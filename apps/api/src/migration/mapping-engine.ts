/**
 * mapping-engine.ts -- Pluggable Mapping DSL Engine (Phase 50)
 *
 * Applies field-level mappings with transforms and validation
 * to convert source data (CSV rows) into VistA-Evolved records.
 *
 * Design:
 *   - Pure functions, no side effects
 *   - Each transform is a simple string→string function
 *   - Validation uses regex patterns from the mapping config
 *   - Templates are composable: base template + per-job overrides
 */

import type {
  FieldMapping,
  FieldTransform,
  TransformFunction,
  MappingTemplate,
  ValidationIssue,
  ValidationResult,
  ValidationSeverity,
} from "./types.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Transform registry                                                  */
/* ------------------------------------------------------------------ */

type TransformFn = (value: string, args?: Record<string, string>) => string;

const TRANSFORMS: Record<TransformFunction, TransformFn> = {
  uppercase: (v) => v.toUpperCase(),
  lowercase: (v) => v.toLowerCase(),
  trim: (v) => v.trim(),

  "date-iso8601": (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toISOString();
  },
  "date-mmddyyyy": (v) => {
    // Parse MM/DD/YYYY or MM-DD-YYYY
    const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!m) return v;
    return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  },
  "date-yyyymmdd": (v) => {
    // Parse YYYYMMDD
    const m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) return v;
    return `${m[1]}-${m[2]}-${m[3]}`;
  },

  "split-first": (v, args) => {
    const sep = args?.separator ?? ",";
    return v.split(sep)[0]?.trim() ?? v;
  },
  "split-last": (v, args) => {
    const sep = args?.separator ?? ",";
    const parts = v.split(sep);
    return parts[parts.length - 1]?.trim() ?? v;
  },

  default: (v, args) => v || args?.default || "",
  "map-value": (v, args) => args?.[v] ?? v,
  concat: (v, args) => `${args?.prefix ?? ""}${v}${args?.suffix ?? ""}`,
  "regex-extract": (v, args) => {
    if (!args?.pattern) return v;
    const m = v.match(new RegExp(args.pattern));
    return m?.[1] ?? m?.[0] ?? v;
  },
  number: (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? v : String(n);
  },
  boolean: (v) => {
    const t = v.toLowerCase().trim();
    return ["1", "true", "yes", "y", "on"].includes(t) ? "true" : "false";
  },
};

/* ------------------------------------------------------------------ */
/* CSV parser (lightweight, handles quoted fields)                     */
/* ------------------------------------------------------------------ */

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip empty lines
    const values = parseRow(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

/* ------------------------------------------------------------------ */
/* Transform application                                               */
/* ------------------------------------------------------------------ */

/**
 * Apply a chain of transforms to a value.
 */
export function applyTransforms(value: string, transforms: FieldTransform[]): string {
  let result = value;
  for (const t of transforms) {
    const fn = TRANSFORMS[t.fn];
    if (fn) {
      result = fn(result, t.args);
    } else {
      log.warn("Unknown transform function", { fn: t.fn });
    }
  }
  return result;
}

/**
 * Map a single source row to a target record using field mappings.
 */
export function mapRow(
  row: Record<string, string>,
  fields: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    let value = row[field.source] ?? "";
    if (field.transforms && field.transforms.length > 0) {
      value = applyTransforms(value, field.transforms);
    }
    result[field.target] = value;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validate a single row against field mappings. Returns issues found.
 */
export function validateRow(
  row: Record<string, string>,
  fields: FieldMapping[],
  rowIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of fields) {
    const value = row[field.source];

    // Required field missing
    if (field.required && (!value || value.trim() === "")) {
      issues.push({
        row: rowIndex,
        field: field.source,
        severity: "error",
        code: "REQUIRED_MISSING",
        message: `Required field '${field.source}' is empty`,
      });
      continue;
    }

    // Pattern validation
    if (value && field.validationPattern) {
      try {
        const re = new RegExp(field.validationPattern);
        if (!re.test(value)) {
          issues.push({
            row: rowIndex,
            field: field.source,
            severity: "error",
            code: "PATTERN_MISMATCH",
            message: `Field '${field.source}' value '${value}' does not match pattern '${field.validationPattern}'`,
          });
        }
      } catch {
        issues.push({
          row: rowIndex,
          field: field.source,
          severity: "warning",
          code: "INVALID_PATTERN",
          message: `Validation pattern for '${field.source}' is invalid`,
        });
      }
    }
  }

  return issues;
}

/**
 * Validate all rows against a mapping template.
 * Returns a full ValidationResult with preview rows.
 */
export function validateData(
  headers: string[],
  rows: Record<string, string>[],
  fields: FieldMapping[],
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check that all required source columns exist in headers
  for (const field of fields) {
    if (field.required && !headers.includes(field.source)) {
      issues.push({
        severity: "error",
        code: "MISSING_COLUMN",
        field: field.source,
        message: `Required source column '${field.source}' not found in CSV headers. Available: ${headers.join(", ")}`,
      });
    }
  }

  // Check for unmapped columns (info)
  for (const h of headers) {
    if (!fields.some((f) => f.source === h)) {
      issues.push({
        severity: "info",
        code: "UNMAPPED_COLUMN",
        field: h,
        message: `Column '${h}' is not mapped and will be ignored`,
      });
    }
  }

  // Validate each row
  let validRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const rowIssues = validateRow(rows[i], fields, i + 1);
    issues.push(...rowIssues);
    if (!rowIssues.some((iss) => iss.severity === "error")) {
      validRows++;
    }
  }

  // Generate preview (first 5 valid rows, mapped)
  const preview: Record<string, unknown>[] = [];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    preview.push(mapRow(rows[i], fields));
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    totalRows: rows.length,
    validRows,
    errorCount,
    warningCount,
    issues,
    preview,
  };
}

/**
 * Merge a base template's fields with per-job overrides.
 * Overrides replace fields with matching source name.
 */
export function mergeFieldMappings(
  base: FieldMapping[],
  overrides?: FieldMapping[],
): FieldMapping[] {
  if (!overrides || overrides.length === 0) return base;

  const merged = [...base];
  for (const override of overrides) {
    const idx = merged.findIndex((f) => f.source === override.source);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...override };
    } else {
      merged.push(override);
    }
  }
  return merged;
}
