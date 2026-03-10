/**
 * cost-attribution-routes.ts -- Cost Attribution & Budget REST endpoints
 *
 * Phase 332 (W15-P6)
 *
 * 17 endpoints under /platform/costs/, /platform/budgets/
 */

import { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeErr } from '../lib/safe-error.js';
import {
  ingestCostRecord,
  getCostRecord,
  listCostRecords,
  getCostBreakdown,
  setBudget,
  getBudget,
  listBudgets,
  acknowledgeAlert,
  resolveAlert,
  listAlerts,
  detectAnomalies,
  listAnomalies,
  getOpenCostConfig,
  updateOpenCostConfig,
  getCostSummary,
  getCostAuditLog,
} from '../services/cost-attribution.js';

export default async function costAttributionRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any, session: any): string | null {
    const sessionTenantId =
      typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
        ? session.tenantId.trim()
        : undefined;
    return sessionTenantId || null;
  }

  function requireTenantId(request: any, reply: any, session: any): string | null {
    const tenantId = resolveTenantId(request, session);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function resolveActor(session: any): string {
    return session?.userName || session?.duz || 'admin';
  }

  // -- Cost Records ------------------------------------------------

  /** POST /platform/costs/ingest -- ingest a cost record */
  server.post('/platform/costs/ingest', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const b = (request.body as any) || {};
    if (!b.date || !b.region || !b.source) {
      return reply.code(400).send({ ok: false, error: 'date, region, source required' });
    }
    const record = ingestCostRecord({ ...b, tenantId }, resolveActor(session));
    return reply.code(201).send({ ok: true, record });
  });

  /** GET /platform/costs/records/:id -- get a cost record */
  server.get('/platform/costs/records/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const record = getCostRecord(id, tenantId);
    if (!record) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, record };
  });

  /** GET /platform/costs/records -- list cost records */
  server.get('/platform/costs/records', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const q = request.query as any;
    const records = listCostRecords(
      {
        tenantId,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        region: q.region,
        source: q.source,
      },
      q.limit ? parseInt(q.limit, 10) : 200
    );
    return { ok: true, count: records.length, records };
  });

  /** GET /platform/costs/breakdown -- cost breakdown by tenant/period */
  server.get('/platform/costs/breakdown', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const q = request.query as any;
    if (!q.period) {
      return reply.code(400).send({ ok: false, error: 'period required' });
    }
    const breakdown = getCostBreakdown(tenantId, q.period, q.region);
    return { ok: true, breakdown };
  });

  // -- Budget Management -------------------------------------------

  /** POST /platform/budgets -- set a tenant budget */
  server.post('/platform/budgets', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const b = (request.body as any) || {};
    if (!b.tier) {
      return reply.code(400).send({ ok: false, error: 'tier required' });
    }
    const validTiers = ['starter', 'professional', 'enterprise', 'custom'];
    if (!validTiers.includes(b.tier)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
    }
    try {
      const budget = setBudget({ ...b, tenantId }, resolveActor(session));
      return reply.code(201).send({ ok: true, budget });
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: safeErr(e) });
    }
  });

  /** GET /platform/budgets/:tenantId -- get tenant budget */
  server.get('/platform/budgets/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const budget = getBudget(tenantId);
    if (!budget) return reply.code(404).send({ ok: false, error: 'no budget set for tenant' });
    return { ok: true, budget };
  });

  /** GET /platform/budgets -- list all budgets */
  server.get('/platform/budgets', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const budgets = listBudgets(tenantId);
    return { ok: true, count: budgets.length, budgets };
  });

  // -- Alerts ------------------------------------------------------

  /** GET /platform/costs/alerts -- list budget alerts */
  server.get('/platform/costs/alerts', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const q = request.query as any;
    const alerts = listAlerts(
      {
        tenantId,
        status: q.status,
        severity: q.severity,
      },
      q.limit ? parseInt(q.limit, 10) : 100
    );
    return { ok: true, count: alerts.length, alerts };
  });

  /** POST /platform/costs/alerts/:id/acknowledge -- acknowledge an alert */
  server.post('/platform/costs/alerts/:id/acknowledge', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    try {
      const alert = acknowledgeAlert(id, resolveActor(session), tenantId);
      return { ok: true, alert };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: safeErr(e) });
    }
  });

  /** POST /platform/costs/alerts/:id/resolve -- resolve an alert */
  server.post('/platform/costs/alerts/:id/resolve', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    try {
      const alert = resolveAlert(id, resolveActor(session), tenantId);
      return { ok: true, alert };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: safeErr(e) });
    }
  });

  // -- Anomalies ---------------------------------------------------

  /** POST /platform/costs/anomalies/detect -- detect cost anomalies for a tenant */
  server.post('/platform/costs/anomalies/detect', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const b = (request.body as any) || {};
    const anomalies = detectAnomalies(tenantId, b.thresholdDeviationPct);
    return { ok: true, count: anomalies.length, anomalies };
  });

  /** GET /platform/costs/anomalies -- list detected anomalies */
  server.get('/platform/costs/anomalies', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const q = request.query as any;
    const anomalies = listAnomalies(
      { tenantId },
      q.limit ? parseInt(q.limit, 10) : 100
    );
    return { ok: true, count: anomalies.length, anomalies };
  });

  // -- OpenCost Config ---------------------------------------------

  /** GET /platform/costs/opencost/config -- get OpenCost configuration */
  server.get('/platform/costs/opencost/config', async () => {
    return { ok: true, config: getOpenCostConfig() };
  });

  /** PUT /platform/costs/opencost/config -- update OpenCost configuration */
  server.put('/platform/costs/opencost/config', async (request) => {
    const b = (request.body as any) || {};
    const config = updateOpenCostConfig(b, 'admin');
    return { ok: true, config };
  });

  // -- Summary + Audit ---------------------------------------------

  /** GET /platform/costs/summary -- cost attribution summary */
  server.get('/platform/costs/summary', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    return { ok: true, summary: getCostSummary(tenantId) };
  });

  /** GET /platform/costs/audit -- cost audit log */
  server.get('/platform/costs/audit', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const q = request.query as any;
    const limit = q.limit ? parseInt(q.limit, 10) : 100;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;
    const entries = getCostAuditLog(limit, offset, tenantId);
    return { ok: true, count: entries.length, entries };
  });
}
