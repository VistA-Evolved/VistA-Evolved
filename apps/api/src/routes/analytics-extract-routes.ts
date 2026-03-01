/**
 * Analytics Extract & De-Id Routes -- Phases 363/364/366/367 (W19-P2/P3/P5/P6)
 *
 * Fastify plugin for the analytics data platform extract layer,
 * de-identification service, quality metrics, and RCM analytics.
 *
 * Route prefix: /analytics/extract/*
 *                /analytics/deid/*
 *                /analytics/quality/*
 *                /analytics/rcm-metrics/*
 *
 * All routes require session auth + analytics_viewer or analytics_admin.
 */

import type { FastifyInstance } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { audit, type AuditAction } from "../lib/audit.js";
import {
  ANALYTICS_ROLE_PERMISSIONS,
  type AnalyticsPermission,
} from "../config/analytics-config.js";
import type { ExtractRunConfig, QualityMeasureId } from "../analytics/extract-types.js";
import {
  runExtract,
  getExtractRuns,
  getExtractRunById,
  getExtractRecords,
  getExtractOffsets,
  getExtractStats,
} from "../analytics/extract-layer.js";
import {
  deidentifyRecords,
  runDenylistScan,
  getDeidConfig,
  setDeidConfig,
  listDeidConfigs,
} from "../analytics/deid-service.js";
import {
  getQualityMeasures,
  getQualityMeasure,
  computeQualityMetric,
  computeAllMetrics,
  getMetricRuns,
} from "../analytics/quality-metrics.js";
import {
  computeRcmMetric,
  listRcmMetrics,
} from "../analytics/rcm-analytics.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = (request as any).session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

function hasAnalyticsPerm(role: string, perm: AnalyticsPermission): boolean {
  const perms = ANALYTICS_ROLE_PERMISSIONS[role as keyof typeof ANALYTICS_ROLE_PERMISSIONS];
  if (!perms) return false;
  return perms.includes(perm);
}

function requirePerm(session: any, perm: AnalyticsPermission, reply: any): void {
  if (!hasAnalyticsPerm(session.role, perm)) {
    reply.code(403).send({ ok: false, error: `Missing permission: ${perm}` });
    throw new Error(`Missing permission: ${perm}`);
  }
}

function getTenantId(request: any): string {
  return (request as any).tenantId || "default";
}

/* ================================================================== */
/* Route Plugin                                                         */
/* ================================================================== */

export default async function analyticsExtractRoutes(server: FastifyInstance): Promise<void> {

  /* ── EXTRACT LAYER (Phase 363) ────────────────────────────────── */

  server.post("/analytics/extract/run", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    const body = (request.body as any) || {};
    const config: ExtractRunConfig = {
      tenantId: getTenantId(request),
      entityTypes: body.entityTypes || ["analytics_event"],
      incremental: body.incremental !== false,
      maxRecords: Math.min(body.maxRecords || 10000, 50000),
    };
    const result = runExtract(config);
    audit("analytics.extract.run" as AuditAction, "success", auditActor(request), {
      detail: { extractedCount: result.extractedCount },
    });
    return reply.send({ ok: true, result });
  });

  server.get("/analytics/extract/runs", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    const q = request.query as any;
    const limit = Math.min(parseInt(q.limit) || 50, 200);
    const runs = getExtractRuns(getTenantId(request), limit);
    return reply.send({ ok: true, runs, count: runs.length });
  });

  server.get("/analytics/extract/runs/:runId", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    const { runId } = request.params as any;
    const run = getExtractRunById(runId);
    if (!run) return reply.code(404).send({ ok: false, error: "Run not found" });
    return reply.send({ ok: true, run });
  });

  server.get("/analytics/extract/records", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    const q = request.query as any;
    if (!q.runId) return reply.code(400).send({ ok: false, error: "runId required" });
    const records = getExtractRecords(q.runId, {
      entityType: q.entityType,
      limit: Math.min(parseInt(q.limit) || 100, 1000),
    });
    return reply.send({ ok: true, records, count: records.length });
  });

  server.get("/analytics/extract/offsets", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    return reply.send({ ok: true, offsets: getExtractOffsets(getTenantId(request)) });
  });

  server.get("/analytics/extract/stats", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    return reply.send({ ok: true, stats: getExtractStats() });
  });

  /* ── DE-IDENTIFICATION (Phase 364) ────────────────────────────── */

  server.post("/analytics/deid/process", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    const body = (request.body as any) || {};
    if (!body.runId) return reply.code(400).send({ ok: false, error: "runId required" });
    const records = getExtractRecords(body.runId);
    const config = getDeidConfig(getTenantId(request));
    const result = deidentifyRecords(records, config);
    audit("analytics.deid.process" as AuditAction, "success", auditActor(request), {
      detail: { recordCount: result.records.length, mode: config.mode },
    });
    return reply.send({ ok: true, ...result });
  });

  server.post("/analytics/deid/scan", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    const body = (request.body as any) || {};
    if (!body.runId) return reply.code(400).send({ ok: false, error: "runId required" });
    const records = getExtractRecords(body.runId);
    const config = getDeidConfig(getTenantId(request));
    const deidResult = deidentifyRecords(records, config);
    const scanResult = runDenylistScan(deidResult.records);
    return reply.send({ ok: true, scan: scanResult });
  });

  server.get("/analytics/deid/config", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    return reply.send({ ok: true, config: getDeidConfig(getTenantId(request)) });
  });

  server.put("/analytics/deid/config", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    const body = (request.body as any) || {};
    setDeidConfig({
      tenantId: getTenantId(request),
      mode: body.mode || "strict",
      pseudonymizationSecret: body.pseudonymizationSecret,
      denylistScanEnabled: body.denylistScanEnabled !== false,
      customFieldDenylist: body.customFieldDenylist || [],
    });
    audit("analytics.deid.config" as AuditAction, "success", auditActor(request), {
      detail: { mode: body.mode || "strict" },
    });
    return reply.send({ ok: true, config: getDeidConfig(getTenantId(request)) });
  });

  server.get("/analytics/deid/configs", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    return reply.send({ ok: true, configs: listDeidConfigs() });
  });

  /* ── QUALITY METRICS (Phase 366) ──────────────────────────────── */

  server.get("/analytics/quality/measures", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    return reply.send({ ok: true, measures: getQualityMeasures() });
  });

  server.get("/analytics/quality/measures/:measureId", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    const { measureId } = request.params as any;
    const measure = getQualityMeasure(measureId);
    if (!measure) return reply.code(404).send({ ok: false, error: "Measure not found" });
    return reply.send({ ok: true, measure });
  });

  server.post("/analytics/quality/compute", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    const body = (request.body as any) || {};
    if (!body.measureId) return reply.code(400).send({ ok: false, error: "measureId required" });
    try {
      const result = computeQualityMetric(body.measureId as QualityMeasureId, getTenantId(request), body.periodStart, body.periodEnd);
      audit("analytics.quality.compute" as AuditAction, "success", auditActor(request), {
        detail: { measureId: body.measureId, value: result.value },
      });
      return reply.send({ ok: true, metric: result });
    } catch (e: any) {
      return reply.code(400).send({ ok: false, error: e.message });
    }
  });

  server.post("/analytics/quality/compute-all", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_admin", reply);
    return reply.send({ ok: true, metrics: computeAllMetrics(getTenantId(request)) });
  });

  server.get("/analytics/quality/runs", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    const q = request.query as any;
    const runs = getMetricRuns(getTenantId(request), q.measureId, parseInt(q.limit) || 50);
    return reply.send({ ok: true, runs, count: runs.length });
  });

  /* ── RCM ANALYTICS (Phase 367) ────────────────────────────────── */

  server.get("/analytics/rcm-metrics", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    return reply.send({ ok: true, metrics: listRcmMetrics() });
  });

  server.get("/analytics/rcm-metrics/:metricKey", async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, "analytics_viewer", reply);
    const { metricKey } = request.params as any;
    const result = computeRcmMetric(metricKey, getTenantId(request));
    if (!result) return reply.code(404).send({ ok: false, error: "Metric not found" });
    return reply.send({ ok: true, ...result });
  });
}
