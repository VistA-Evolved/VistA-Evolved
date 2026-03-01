/**
 * cost-attribution-routes.ts -- Cost Attribution & Budget REST endpoints
 *
 * Phase 332 (W15-P6)
 *
 * 17 endpoints under /platform/costs/, /platform/budgets/
 */

import { FastifyInstance } from "fastify";
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
} from "../services/cost-attribution.js";

export default async function costAttributionRoutes(server: FastifyInstance): Promise<void> {

  // ── Cost Records ────────────────────────────────────────────────

  /** POST /platform/costs/ingest — ingest a cost record */
  server.post("/platform/costs/ingest", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.tenantId || !b.date || !b.region || !b.source) {
      return reply.code(400).send({ ok: false, error: "tenantId, date, region, source required" });
    }
    const record = ingestCostRecord(b, "admin");
    return reply.code(201).send({ ok: true, record });
  });

  /** GET /platform/costs/records/:id — get a cost record */
  server.get("/platform/costs/records/:id", async (request, reply) => {
    const { id } = request.params as any;
    const record = getCostRecord(id);
    if (!record) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, record };
  });

  /** GET /platform/costs/records — list cost records */
  server.get("/platform/costs/records", async (request) => {
    const q = request.query as any;
    const records = listCostRecords({
      tenantId: q.tenantId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      region: q.region,
      source: q.source,
    }, q.limit ? parseInt(q.limit, 10) : 200);
    return { ok: true, count: records.length, records };
  });

  /** GET /platform/costs/breakdown — cost breakdown by tenant/period */
  server.get("/platform/costs/breakdown", async (request, reply) => {
    const q = request.query as any;
    if (!q.tenantId || !q.period) {
      return reply.code(400).send({ ok: false, error: "tenantId, period required" });
    }
    const breakdown = getCostBreakdown(q.tenantId, q.period, q.region);
    return { ok: true, breakdown };
  });

  // ── Budget Management ───────────────────────────────────────────

  /** POST /platform/budgets -- set a tenant budget */
  server.post("/platform/budgets", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.tenantId || !b.tier) {
      return reply.code(400).send({ ok: false, error: "tenantId, tier required" });
    }
    const validTiers = ["starter", "professional", "enterprise", "custom"];
    if (!validTiers.includes(b.tier)) {
      return reply.code(400).send({ ok: false, error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` });
    }
    try {
      const budget = setBudget(b, "admin");
      return reply.code(201).send({ ok: true, budget });
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/budgets/:tenantId — get tenant budget */
  server.get("/platform/budgets/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as any;
    const budget = getBudget(tenantId);
    if (!budget) return reply.code(404).send({ ok: false, error: "no budget set for tenant" });
    return { ok: true, budget };
  });

  /** GET /platform/budgets — list all budgets */
  server.get("/platform/budgets", async () => {
    const budgets = listBudgets();
    return { ok: true, count: budgets.length, budgets };
  });

  // ── Alerts ──────────────────────────────────────────────────────

  /** GET /platform/costs/alerts — list budget alerts */
  server.get("/platform/costs/alerts", async (request) => {
    const q = request.query as any;
    const alerts = listAlerts({
      tenantId: q.tenantId,
      status: q.status,
      severity: q.severity,
    }, q.limit ? parseInt(q.limit, 10) : 100);
    return { ok: true, count: alerts.length, alerts };
  });

  /** POST /platform/costs/alerts/:id/acknowledge — acknowledge an alert */
  server.post("/platform/costs/alerts/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as any;
    try {
      const alert = acknowledgeAlert(id, "admin");
      return { ok: true, alert };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/costs/alerts/:id/resolve — resolve an alert */
  server.post("/platform/costs/alerts/:id/resolve", async (request, reply) => {
    const { id } = request.params as any;
    try {
      const alert = resolveAlert(id, "admin");
      return { ok: true, alert };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  // ── Anomalies ───────────────────────────────────────────────────

  /** POST /platform/costs/anomalies/detect — detect cost anomalies for a tenant */
  server.post("/platform/costs/anomalies/detect", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.tenantId) {
      return reply.code(400).send({ ok: false, error: "tenantId required" });
    }
    const anomalies = detectAnomalies(b.tenantId, b.thresholdDeviationPct);
    return { ok: true, count: anomalies.length, anomalies };
  });

  /** GET /platform/costs/anomalies — list detected anomalies */
  server.get("/platform/costs/anomalies", async (request) => {
    const q = request.query as any;
    const anomalies = listAnomalies({ tenantId: q.tenantId }, q.limit ? parseInt(q.limit, 10) : 100);
    return { ok: true, count: anomalies.length, anomalies };
  });

  // ── OpenCost Config ─────────────────────────────────────────────

  /** GET /platform/costs/opencost/config — get OpenCost configuration */
  server.get("/platform/costs/opencost/config", async () => {
    return { ok: true, config: getOpenCostConfig() };
  });

  /** PUT /platform/costs/opencost/config — update OpenCost configuration */
  server.put("/platform/costs/opencost/config", async (request) => {
    const b = (request.body as any) || {};
    const config = updateOpenCostConfig(b, "admin");
    return { ok: true, config };
  });

  // ── Summary + Audit ─────────────────────────────────────────────

  /** GET /platform/costs/summary — cost attribution summary */
  server.get("/platform/costs/summary", async () => {
    return { ok: true, summary: getCostSummary() };
  });

  /** GET /platform/costs/audit — cost audit log */
  server.get("/platform/costs/audit", async (request) => {
    const q = request.query as any;
    const limit = q.limit ? parseInt(q.limit, 10) : 100;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;
    const entries = getCostAuditLog(limit, offset);
    return { ok: true, count: entries.length, entries };
  });
}
