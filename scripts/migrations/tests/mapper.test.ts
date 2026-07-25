import { describe, it, expect, beforeEach } from "vitest";
import type { SnapshotArtifact, PipelineContext, DictionaryVersion } from "../src/types.js";

function makeSnapshot(overrides?: Partial<SnapshotArtifact>): SnapshotArtifact {
  return {
    metadata: {
      mdbPath: "/data/test.mdb",
      mdbHash: "a".repeat(64),
      mdbSizeBytes: 1024,
      extractedAt: "2026-07-20T10:00:00.000Z",
      totalTables: 2,
      totalRows: 4,
    },
    schema: {
      schemaVersion: "1.0.0",
      extractVersion: "1.0.0",
      dictionaryVersion: "1.0.0",
      importerVersion: "1.0.0",
    },
    tables: [
      {
        name: "CLIENTES",
        rows: [
          { id: 1, nome: "João Silva", email: "joao@test.com", telefone: "(11) 99999-8888" },
          { id: 2, nome: "Maria Souza", email: null, telefone: "+55 11 91234-5678" },
        ],
        statistics: {
          rowCount: 2,
          columns: ["id", "nome", "email", "telefone"],
          nullPercentage: { id: 0, nome: 0, email: 50, telefone: 0 },
        },
      },
      {
        name: "OS",
        rows: [
          { id: 1, cliente_id: 1, status: "0", data_entrada: "2024-01-15" },
          { id: 2, cliente_id: 2, status: "6", data_entrada: "2024-02-01" },
        ],
        statistics: {
          rowCount: 2,
          columns: ["id", "cliente_id", "status", "data_entrada"],
          nullPercentage: { id: 0, cliente_id: 0, status: 0, data_entrada: 0 },
        },
      },
    ],
    checksums: {
      mdbSha256: "a".repeat(64),
      perTable: { CLIENTES: "b".repeat(64), OS: "c".repeat(64) },
    },
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

function makeDictionary(overrides?: Partial<DictionaryVersion>): DictionaryVersion {
  return {
    version: "1.0.0",
    description: "Test dictionary",
    entities: {
      Client: {
        name: "Client",
        sourceTable: "CLIENTES",
        fields: {
          legacyId: { source: "id" },
          name: { source: "nome", transform: "trim" },
          email: { source: "email" },
          phone: { source: "telefone", transform: "strip-non-digits" },
        },
      },
      OrdemServico: {
        name: "OrdemServico",
        sourceTable: "OS",
        fields: {
          legacyId: { source: "id" },
          clientLegacyId: { source: "cliente_id" },
          status: { source: "status", transform: "status-map" },
          entryDate: { source: "data_entrada", transform: "date-format" },
        },
      },
    },
    ...overrides,
  };
}

describe("Mapper", () => {
  let Mapper: Awaited<typeof import("../src/services/mapper.js")>["Mapper"];

  beforeEach(async () => {
    const mod = await import("../src/services/mapper.js");
    Mapper = mod.Mapper;
  });

  describe("constructor", () => {
    it("should create mapper with dictionary", () => {
      const m = new Mapper(makeDictionary());
      expect(m).toBeInstanceOf(Mapper);
    });

    it("should create mapper with empty dictionary", () => {
      const m = new Mapper({ version: "1.0.0", description: "empty", entities: {} });
      expect(m).toBeInstanceOf(Mapper);
    });
  });

  describe("field mapping", () => {
    it("should map fields according to dictionary", async () => {
      const m = new Mapper(makeDictionary());
      const result = await m.map(makeSnapshot(), makeContext());
      const clients = result.filter((r) => r.entity === "Client");
      expect(clients).toHaveLength(2);
      expect(clients[0].data).toMatchObject({
        legacyId: 1,
        name: "João Silva",
        email: "joao@test.com",
      });
    });

    it("should apply strip-non-digits transform", async () => {
      const m = new Mapper(makeDictionary());
      const result = await m.map(makeSnapshot(), makeContext());
      const clients = result.filter((r) => r.entity === "Client");
      expect(clients[0].data.phone).toBe("11999998888");
      expect(clients[1].data.phone).toBe("5511912345678");
    });
  });

  describe("status mapping", () => {
    it("should map OS status codes to MGV status", async () => {
      const m = new Mapper(makeDictionary());
      const result = await m.map(makeSnapshot(), makeContext());
      const ordens = result.filter((r) => r.entity === "OrdemServico");
      expect(ordens).toHaveLength(2);
      expect(ordens[0].data.status).toBe("ORCAMENTO");
      expect(ordens[1].data.status).toBe("EM_MANUTENCAO");
    });
  });

  describe("date formatting", () => {
    it("should format date fields", async () => {
      const m = new Mapper(makeDictionary());
      const result = await m.map(makeSnapshot(), makeContext());
      const ordens = result.filter((r) => r.entity === "OrdemServico");
      expect(ordens[0].data.entryDate).toBe("2024-01-15");
      expect(ordens[1].data.entryDate).toBe("2024-02-01");
    });
  });

  describe("legacy reference", () => {
    it("should include legacy reference in output", async () => {
      const m = new Mapper(makeDictionary());
      const result = await m.map(makeSnapshot(), makeContext());
      const client1 = result.find((r) => r.entity === "Client" && r.legacyRef.id === 1);
      expect(client1?.legacyRef).toMatchObject({
        table: "CLIENTES",
        id: 1,
      });
    });
  });

  describe("warnings", () => {
    it("should emit warning for unmapped table", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables.push({
        name: "UNKNOWN_TABLE",
        rows: [{ id: 1, desc: "test" }],
        statistics: {
          rowCount: 1,
          columns: ["id", "desc"],
          nullPercentage: { id: 0, desc: 0 },
        },
      });

      const m = new Mapper(makeDictionary());
      const result = await m.map(snapshot, makeContext());
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.warnings.length > 0)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty table", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [];

      const m = new Mapper(makeDictionary());
      const result = await m.map(snapshot, makeContext());
      const clients = result.filter((r) => r.entity === "Client");
      expect(clients).toHaveLength(0);
    });

    it("should handle non-existent source fields", async () => {
      const dict = makeDictionary();
      dict.entities.Client.fields.missingField = { source: "non_existent" };

      const m = new Mapper(dict);
      const result = await m.map(makeSnapshot(), makeContext());
      const client = result.find((r) => r.entity === "Client");
      expect(client?.data.missingField).toBeUndefined();
    });

    it("should handle empty dictionary", async () => {
      const m = new Mapper({ version: "1.0.0", description: "empty", entities: {} });
      const result = await m.map(makeSnapshot(), makeContext());
      expect(result).toHaveLength(0);
    });

    it("should handle null values in source data", async () => {
      const m = new Mapper(makeDictionary());
      const result = await m.map(makeSnapshot(), makeContext());
      const maria = result.find(
        (r) => r.entity === "Client" && r.legacyRef.id === 2,
      );
      expect(maria?.data.email).toBeNull();
    });
  });
});
