import { readFileSync, statSync } from "fs";
import { createHash } from "crypto";
import MDBReader from "mdb-reader";
import { MdbReadError } from "../errors.js";
import type { IMdbReader, MdbReaderOptions } from "../interfaces.js";
import type { MdbTable, MdbReadResult } from "../types.js";
import { HASH_ALGORITHM } from "../constants.js";

export class MdbReader implements IMdbReader {
  private readonly options: Required<MdbReaderOptions>;

  constructor(options: MdbReaderOptions = {}) {
    this.options = {
      tables: options.tables ?? [],
      batchSize: options.batchSize ?? 1000,
      password: options.password ?? "",
    };
  }

  async read(mdbPath: string, options?: MdbReaderOptions): Promise<MdbReadResult> {
    const opts = { ...this.options, ...options };

    this.validateFile(mdbPath);

    const buffer = this.readMdbFile(mdbPath);
    const hash = this.calculateHash(buffer);

    try {
      const db = new MDBReader(buffer, opts.password ? { password: opts.password } : undefined);
      return this.extractTables(db, hash, buffer.length, opts.tables);
    } catch (error) {
      throw new MdbReadError(
        `Failed to parse MDB file at path: ${mdbPath}`,
        { mdbPath, originalError: String(error) },
      );
    }
  }

  private validateFile(mdbPath: string): void {
    try {
      const stats = statSync(mdbPath);
      if (!stats.isFile()) {
        throw new MdbReadError(`Path is not a file: ${mdbPath}`, { mdbPath });
      }
      if (stats.size === 0) {
        throw new MdbReadError(`MDB file is empty: ${mdbPath}`, { mdbPath });
      }
    } catch (error) {
      if (error instanceof MdbReadError) throw error;
      throw new MdbReadError(
        `Cannot access MDB file at path: ${mdbPath}`,
        { mdbPath, originalError: String(error) },
      );
    }
  }

  private readMdbFile(mdbPath: string): Buffer {
    try {
      return readFileSync(mdbPath);
    } catch (error) {
      throw new MdbReadError(
        `Failed to read MDB file at path: ${mdbPath}`,
        { mdbPath, originalError: String(error) },
      );
    }
  }

  private calculateHash(buffer: Buffer): string {
    return createHash(HASH_ALGORITHM).update(buffer).digest("hex");
  }

  private extractTables(
    db: MDBReader,
    hash: string,
    sizeBytes: number,
    filterTables?: string[],
  ): MdbReadResult {
    const allTableNames = db.getTableNames();
    const targetTableNames = filterTables && filterTables.length > 0
      ? filterTables
      : allTableNames;

    const validatedNames = this.resolveTableNames(targetTableNames, allTableNames);
    const tables: MdbTable[] = [];

    for (const tableName of validatedNames) {
      try {
        const table = db.getTable(tableName);
        const rows = table.getData();
        tables.push({ name: tableName, rows });
      } catch (error) {
        throw new MdbReadError(
          `Failed to read table '${tableName}' from MDB`,
          { tableName, mdbPath: "", originalError: String(error) },
        );
      }
    }

    return {
      tables,
      hash,
      sizeBytes,
      extractedAt: new Date().toISOString(),
    };
  }

  private resolveTableNames(requested: string[], available: string[]): string[] {
    const availableSet = new Set(available);
    const resolved: string[] = [];

    for (const name of requested) {
      if (!availableSet.has(name)) {
        throw new MdbReadError(
          `Table '${name}' not found in MDB file. Available tables: ${available.join(", ")}`,
          { tableName: name, availableTables: available },
        );
      }
      resolved.push(name);
    }

    return resolved;
  }
}
