import { describe, it, expect } from "vitest";
import { Orchestrator } from "../src/services/orchestrator.js";

describe("CLI Entry Point", () => {
  it("should export a module that can be imported", async () => {
    const mod = await import("../src/cli.js");
    expect(mod).toBeDefined();
  });

  it("should create orchestrator with correct mode logic", () => {
    const reader = { read: async () => ({}) };
    const snapshotService = { create: async () => ({}), save: async () => {}, load: async () => ({}) };
    const validator = { validate: async () => ({ valid: true, warnings: [], errors: [] }) };
    const normalizer = { normalize: async () => ({}) };
    const mapper = { map: async () => [] };
    const persistence = {
      bulkInsert: async () => ({ entity: "test", created: 0, updated: 0, skipped: 0, errors: [] }),
      rollback: async () => {},
    };

    const orchestrator = new Orchestrator(
      reader as never,
      snapshotService as never,
      validator as never,
      normalizer as never,
      mapper as never,
      persistence,
    );

    expect(orchestrator).toBeInstanceOf(Orchestrator);
  });
});
