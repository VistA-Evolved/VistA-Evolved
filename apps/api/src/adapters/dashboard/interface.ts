/**
 * apps/api/src/adapters/dashboard/interface.ts
 *
 * Phase 453 (W29-P7). Dashboard/Rules Engine adapter interface.
 * Per ADR-W29-HARVEST-DASHBOARD.md.
 */

// ── Domain types ───────────────────────────────────────────────────

export interface ClinicalRule {
  id: string;
  name: string;
  description: string;
  category: 'alert' | 'reminder' | 'order-check' | 'documentation';
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  conditions: Record<string, unknown>;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  evaluatedAt: string;
  data?: Record<string, unknown>;
}

export interface ClinicalAlert {
  id: string;
  ruleId: string;
  patientDfn: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface PatientList {
  id: string;
  name: string;
  description: string;
  patientCount: number;
  criteria: Record<string, unknown>;
  updatedAt: string;
}

// ── Adapter result ─────────────────────────────────────────────────

export interface DashboardResult<T> {
  ok: boolean;
  data?: T;
  pending?: boolean;
  error?: string;
}

// ── Adapter interface ──────────────────────────────────────────────

export interface DashboardAdapter {
  /** Get all configured clinical rules */
  getRules(): Promise<DashboardResult<ClinicalRule[]>>;

  /** Evaluate rules for a specific patient */
  evaluateRules(patientDfn: string): Promise<DashboardResult<RuleEvaluation[]>>;

  /** Get active alerts for a patient */
  getAlerts(patientDfn: string): Promise<DashboardResult<ClinicalAlert[]>>;

  /** Get available patient lists */
  getPatientLists(): Promise<DashboardResult<PatientList[]>>;

  /** Health check for the dashboard service */
  health(): Promise<{ status: 'connected' | 'unreachable' | 'stub'; detail?: string }>;
}
