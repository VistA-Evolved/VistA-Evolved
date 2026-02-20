/**
 * Phase 54 -- Perf Smoke Audit Module (Integration-only)
 *
 * Requires a running API server. Tests:
 *   1. /health responds in < 200ms
 *   2. /ready responds in < 500ms
 *   3. /vista/ping responds in < 2000ms
 */

import type { AuditModule, AuditFinding } from "../types.js";

const API_BASE = process.env.AUDIT_API_BASE || "http://127.0.0.1:3001";

async function timedFetch(url: string): Promise<{ status: number; ms: number }> {
  const t0 = Date.now();
  const resp = await fetch(url);
  const ms = Date.now() - t0;
  return { status: resp.status, ms };
}

export const perfSmokeAudit: AuditModule = {
  name: "perfSmokeAudit",
  requires: "integration",

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const endpoints: { url: string; name: string; threshold: number }[] = [
      { url: `${API_BASE}/health`, name: "/health", threshold: 200 },
      { url: `${API_BASE}/ready`, name: "/ready", threshold: 500 },
      { url: `${API_BASE}/vista/ping`, name: "/vista/ping", threshold: 2000 },
    ];

    for (const ep of endpoints) {
      try {
        const { status, ms } = await timedFetch(ep.url);
        if (ms <= ep.threshold) {
          findings.push({
            rule: `perf-${ep.name.replace(/\//g, "-").replace(/^-/, "")}`,
            status: "pass",
            severity: "info",
            message: `${ep.name} responded in ${ms}ms (threshold: ${ep.threshold}ms)`,
          });
        } else {
          findings.push({
            rule: `perf-${ep.name.replace(/\//g, "-").replace(/^-/, "")}`,
            status: "warn",
            severity: "medium",
            message: `${ep.name} responded in ${ms}ms (threshold: ${ep.threshold}ms)`,
            fix: "Investigate slow response time",
          });
        }
      } catch (err: any) {
        findings.push({
          rule: `perf-${ep.name.replace(/\//g, "-").replace(/^-/, "")}`,
          status: "fail",
          severity: "high",
          message: `${ep.name} failed: ${err.message}`,
          fix: "Ensure API is running",
        });
      }
    }

    return findings;
  },
};
