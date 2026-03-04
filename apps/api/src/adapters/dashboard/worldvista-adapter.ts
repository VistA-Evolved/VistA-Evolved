/**
 * apps/api/src/adapters/dashboard/worldvista-adapter.ts
 *
 * Phase 453 (W29-P7). HTTP bridge to WorldVistA Dashboard / Rules Engine.
 * Env vars: DASHBOARD_URL (default http://localhost:3010), DASHBOARD_TIMEOUT_MS.
 */

import type {
  DashboardAdapter,
  DashboardResult,
  ClinicalRule,
  RuleEvaluation,
  ClinicalAlert,
  PatientList,
} from './interface.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3010';
const TIMEOUT_MS = parseInt(process.env.DASHBOARD_TIMEOUT_MS || '5000', 10);

async function dashboardFetch<T>(path: string): Promise<DashboardResult<T>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${DASHBOARD_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, error: `Dashboard returned ${res.status}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Dashboard unreachable: ${msg}` };
  }
}

export class WorldVistaDashboardAdapter implements DashboardAdapter {
  async getRules(): Promise<DashboardResult<ClinicalRule[]>> {
    return dashboardFetch<ClinicalRule[]>('/api/rules');
  }

  async evaluateRules(patientDfn: string): Promise<DashboardResult<RuleEvaluation[]>> {
    return dashboardFetch<RuleEvaluation[]>(
      `/api/rules/evaluate?dfn=${encodeURIComponent(patientDfn)}`
    );
  }

  async getAlerts(patientDfn: string): Promise<DashboardResult<ClinicalAlert[]>> {
    return dashboardFetch<ClinicalAlert[]>(`/api/alerts?dfn=${encodeURIComponent(patientDfn)}`);
  }

  async getPatientLists(): Promise<DashboardResult<PatientList[]>> {
    return dashboardFetch<PatientList[]>('/api/patient-lists');
  }

  async health() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${DASHBOARD_URL}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      return {
        status: res.ok ? ('connected' as const) : ('unreachable' as const),
        detail: `HTTP ${res.status}`,
      };
    } catch {
      return { status: 'unreachable' as const, detail: 'Connection failed' };
    }
  }
}
