/**
 * RCM Ops Routes — Phase 82: RCM Adapter Expansion v2
 *
 * Operational visibility endpoints for the RCM subsystem.
 * No fake data — if a connector/adapter is not connected,
 * the response says so with pendingTargets.
 *
 * Endpoints:
 *   GET  /rcm/ops/connector-state     -- All connector probe states
 *   GET  /rcm/ops/adapter-state       -- All adapter probe states
 *   GET  /rcm/ops/state-summary       -- Aggregated state summary
 *   GET  /rcm/ops/queue-depth         -- Job queue depth & stats
 *   GET  /rcm/ops/queue-jobs          -- List jobs (paginated, filterable)
 *   POST /rcm/ops/enqueue-eligibility -- Enqueue an eligibility check job
 *   POST /rcm/ops/enqueue-status-poll -- Enqueue a claim status poll job
 *   GET  /rcm/ops/denial-queue        -- Denial workqueue items + stats
 *   GET  /rcm/ops/scheduler-status    -- Polling scheduler status
 *   GET  /rcm/ops/dashboard           -- Unified ops dashboard
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getAllConnectorStates,
  getAllAdapterStates,
  getConnectorStateSummary,
} from "./connectors/connector-state.js";
import {
  auditedEnqueue,
  getJobStatsByTenant,
  listJobsByTenant,
} from "./jobs/job-audit-bridge.js";
import { getPollingScheduler } from "./jobs/polling-scheduler.js";
import {
  listWorkqueueItems,
  getWorkqueueStats,
} from "./workqueues/workqueue-store.js";
import { requirePermission, requireRcmWrite } from "../auth/rbac.js";
import { safeErr } from "../lib/safe-error.js";

/* ── Route plugin ───────────────────────────────────────────── */

export default async function rcmOpsRoutes(
  server: FastifyInstance,
): Promise<void> {
  /* ── RBAC: reads require rcm:read, writes require rcm:write ── */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) return; // security.ts already rejected unauthenticated

    const method = request.method;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requireRcmWrite(session, reply, {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
    } else {
      requirePermission(session, "rcm:read", reply, {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
    }
  });
  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/connector-state                                */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/connector-state",
    async (_request: FastifyRequest) => {
      const states = await getAllConnectorStates();
      return { ok: true, connectors: states };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/adapter-state                                  */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/adapter-state",
    async (_request: FastifyRequest) => {
      const states = await getAllAdapterStates();
      return { ok: true, adapters: states };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/state-summary                                  */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/state-summary",
    async (_request: FastifyRequest) => {
      const summary = await getConnectorStateSummary();
      return { ok: true, ...summary };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/queue-depth                                    */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/queue-depth",
    async (request: FastifyRequest) => {
      const q = request.query as Record<string, string>;
      const tenantId = q.tenantId ?? "default";
      const stats = await getJobStatsByTenant(tenantId);
      return { ok: true, tenantId, ...stats };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/queue-jobs                                     */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/queue-jobs",
    async (request: FastifyRequest) => {
      const q = request.query as Record<string, string>;
      const tenantId = q.tenantId ?? "default";
      const status = q.status as any;
      const type = q.type as any;
      const offset = parseInt(q.offset ?? "0", 10) || 0;
      const limit = Math.min(parseInt(q.limit ?? "50", 10) || 50, 200);

      const result = await listJobsByTenant(tenantId, {
        status,
        type,
        limit,
        offset,
      });
      return { ok: true, tenantId, ...result };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* POST /rcm/ops/enqueue-eligibility                           */
  /* ─────────────────────────────────────────────────────────── */
  server.post(
    "/rcm/ops/enqueue-eligibility",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const session = (request as any).session;

      const { payerCode, subscriberMemberId, tenantId } = body;
      if (!payerCode || !subscriberMemberId) {
        reply.code(400);
        return {
          ok: false,
          error: "payerCode and subscriberMemberId are required",
        };
      }

      try {
        const result = await auditedEnqueue({
          type: "ELIGIBILITY_CHECK",
          payload: {
            payerCode,
            subscriberMemberId,
            serviceType: body.serviceType ?? "30", // Health benefit plan coverage
          },
          tenantId: tenantId ?? "default",
          userId: session?.duz ?? "unknown",
          priority: body.priority ?? 5,
          idempotencyKey: body.idempotencyKey,
        });

        return { ok: true, ...result, type: "ELIGIBILITY_CHECK" };
      } catch (err: unknown) {
        reply.code(422);
        return { ok: false, error: safeErr(err) };
      }
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* POST /rcm/ops/enqueue-status-poll                           */
  /* ─────────────────────────────────────────────────────────── */
  server.post(
    "/rcm/ops/enqueue-status-poll",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const session = (request as any).session;

      const { claimId, payerCode } = body;
      if (!claimId) {
        reply.code(400);
        return { ok: false, error: "claimId is required" };
      }

      try {
        const result = await auditedEnqueue({
          type: "STATUS_POLL",
          payload: {
            claimId,
            payerCode: payerCode ?? "unknown",
            trackingNumber: body.trackingNumber,
          },
          tenantId: body.tenantId ?? "default",
          userId: session?.duz ?? "unknown",
          priority: body.priority ?? 5,
          idempotencyKey: body.idempotencyKey,
        });

        return { ok: true, ...result, type: "STATUS_POLL" };
      } catch (err: unknown) {
        reply.code(422);
        return { ok: false, error: safeErr(err) };
      }
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/denial-queue                                   */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/denial-queue",
    async (request: FastifyRequest) => {
      const q = request.query as Record<string, string>;
      const tenantId = q.tenantId ?? "default";
      const status = q.status as any;
      const priority = q.priority as any;
      const offset = parseInt(q.offset ?? "0", 10) || 0;
      const limit = Math.min(parseInt(q.limit ?? "50", 10) || 50, 200);

      const items = await listWorkqueueItems({
        type: "denial",
        status,
        priority,
        tenantId,
        limit,
        offset,
      });

      const stats = await getWorkqueueStats(tenantId);

      return {
        ok: true,
        tenantId,
        denials: items,
        stats: {
          denialCount: stats.byType.denial,
          openCount: stats.byStatus.open,
          escalatedCount: stats.byStatus.escalated,
          totalWorkqueue: stats.total,
        },
        pendingTargets: {
          note: "Denial auto-routing requires payer-specific CARC/RARC mappings",
          configRequired: ["payer rule engine rules for each payer"],
          migrationPath: "Phase 43+ payer rules engine -> denial auto-classification",
        },
      };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/scheduler-status                               */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/scheduler-status",
    async (_request: FastifyRequest) => {
      const scheduler = getPollingScheduler();
      const status = scheduler.getStatus();

      return {
        ok: true,
        scheduler: {
          ...status,
          note: status.running
            ? "Polling scheduler is active"
            : "Polling scheduler is stopped. Set ELIGIBILITY_POLLING_ENABLED=true / CLAIM_STATUS_POLLING_ENABLED=true to enable.",
        },
      };
    },
  );

  /* ─────────────────────────────────────────────────────────── */
  /* GET /rcm/ops/dashboard                                      */
  /* ─────────────────────────────────────────────────────────── */
  server.get(
    "/rcm/ops/dashboard",
    async (request: FastifyRequest) => {
      const q = request.query as Record<string, string>;
      const tenantId = q.tenantId ?? "default";

      // Gather all state — single call to getConnectorStateSummary avoids triple-probe
      const [
        stateSummary,
        jobStats,
        schedulerStatus,
        workqueueStats,
      ] = await Promise.all([
        getConnectorStateSummary(),
        getJobStatsByTenant(tenantId),
        Promise.resolve(getPollingScheduler().getStatus()),
        getWorkqueueStats(tenantId),
      ]);

      const { connectors: connectorStates, adapters: adapterStates, summary } = stateSummary;

      return {
        ok: true,
        tenantId,
        timestamp: new Date().toISOString(),
        connectivity: {
          summary,
          connectors: connectorStates,
          adapters: adapterStates,
        },
        jobs: {
          ...jobStats,
          scheduler: {
            running: schedulerStatus.running,
            registeredJobs: schedulerStatus.jobConfigs.length,
          },
        },
        workqueues: workqueueStats,
        systemHealth: {
          connectorHealth:
            summary.connected > 0 ? "operational" : "no-live-connectors",
          jobQueueHealth:
            jobStats.deadLetter === 0 ? "healthy" : "has-dlq-items",
          workqueueHealth:
            workqueueStats.byStatus.escalated === 0
              ? "healthy"
              : "has-escalations",
        },
      };
    },
  );
}
