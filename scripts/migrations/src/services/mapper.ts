import { randomUUID } from "node:crypto";
import { OS_STATUS_MAP } from "../constants.js";
import type { SnapshotArtifact, PipelineContext, DictionaryVersion, MappingOutput } from "../types.js";

type TransformFn = (value: unknown) => unknown;

const TRANSFORM_MAP: Record<string, TransformFn> = {
  "trim": (value: unknown) => {
    if (typeof value !== "string") return value;
    return value.trim();
  },

  "strip-non-digits": (value: unknown) => {
    if (value === null || value === undefined) return value;
    return String(value).replace(/\D/g, "");
  },

  "status-map": (value: unknown) => {
    if (value === null || value === undefined) return value;
    const key = String(value);
    return OS_STATUS_MAP[key] ?? "AGUARDANDO_AVALIACAO";
  },

  "date-format": (value: unknown) => {
    if (value === null || value === undefined) return value;
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return value;
    return d.toISOString().slice(0, 10);
  },

  "toString": (value: unknown) => {
    if (value === null || value === undefined) return value;
    return String(value);
  },

  "toInt": (value: unknown) => {
    if (value === null || value === undefined) return 0;
    const num = Math.round(Number(value));
    return isNaN(num) ? 0 : num;
  },
};

export class Mapper {
  private dictionary: DictionaryVersion;

  constructor(dictionary: DictionaryVersion) {
    this.dictionary = dictionary;
  }

  async map(
    snapshot: SnapshotArtifact,
    context: PipelineContext,
  ): Promise<MappingOutput[]> {
    const outputs: MappingOutput[] = [];
    const sourceToEntity = new Map<string, string>();
    const unmappedTables: string[] = [];

    for (const [entityName, entity] of Object.entries(this.dictionary.entities)) {
      sourceToEntity.set(entity.sourceTable, entityName);
    }

    const clientLegacyToId = new Map<string, string>();
    const deviceLegacyToId = new Map<string, string>();

    for (const table of snapshot.tables) {
      const entityName = sourceToEntity.get(table.name);
      if (entityName === "Client") {
        const src = this.dictionary.entities["Client"]?.fields?.legacyId?.source;
        if (src) {
          for (const row of table.rows) {
            const raw = row[src];
            if (raw != null) {
              const rawStr = String(raw);
              clientLegacyToId.set(rawStr, context.clientMappings?.get(rawStr) ?? randomUUID());
            }
          }
        }
      } else if (entityName === "Device") {
        const src = this.dictionary.entities["Device"]?.fields?.legacyId?.source;
        if (src) {
          for (const row of table.rows) {
            const raw = row[src];
            if (raw != null) {
              const rawStr = String(raw);
              deviceLegacyToId.set(rawStr, context.deviceMappings?.get(rawStr) ?? randomUUID());
            }
          }
        }
      }
    }

    let targetDate = process.env.MIGRATION_DATE;
    if (targetDate && targetDate.includes("/")) {
      const parts = targetDate.split("/");
      if (parts.length === 3) {
        targetDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // ISO representation yyyy-mm-dd
      }
    }

    let maxOsNumber = 0;
    if (context.existingOsNumbers) {
      for (const osNum of context.existingOsNumbers) {
        const cleanNumStr = osNum.replace(/\D/g, "");
        const num = parseInt(cleanNumStr, 10);
        if (!isNaN(num) && num > maxOsNumber) {
          maxOsNumber = num;
        }
      }
    }

    const allowedOsLegacyIds = new Set<string>();
    const conflictingOsToNewNum = new Map<string, string>();
    let currentSeqNum = maxOsNumber;

    if (targetDate) {
      const ordemsTable = snapshot.tables.find(t => t.name === "ORDEMS");
      if (ordemsTable) {
        for (const row of ordemsTable.rows) {
          const entrada = row.ENTRADA;
          const codCliente = row.COD_CLIENTE !== undefined ? Number(row.COD_CLIENTE) : undefined;
          if (entrada === null && codCliente === 0) {
            continue;
          }
          const entradaStr = entrada ? String(entrada) : "";
          if (entradaStr.startsWith(targetDate)) {
            const codigo = row.CODIGO;
            if (codigo != null) {
              const osNum = String(codigo);
              allowedOsLegacyIds.add(osNum);
              const hasConflict = context.existingOsNumbers?.has(osNum) ||
                                  context.existingOsNumbers?.has(`OS-${osNum}`) ||
                                  context.existingOsNumbers?.has(`OS ${osNum}`) ||
                                  context.existingOsNumbers?.has(`OS${osNum}`);
              if (hasConflict) {
                currentSeqNum++;
                conflictingOsToNewNum.set(osNum, String(currentSeqNum));
              }
            }
          }
        }
      }
    }

    for (const table of snapshot.tables) {
      const entityName = sourceToEntity.get(table.name);
      if (!entityName) {
        unmappedTables.push(table.name);
        continue;
      }

      const entity = this.dictionary.entities[entityName];

      for (const row of table.rows) {
        if (entityName === "OrdemServico") {
          const entrada = row.ENTRADA;
          const codCliente = row.COD_CLIENTE !== undefined ? Number(row.COD_CLIENTE) : undefined;
          if (entrada === null && codCliente === 0) {
            continue; // Pula ordens de serviço rascunho sem dados no MDB
          }
          if (targetDate) {
            const codigo = row.CODIGO;
            if (!codigo || !allowedOsLegacyIds.has(String(codigo))) {
              continue;
            }
          }
        }

        if (targetDate) {
          if (entityName === "PartUsage") {
            const osNum = row.COD_OS;
            if (!osNum || !allowedOsLegacyIds.has(String(osNum))) {
              continue;
            }
          }
          if (entityName === "ServiceItem") {
            const osNum = row.OS_NUM;
            if (!osNum || !allowedOsLegacyIds.has(String(osNum))) {
              continue;
            }
          }
        }

        const data: Record<string, unknown> = {};
        const warnings: MappingOutput["warnings"] = [];
        const legacyRef: MappingOutput["legacyRef"] = {
          table: table.name,
          id: (row.id ?? "") as string | number,
          version: context.metadata.importerVersion,
        };

        for (const [targetField, fieldDef] of Object.entries(entity.fields)) {
          const sourceValue = row[fieldDef.source];
          if (sourceValue === undefined && fieldDef.defaultValue !== undefined) {
            data[targetField] = fieldDef.defaultValue;
            continue;
          }

          const transform = fieldDef.transform && Object.hasOwn(TRANSFORM_MAP, fieldDef.transform)
            ? TRANSFORM_MAP[fieldDef.transform]
            : undefined;

          if (sourceValue !== undefined && transform) {
            data[targetField] = transform(sourceValue);
          } else if (sourceValue !== undefined) {
            data[targetField] = sourceValue;
          }
        }

        if (entityName === "Client") {
          data.id = clientLegacyToId.get(String(data.legacyId ?? "")) ?? randomUUID();
        } else if (entityName === "Device") {
          data.id = deviceLegacyToId.get(String(data.legacyId ?? "")) ?? randomUUID();
        } else {
          data.id = randomUUID();
        }

        if (entityName === "OrdemServico") {
          const cle = data.clientLegacyId;
          if (cle != null) {
            const resolved = clientLegacyToId.get(String(cle));
            if (resolved) data.clientId = resolved;
          }
          const dle = data.deviceLegacyId;
          if (dle != null) {
            const resolved = deviceLegacyToId.get(String(dle));
            if (resolved) data.deviceId = resolved;
          }

          const osNum = String(data.osNumber);
          const newNum = conflictingOsToNewNum.get(osNum);
          if (newNum) {
            data.osNumber = newNum;
            warnings.push({
              code: "OS_NUMBER_CONFLICT",
              message: `Conflito de OS detectado: OS ${osNum} reordenada para ${data.osNumber}`,
              phase: "MAP",
            });
          }
        }

        if (entityName === "PartUsage") {
          const osNum = String(data.osLegacyId);
          const newNum = conflictingOsToNewNum.get(osNum);
          if (newNum) {
            data.osLegacyId = newNum;
          }
        }

        if (entityName === "ServiceItem") {
          const osNum = String(data.osLegacyId);
          const newNum = conflictingOsToNewNum.get(osNum);
          if (newNum) {
            data.osLegacyId = newNum;
          }
        }

        outputs.push({ entity: entityName, data, legacyRef, warnings });
      }
    }

    if (unmappedTables.length > 0 && outputs.length > 0) {
      outputs[0].warnings.push({
        code: "UNMAPPED_TABLE",
        message: `Tables without dictionary mapping: ${unmappedTables.join(", ")}`,
        phase: "MAP",
      });
    }

    return outputs;
  }
}
