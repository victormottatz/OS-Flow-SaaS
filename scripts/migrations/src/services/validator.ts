import { RequiredFieldError, InvalidTypeError, ValidationError, MigrationError } from "../errors.js";
import type {
  SnapshotArtifact,
  PipelineContext,
  ValidationResult,
  ValidationRule,
  Warning,
} from "../types.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRequired(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function validateType(value: unknown, expected: string): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === expected;
}

function validateFormat(value: unknown, format: string): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;

  switch (format) {
    case "email":
      return EMAIL_REGEX.test(value);
    default:
      return true;
  }
}

function validateRange(value: unknown, min?: number, max?: number): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "number") return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function validateEnum(value: unknown, values: unknown[]): boolean {
  if (value === null || value === undefined) return true;
  return values.includes(value);
}

export class Validator {
  private rules: ValidationRule[];

  constructor(rules?: ValidationRule[]) {
    this.rules = rules ?? [];
  }

  async validate(
    snapshot: SnapshotArtifact,
    _context: PipelineContext,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: Warning[] = [];
    const stats: Record<string, { total: number; valid: number; invalid: number }> = {};

    const rulesByTable = new Map<string, ValidationRule[]>();
    for (const rule of this.rules) {
      const existing = rulesByTable.get(rule.table) ?? [];
      existing.push(rule);
      rulesByTable.set(rule.table, existing);
    }

    for (const table of snapshot.tables) {
      const tableRules = rulesByTable.get(table.name) ?? [];
      if (tableRules.length === 0) continue;

      const tableStats = { total: table.rows.length, valid: 0, invalid: 0 };

      for (const row of table.rows) {
        let rowValid = true;

        for (const rule of tableRules) {
          const value = row[rule.field];

          switch (rule.rule) {
            case "required": {
              if (!validateRequired(value)) {
                errors.push(new RequiredFieldError(table.name, rule.field));
                rowValid = false;
              }
              break;
            }

            case "type": {
              const expectedType = rule.params?.type as string | undefined;
              if (!expectedType) break;

              const typeRequired = rule.params?.required === true;
              if (typeRequired && !validateRequired(value)) {
                errors.push(
                  new RequiredFieldError(table.name, rule.field),
                );
                rowValid = false;
                break;
              }

              if (!validateType(value, expectedType)) {
                errors.push(
                  new InvalidTypeError(table.name, rule.field, expectedType, value),
                );
                rowValid = false;
              }
              break;
            }

            case "format": {
              const format = rule.params?.format as string | undefined;
              if (!format) break;

              if (!validateFormat(value, format)) {
                errors.push(
                  new ValidationError(
                    "INVALID_FORMAT",
                    `Field '${rule.field}' in table '${table.name}' has invalid format: expected ${format}`,
                    table.name,
                    undefined,
                    { field: rule.field, format, value },
                  ),
                );
                rowValid = false;
              }
              break;
            }

            case "range": {
              const min = rule.params?.min as number | undefined;
              const max = rule.params?.max as number | undefined;
              if (min === undefined && max === undefined) break;

              if (!validateRange(value, min, max)) {
                const rangeStr =
                  min !== undefined && max !== undefined
                    ? `[${min}, ${max}]`
                    : min !== undefined
                      ? `>= ${min}`
                      : `<= ${max}`;
                errors.push(
                  new ValidationError(
                    "OUT_OF_RANGE",
                    `Field '${rule.field}' in table '${table.name}' is out of range ${rangeStr}: ${String(value)}`,
                    table.name,
                    undefined,
                    { field: rule.field, min, max, value },
                  ),
                );
                rowValid = false;
              }
              break;
            }

            case "enum": {
              const values = rule.params?.values as unknown[] | undefined;
              if (!values || values.length === 0) break;

              if (!validateEnum(value, values)) {
                errors.push(
                  new ValidationError(
                    "NOT_IN_ENUM",
                    `Field '${rule.field}' in table '${table.name}' has value not in allowed set: ${String(value)}`,
                    table.name,
                    undefined,
                    { field: rule.field, allowedValues: values, value },
                  ),
                );
                rowValid = false;
              }
              break;
            }
          }
        }

        if (rowValid) {
          tableStats.valid++;
        } else {
          tableStats.invalid++;
        }
      }

      stats[table.name] = tableStats;
    }

    return {
      valid: errors.length === 0,
      errors: errors.map((e) => (e instanceof MigrationError ? e.toPipelineError() : e)),
      warnings,
      stats,
    };
  }
}
