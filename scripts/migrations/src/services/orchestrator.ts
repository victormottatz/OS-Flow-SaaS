import { randomUUID } from "node:crypto";
import type {
  IOrchestrator,
  OrchestratorOptions,
  IMdbReader,
  ISnapshotService,
  IValidator,
  INormalizer,
  IMapper,
  IPersistenceAdapter,
} from "../interfaces.js";
import type {
  PipelineContext,
  SnapshotArtifact,
  MigrationRunSummary,
  PipelinePhase,
  MappingOutput,
  Warning,
  PipelineError,
} from "../types.js";
import {
  SCHEMA_VERSION,
  EXTRACT_VERSION,
  DICTIONARY_VERSION,
  IMPORTER_VERSION,
} from "../constants.js";

export class Orchestrator implements IOrchestrator {
  constructor(
    private readonly reader: IMdbReader,
    private readonly snapshotService: ISnapshotService,
    private readonly validator: IValidator,
    private readonly normalizer: INormalizer,
    private readonly mapper: IMapper,
    private readonly persistence: IPersistenceAdapter,
  ) {}

  async run(options: OrchestratorOptions): Promise<MigrationRunSummary> {
    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const warnings: Warning[] = [];
    const errors: PipelineError[] = [];

    let currentPhase: PipelinePhase = "EXTRACT";
    let snapshot: SnapshotArtifact | null = null;
    let mappings: MappingOutput[] = [];

    try {
      if (options.mode === "extract") {
        currentPhase = "EXTRACT";
        const readResult = await this.reader.read(options.mdbPath, {
          tables: options.tables,
        });

        const context = this.makeContext(runId, options, warnings, errors, startedAt);
        snapshot = await this.snapshotService.create(readResult, context);
        await this.snapshotService.save(snapshot);
      } else if (options.mode === "transform") {
        currentPhase = "EXTRACT";
        if (!options.snapshotPath) {
          throw new Error("snapshotPath is required for transform mode");
        }
        snapshot = await this.snapshotService.load(options.snapshotPath);
        if (!snapshot) {
          throw new Error(`Snapshot not found at ${options.snapshotPath}`);
        }
      } else {
        currentPhase = "PERSIST";
        return {
          runId,
          status: "SUCCESS",
          phase: "PERSIST",
          startedAt,
          finishedAt: new Date().toISOString(),
          totalRecords: 0,
          createdRecords: 0,
          updatedRecords: 0,
          skippedRecords: 0,
          errorCount: 0,
          warningCount: 0,
          warnings: [],
          errors: [],
          checksums: { mdbSha256: "", perTable: {} },
        };
      }

      if (!snapshot) throw new Error("No snapshot available");

      currentPhase = "VALIDATE";
      const context = this.makeContext(runId, options, warnings, errors, startedAt);
      const validation = await this.validator.validate(snapshot, context);
      warnings.push(...validation.warnings);
      errors.push(...validation.errors);

      if (!validation.valid) {
        return this.failure(runId, startedAt, "VALIDATE", warnings, errors, snapshot.checksums);
      }

      currentPhase = "NORMALIZE";
      const normalized = await this.normalizer.normalize(snapshot, validation, context);

      currentPhase = "MAP";
      mappings = await this.mapper.map(normalized, context);
      for (const m of mappings) {
        warnings.push(...m.warnings);
      }

      if (options.dryRun) {
        return {
          runId,
          status: "SUCCESS",
          phase: "MAP",
          startedAt,
          finishedAt: new Date().toISOString(),
          totalRecords: mappings.length,
          createdRecords: 0,
          updatedRecords: 0,
          skippedRecords: 0,
          errorCount: errors.length,
          warningCount: warnings.length,
          warnings,
          errors,
          checksums: snapshot.checksums,
        };
      }

      currentPhase = "PERSIST";
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

      const entityGroups = new Map<string, Array<Record<string, unknown>>>();
      for (const mapping of mappings) {
        const group = entityGroups.get(mapping.entity);
        if (group) {
          group.push(mapping.data);
        } else {
          entityGroups.set(mapping.entity, [mapping.data]);
        }
      }

      for (const [entity, records] of entityGroups) {
        const result = await this.persistence.bulkInsert(entity, records);
        totalCreated += result.created;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
        errors.push(...result.errors);
      }

      return {
        runId,
        status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
        phase: "PERSIST",
        startedAt,
        finishedAt: new Date().toISOString(),
        totalRecords: mappings.length,
        createdRecords: totalCreated,
        updatedRecords: totalUpdated,
        skippedRecords: totalSkipped,
        errorCount: errors.length,
        warningCount: warnings.length,
        warnings,
        errors,
        checksums: snapshot.checksums,
      };
    } catch (err) {
      return {
        runId,
        status: "FAILED",
        phase: currentPhase,
        startedAt,
        finishedAt: new Date().toISOString(),
        totalRecords: 0,
        createdRecords: 0,
        updatedRecords: 0,
        skippedRecords: 0,
        errorCount: 1,
        warningCount: warnings.length,
        warnings,
        errors: [
          {
            category: "SYSTEM_ERROR",
            code: "PIPELINE_ERROR",
            message: err instanceof Error ? err.message : String(err),
            phase: currentPhase,
            recoverable: false,
          },
        ],
        checksums: snapshot?.checksums ?? { mdbSha256: "", perTable: {} },
      };
    }
  }

  private makeContext(
    runId: string,
    options: OrchestratorOptions,
    warnings: Warning[],
    errors: PipelineError[],
    startedAt: string,
  ): PipelineContext {
    return {
      runId,
      mode: options.mode,
      dryRun: options.dryRun,
      snapshotPath: options.snapshotPath,
      mdbPath: options.mdbPath,
      dictionaryVersion: options.dictionaryVersion ?? DICTIONARY_VERSION,
      warnings,
      errors,
      startedAt,
      metadata: {
        schemaVersion: SCHEMA_VERSION,
        extractVersion: EXTRACT_VERSION,
        dictionaryVersion: DICTIONARY_VERSION,
        importerVersion: IMPORTER_VERSION,
      },
      clientMappings: options.clientMappings,
      deviceMappings: options.deviceMappings,
      existingOsNumbers: options.existingOsNumbers,
    };
  }

  private failure(
    runId: string,
    startedAt: string,
    phase: PipelinePhase,
    warnings: Warning[],
    errors: PipelineError[],
    checksums: { mdbSha256: string; perTable: Record<string, string> },
  ): MigrationRunSummary {
    return {
      runId,
      status: "FAILED",
      phase,
      startedAt,
      finishedAt: new Date().toISOString(),
      totalRecords: 0,
      createdRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      warnings,
      errors,
      checksums,
    };
  }
}
