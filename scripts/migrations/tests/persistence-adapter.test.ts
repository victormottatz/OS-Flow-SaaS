import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IDatabaseClient, IDbTransaction } from "../src/services/persistence-adapter.js";

function makeTx(): IDbTransaction {
  return {
    insert: vi.fn().mockImplementation(
      (_table: string, records: Record<string, unknown>[]) => Promise.resolve({ count: records.length }),
    ),
  };
}

function makeClient(tx?: IDbTransaction): IDatabaseClient {
  return {
    transaction: vi.fn().mockImplementation(
      <T>(fn: (t: IDbTransaction) => Promise<T>) => Promise.resolve(fn(tx ?? makeTx())),
    ),
  };
}

describe("PersistenceAdapter", () => {
  let PersistenceAdapter: Awaited<typeof import("../src/services/persistence-adapter.js")>["PersistenceAdapter"];

  beforeEach(async () => {
    const mod = await import("../src/services/persistence-adapter.js");
    PersistenceAdapter = mod.PersistenceAdapter;
  });

  describe("constructor", () => {
    it("should create adapter with db client", () => {
      const client = makeClient();
      const adapter = new PersistenceAdapter(client);
      expect(adapter).toBeInstanceOf(PersistenceAdapter);
    });
  });

  describe("bulkInsert", () => {
    it("should insert all records in a single batch", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));
      const records = [
        { id: 1, name: "João" },
        { id: 2, name: "Maria" },
      ];

      const result = await adapter.bulkInsert("Client", records, 100);

      expect(result.entity).toBe("Client");
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(tx.insert).toHaveBeenCalledTimes(1);
      expect(tx.insert).toHaveBeenCalledWith("Client", records);
    });

    it("should split records into multiple batches", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));
      const records = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

      const result = await adapter.bulkInsert("Client", records, 3);

      expect(result.created).toBe(10);
      expect(tx.insert).toHaveBeenCalledTimes(4);
      expect(tx.insert).toHaveBeenNthCalledWith(1, "Client", records.slice(0, 3));
      expect(tx.insert).toHaveBeenNthCalledWith(2, "Client", records.slice(3, 6));
      expect(tx.insert).toHaveBeenNthCalledWith(3, "Client", records.slice(6, 9));
      expect(tx.insert).toHaveBeenNthCalledWith(4, "Client", records.slice(9, 10));
    });

    it("should use default batch size when not specified", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));
      const records = Array.from({ length: 600 }, (_, i) => ({ id: i + 1 }));

      const result = await adapter.bulkInsert("Client", records);

      expect(result.created).toBe(600);
      expect(tx.insert).toHaveBeenCalledTimes(2);
      expect(tx.insert).toHaveBeenNthCalledWith(1, "Client", records.slice(0, 500));
      expect(tx.insert).toHaveBeenNthCalledWith(2, "Client", records.slice(500, 600));
    });

    it("should handle empty records array", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));

      const result = await adapter.bulkInsert("Client", [], 100);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it("should count skipped records (duplicates)", async () => {
      const tx = makeTx();
      tx.insert = vi.fn().mockResolvedValue({ count: 0 });
      const adapter = new PersistenceAdapter(makeClient(tx));
      const records = [
        { id: 1, name: "João" },
        { id: 1, name: "João" },
      ];

      const result = await adapter.bulkInsert("Client", records, 100);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(2);
    });

    it("should collect and report errors", async () => {
      const tx = makeTx();
      tx.insert = vi.fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockRejectedValueOnce(new Error("DB timeout"));
      const adapter = new PersistenceAdapter(makeClient(tx));
      const records = [
        { id: 1 },
        { id: 2 },
      ];

      const result = await adapter.bulkInsert("Client", records, 1);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("BULK_INSERT_ERROR");
      expect(result.errors[0].recoverable).toBe(true);
    });

    it("should throw on total failure with no partial success", async () => {
      const tx = makeTx();
      tx.insert = vi.fn().mockRejectedValue(new Error("Connection lost"));
      const adapter = new PersistenceAdapter(makeClient(tx));
      const records = [{ id: 1 }];

      await expect(adapter.bulkInsert("Client", records, 1)).rejects.toThrow(
        "Connection lost",
      );
    });
  });

  describe("rollback", () => {
    it("should execute soft rollback", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));

      await adapter.rollback("soft", "run-001");

      expect(tx.insert).toHaveBeenCalledWith("_migration_log", expect.arrayContaining([
        expect.objectContaining({ runId: "run-001", strategy: "soft" }),
      ]));
    });

    it("should execute hard rollback", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));

      await adapter.rollback("hard", "run-001");

      expect(tx.insert).toHaveBeenCalledWith("_migration_rollback", expect.arrayContaining([
        expect.objectContaining({ runId: "run-001", strategy: "hard" }),
      ]));
    });

    it("should execute compensating rollback", async () => {
      const tx = makeTx();
      const adapter = new PersistenceAdapter(makeClient(tx));

      await adapter.rollback("compensating", "run-001");

      expect(tx.insert).toHaveBeenCalledWith("_migration_rollback", expect.arrayContaining([
        expect.objectContaining({ runId: "run-001", strategy: "compensating" }),
      ]));
    });
  });
});
