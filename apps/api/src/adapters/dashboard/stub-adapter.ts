/**
 * apps/api/src/adapters/dashboard/stub-adapter.ts
 *
 * Phase 453 (W29-P7). Stub adapter returning pending status for all methods.
 * Active when ADAPTER_DASHBOARD=stub (default) or Dashboard service unavailable.
 */

import type {
  DashboardAdapter,
  DashboardResult,
  ClinicalRule,
  RuleEvaluation,
  ClinicalAlert,
  PatientList,
} from "./interface.js";

const PENDING = <T>(): DashboardResult<T> => ({
  ok: false,
  pending: true,
  error: "Dashboard service not configured -- using stub adapter",
});

export class StubDashboardAdapter implements DashboardAdapter {
  async getRules(): Promise<DashboardResult<ClinicalRule[]>> {
    return PENDING();
  }

  async evaluateRules(_patientDfn: string): Promise<DashboardResult<RuleEvaluation[]>> {
    return PENDING();
  }

  async getAlerts(_patientDfn: string): Promise<DashboardResult<ClinicalAlert[]>> {
    return PENDING();
  }

  async getPatientLists(): Promise<DashboardResult<PatientList[]>> {
    return PENDING();
  }

  async health() {
    return { status: "stub" as const, detail: "Stub adapter active" };
  }
}
