import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { SourceError } from "../errors.js";
import type { MdbReadResult, PipelineContext, SnapshotArtifact, SnapshotTable, TableStatistics } from "../types.js";
import { HASH_ALGORITHM, SNAPSHOT_DIR, SNAPSHOT_NAMING } from "../constants.js";

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

function buildSnapshotFilename(hash: string, date: Date): string {
  const hash8 = hash.slice(0, 8);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  return SNAPSHOT_NAMING.replace("{hash8}", hash8).replace("{date}", dateStr);
}

const REQUIRED_TOP_KEYS = ["metadata", "schema", "tables", "checksums"] as const;
const REQUIRED_META_KEYS = ["mdbPath", "mdbHash", "mdbSizeBytes", "extractedAt", "totalTables", "totalRows"] as const;

function validateSnapshotShape(data: unknown): data is SnapshotArtifact {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in obj)) return false;
  }

  const meta = obj.metadata as Record<string, unknown>;
  if (!meta || typeof meta !== "object") return false;
  for (const key of REQUIRED_META_KEYS) {
    if (!(key in meta)) return false;
  }

  if (!Array.isArray(obj.tables)) return false;

  return true;
}

export class SnapshotService {
  async create(mdbResult: MdbReadResult, context: PipelineContext): Promise<SnapshotArtifact> {
    if (!mdbResult.tables || mdbResult.tables.length === 0) {
      throw new SourceError("SNAPSHOT_NO_TABLES", "Cannot create snapshot: MDB result contains no tables");
    }

    const tables: SnapshotTable[] = mdbResult.tables.map((t) => ({
      name: t.name,
      rows: t.rows,
      statistics: computeStatistics(t.rows),
    }));

    const totalRows = tables.reduce((sum, t) => sum + t.statistics.rowCount, 0);

    const perTable: Record<string, string> = {};
    for (const t of tables) {
      perTable[t.name] = computeTableHash(t.rows);
    }

    return {
      metadata: {
        mdbPath: context.mdbPath,
        mdbHash: mdbResult.hash,
        mdbSizeBytes: mdbResult.sizeBytes,
        extractedAt: mdbResult.extractedAt,
        totalTables: tables.length,
        totalRows,
      },
      schema: {
        schemaVersion: context.metadata.schemaVersion,
        extractVersion: context.metadata.extractVersion,
        dictionaryVersion: context.metadata.dictionaryVersion,
        importerVersion: context.metadata.importerVersion,
      },
      tables,
      checksums: {
        mdbSha256: mdbResult.hash,
        perTable,
      },
    };
  }

  async save(snapshot: SnapshotArtifact, dir?: string): Promise<string> {
    const outputDir = dir ?? SNAPSHOT_DIR;
    mkdirSync(outputDir, { recursive: true });

    const filename = buildSnapshotFilename(
      snapshot.metadata.mdbHash,
      new Date(snapshot.metadata.extractedAt),
    );

    const fullPath = `${outputDir}/${filename}`;
    const json = JSON.stringify(snapshot, null, 2);
    writeFileSync(fullPath, json, "utf-8");
    return fullPath;
  }

  async load(path: string): Promise<SnapshotArtifact> {
    if (!existsSync(path)) {
      throw new SourceError("SNAPSHOT_NOT_FOUND", `Snapshot file not found: ${path}`);
    }

    const stat = statSync(path);
    if (!stat.isFile()) {
      throw new SourceError("SNAPSHOT_NOT_FILE", `Path is not a file: ${path}`);
    }

    let data: unknown;
    try {
      const content = readFileSync(path, "utf-8");
      data = JSON.parse(content);
    } catch {
      throw new SourceError("SNAPSHOT_MALFORMED", `Snapshot file contains invalid JSON: ${path}`);
    }

    if (!validateSnapshotShape(data)) {
      throw new SourceError("SNAPSHOT_INVALID", `Snapshot file has invalid structure: ${path}`);
    }

    return data as SnapshotArtifact;
  }
}
