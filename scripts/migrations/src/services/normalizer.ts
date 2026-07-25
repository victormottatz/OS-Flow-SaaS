import { createHash } from "node:crypto";
import { HASH_ALGORITHM } from "../constants.js";
import type {
  SnapshotArtifact,
  TableStatistics,
  PipelineContext,
  ValidationResult,
  NormalizationRule,
} from "../types.js";

function deepCloneSnapshot(snapshot: SnapshotArtifact): SnapshotArtifact {
  return JSON.parse(JSON.stringify(snapshot));
}

function computeTableHash(rows: Record<string, unknown>[]): string {
  return createHash(HASH_ALGORITHM)
    .update(JSON.stringify(rows))
    .digest("hex");
}

function computeStatistics(rows: Record<string, unknown>[]): TableStatistics {
  if (rows.length === 0) {
    return { rowCount: 0, columns: [], nullPercentage: {} };
  }

  const columns = Object.keys(rows[0]);
  const nullPercentage: Record<string, number> = {};

  for (const col of columns) {
    const nullCount = rows.filter((r) => r[col] === null || r[col] === undefined).length;
    nullPercentage[col] = Math.round((nullCount / rows.length) * 10000) / 100;
  }

  return { rowCount: rows.length, columns, nullPercentage };
}

type TransformFn = (value: unknown, params?: Record<string, unknown>) => unknown;

const TRANSFORM_MAP: Record<string, TransformFn> = {
  "trim": (value: unknown) => {
    if (typeof value !== "string") return value;
    return value.trim();
  },

  "lowercase": (value: unknown) => {
    if (typeof value !== "string") return value;
    return value.toLowerCase();
  },

  "uppercase": (value: unknown) => {
    if (typeof value !== "string") return value;
    return value.toUpperCase();
  },

  "default-value": (value: unknown, params?: Record<string, unknown>) => {
    if (value !== null && value !== undefined) return value;
    return params?.default;
  },

  "strip-non-digits": (value: unknown) => {
    if (value === null || value === undefined) return value;
    return String(value).replace(/\D/g, "");
  },

  "date-format": (value: unknown) => {
    if (value === null || value === undefined) return value;
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return value;
    return d.toISOString().slice(0, 10);
  },
};

export class Normalizer {
  private rules: NormalizationRule[];

  constructor(rules?: NormalizationRule[]) {
    this.rules = rules ?? [];
  }

  async normalize(
    snapshot: SnapshotArtifact,
    _validation: ValidationResult,
    _context: PipelineContext,
  ): Promise<SnapshotArtifact> {
    const result = deepCloneSnapshot(snapshot);
    const rulesByTable = new Map<string, NormalizationRule[]>();

    for (const rule of this.rules) {
      const existing = rulesByTable.get(rule.table) ?? [];
      existing.push(rule);
      rulesByTable.set(rule.table, existing);
    }

    let anyTableModified = false;

    for (const table of result.tables) {
      const tableRules = rulesByTable.get(table.name);
      if (!tableRules || tableRules.length === 0) continue;

      for (const row of table.rows) {
        for (const rule of tableRules) {
          const transform = Object.hasOwn(TRANSFORM_MAP, rule.transform) ? TRANSFORM_MAP[rule.transform] : undefined;
          if (!transform) continue;

          row[rule.field] = transform(row[rule.field], rule.params);
        }
      }

      table.statistics = computeStatistics(table.rows);
      anyTableModified = true;
    }

    if (anyTableModified) {
      for (const table of result.tables) {
        result.checksums.perTable[table.name] = computeTableHash(table.rows);
      }
    }

    return result;
  }
}
