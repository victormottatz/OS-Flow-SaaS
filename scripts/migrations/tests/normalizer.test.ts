import { describe, it, expect, beforeEach } from "vitest";
import type { SnapshotArtifact, PipelineContext, NormalizationRule, ValidationResult } from "../src/types.js";

function makeSnapshot(overrides?: Partial<SnapshotArtifact>): SnapshotArtifact {
  return {
    metadata: {
      mdbPath: "/data/test.mdb",
      mdbHash: "a".repeat(64),
      mdbSizeBytes: 1024,
      extractedAt: "2026-07-20T10:00:00.000Z",
      totalTables: 1,
      totalRows: 3,
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
          { id: 1, nome: "  João  ", email: "JOÃO@TEST.COM", idade: 30 },
          { id: 2, nome: "maria", email: null, idade: null },
          { id: 3, nome: "  Carlos  ", email: "carlos@test.com", idade: 25 },
        ],
        statistics: {
          rowCount: 3,
          columns: ["id", "nome", "email", "idade"],
          nullPercentage: { id: 0, nome: 0, email: 33.33, idade: 33.33 },
        },
      },
    ],
    checksums: { mdbSha256: "a".repeat(64), perTable: { CLIENTES: "existing-hash" } },
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

function makeValidation(overrides?: Partial<ValidationResult>): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    stats: {},
    ...overrides,
  };
}

describe("Normalizer", () => {
  let Normalizer: Awaited<typeof import("../src/services/normalizer.js")>["Normalizer"];

  beforeEach(async () => {
    const mod = await import("../src/services/normalizer.js");
    Normalizer = mod.Normalizer;
  });

  describe("constructor", () => {
    it("should create normalizer without rules", () => {
      const n = new Normalizer();
      expect(n).toBeInstanceOf(Normalizer);
    });

    it("should create normalizer with rules", () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      expect(n).toBeInstanceOf(Normalizer);
    });
  });

  describe("trim transform", () => {
    it("should trim whitespace from string fields", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].nome).toBe("João");
      expect(result.tables[0].rows[1].nome).toBe("maria");
      expect(result.tables[0].rows[2].nome).toBe("Carlos");
    });

    it("should handle null values in trim (no-op)", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "email", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[1].email).toBeNull();
    });
  });

  describe("lowercase transform", () => {
    it("should convert string field to lowercase", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "email", transform: "lowercase" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].email).toBe("joão@test.com");
      expect(result.tables[0].rows[2].email).toBe("carlos@test.com");
    });

    it("should handle null values in lowercase (no-op)", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "email", transform: "lowercase" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[1].email).toBeNull();
    });
  });

  describe("uppercase transform", () => {
    it("should convert string field to uppercase", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "uppercase" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].nome).toBe("  JOÃO  ");
      expect(result.tables[0].rows[1].nome).toBe("MARIA");
    });
  });

  describe("default-value transform", () => {
    it("should replace null with specified default", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "idade", transform: "default-value", params: { default: 0 } },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].idade).toBe(30);
      expect(result.tables[0].rows[1].idade).toBe(0);
      expect(result.tables[0].rows[2].idade).toBe(25);
    });

    it("should not replace existing non-null values", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "default-value", params: { default: "DEFAULT" } },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].nome).toBe("  João  ");
      expect(result.tables[0].rows[1].nome).toBe("maria");
    });
  });

  describe("strip-non-digits transform", () => {
    it("should remove non-digit characters from string fields", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [
        { id: 1, telefone: "(11) 99999-8888" },
        { id: 2, telefone: "+55 11 91234-5678" },
        { id: 3, telefone: null },
      ];
      snapshot.tables[0].statistics.columns = ["id", "telefone"];

      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "telefone", transform: "strip-non-digits" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows[0].telefone).toBe("11999998888");
      expect(result.tables[0].rows[1].telefone).toBe("5511912345678");
      expect(result.tables[0].rows[2].telefone).toBeNull();
    });

    it("should convert number values to string then strip", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [{ id: 1, cpf: 12345678901 }];
      snapshot.tables[0].statistics.columns = ["id", "cpf"];

      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "cpf", transform: "strip-non-digits" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows[0].cpf).toBe("12345678901");
    });
  });

  describe("date-format transform", () => {
    it("should normalize ISO date strings", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [
        { id: 1, data: "2024-01-15" },
        { id: 2, data: "2024-12-01" },
      ];
      snapshot.tables[0].statistics.columns = ["id", "data"];

      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "data", transform: "date-format" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows[0].data).toBe("2024-01-15");
      expect(result.tables[0].rows[1].data).toBe("2024-12-01");
    });

    it("should handle null values in date-format (no-op)", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [{ id: 1, data: null }];
      snapshot.tables[0].statistics.columns = ["id", "data"];

      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "data", transform: "date-format" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows[0].data).toBeNull();
    });
  });

  describe("multiple transforms", () => {
    it("should apply multiple rules on same table", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
        { table: "CLIENTES", field: "nome", transform: "uppercase" },
        { table: "CLIENTES", field: "email", transform: "lowercase" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].nome).toBe("JOÃO");
      expect(result.tables[0].rows[0].email).toBe("joão@test.com");
    });

    it("should apply rules across multiple tables", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables.push({
        name: "EQUIPAMENTOS",
        rows: [
          { id: 1, descricao: "  Notebook  " },
          { id: 2, descricao: "  Mouse  " },
        ],
        statistics: {
          rowCount: 2,
          columns: ["id", "descricao"],
          nullPercentage: { id: 0, descricao: 0 },
        },
      });

      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
        { table: "EQUIPAMENTOS", field: "descricao", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows[0].nome).toBe("João");
      expect(result.tables[1].rows[0].descricao).toBe("Notebook");
      expect(result.tables[1].rows[1].descricao).toBe("Mouse");
    });
  });

  describe("edge cases", () => {
    it("should handle non-existent table gracefully", async () => {
      const rules: NormalizationRule[] = [
        { table: "NONEXISTENT", field: "nome", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables).toHaveLength(1);
    });

    it("should handle empty table gracefully", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [];
      const n = new Normalizer(rules);
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows).toHaveLength(0);
    });

    it("should preserve unmodified tables", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].rows[0].id).toBe(1);
      expect(result.tables[0].rows[0].idade).toBe(30);
    });

    it("should recalculate statistics after normalization", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "idade", transform: "default-value", params: { default: 0 } },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.tables[0].statistics.nullPercentage.idade).toBe(0);
    });

    it("should recalculate checksums after normalization", async () => {
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      const result = await n.normalize(makeSnapshot(), makeValidation(), makeContext());
      expect(result.checksums.perTable.CLIENTES).not.toBe("existing-hash");
      expect(result.checksums.perTable.CLIENTES).toHaveLength(64);
    });

    it("should not mutate the original snapshot", async () => {
      const snapshot = makeSnapshot();
      const rules: NormalizationRule[] = [
        { table: "CLIENTES", field: "nome", transform: "trim" },
      ];
      const n = new Normalizer(rules);
      await n.normalize(snapshot, makeValidation(), makeContext());
      expect(snapshot.tables[0].rows[0].nome).toBe("  João  ");
    });

    it("should handle empty rules list (passthrough)", async () => {
      const n = new Normalizer();
      const snapshot = makeSnapshot();
      const result = await n.normalize(snapshot, makeValidation(), makeContext());
      expect(result.tables[0].rows[0].nome).toBe("  João  ");
      expect(result.checksums.perTable.CLIENTES).toBe("existing-hash");
    });
  });
});
