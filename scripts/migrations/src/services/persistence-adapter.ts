import type { PersistenceWriteResult } from "../interfaces.js";
import { BATCH_SIZE } from "../constants.js";

export interface IDbTransaction {
  insert(
    table: string,
    records: Record<string, unknown>[],
  ): Promise<{ count: number }>;
}

export interface IDatabaseClient {
  transaction<T>(
    fn: (tx: IDbTransaction) => Promise<T>,
  ): Promise<T>;
}

export class PersistenceAdapter {
  constructor(private readonly db: IDatabaseClient) {}

  async bulkInsert(
    table: string,
    records: Record<string, unknown>[],
    batchSize: number = BATCH_SIZE,
  ): Promise<PersistenceWriteResult> {
    const result: PersistenceWriteResult = {
      entity: table,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (records.length === 0) return result;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        const { count } = await this.db.transaction((tx) =>
          tx.insert(table, batch),
        );
        result.created += count;
        result.skipped += batch.length - count;
      } catch (err) {
        if (result.created === 0 && result.errors.length === 0) {
          throw err;
        }
        result.errors.push({
          category: "PERSISTENCE_ERROR",
          code: "BULK_INSERT_ERROR",
          message: err instanceof Error ? err.message : String(err),
          table,
          phase: "PERSIST",
          recoverable: true,
        });
      }
    }

    return result;
  }

  async rollback(
    strategy: "soft" | "hard" | "compensating",
    runId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (strategy === "soft") {
        await tx.insert("_migration_log", [
          { runId, strategy, timestamp: new Date().toISOString() },
        ]);
      } else {
        await tx.insert("_migration_rollback", [
          { runId, strategy, timestamp: new Date().toISOString() },
        ]);
      }
    });
  }
}
