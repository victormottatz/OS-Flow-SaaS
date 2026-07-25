// ============================================================================
// SH Oficina → MGV Migration Pipeline — Error Classes
// ============================================================================

import type {
  ErrorCategory,
  PipelineError,
  PipelinePhase,
} from "./types.js";

// --- Base Pipeline Error ---
export class MigrationError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly phase: PipelinePhase;
  public readonly recoverable: boolean;
  public readonly table?: string;
  public readonly rowId?: string | number;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    category: ErrorCategory;
    code: string;
    message: string;
    phase: PipelinePhase;
    recoverable?: boolean;
    table?: string;
    rowId?: string | number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "MigrationError";
    this.category = params.category;
    this.code = params.code;
    this.phase = params.phase;
    this.recoverable = params.recoverable ?? true;
    this.table = params.table;
    this.rowId = params.rowId;
    this.details = params.details;
  }

  toPipelineError(): PipelineError {
    return {
      category: this.category,
      code: this.code,
      message: this.message,
      phase: this.phase,
      recoverable: this.recoverable,
      table: this.table,
      rowId: this.rowId,
      details: this.details,
    };
  }
}

// --- Source Errors ---
export class SourceError extends MigrationError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super({
      category: "SOURCE_ERROR",
      code,
      message,
      phase: "EXTRACT",
      recoverable: false,
      details,
    });
    this.name = "SourceError";
  }
}

export class MdbReadError extends SourceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("MDB_READ_FAILED", message, details);
    this.name = "MdbReadError";
  }
}

export class MdbHashMismatchError extends SourceError {
  constructor(expected: string, actual: string) {
    super("MDB_HASH_MISMATCH", `Hash mismatch: expected ${expected}, got ${actual}`, {
      expected,
      actual,
    });
    this.name = "MdbHashMismatchError";
  }
}

// --- Validation Errors ---
export class ValidationError extends MigrationError {
  constructor(
    code: string,
    message: string,
    table?: string,
    rowId?: string | number,
    details?: Record<string, unknown>,
  ) {
    super({
      category: "VALIDATION_ERROR",
      code,
      message,
      phase: "VALIDATE",
      recoverable: true,
      table,
      rowId,
      details,
    });
    this.name = "ValidationError";
  }
}

export class RequiredFieldError extends ValidationError {
  constructor(table: string, field: string, rowId?: string | number) {
    super(
      "REQUIRED_FIELD_MISSING",
      `Required field '${field}' is missing or empty in table '${table}'`,
      table,
      rowId,
      { field },
    );
    this.name = "RequiredFieldError";
  }
}

export class InvalidTypeError extends ValidationError {
  constructor(
    table: string,
    field: string,
    expectedType: string,
    actualValue: unknown,
    rowId?: string | number,
  ) {
    super(
      "INVALID_TYPE",
      `Field '${field}' in table '${table}' expected ${expectedType}, got ${typeof actualValue}: ${String(actualValue)}`,
      table,
      rowId,
      { field, expectedType, actualValue },
    );
    this.name = "InvalidTypeError";
  }
}

// --- Normalization Errors ---
export class NormalizationError extends MigrationError {
  constructor(
    code: string,
    message: string,
    table?: string,
    rowId?: string | number,
    details?: Record<string, unknown>,
  ) {
    super({
      category: "NORMALIZATION_ERROR",
      code,
      message,
      phase: "NORMALIZE",
      recoverable: true,
      table,
      rowId,
      details,
    });
    this.name = "NormalizationError";
  }
}

// --- Mapping Errors ---
export class MappingError extends MigrationError {
  constructor(
    code: string,
    message: string,
    table?: string,
    rowId?: string | number,
    details?: Record<string, unknown>,
  ) {
    super({
      category: "MAPPING_ERROR",
      code,
      message,
      phase: "MAP",
      recoverable: true,
      table,
      rowId,
      details,
    });
    this.name = "MappingError";
  }
}

// --- Persistence Errors ---
export class PersistenceError extends MigrationError {
  constructor(
    code: string,
    message: string,
    table?: string,
    rowId?: string | number,
    details?: Record<string, unknown>,
  ) {
    super({
      category: "PERSISTENCE_ERROR",
      code,
      message,
      phase: "PERSIST",
      recoverable: false,
      table,
      rowId,
      details,
    });
    this.name = "PersistenceError";
  }
}

// --- System Errors ---
export class SystemError extends MigrationError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super({
      category: "SYSTEM_ERROR",
      code,
      message,
      phase: "EXTRACT",
      recoverable: false,
      details,
    });
    this.name = "SystemError";
  }
}
