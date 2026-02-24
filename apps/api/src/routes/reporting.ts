/**
 * Reporting & export routes — Phase 19A.
 *
 * PLATFORM OPERATIONAL REPORTS ONLY.
 * These endpoints track system health, integration status, audit events,
 * and clinical activity metrics. They are NOT VistA clinical reports.
 *
 * VistA clinical reports (Health Summary, lab cumulatives, etc.) are served
 * via ORWRP REPORT TEXT in the main VistA routes (index.ts).
 *
 * All reports are:
 *   - RBAC-gated (admin role required)
 *   - Paginated with configurable limits
 *   - Cached with short TTLs
 *   - Fully audited
 *
 * See: docs/reporting-grounding.md
 *
 * Routes:
 *   GET  /reports/operations        — RPC health, circuit breaker, cache, process metrics
 *   GET  /reports/integrations      — integration health summary + per-entry queue metrics
 *   GET  /reports/audit             — audit event summary + filtered event list
 *   GET  /reports/clinical-activity — clinical action counts (no PHI text)
 *   POST /reports/export            — create audited export job (CSV/JSON)
 *   GET  /reports/export/jobs       — list export jobs
 *   GET  /reports/export/:jobId     — download completed export
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { audit, queryAuditEvents, getAuditStats, type AuditAction } from "../lib/audit.js";
import { log } from "../lib/logger.js";
import { getRpcHealthSummary } from "../lib/rpc-resilience.js";
import { getIntegrationHealthSummary } from "../config/integration-registry.js";
import { REPORT_CONFIG, EXPORT_CONFIG } from "../config/report-config.js";
import {
  checkExportPolicy,
  createExportJob,
  executeExportJob,
  getExportJob,
  listExportJobs,
  type ExportReportType,
} from "../lib/export-governance.js";
import type { ExportFormat } from "../config/report-config.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

/** Simple in-memory cache with TTL. */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const reportCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = reportCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    reportCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  reportCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Clamp page size to configured limits. */
function clampPageSize(requested?: number): number {
  const size = requested || REPORT_CONFIG.defaultPageSize;
  return Math.min(Math.max(1, size), REPORT_CONFIG.maxPageSize);
}

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

export default async function reportingRoutes(server: FastifyInstance): Promise<void> {

  /* ── GET /reports/operations ─────────────────────────────────── */
  server.get("/reports/operations", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const cached = getCached<object>("report:operations");
    if (cached) {
      audit("report.generate" as AuditAction, "success", auditActor(request), {
        detail: { report: "operations", cached: true },
      });
      return { ok: true, cached: true, ...cached };
    }

    const rpcHealth = getRpcHealthSummary();
    const mem = process.memoryUsage();

    const report = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      process: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
        rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        pid: process.pid,
      },
      rpcHealth: {
        circuitBreaker: rpcHealth.circuitBreaker,
        cacheSize: rpcHealth.cacheSize,
        totalRpcsCalled: rpcHealth.totalRpcsCalled,
        totalSuccesses: rpcHealth.totalSuccesses,
        totalFailures: rpcHealth.totalFailures,
        totalTimeouts: rpcHealth.totalTimeouts,
      },
      rpcMetrics: rpcHealth.rpcMetrics,
    };

    setCache("report:operations", report, REPORT_CONFIG.operationsCacheTtlMs);

    audit("report.generate" as AuditAction, "success", auditActor(request), {
      detail: { report: "operations", cached: false },
    });

    return { ok: true, cached: false, ...report };
  });

  /* ── GET /reports/integrations ───────────────────────────────── */
  server.get("/reports/integrations", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const cached = getCached<object>("report:integrations");
    if (cached) {
      audit("report.generate" as AuditAction, "success", auditActor(request), {
        detail: { report: "integrations", cached: true },
      });
      return { ok: true, cached: true, ...cached };
    }

    const tenantId = (request.query as any)?.tenantId || "default";
    const health = getIntegrationHealthSummary(tenantId);

    const report = {
      timestamp: new Date().toISOString(),
      tenantId,
      summary: {
        total: health.total,
        enabled: health.enabled,
        connected: health.connected,
        disconnected: health.disconnected,
        degraded: health.degraded,
        unknown: health.unknown,
        disabled: health.disabled,
      },
      byType: health.byType,
      entries: health.entries.map((e: any) => ({
        id: e.id,
        label: e.label,
        type: e.type,
        status: e.status,
        enabled: e.enabled,
        lastChecked: e.lastChecked,
        queueMetrics: e.queueMetrics,
      })),
    };

    setCache("report:integrations", report, REPORT_CONFIG.integrationsCacheTtlMs);

    audit("report.generate" as AuditAction, "success", auditActor(request), {
      detail: { report: "integrations", cached: false, tenantId },
    });

    return { ok: true, cached: false, ...report };
  });

  /* ── GET /reports/audit ──────────────────────────────────────── */
  server.get("/reports/audit", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const query = request.query as any;
    const limit = clampPageSize(query?.limit ? Number(query.limit) : undefined);
    const actionPrefix = query?.actionPrefix;
    const actorDuz = query?.actorDuz;
    const since = query?.since;

    // Enforce max audit range
    let effectiveSince = since;
    if (!since) {
      const cutoff = new Date(Date.now() - REPORT_CONFIG.maxAuditRangeDays * 24 * 60 * 60 * 1000);
      effectiveSince = cutoff.toISOString();
    }

    const stats = getAuditStats();
    const events = queryAuditEvents({
      actionPrefix,
      actorDuz,
      since: effectiveSince,
      limit,
    });

    audit("report.generate" as AuditAction, "success", auditActor(request), {
      detail: { report: "audit", eventCount: events.length, filters: { actionPrefix, actorDuz, since: effectiveSince } },
    });

    return {
      ok: true,
      stats: {
        total: stats.total,
        byAction: stats.byAction,
        byOutcome: stats.byOutcome,
        oldestTimestamp: stats.oldestTimestamp,
        newestTimestamp: stats.newestTimestamp,
      },
      page: {
        limit,
        returned: events.length,
      },
      events,
    };
  });

  /* ── GET /reports/clinical-activity ──────────────────────────── */
  server.get("/reports/clinical-activity", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const cached = getCached<object>("report:clinical");
    if (cached) {
      audit("report.generate" as AuditAction, "success", auditActor(request), {
        detail: { report: "clinical", cached: true },
      });
      return { ok: true, cached: true, ...cached };
    }

    // Aggregate clinical activity from audit events — counts only, no PHI text
    const allEvents = queryAuditEvents({ limit: 5000 });

    const clinicalCounts: Record<string, number> = {};
    const phiCounts: Record<string, number> = {};
    let totalClinicalActions = 0;
    let totalPhiAccess = 0;

    for (const event of allEvents) {
      if (event.action.startsWith("clinical.")) {
        clinicalCounts[event.action] = (clinicalCounts[event.action] || 0) + 1;
        totalClinicalActions++;
      }
      if (event.action.startsWith("phi.")) {
        phiCounts[event.action] = (phiCounts[event.action] || 0) + 1;
        totalPhiAccess++;
      }
    }

    // Unique patients touched (by DFN, derived from audit events)
    const uniquePatients = new Set(
      allEvents.filter((e) => e.patientDfn).map((e) => e.patientDfn),
    );

    // Unique providers acting
    const uniqueProviders = new Set(
      allEvents.filter((e) => e.actorDuz !== "anonymous" && e.actorDuz !== "system").map((e) => e.actorDuz),
    );

    const report = {
      timestamp: new Date().toISOString(),
      totalClinicalActions,
      totalPhiAccess,
      clinicalActionCounts: clinicalCounts,
      phiAccessCounts: phiCounts,
      uniquePatientCount: uniquePatients.size,
      uniqueProviderCount: uniqueProviders.size,
      note: "Counts only — no PHI text is included in this report.",
    };

    setCache("report:clinical", report, REPORT_CONFIG.clinicalCacheTtlMs);

    audit("report.generate" as AuditAction, "success", auditActor(request), {
      detail: { report: "clinical", cached: false },
    });

    return { ok: true, cached: false, ...report };
  });

  /* ── POST /reports/export ────────────────────────────────────── */
  server.post("/reports/export", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const body = request.body as any;
    const reportType = body?.reportType as ExportReportType;
    const format = (body?.format || "csv") as ExportFormat;
    const filters = body?.filters || {};

    if (!reportType || !["operations", "integrations", "audit", "clinical-activity", "clinical"].includes(reportType)) {
      reply.code(400);
      return { ok: false, error: "reportType must be one of: operations, integrations, audit, clinical-activity" };
    }

    const actor = auditActor(request);

    // Estimate row count based on report type
    let rowEstimate = 0;
    let rows: Record<string, unknown>[] = [];

    try {
      switch (reportType) {
        case "operations": {
          const health = getRpcHealthSummary();
          rows = Object.entries(health.rpcMetrics).map(([name, m]) => ({
            rpcName: name,
            calls: m.calls,
            successes: m.successes,
            failures: m.failures,
            timeouts: m.timeouts,
            avgMs: m.avgDurationMs,
            p95Ms: m.p95DurationMs,
          }));
          rowEstimate = rows.length;
          break;
        }
        case "integrations": {
          const tenantId = filters?.tenantId || "default";
          const health = getIntegrationHealthSummary(tenantId);
          rows = health.entries.map((e: any) => ({
            id: e.id,
            label: e.label,
            type: e.type,
            status: e.status,
            enabled: e.enabled,
            pending: e.queueMetrics?.pending ?? 0,
            processed: e.queueMetrics?.processed ?? 0,
            errors: e.queueMetrics?.errors ?? 0,
            avgLatencyMs: e.queueMetrics?.avgLatencyMs ?? 0,
          }));
          rowEstimate = rows.length;
          break;
        }
        case "audit": {
          const events = queryAuditEvents({
            actionPrefix: filters?.actionPrefix,
            actorDuz: filters?.actorDuz,
            since: filters?.since,
            limit: EXPORT_CONFIG.maxExportRows,
          });
          rows = events.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            action: e.action,
            outcome: e.outcome,
            actorDuz: e.actorDuz,
            actorName: e.actorName,
            actorRole: e.actorRole,
            requestId: e.requestId,
            patientDfn: e.patientDfn || "",
          }));
          rowEstimate = rows.length;
          break;
        }
        case "clinical": {
          // Clinical exports blocked by default (PHI policy)
          rowEstimate = 1;
          break;
        }
      }
    } catch (err: any) {
      log.error("Report data generation failed", { reportType, error: err.message });
      reply.code(500);
      return { ok: false, error: "Failed to generate report data" };
    }

    // Policy check
    const policy = checkExportPolicy(actor, reportType, format, rowEstimate);
    if (!policy.allowed) {
      audit("export.policy-check" as AuditAction, "denied", actor, {
        detail: { reportType, format, reason: policy.reason },
      });
      reply.code(403);
      return { ok: false, error: policy.reason };
    }

    // Create and execute export job
    const job = createExportJob(actor, reportType, format, filters);
    executeExportJob(job.id, rows);

    const result = getExportJob(job.id);
    if (!result || result.status === "failed") {
      reply.code(500);
      return { ok: false, error: result?.error || "Export failed" };
    }

    return {
      ok: true,
      jobId: result.id,
      status: result.status,
      rowCount: result.rowCount,
      format: result.format,
      downloadUrl: `/reports/export/${result.id}`,
    };
  });

  /* ── GET /reports/export/jobs ────────────────────────────────── */
  server.get("/reports/export/jobs", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const query = request.query as any;
    const duzFilter = query?.mine === "true" ? session.duz : undefined;
    const jobs = listExportJobs(duzFilter);

    // Strip data field from listing
    const stripped = jobs.map((j) => ({
      id: j.id,
      reportType: j.reportType,
      format: j.format,
      status: j.status,
      requestedAt: j.requestedAt,
      completedAt: j.completedAt,
      rowCount: j.rowCount,
      requestedBy: j.requestedBy.duz,
    }));

    return { ok: true, count: stripped.length, jobs: stripped };
  });

  /* ── GET /reports/export/:jobId ──────────────────────────────── */
  server.get("/reports/export/:jobId", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { jobId } = request.params as { jobId: string };
    const job = getExportJob(jobId);

    if (!job) {
      reply.code(404);
      return { ok: false, error: "Export job not found" };
    }

    if (job.status !== "completed") {
      return { ok: true, jobId: job.id, status: job.status, message: "Export not yet ready" };
    }

    // Serve the data as a downloadable file
    reply.header("Content-Type", job.mimeType || "application/octet-stream");
    reply.header("Content-Disposition", `attachment; filename="${job.reportType}-${job.id}.${job.format}"`);

    audit("export.download" as AuditAction, "success", auditActor(request), {
      detail: { jobId, format: job.format, rowCount: job.rowCount },
    });

    return reply.send(job.data);
  });
}
