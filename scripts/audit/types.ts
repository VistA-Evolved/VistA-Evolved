/**
 * Phase 54 -- Shared types for the alignment audit framework.
 */

export type AuditMode = "offline" | "integration";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "pass" | "fail" | "warn" | "skip";

export interface AuditFinding {
  rule: string;
  status: FindingStatus;
  severity: FindingSeverity;
  message: string;
  file?: string;
  line?: number;
  fix?: string;
}

export interface ModuleResult {
  module: string;
  status: "pass" | "fail" | "warn" | "skip";
  findings: AuditFinding[];
  duration_ms: number;
}

export interface AuditSummary {
  version: "2.0";
  mode: AuditMode;
  timestamp: string;
  modules: ModuleResult[];
  totals: {
    pass: number;
    fail: number;
    warn: number;
    skip: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

/**
 * Each audit module implements this interface.
 */
export interface AuditModule {
  name: string;
  /** "offline" modules run without VistA; "integration" require live VistA */
  requires: AuditMode;
  run(root: string): Promise<AuditFinding[]>;
}
