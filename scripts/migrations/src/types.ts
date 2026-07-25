// ============================================================================
// SH Oficina → MGV Migration Pipeline — Core Types
// Baseline Arquitetural v1.0.0
// PIPELINE_CONTRACT_VERSION = "1.0.0"
// ============================================================================

// --- Pipeline Phases ---
export type PipelinePhase =
  | "EXTRACT"
  | "VALIDATE"
  | "NORMALIZE"
  | "MAP"
  | "PERSIST";

// --- Error Taxonomy ---
export type ErrorCategory =
  | "SOURCE_ERROR"
  | "VALIDATION_ERROR"
  | "NORMALIZATION_ERROR"
  | "MAPPING_ERROR"
  | "PERSISTENCE_ERROR"
  | "SYSTEM_ERROR";

// --- Migration Log Stages ---
export type MigrationStage =
  | "READ"
  | "VALIDATED"
  | "NORMALIZED"
  | "MAPPED"
  | "PERSISTED";

// --- Pipeline Modes ---
export type PipelineMode = "extract" | "transform" | "load";

// --- Dry-Run Modes ---
export type DryRunMode = "full" | "partial" | "targeted";

// --- Severity ---
export type Severity = "ERROR" | "WARNING" | "INFO";

// --- Warning ---
export interface Warning {
  code: string;
  message: string;
  table?: string;
  rowId?: string | number;
  phase: PipelinePhase;
}

// --- Pipeline Error ---
export interface PipelineError {
  category: ErrorCategory;
  code: string;
  message: string;
  table?: string;
  rowId?: string | number;
  phase: PipelinePhase;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// --- Snapshot Types ---
export interface SchemaVersion {
  schemaVersion: string;
  extractVersion: string;
  dictionaryVersion: string;
  importerVersion: string;
}

export interface SnapshotMetadata {
  mdbPath: string;
  mdbHash: string;
  mdbSizeBytes: number;
  extractedAt: string;
  totalTables: number;
  totalRows: number;
}

export interface Checksums {
  mdbSha256: string;
  perTable: Record<string, string>;
}

export interface TableStatistics {
  rowCount: number;
  columns: string[];
  nullPercentage: Record<string, number>;
}

export interface SnapshotTable {
  name: string;
  rows: Record<string, unknown>[];
  statistics: TableStatistics;
}

export interface SnapshotArtifact {
  metadata: SnapshotMetadata;
  schema: SchemaVersion;
  tables: SnapshotTable[];
  checksums: Checksums;
}

// --- Pipeline Context ---
export interface PipelineContext {
  runId: string;
  mode: PipelineMode;
  dryRun?: DryRunMode;
  snapshotPath?: string;
  mdbPath: string;
  dictionaryVersion: string;
  warnings: Warning[];
  errors: PipelineError[];
  startedAt: string;
  metadata: SchemaVersion;
  clientMappings?: Map<string, string>;
  deviceMappings?: Map<string, string>;
  existingOsNumbers?: Set<string>;
}

// --- Dictionary Types ---
export interface DictionaryField {
  source: string;
  transform?: string;
  defaultValue?: unknown;
  description?: string;
}

export interface DictionaryEntity {
  name: string;
  sourceTable: string;
  fields: Record<string, DictionaryField>;
}

export interface DictionaryVersion {
  version: string;
  description: string;
  entities: Record<string, DictionaryEntity>;
}

// --- Reader Types ---
export interface MdbTable {
  name: string;
  rows: Record<string, unknown>[];
}

export interface MdbReadResult {
  tables: MdbTable[];
  hash: string;
  sizeBytes: number;
  extractedAt: string;
}

// --- Writer Types ---
export interface WriteResult {
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  errors: PipelineError[];
}

export interface MigrationRunSummary {
  runId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  phase: PipelinePhase;
  startedAt: string;
  finishedAt?: string;
  totalRecords: number;
  createdRecords: number;
  updatedRecords: number;
  skippedRecords: number;
  errorCount: number;
  warningCount: number;
  warnings: Warning[];
  errors: PipelineError[];
  checksums: Checksums;
}

// --- Validator Types ---
export interface ValidationRule {
  table: string;
  field: string;
  rule: "required" | "type" | "format" | "range" | "enum" | "custom";
  params?: Record<string, unknown>;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: PipelineError[];
  warnings: Warning[];
  stats: Record<string, { total: number; valid: number; invalid: number }>;
}

// --- Normalizer Types ---
export interface NormalizationRule {
  table: string;
  field: string;
  transform: string;
  params?: Record<string, unknown>;
}

// --- Mapper Types ---
export interface MappingInput {
  table: string;
  row: Record<string, unknown>;
  context: PipelineContext;
}

export interface MappingOutput {
  entity: string;
  data: Record<string, unknown>;
  legacyRef: {
    table: string;
    id: string | number;
    version: string;
  };
  warnings: Warning[];
}
