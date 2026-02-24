/**
 * Analytics Routes — Phase 25C/E.
 *
 * Fastify plugin providing dashboard, event query, export, and health
 * endpoints for the analytics subsystem.
 *
 * Routes:
 *   GET  /analytics/dashboards/ops                — Operational dashboard (metrics, RPC health)
 *   GET  /analytics/dashboards/clinical            — Clinical utilization dashboard
 *   GET  /analytics/events                         — Query raw analytics events (non-PHI)
 *   GET  /analytics/aggregated                     — Query aggregated metric buckets
 *   GET  /analytics/series/:metric                 — Time-series for a single metric
 *   POST /analytics/export                         — Export analytics data (CSV)
 *   GET  /analytics/health                         — Analytics subsystem health
 *   GET  /analytics/clinical-reports                — List available VistA clinical reports
 *   GET  /analytics/clinical-reports/text           — Fetch VistA clinical report text
 *
 * All routes require session auth. Permission checks (analytics_viewer,
 * analytics_admin) are performed in-handler using the analytics config.
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { audit, type AuditAction } from "../lib/audit.js";
import { log } from "../lib/logger.js";
import { getRpcHealthSummary } from "../lib/rpc-resilience.js";
import {
  ANALYTICS_ROLE_PERMISSIONS,
  ANALYTICS_EXPORT_CONFIG,
  ANALYTICS_DASHBOARD_CONFIG,
  type AnalyticsPermission,
} from "../config/analytics-config.js";
import {
  queryAnalyticsEvents,
  getEventBufferStats,
  exportAnalyticsEventsCsv,
  recordAnalyticsEvent,
} from "../services/analytics-store.js";
import {
  queryAggregatedMetrics,
  getMetricSeries,
  getAggregationStats,
  runAggregation,
} from "../services/analytics-aggregator.js";
import {
  getEtlStatus,
  syncBucketsToOcto,
} from "../services/analytics-etl.js";
import {
  getClinicalReportList,
  getClinicalReportText,
  getClinicalReportHealth,
} from "../services/clinical-reports.js";

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

/** Check if user has a specific analytics permission via their role. */
function hasAnalyticsPermission(
  role: string,
  permission: AnalyticsPermission,
): boolean {
  const perms = ANALYTICS_ROLE_PERMISSIONS[role as keyof typeof ANALYTICS_ROLE_PERMISSIONS];
  if (!perms) return false;
  return perms.includes(permission);
}

/** Require a specific analytics permission or throw 403. */
function requireAnalyticsPermission(
  session: any,
  permission: AnalyticsPermission,
  reply: any,
): void {
  if (!hasAnalyticsPermission(session.role, permission)) {
    reply.code(403).send({
      ok: false,
      error: `Missing analytics permission: ${permission}`,
    });
    throw new Error(`Missing permission: ${permission}`);
  }
}

/** Simple in-memory dashboard cache. */
interface DashboardCacheEntry {
  data: unknown;
  expiresAt: number;
}
const dashboardCache = new Map<string, DashboardCacheEntry>();

function getCachedDashboard(key: string): unknown | null {
  const entry = dashboardCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    dashboardCache.delete(key);
    return null;
  }
  return entry.data;
}

function setDashboardCache(key: string, data: unknown): void {
  dashboardCache.set(key, {
    data,
    expiresAt: Date.now() + ANALYTICS_DASHBOARD_CONFIG.cacheTtlMs,
  });
}

/* ================================================================== */
/* Route Plugin                                                         */
/* ================================================================== */

export default async function analyticsRoutes(server: FastifyInstance): Promise<void> {

  /* ── GET /analytics/dashboards/ops ────────────────────────── */
  server.get("/analytics/dashboards/ops", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_viewer", reply);

    const cached = getCachedDashboard(`ops:${session.tenantId}`);
    if (cached) return { ok: true, cached: true, ...(cached as object) };

    const rpcHealth = getRpcHealthSummary();
    const eventStats = getEventBufferStats();
    const aggStats = getAggregationStats();
    const mem = process.memoryUsage();

    const dashboard = {
      timestamp: new Date().toISOString(),
      tenantId: session.tenantId,
      process: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        uptime: process.uptime(),
      },
      rpcHealth: {
        circuitBreaker: rpcHealth.circuitBreaker,
        cacheSize: rpcHealth.cacheSize,
        totalCalled: rpcHealth.totalRpcsCalled,
        totalSuccesses: rpcHealth.totalSuccesses,
        totalFailures: rpcHealth.totalFailures,
      },
      analytics: {
        eventBuffer: eventStats,
        aggregation: aggStats,
      },
    };

    setDashboardCache(`ops:${session.tenantId}`, dashboard);

    audit("analytics.view" as AuditAction, "success", auditActor(request), {
      detail: { dashboard: "ops" },
    });

    recordAnalyticsEvent("usage.report", "dashboard_ops_view", 1, {
      unit: "count",
      tenantId: session.tenantId,
    });

    return { ok: true, cached: false, ...dashboard };
  });

  /* ── GET /analytics/dashboards/clinical ───────────────────── */
  server.get("/analytics/dashboards/clinical", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_viewer", reply);

    const cached = getCachedDashboard(`clinical:${session.tenantId}`);
    if (cached) return { ok: true, cached: true, ...(cached as object) };

    // Aggregate clinical utilization from usage.* events
    const { buckets: reportBuckets } = queryAggregatedMetrics({
      category: "usage.report",
      tenantId: session.tenantId,
      period: "daily",
      limit: 30,
    });

    const { buckets: orderBuckets } = queryAggregatedMetrics({
      category: "usage.order",
      tenantId: session.tenantId,
      period: "daily",
      limit: 30,
    });

    const { buckets: searchBuckets } = queryAggregatedMetrics({
      category: "usage.search",
      tenantId: session.tenantId,
      period: "daily",
      limit: 30,
    });

    const reportHealth = getClinicalReportHealth();

    const dashboard = {
      timestamp: new Date().toISOString(),
      tenantId: session.tenantId,
      clinicalReports: {
        dailyBuckets: reportBuckets.length,
        recentViews: reportBuckets.reduce((s, b) => s + b.count, 0),
        avgLatency: reportBuckets.length > 0
          ? Math.round(reportBuckets.reduce((s, b) => s + b.avg, 0) / reportBuckets.length)
          : 0,
        cacheHealth: reportHealth,
      },
      orderActivity: {
        dailyBuckets: orderBuckets.length,
        recentOrders: orderBuckets.reduce((s, b) => s + b.count, 0),
      },
      searchActivity: {
        dailyBuckets: searchBuckets.length,
        recentSearches: searchBuckets.reduce((s, b) => s + b.count, 0),
      },
    };

    setDashboardCache(`clinical:${session.tenantId}`, dashboard);

    audit("analytics.view" as AuditAction, "success", auditActor(request), {
      detail: { dashboard: "clinical" },
    });

    return { ok: true, cached: false, ...dashboard };
  });

  /* ── GET /analytics/events ────────────────────────────────── */
  server.get("/analytics/events", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_viewer", reply);

    const q = request.query as any;

    const result = queryAnalyticsEvents({
      category: q.category,
      metric: q.metric,
      tenantId: q.tenantId || session.tenantId,
      since: q.since,
      until: q.until,
      limit: Math.min(Number(q.limit || 100), 1000),
    });

    return { ok: true, ...result };
  });

  /* ── GET /analytics/aggregated ────────────────────────────── */
  server.get("/analytics/aggregated", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_viewer", reply);

    const q = request.query as any;

    const result = queryAggregatedMetrics({
      period: q.period || "hourly",
      metric: q.metric,
      category: q.category,
      tenantId: q.tenantId || session.tenantId,
      since: q.since,
      until: q.until,
      limit: Math.min(Number(q.limit || 200), ANALYTICS_DASHBOARD_CONFIG.maxDataPoints),
    });

    return { ok: true, ...result };
  });

  /* ── GET /analytics/series/:metric ────────────────────────── */
  server.get("/analytics/series/:metric", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_viewer", reply);

    const { metric } = request.params as any;
    const q = request.query as any;

    const series = getMetricSeries(metric, {
      period: q.period || "hourly",
      tenantId: q.tenantId || session.tenantId,
      since: q.since,
      until: q.until,
      maxPoints: Math.min(Number(q.maxPoints || 200), ANALYTICS_DASHBOARD_CONFIG.maxDataPoints),
    });

    if (!series) {
      return { ok: true, metric, dataPoints: [], note: "No data available for this metric" };
    }

    return { ok: true, ...series };
  });

  /* ── POST /analytics/export ───────────────────────────────── */
  server.post("/analytics/export", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_admin", reply);

    const body = request.body as any;
    const exportType = body.type || "events"; // "events" | "aggregated"
    const format = body.format || "csv";

    if (format !== "csv") {
      return reply.code(400).send({ ok: false, error: "Only CSV export is currently supported" });
    }

    audit("analytics.export" as AuditAction, "success", auditActor(request), {
      detail: { exportType, format, filters: body.filters },
    });

    let csv: string;
    if (exportType === "aggregated") {
      const { exportAggregatedCsv } = await import("../services/analytics-aggregator.js");
      csv = exportAggregatedCsv({
        period: body.filters?.period,
        metric: body.filters?.metric,
        category: body.filters?.category,
        tenantId: body.filters?.tenantId || session.tenantId,
        since: body.filters?.since,
        until: body.filters?.until,
      });
    } else {
      csv = exportAnalyticsEventsCsv({
        category: body.filters?.category,
        metric: body.filters?.metric,
        tenantId: body.filters?.tenantId || session.tenantId,
        since: body.filters?.since,
        until: body.filters?.until,
        limit: ANALYTICS_EXPORT_CONFIG.maxExportRows,
      });
    }

    recordAnalyticsEvent("usage.report", "analytics_export", 1, {
      unit: "count",
      tenantId: session.tenantId,
      tags: { exportType, format },
    });

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="analytics-${exportType}-${Date.now()}.csv"`);
    return csv;
  });

  /* ── POST /analytics/aggregate ─────────────────────────────── */
  server.post("/analytics/aggregate", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_admin", reply);

    const body = (request.body as any) || {};
    const result = runAggregation(body.since, body.until, body.tenantId || session.tenantId);

    audit("analytics.aggregate" as AuditAction, "success", auditActor(request), {
      detail: { ...result },
    });

    return { ok: true, ...result };
  });

  /* ── GET /analytics/health ────────────────────────────────── */
  server.get("/analytics/health", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_viewer", reply);

    const eventStats = getEventBufferStats();
    const aggStats = getAggregationStats();
    const reportHealth = getClinicalReportHealth();

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      eventBuffer: eventStats,
      aggregation: aggStats,
      clinicalReports: reportHealth,
      dashboardCacheSize: dashboardCache.size,
    };
  });

  /* ── GET /analytics/clinical-reports ──────────────────────── */
  server.get("/analytics/clinical-reports", async (request, reply) => {
    const session = await requireSession(request, reply);
    // Any authenticated user can list reports
    const result = await getClinicalReportList(
      auditActor(request),
      session.tenantId,
    );
    return result;
  });

  /* ── GET /analytics/clinical-reports/text ─────────────────── */
  server.get("/analytics/clinical-reports/text", async (request, reply) => {
    const session = await requireSession(request, reply);
    // Any authenticated user can view clinical reports

    const { dfn, id, hsType } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn))) {
      return reply.code(400).send({ ok: false, error: "Missing or non-numeric dfn" });
    }
    if (!id) {
      return reply.code(400).send({ ok: false, error: "Missing report id" });
    }

    const result = await getClinicalReportText(
      String(dfn),
      String(id),
      String(hsType || ""),
      auditActor(request),
      session.tenantId,
    );
    return result;
  });

  /* ── GET /analytics/etl/status ──────────────────────────── */
  server.get("/analytics/etl/status", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_admin", reply);
    return { ok: true, ...getEtlStatus() };
  });

  /* ── POST /analytics/etl/sync ──────────────────────────── */
  server.post("/analytics/etl/sync", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireAnalyticsPermission(session, "analytics_admin", reply);

    const { buckets: hourly } = queryAggregatedMetrics({ period: "hourly", limit: 5000 });
    const { buckets: daily } = queryAggregatedMetrics({ period: "daily", limit: 5000 });

    const result = await syncBucketsToOcto(hourly, daily);

    audit("analytics.etl_sync" as AuditAction, "success", auditActor(request), {
      detail: { ...result, hourlyTotal: hourly.length, dailyTotal: daily.length },
    });

    return { ok: true, ...result };
  });

  log.info("Analytics routes registered (Phase 25)");
}
