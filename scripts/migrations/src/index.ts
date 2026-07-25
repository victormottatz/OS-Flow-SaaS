// ============================================================================
// SH Oficina → MGV Migration Pipeline — Barrel Export
// ============================================================================

// Types
export type {
  PipelinePhase,
  ErrorCategory,
  MigrationStage,
  PipelineMode,
  DryRunMode,
  Severity,
  Warning,
  PipelineError,
  SchemaVersion,
  SnapshotMetadata,
  Checksums,
  TableStatistics,
  SnapshotTable,
  SnapshotArtifact,
  PipelineContext,
  DictionaryField,
  DictionaryEntity,
  DictionaryVersion,
  MdbTable,
  MdbReadResult,
  WriteResult,
  MigrationRunSummary,
  ValidationRule,
  ValidationResult,
  NormalizationRule,
  MappingInput,
  MappingOutput,
} from "./types.js";

// Errors
export {
  MigrationError,
  SourceError,
  MdbReadError,
  MdbHashMismatchError,
  ValidationError,
  RequiredFieldError,
  InvalidTypeError,
  NormalizationError,
  MappingError,
  PersistenceError,
  SystemError,
} from "./errors.js";

// Constants
export {
  PIPELINE_CONTRACT_VERSION,
  IMPORTER_VERSION,
  DICTIONARY_VERSION,
  SCHEMA_VERSION,
  EXTRACT_VERSION,
  BATCH_SIZE,
  OS_STATUS_MAP,
  MDB_TABLES,
  MDB_TABLES_TO_IMPORT,
  ENTITY_NAMES,
} from "./constants.js";

// Services
export { PersistenceAdapter } from "./services/persistence-adapter.js";
export type { IDatabaseClient, IDbTransaction } from "./services/persistence-adapter.js";
export { Orchestrator } from "./services/orchestrator.js";
