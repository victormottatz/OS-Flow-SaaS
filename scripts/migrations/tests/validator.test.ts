import { describe, it, expect, beforeEach } from "vitest";
import type { SnapshotArtifact, PipelineContext, ValidationRule } from "../src/types.js";
import { RequiredFieldError, InvalidTypeError } from "../src/errors.js";

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
          { id: 1, nome: "João", email: "joao@test.com", idade: 30 },
          { id: 2, nome: "Maria", email: "maria@test.com", idade: null },
          { id: 3, nome: "Carlos", email: null, idade: 25 },
        ],
        statistics: {
          rowCount: 3,
          columns: ["id", "nome", "email", "idade"],
          nullPercentage: { id: 0, nome: 0, email: 33.33, idade: 33.33 },
        },
      },
    ],
    checksums: { mdbSha256: "a".repeat(64), perTable: { CLIENTES: "b".repeat(64) } },
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

describe("Validator", () => {
  let Validator: Awaited<typeof import("../src/services/validator.js")>["Validator"];
  let validator: InstanceType<Awaited<typeof import("../src/services/validator.js")>["Validator"]>;

  beforeEach(async () => {
    const mod = await import("../src/services/validator.js");
    Validator = mod.Validator;
  });

  describe("constructor", () => {
    it("should create validator without rules", () => {
      const v = new Validator();
      expect(v).toBeInstanceOf(Validator);
    });

    it("should create validator with rules", () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "nome", rule: "required" },
      ];
      const v = new Validator(rules);
      expect(v).toBeInstanceOf(Validator);
    });
  });

  describe("required rule", () => {
    it("should pass when required fields are present", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "id", rule: "required" },
        { table: "CLIENTES", field: "nome", rule: "required" },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when required field has null values", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "nome", rule: "required" },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows[1].nome = null;

      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatchObject({
        code: "REQUIRED_FIELD_MISSING",
        table: "CLIENTES",
      });
    });

    it("should track per-table stats", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "nome", rule: "required" },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows[1].nome = null;

      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.stats.CLIENTES).toBeDefined();
      expect(result.stats.CLIENTES.total).toBe(3);
      expect(result.stats.CLIENTES.invalid).toBe(1);
      expect(result.stats.CLIENTES.valid).toBe(2);
    });

    it("should handle empty table gracefully", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "nome", rule: "required" },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [];

      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(true);
      expect(result.stats.CLIENTES.total).toBe(0);
    });
  });

  describe("type rule", () => {
    it("should pass when fields have correct types", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "id", rule: "type", params: { type: "number" } },
        { table: "CLIENTES", field: "email", rule: "type", params: { type: "string" } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(true);
    });

    it("should fail when field has wrong type", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "idade", rule: "type", params: { type: "number" } },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows[0].idade = "trinta";

      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should allow null values for nullable type fields", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "idade", rule: "type", params: { type: "number" } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      // idade has null in row index 1 which should be allowed (nullable)
      expect(result.valid).toBe(true);
    });

    it("should reject null values for required type fields", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "idade", rule: "type", params: { type: "number", required: true } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(false);
    });
  });

  describe("format rule", () => {
    it("should validate email format", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "email", rule: "format", params: { format: "email" } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(true);
    });

    it("should fail on invalid email format", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "email", rule: "format", params: { format: "email" } },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows[0].email = "not-an-email";

      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(false);
    });
  });

  describe("range rule", () => {
    it("should pass when values are within range", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "idade", rule: "range", params: { min: 0, max: 150 } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(true);
    });

    it("should fail when values are outside range", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "idade", rule: "range", params: { min: 0, max: 120 } },
      ];
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows[0].idade = 200;

      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(false);
    });

    it("should pass null values in range check", async () => {
      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "idade", rule: "range", params: { min: 0, max: 120 } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(true);
    });
  });

  describe("enum rule", () => {
    it("should pass when values are in enum", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [
        { id: 1, status: "ATIVO" },
        { id: 2, status: "INATIVO" },
      ];
      snapshot.tables[0].statistics.columns = ["id", "status"];

      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "status", rule: "enum", params: { values: ["ATIVO", "INATIVO"] } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(true);
    });

    it("should fail when value is not in enum", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables[0].rows = [
        { id: 1, status: "BLOQUEADO" },
      ];
      snapshot.tables[0].statistics.columns = ["id", "status"];

      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "status", rule: "enum", params: { values: ["ATIVO", "INATIVO"] } },
      ];
      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());
      expect(result.valid).toBe(false);
    });
  });

  describe("multi-table rules", () => {
    it("should validate rules across multiple tables", async () => {
      const snapshot = makeSnapshot();
      snapshot.tables.push({
        name: "EQUIPAMENTOS",
        rows: [
          { id: 1, descricao: "Notebook", serial: "SN001" },
          { id: 2, descricao: null, serial: "SN002" },
        ],
        statistics: {
          rowCount: 2,
          columns: ["id", "descricao", "serial"],
          nullPercentage: { id: 0, descricao: 50, serial: 0 },
        },
      });

      const rules: ValidationRule[] = [
        { table: "CLIENTES", field: "id", rule: "required" },
        { table: "EQUIPAMENTOS", field: "descricao", rule: "required" },
      ];
      const v = new Validator(rules);
      const result = await v.validate(snapshot, makeContext());

      expect(result.valid).toBe(false);
      expect(result.stats.EQUIPAMENTOS).toBeDefined();
      expect(result.stats.CLIENTES).toBeDefined();
    });

    it("should handle rules for non-existent table", async () => {
      const rules: ValidationRule[] = [
        { table: "NONEXISTENT", field: "id", rule: "required" },
      ];
      const v = new Validator(rules);
      const result = await v.validate(makeSnapshot(), makeContext());
      expect(result.valid).toBe(true);
    });
  });
});
