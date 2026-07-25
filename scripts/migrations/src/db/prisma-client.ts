import pg from "pg";
import crypto from "crypto";
import type { IDatabaseClient, IDbTransaction } from "../services/persistence-adapter.js";

const ENTITY_TO_TABLE: Record<string, string> = {
  Client: "clients",
  Device: "devices",
  OrdemServico: "ordem_servicos",
  ServiceItem: "service_items",
  PartUsage: "part_usages",
  Payment: "payments",
  Part: "parts",
};

export class PgDbClient implements IDatabaseClient {
  private pool: pg.Pool;

  constructor(url?: string) {
    this.pool = new pg.Pool({ connectionString: url ?? process.env.DATABASE_URL });
  }

  async connect(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async transaction<T>(fn: (tx: IDbTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const tx: IDbTransaction = {
        insert: async (entity, records) => {
          const table = ENTITY_TO_TABLE[entity] ?? entity;
          if (records.length === 0) return { count: 0 };

          const cleanRecords = records.map((r) => {
            const filtered: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(r)) {
              if (v != null) filtered[k] = v;
            }
            if (!filtered.id) filtered.id = crypto.randomUUID();
            return filtered;
          });

          const keys = [...new Set(cleanRecords.flatMap((r) => Object.keys(r)))];
          const cols = keys.map((k) => `"${k}"`).join(", ");
          let paramIndex = 1;
          const values: unknown[] = [];
          const valueClauses: string[] = [];

          for (const record of cleanRecords) {
            const placeholders: string[] = [];
            for (const key of keys) {
              if (Object.hasOwn(record, key)) {
                values.push(record[key]);
                placeholders.push(`$${paramIndex++}`);
              } else {
                placeholders.push("DEFAULT");
              }
            }
            valueClauses.push(`(${placeholders.join(", ")})`);
          }

          const sql = `INSERT INTO "${table}" (${cols}) VALUES ${valueClauses.join(", ")} ON CONFLICT DO NOTHING`;
          await client.query(sql, values);
          return { count: cleanRecords.length };
        },
      };
      const result = await fn(tx);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async getLegacyMappings(table: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const res = await this.pool.query(`SELECT "id", "legacyId" FROM "${table}" WHERE "legacyId" IS NOT NULL`);
    for (const row of res.rows) {
      map.set(String(row.legacyId), String(row.id));
    }
    return map;
  }

  async getExistingOsNumbers(): Promise<Set<string>> {
    const set = new Set<string>();
    const res = await this.pool.query('SELECT "osNumber" FROM "ordem_servicos"');
    for (const row of res.rows) {
      if (row.osNumber != null) set.add(String(row.osNumber));
    }
    return set;
  }
}
