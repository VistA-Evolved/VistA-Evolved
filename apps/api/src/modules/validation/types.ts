/**
 * types.ts -- Module packaging validation types (Phase 163)
 */

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  /** Unique issue code for programmatic handling */
  code: string;
  /** Severity: error = must fix, warning = should fix, info = informational */
  severity: ValidationSeverity;
  /** Human-readable description */
  message: string;
  /** Module or component affected */
  subject?: string;
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationCategory {
  /** Category identifier */
  category: string;
  /** Human-readable label */
  label: string;
  /** Issues found in this category */
  issues: ValidationIssue[];
  /** Time taken to run this validation (ms) */
  durationMs: number;
}

export interface ValidationReport {
  /** When the report was generated */
  generatedAt: string;
  /** Overall pass/fail */
  passed: boolean;
  /** Total error count */
  errorCount: number;
  /** Total warning count */
  warningCount: number;
  /** Total info count */
  infoCount: number;
  /** Categories of validation */
  categories: ValidationCategory[];
  /** Active SKU at time of validation */
  activeSku: string;
  /** Active tenant checked */
  tenantId: string;
}
