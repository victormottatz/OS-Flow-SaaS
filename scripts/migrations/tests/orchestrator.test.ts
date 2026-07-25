import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  IMdbReader,
  ISnapshotService,
  IValidator,
  INormalizer,
  IMapper,
  IPersistenceAdapter,
} from "../src/interfaces.js";
import type {
  MdbReadResult,
  SnapshotArtifact,
  ValidationResult,
  MappingOutput,
  PipelineContext,
  PipelineError,
  Warning,
} from "../src/types.js";

function makeMocks() {
  const reader: IMdbReader = {
    read: vi.fn().mockResolvedValue({ tables: [], hash: "a".repeat(64), sizeBytes: 0, extractedAt: new Date().toISOString() } satisfies MdbReadResult),
  };
  const snapshotService: ISnapshotService = {
    create: vi.fn().mockImplementation((_result: MdbReadResult, _ctx: PipelineContext) =>
      Promise.resolve({
        metadata: { mdbPath: "/test.mdb", mdbHash: "a".repeat(64), mdbSizeBytes: 0, extractedAt: new Date().toISOString(), totalTables: 0, totalRows: 0 },
        schema: { schemaVersion: "1.0.0", extractVersion: "1.0.0", dictionaryVersion: "1.0.0", importerVersion: "1.0.0" },
        tables: [],
        checksums: { mdbSha256: "a".repeat(64), perTable: {} },
      } satisfies SnapshotArtifact),
    ),
    load: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(".snapshots/test.json"),
  };
  const validator: IValidator = {
    validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [], stats: {} } satisfies ValidationResult),
  };
  const normalizer: INormalizer = {
    normalize: vi.fn().mockImplementation((snapshot: SnapshotArtifact) => Promise.resolve(snapshot)),
  };
  const mapper: IMapper = {
    map: vi.fn().mockResolvedValue([] as MappingOutput[]),
  };
  const persistence: IPersistenceAdapter = {
    bulkInsert: vi.fn().mockResolvedValue({ entity: "Test", created: 0, updated: 0, skipped: 0, errors: [] }),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
  return { reader, snapshotService, validator, normalizer, mapper, persistence };
}

describe("Orchestrator", () => {
  let Orchestrator: Awaited<typeof import("../src/services/orchestrator.js")>["Orchestrator"];

  beforeEach(async () => {
    const mod = await import("../src/services/orchestrator.js");
    Orchestrator = mod.Orchestrator;
  });

  describe("constructor", () => {
    it("should create orchestrator with all services", () => {
      const mocks = makeMocks();
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );
      expect(orchestrator).toBeInstanceOf(Orchestrator);
    });
  });

  describe("run (extract mode)", () => {
    it("should run full pipeline successfully with zero data", async () => {
      const mocks = makeMocks();
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      const result = await orchestrator.run({ mdbPath: "/test.mdb", mode: "extract" });

      expect(result.status).toBe("SUCCESS");
      expect(result.phase).toBe("PERSIST");
      expect(mocks.reader.read).toHaveBeenCalledOnce();
      expect(mocks.snapshotService.create).toHaveBeenCalledOnce();
      expect(mocks.validator.validate).toHaveBeenCalledOnce();
      expect(mocks.normalizer.normalize).toHaveBeenCalledOnce();
      expect(mocks.mapper.map).toHaveBeenCalledOnce();
    });

    it("should stop after mapping in dry-run mode", async () => {
      const mocks = makeMocks();
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      const result = await orchestrator.run({
        mdbPath: "/test.mdb",
        mode: "extract",
        dryRun: "full",
      });

      expect(result.phase).toBe("MAP");
      expect(mocks.persistence.bulkInsert).not.toHaveBeenCalled();
    });

    it("should read MDB with specific tables when provided", async () => {
      const mocks = makeMocks();
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      await orchestrator.run({
        mdbPath: "/test.mdb",
        mode: "extract",
        tables: ["CLIENTES", "OS"],
      });

      expect(mocks.reader.read).toHaveBeenCalledWith(
        "/test.mdb",
        expect.objectContaining({ tables: ["CLIENTES", "OS"] }),
      );
    });

    it("should return FAILED status when MDB read fails", async () => {
      const mocks = makeMocks();
      mocks.reader.read = vi.fn().mockRejectedValue(new Error("File not found"));
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      const result = await orchestrator.run({ mdbPath: "/test.mdb", mode: "extract" });

      expect(result.status).toBe("FAILED");
      expect(result.phase).toBe("EXTRACT");
      expect(result.errors[0].message).toContain("File not found");
    });

    it("should return FAILED when validation fails", async () => {
      const mocks = makeMocks();
      mocks.validator.validate = vi.fn().mockResolvedValue({
        valid: false,
        errors: [{ category: "VALIDATION_ERROR", code: "REQUIRED_FIELD", message: "Missing field", phase: "VALIDATE", recoverable: false, table: "CLIENTES" } as PipelineError],
        warnings: [],
        stats: {},
      });
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      const result = await orchestrator.run({ mdbPath: "/test.mdb", mode: "extract" });

      expect(result.status).toBe("FAILED");
      expect(result.phase).toBe("VALIDATE");
    });
  });

  describe("run (transform mode)", () => {
    it("should load snapshot and run validate/map/persist", async () => {
      const mocks = makeMocks();
      mocks.snapshotService.load = vi.fn().mockResolvedValue({
        metadata: { mdbPath: "/stored.mdb", mdbHash: "b".repeat(64), mdbSizeBytes: 100, extractedAt: new Date().toISOString(), totalTables: 1, totalRows: 2 },
        schema: { schemaVersion: "1.0.0", extractVersion: "1.0.0", dictionaryVersion: "1.0.0", importerVersion: "1.0.0" },
        tables: [{ name: "CLIENTES", rows: [{ id: 1 }], statistics: { rowCount: 1, columns: ["id"], nullPercentage: { id: 0 } } }],
        checksums: { mdbSha256: "b".repeat(64), perTable: { CLIENTES: "c".repeat(64) } },
      } satisfies SnapshotArtifact);
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      const result = await orchestrator.run({
        mdbPath: "/test.mdb",
        mode: "transform",
        snapshotPath: ".snapshots/sh-oficina-abc12345-20260720.json",
      });

      expect(result.status).toBe("SUCCESS");
      expect(mocks.reader.read).not.toHaveBeenCalled();
      expect(mocks.snapshotService.load).toHaveBeenCalledWith(
        ".snapshots/sh-oficina-abc12345-20260720.json",
      );
      expect(mocks.snapshotService.create).not.toHaveBeenCalled();
    });
  });

  describe("run (load mode)", () => {
    it("should skip read and mapping phases", async () => {
      const mocks = makeMocks();
      const orchestrator = new Orchestrator(
        mocks.reader,
        mocks.snapshotService,
        mocks.validator,
        mocks.normalizer,
        mocks.mapper,
        mocks.persistence,
      );

      const result = await orchestrator.run({ mdbPath: "/test.mdb", mode: "load" });

      expect(result.status).toBe("SUCCESS" as const);
      expect(mocks.reader.read).not.toHaveBeenCalled();
    });
  });
});
