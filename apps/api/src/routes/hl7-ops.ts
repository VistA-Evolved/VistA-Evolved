/**
 * HL7v2 Ops Routes
 *
 * Phase 320 (W14-P4): Operational maturity endpoints.
 *
 * Routes:
 *   GET    /hl7/ops/dashboard          — unified ops dashboard
 *   GET    /hl7/ops/throughput/:endpointId — time-bucketed throughput
 *   POST   /hl7/ops/sla               — create SLA config
 *   GET    /hl7/ops/sla               — list SLA configs
 *   DELETE /hl7/ops/sla/:id           — delete SLA config
 *   POST   /hl7/ops/sla/evaluate      — trigger SLA evaluation
 *   GET    /hl7/ops/sla/violations    — list violations
 *   POST   /hl7/ops/sla/violations/:id/ack — acknowledge violation
 *   POST   /hl7/ops/retry/:dlqId      — queue DLQ entry for auto-retry
 *   GET    /hl7/ops/retry             — list retry queue
 *   GET    /hl7/ops/retry/stats       — retry queue stats
 *   GET    /hl7/ops/retry/due         — entries due for retry
 */

import type { FastifyInstance } from "fastify";
import {
  buildOpsDashboard,
  getThroughput,
  createSlaConfig,
  listSlaConfigs,
  deleteSlaConfig,
  evaluateSlas,
  listSlaViolations,
  acknowledgeSlaViolation,
  queueForRetry,
  listRetryQueue,
  getRetryQueueStats,
  getRetryDueEntries,
  DEFAULT_RETRY_POLICY,
} from "../hl7/hl7-ops-monitor.js";

const DEFAULT_TENANT = "default";

function getTenantId(request: any): string {
  return (request as any).session?.tenantId || DEFAULT_TENANT;
}

export async function hl7OpsRoutes(app: FastifyInstance): Promise<void> {

  // ─── Dashboard ───────────────────────────────────────────────────

  app.get("/hl7/ops/dashboard", async (request) => {
    const dashboard = buildOpsDashboard(getTenantId(request));
    return { ok: true, dashboard };
  });

  // ─── Throughput ──────────────────────────────────────────────────

  app.get("/hl7/ops/throughput/:endpointId", async (request) => {
    const { endpointId } = request.params as { endpointId: string };
    const query = request.query as Record<string, string>;
    const minutes = parseInt(query.minutes || "60", 10);
    const throughput = getThroughput(endpointId, minutes);
    return { ok: true, throughput };
  });

  // ─── SLA Configuration ──────────────────────────────────────────

  app.post("/hl7/ops/sla", async (request, reply) => {
    const body = (request.body as any) || {};
    const { targetId, description, deliveryRateTarget, p95LatencyTargetMs, p99LatencyTargetMs } = body;
    if (!targetId) {
      reply.code(400);
      return { ok: false, error: "targetId is required" };
    }
    const config = createSlaConfig({
      targetId,
      tenantId: getTenantId(request),
      description: description || "",
      deliveryRateTarget: deliveryRateTarget ?? 0.995,
      p95LatencyTargetMs: p95LatencyTargetMs ?? 500,
      p99LatencyTargetMs: p99LatencyTargetMs ?? 2000,
      windowMinutes: body.windowMinutes ?? 60,
      enabled: body.enabled !== false,
    });
    reply.code(201);
    return { ok: true, sla: config };
  });

  app.get("/hl7/ops/sla", async (request) => {
    const configs = listSlaConfigs(getTenantId(request));
    return { ok: true, count: configs.length, slaConfigs: configs };
  });

  app.delete("/hl7/ops/sla/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteSlaConfig(id);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: "sla_config_not_found" };
    }
    return { ok: true, deleted: true };
  });

  app.post("/hl7/ops/sla/evaluate", async () => {
    const violations = evaluateSlas();
    return {
      ok: true,
      newViolations: violations.length,
      violations: violations.map((v) => ({
        id: v.id,
        slaId: v.slaId,
        metric: v.metric,
        target: v.target,
        actual: v.actual,
      })),
    };
  });

  app.get("/hl7/ops/sla/violations", async (request) => {
    const query = request.query as Record<string, string>;
    const violations = listSlaViolations({
      slaId: query.slaId,
      acknowledged: query.acknowledged === "true" ? true : query.acknowledged === "false" ? false : undefined,
      limit: parseInt(query.limit || "100", 10),
    });
    return { ok: true, count: violations.length, violations };
  });

  app.post("/hl7/ops/sla/violations/:id/ack", async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = acknowledgeSlaViolation(id);
    if (!success) {
      reply.code(404);
      return { ok: false, error: "violation_not_found" };
    }
    return { ok: true, acknowledged: true };
  });

  // ─── Retry Queue ─────────────────────────────────────────────────

  app.post("/hl7/ops/retry/:dlqId", async (request, reply) => {
    const { dlqId } = request.params as { dlqId: string };
    const body = (request.body as any) || {};
    const policy = body.policy || DEFAULT_RETRY_POLICY;
    const entry = queueForRetry(dlqId, policy);
    reply.code(201);
    return { ok: true, retryEntry: entry };
  });

  app.get("/hl7/ops/retry", async () => {
    const queue = listRetryQueue();
    return { ok: true, count: queue.length, retryQueue: queue };
  });

  app.get("/hl7/ops/retry/stats", async () => {
    const stats = getRetryQueueStats();
    return { ok: true, ...stats };
  });

  app.get("/hl7/ops/retry/due", async () => {
    const due = getRetryDueEntries();
    return { ok: true, count: due.length, dueEntries: due };
  });
}
