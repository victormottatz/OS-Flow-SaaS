// ============================================================================
// SH Oficina → MGV Migration Pipeline — Contract Interfaces
// PIPELINE_CONTRACT_VERSION = "1.0.0"
// ============================================================================
//
// Este arquivo define o contrato público entre módulos do pipeline.
// Alterações aqui requerem nova versão do contrato e novo ADR.

import type {
  PipelineContext,
  PipelineMode,
  DryRunMode,
  SnapshotArtifact,
  ValidationResult,
  MappingOutput,
  MigrationRunSummary,
  MdbReadResult,
  PipelineError,
  Warning,
} from "./types.js";

// --- Version ---
export const PIPELINE_CONTRACT_VERSION = "1.0.0" as const;

// ============================================================================
// MdbReader
// ============================================================================
export interface MdbReaderOptions {
  tables?: string[];
  batchSize?: number;
  password?: string;
}

export interface IMdbReader {
  read(mdbPath: string, options?: MdbReaderOptions): Promise<MdbReadResult>;
}

// ============================================================================
// SnapshotService
// ============================================================================
export interface ISnapshotService {
  create(mdbResult: MdbReadResult, context: PipelineContext): Promise<SnapshotArtifact>;
  load(path: string): Promise<SnapshotArtifact>;
  save(snapshot: SnapshotArtifact, dir?: string): Promise<string>;
}

// ============================================================================
// Validator
// ============================================================================
export interface IValidator {
  validate(snapshot: SnapshotArtifact, context: PipelineContext): Promise<ValidationResult>;
}

// ============================================================================
// Normalizer
// ============================================================================
export interface INormalizer {
  normalize(
    snapshot: SnapshotArtifact,
    validation: ValidationResult,
    context: PipelineContext,
  ): Promise<SnapshotArtifact>;
}

// ============================================================================
// Mapper
// ============================================================================
export interface IMapper {
  map(snapshot: SnapshotArtifact, context: PipelineContext): Promise<MappingOutput[]>;
}

// ============================================================================
// Persistence Adapter
// ============================================================================
export interface PersistenceWriteResult {
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  errors: PipelineError[];
}

export interface IPersistenceAdapter {
  bulkInsert(
    table: string,
    records: Record<string, unknown>[],
    batchSize?: number,
  ): Promise<PersistenceWriteResult>;

  rollback(
    strategy: "soft" | "hard" | "compensating",
    runId: string,
  ): Promise<void>;
}

// ============================================================================
// MigrationRunService
// ============================================================================
export interface MigrationRunInput {
  mdbHash: string;
  mdbSizeBytes: number;
  extractVersion: string;
  dictionaryVersion: string;
  importerVersion: string;
}

export interface IMigrationRunService {
  create(data: MigrationRunInput): Promise<{ id: string; [key: string]: unknown }>;
  update(id: string, data: Record<string, unknown>): Promise<void>;
  getById(id: string): Promise<Record<string, unknown> | null>;
}

// ============================================================================
// MigrationLogService
// ============================================================================
export interface MigrationLogInput {
  migrationRunId: string;
  phase: string;
  status: string;
  recordsProcessed?: number;
  errors?: PipelineError[];
  warnings?: Warning[];
}

export interface IMigrationLogService {
  create(data: MigrationLogInput): Promise<{ id: string }>;
  createBatch(data: MigrationLogInput[]): Promise<{ id: string }[]>;
}

// ============================================================================
// MigrationMappingService
// ============================================================================
export interface MigrationMappingInput {
  migrationRunId: string;
  sourceTable: string;
  sourceId: string;
  version: number;
  row: Record<string, unknown>;
  targetTable?: string;
  targetId?: string;
}

export interface IMigrationMappingService {
  create(data: MigrationMappingInput): Promise<{ id: string }>;
  createBatch(data: MigrationMappingInput[]): Promise<{ id: string }[]>;
}

// ============================================================================
// EntityWriter
// ============================================================================
export interface IEntityWriter {
  write(
    mappings: MappingOutput[],
    context: PipelineContext,
  ): Promise<MigrationRunSummary>;
}

// ============================================================================
// Orchestrator
// ============================================================================
export interface OrchestratorOptions {
  mdbPath: string;
  mode: PipelineMode;
  dryRun?: DryRunMode;
  snapshotPath?: string;
  tables?: string[];
  dictionaryVersion?: string;
  verbose?: boolean;
  clientMappings?: Map<string, string>;
  deviceMappings?: Map<string, string>;
}

export interface IOrchestrator {
  run(options: OrchestratorOptions): Promise<MigrationRunSummary>;
}

// ============================================================================
// Dictionary Service
// ============================================================================
export interface IDictionaryService {
  load(version?: string): Promise<Record<string, unknown>>;
  getFieldTransform(
    sourceTable: string,
    sourceField: string,
  ): ((value: unknown) => unknown) | undefined;
}
