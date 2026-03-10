/**
 * Phase 171: Ops Admin Center -- Unified operations API
 *
 * Aggregates all posture/health/provisioning data into a single
 * ops overview suitable for SaaS + hospital IT visibility.
 *
 * Endpoints:
 *   GET /admin/ops/overview          -- Unified ops health snapshot
 *   GET /admin/ops/alerts            -- Active alert conditions
 *   GET /admin/ops/runbooks          -- Runbook index with deep links
 *   GET /admin/ops/store-inventory   -- In-memory store summary
 *
 * All endpoints require admin role (AUTH_RULES /admin/*).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// -- Types ---------------------------------------------------

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface OpsAlert {
  id: string;
  severity: AlertSeverity;
  domain: string;
  message: string;
  runbookLink?: string;
  detectedAt: string;
}

export interface OpsDomainStatus {
  domain: string;
  score: number;
  passCount: number;
  totalGates: number;
  summary: string;
  alerts: OpsAlert[];
}

export interface OpsOverview {
  overallScore: number;
  totalGates: number;
  passingGates: number;
  domains: OpsDomainStatus[];
  alerts: OpsAlert[];
  storeCount: number;
  runbookCount: number;
  timestamp: string;
}

// -- Runbook index -------------------------------------------

interface RunbookEntry {
  name: string;
  path: string;
  domain: string;
}

function indexRunbooks(): RunbookEntry[] {
  const runbookDir = resolve(import.meta.dirname, '../../../../docs/runbooks');
  if (!existsSync(runbookDir)) return [];
  try {
    const files = readdirSync(runbookDir).filter((f) => f.endsWith('.md'));
    return files.map((f) => {
      const domain = f.startsWith('phase')
        ? 'phase'
        : f.startsWith('rcm')
          ? 'rcm'
          : f.startsWith('imaging')
            ? 'imaging'
            : f.startsWith('vista')
              ? 'vista'
              : f.startsWith('analytics')
                ? 'analytics'
                : 'general';
      return { name: f.replace('.md', ''), path: `docs/runbooks/${f}`, domain };
    });
  } catch {
    return [];
  }
}

// -- Alert generation ----------------------------------------

function generateAlerts(domains: OpsDomainStatus[]): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  const now = new Date().toISOString();

  for (const d of domains) {
    if (d.score < 50) {
      alerts.push({
        id: `${d.domain}-critical`,
        severity: 'critical',
        domain: d.domain,
        message: `${d.domain} posture critically low: ${d.score}% (${d.passCount}/${d.totalGates} gates)`,
        runbookLink: 'docs/runbooks/phase107-production-posture.md',
        detectedAt: now,
      });
    } else if (d.score < 80) {
      alerts.push({
        id: `${d.domain}-warning`,
        severity: 'warning',
        domain: d.domain,
        message: `${d.domain} posture degraded: ${d.score}% (${d.passCount}/${d.totalGates} gates)`,
        detectedAt: now,
      });
    }
  }

  return alerts;
}

// -- Routes --------------------------------------------------

export default async function opsAdminRoutes(server: FastifyInstance) {
  // GET /admin/ops/overview -- unified ops health snapshot
  server.get('/admin/ops/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    // Aggregate posture data by calling internal posture modules
    const domains: OpsDomainStatus[] = [];
    let totalGates = 0;
    let passingGates = 0;

    // Each posture module has a named check function with a .gates array
    const postureCheckers: Array<{ name: string; fn: () => any }> = [];
    try {
      const obs = await import('../posture/observability-posture.js');
      postureCheckers.push({ name: 'observability', fn: obs.checkObservabilityPosture });
    } catch {
      /* ignore */
    }
    try {
      const ten = await import('../posture/tenant-posture.js');
      postureCheckers.push({ name: 'tenant', fn: ten.checkTenantIsolationPosture });
    } catch {
      /* ignore */
    }
    try {
      const perf = await import('../posture/perf-posture.js');
      postureCheckers.push({ name: 'performance', fn: perf.checkPerfPosture });
    } catch {
      /* ignore */
    }
    try {
      const bk = await import('../posture/backup-posture.js');
      postureCheckers.push({ name: 'backup', fn: bk.checkBackupPosture });
    } catch {
      /* ignore */
    }
    try {
      const dp = await import('../posture/data-plane-posture.js');
      postureCheckers.push({ name: 'data-plane', fn: dp.checkDataPlanePosture });
    } catch {
      /* ignore */
    }

    for (const { name, fn } of postureCheckers) {
      try {
        if (typeof fn === 'function') {
          const result = await fn();
          const gates = result?.gates || [];
          const pass = gates.filter((g: any) => g.pass).length;
          const total = gates.length;
          const score = total > 0 ? Math.round((pass / total) * 100) : 100;
          totalGates += total;
          passingGates += pass;
          domains.push({
            domain: name,
            score,
            passCount: pass,
            totalGates: total,
            summary: result?.summary || `${pass}/${total} gates passing`,
            alerts: [],
          });
        } else {
          domains.push({
            domain: name,
            score: 0,
            passCount: 0,
            totalGates: 0,
            summary: 'Module not callable',
            alerts: [],
          });
        }
      } catch {
        domains.push({
          domain: name,
          score: 0,
          passCount: 0,
          totalGates: 0,
          summary: 'Module load failed',
          alerts: [],
        });
      }
    }

    // Store inventory count
    let storeCount = 0;
    try {
      const storePolicy = await import('../platform/store-policy.js');
      storeCount = storePolicy.STORE_INVENTORY?.length || 0;
    } catch {
      /* ignore */
    }

    // Runbook count
    const runbooks = indexRunbooks();

    const overallScore = totalGates > 0 ? Math.round((passingGates / totalGates) * 100) : 0;
    const alerts = generateAlerts(domains);

    // Apply alerts back to domains
    for (const alert of alerts) {
      const domain = domains.find((d) => d.domain === alert.domain);
      if (domain) domain.alerts.push(alert);
    }

    const overview: OpsOverview = {
      overallScore,
      totalGates,
      passingGates,
      domains,
      alerts,
      storeCount,
      runbookCount: runbooks.length,
      timestamp: new Date().toISOString(),
    };

    return { ok: true, overview };
  });

  // GET /admin/ops/alerts -- active alert conditions
  server.get('/admin/ops/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    // Quick posture scan for alerts without full data
    const alerts: OpsAlert[] = [];
    const now = new Date().toISOString();

    // Check circuit breaker state
    try {
      const perf = await import('../posture/perf-posture.js');
      const result = perf.checkPerfPosture();
      const cbGate = result?.gates?.find(
        (g: any) => g.name?.includes('circuit') || g.name?.includes('breaker')
      );
      if (cbGate && !cbGate.pass) {
        alerts.push({
          id: 'circuit-breaker-open',
          severity: 'critical',
          domain: 'performance',
          message: 'VistA circuit breaker is OPEN -- RPC calls failing',
          runbookLink: 'docs/runbooks/phase107-production-posture.md',
          detectedAt: now,
        });
      }
    } catch {
      /* ignore */
    }

    // Check store count for unbounded growth
    try {
      const storePolicy = await import('../platform/store-policy.js');
      const criticalStores = storePolicy.getStoresByClassification?.('critical') || [];
      const inMemoryOnly = criticalStores.filter((s: any) => s.durability === 'in_memory_only');
      if (inMemoryOnly.length > 20) {
        alerts.push({
          id: 'many-in-memory-stores',
          severity: 'warning',
          domain: 'infrastructure',
          message: `${inMemoryOnly.length} critical in-memory-only stores (data loss on restart)`,
          detectedAt: now,
        });
      }
    } catch {
      /* ignore */
    }

    return {
      ok: true,
      alerts,
      total: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 'critical').length,
      warningCount: alerts.filter((a) => a.severity === 'warning').length,
    };
  });

  // GET /admin/ops/runbooks -- runbook index
  server.get('/admin/ops/runbooks', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const runbooks = indexRunbooks();
    const byDomain: Record<string, RunbookEntry[]> = {};
    for (const rb of runbooks) {
      if (!byDomain[rb.domain]) byDomain[rb.domain] = [];
      byDomain[rb.domain].push(rb);
    }

    return {
      ok: true,
      runbooks,
      total: runbooks.length,
      byDomain,
    };
  });

  // GET /admin/ops/store-inventory -- in-memory store summary
  server.get('/admin/ops/store-inventory', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    try {
      const storePolicy = await import('../platform/store-policy.js');
      const inventory = storePolicy.STORE_INVENTORY || [];

      const byClassification: Record<string, number> = {};
      const byDomain: Record<string, number> = {};
      const byDurability: Record<string, number> = {};

      for (const store of inventory) {
        byClassification[store.classification] = (byClassification[store.classification] || 0) + 1;
        byDomain[store.domain] = (byDomain[store.domain] || 0) + 1;
        byDurability[store.durability] = (byDurability[store.durability] || 0) + 1;
      }

      return {
        ok: true,
        total: inventory.length,
        byClassification,
        byDomain,
        byDurability,
        criticalInMemory: inventory.filter(
          (s: any) => s.classification === 'critical' && s.durability === 'in_memory_only'
        ).length,
      };
    } catch {
      return {
        ok: true,
        total: 0,
        byClassification: {},
        byDomain: {},
        byDurability: {},
        criticalInMemory: 0,
        error: 'store-policy not available',
      };
    }
  });
}
