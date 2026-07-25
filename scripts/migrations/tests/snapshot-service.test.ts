import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { SourceError } from "../src/errors.js";
import type { MdbReadResult, PipelineContext, SnapshotArtifact } from "../src/types.js";

const { mockMkdirSync, mockWriteFileSync, mockReadFileSync, mockExistsSync, mockStatSync } =
  vi.hoisted(() => ({
    mockMkdirSync: vi.fn(),
    mockWriteFileSync: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockExistsSync: vi.fn(),
    mockStatSync: vi.fn(),
  }));

vi.mock("node:fs", () => ({
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  statSync: mockStatSync,
}));

function makeMdbResult(overrides?: Partial<MdbReadResult>): MdbReadResult {
  return {
    tables: [
      {
        name: "CLIENTES",
        rows: [
          { id: 1, nome: "João", email: "joao@test.com" },
          { id: 2, nome: null, email: "maria@test.com" },
          { id: 3, nome: "Carlos", email: null },
        ],
      },
      {
        name: "EQUIPAMENTOS",
        rows: [
          { id: 1, descricao: "Notebook", valor: 2500 },
          { id: 2, descricao: "Monitor", valor: 800 },
        ],
      },
    ],
    hash: "abc123def456".repeat(4) + "aaaa",
    sizeBytes: 1024,
    extractedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function makeContext(overrides?: Partial<PipelineContext>): PipelineContext {
  return {
    runId: "test-run-001",
    mode: "extract",
    mdbPath: "/data/test.mdb",
    dictionaryVersion: "1.0.0",
    warnings: [],
    errors: [],
    startedAt: "2026-07-20T10:00:00.000Z",
    metadata: {
      schemaVersion: "1.0.0",
      extractVersion: "1.0.0",
      dictionaryVersion: "1.0.0",
      importerVersion: "1.0.0",
    },
    ...overrides,
  };
}

describe("SnapshotService", () => {
  let SnapshotService: Awaited<typeof import("../src/services/snapshot-service.js")>["SnapshotService"];
  let service: InstanceType<typeof import("../src/services/snapshot-service.js")["SnapshotService"]>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../src/services/snapshot-service.js");
    SnapshotService = mod.SnapshotService;
    service = new SnapshotService();
  });

  describe("create", () => {
    it("should create snapshot with correct metadata", async () => {
      const result = makeMdbResult();
      const ctx = makeContext();
      const snapshot = await service.create(result, ctx);

      expect(snapshot.metadata.mdbPath).toBe("/data/test.mdb");
      expect(snapshot.metadata.mdbHash).toBe(result.hash);
      expect(snapshot.metadata.mdbSizeBytes).toBe(1024);
      expect(snapshot.metadata.extractedAt).toBe("2026-07-20T10:00:00.000Z");
      expect(snapshot.metadata.totalTables).toBe(2);
      expect(snapshot.metadata.totalRows).toBe(5);
    });

    it("should carry schema version from context metadata", async () => {
      const ctx = makeContext({
        metadata: {
          schemaVersion: "2.0.0",
          extractVersion: "2.0.0",
          dictionaryVersion: "2.0.0",
          importerVersion: "2.0.0",
        },
      });
      const snapshot = await service.create(makeMdbResult(), ctx);

      expect(snapshot.schema.schemaVersion).toBe("2.0.0");
      expect(snapshot.schema.extractVersion).toBe("2.0.0");
      expect(snapshot.schema.dictionaryVersion).toBe("2.0.0");
      expect(snapshot.schema.importerVersion).toBe("2.0.0");
    });

    it("should compute per-table statistics", async () => {
      const snapshot = await service.create(makeMdbResult(), makeContext());

      expect(snapshot.tables).toHaveLength(2);

      const clientes = snapshot.tables[0];
      expect(clientes.name).toBe("CLIENTES");
      expect(clientes.statistics.rowCount).toBe(3);
      expect(clientes.statistics.columns).toEqual(["id", "nome", "email"]);

      const equip = snapshot.tables[1];
      expect(equip.name).toBe("EQUIPAMENTOS");
      expect(equip.statistics.rowCount).toBe(2);
      expect(equip.statistics.columns).toEqual(["id", "descricao", "valor"]);
    });

    it("should compute null percentages correctly", async () => {
      const snapshot = await service.create(makeMdbResult(), makeContext());

      const clientes = snapshot.tables[0].statistics;
      expect(clientes.nullPercentage.id).toBe(0);
      expect(clientes.nullPercentage.nome).toBeCloseTo(33.33, 1);
      expect(clientes.nullPercentage.email).toBeCloseTo(33.33, 1);
    });

    it("should compute per-table checksums", async () => {
      const snapshot = await service.create(makeMdbResult(), makeContext());

      const expectedHash = createHash("sha256")
        .update(JSON.stringify(snapshot.tables[0].rows))
        .digest("hex");
      expect(snapshot.checksums.perTable.CLIENTES).toBe(expectedHash);
      expect(snapshot.checksums.mdbSha256).toBe(makeMdbResult().hash);
    });

    it("should handle empty tables (zero rows)", async () => {
      const result = makeMdbResult({
        tables: [{ name: "VAZIA", rows: [] }],
      });
      // Fix totalRows after override
      const snapshot = await service.create({ ...result, totalRows: 0 } as unknown as MdbReadResult, makeContext());

      expect(snapshot.tables).toHaveLength(1);
      expect(snapshot.tables[0].statistics.rowCount).toBe(0);
      expect(snapshot.tables[0].statistics.columns).toEqual([]);
      expect(snapshot.tables[0].statistics.nullPercentage).toEqual({});
    });

    it("should throw SourceError when mdbResult has no tables", async () => {
      const result = makeMdbResult({ tables: [] });
      await expect(
        service.create(result, makeContext()),
      ).rejects.toThrow(SourceError);
    });
  });

  describe("save", () => {
    it("should write snapshot as JSON to specified directory", async () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const snapshot = await service.create(makeMdbResult(), makeContext());
      const savedPath = await service.save(snapshot, "/output");

      expect(mockMkdirSync).toHaveBeenCalledWith("/output", { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      expect(savedPath).toMatch(/^\/output\\?\/?sh-oficina-/);
      expect(savedPath).toMatch(/\.json$/);
    });

    it("should create output directory if it does not exist", async () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const snapshot = await service.create(makeMdbResult(), makeContext());
      await service.save(snapshot, "/new-dir");

      expect(mockMkdirSync).toHaveBeenCalledWith("/new-dir", { recursive: true });
    });

    it("should return the full path of the saved file", async () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const snapshot = await service.create(makeMdbResult(), makeContext());
      const savedPath = await service.save(snapshot, "/output");

      expect(typeof savedPath).toBe("string");
      expect(savedPath).toContain("/output");
    });
  });

  describe("load", () => {
    it("should load and parse a snapshot from disk", async () => {
      const snapshot = await service.create(makeMdbResult(), makeContext());
      const json = JSON.stringify(snapshot);

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true, size: json.length });
      mockReadFileSync.mockReturnValue(json);

      const loaded = await service.load("/snapshots/test.json");
      expect(loaded.metadata.mdbHash).toBe(snapshot.metadata.mdbHash);
      expect(loaded.tables).toHaveLength(2);
      expect(loaded.checksums.mdbSha256).toBe(snapshot.checksums.mdbSha256);
    });

    it("should throw SourceError if file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(service.load("/nonexistent.json")).rejects.toThrow(SourceError);
    });

    it("should throw SourceError if JSON is malformed", async () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true, size: 100 });
      mockReadFileSync.mockReturnValue("invalid json{{{");

      await expect(service.load("/bad.json")).rejects.toThrow(SourceError);
    });

    it("should throw SourceError if snapshot structure is invalid", async () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true, size: 50 });
      mockReadFileSync.mockReturnValue(JSON.stringify({ not: "a snapshot" }));

      await expect(service.load("/invalid.json")).rejects.toThrow(SourceError);
    });
  });
});
