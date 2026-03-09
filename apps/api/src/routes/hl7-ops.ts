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

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  buildOpsDashboard,
  getThroughput,
  createSlaConfig,
  listSlaConfigs,
  getSlaConfig,
  deleteSlaConfig,
  evaluateSlas,
  listSlaViolations,
  acknowledgeSlaViolation,
  queueForRetry,
  listRetryQueue,
  getRetryQueueStats,
  getRetryDueEntries,
  getRetryState,
  recordRetryResult,
  getOpsStoreStats,
  DEFAULT_RETRY_POLICY,
} from '../hl7/hl7-ops-monitor.js';
import { getEndpoint } from '../hl7/tenant-endpoints.js';

function getTenantId(request: any): string | null {
  const sessionTenantId = request?.session?.tenantId;
  if (typeof sessionTenantId === 'string' && sessionTenantId.trim().length > 0) {
    return sessionTenantId.trim();
  }
  const requestTenantId = request?.tenantId;
  if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
    return requestTenantId.trim();
  }
  const headerTenantId = request?.headers?.['x-tenant-id'];
  if (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) {
    return headerTenantId.trim();
  }
  return null;
}

function requireTenantId(request: any, reply: any): string | null {
  const tenantId = getTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export async function hl7OpsRoutes(app: FastifyInstance): Promise<void> {
  // ─── Dashboard ───────────────────────────────────────────────────

  app.get('/hl7/ops/dashboard', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const dashboard = buildOpsDashboard(tenantId);
    return { ok: true, dashboard };
  });

  // ─── Throughput ──────────────────────────────────────────────────

  app.get('/hl7/ops/throughput/:endpointId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { endpointId } = request.params as { endpointId: string };
    const query = request.query as Record<string, string>;
    const minutes = parseInt(query.minutes || '60', 10);
    const endpoint = getEndpoint(endpointId);
    if (!endpoint || endpoint.tenantId !== tenantId) {
      return { ok: false, error: 'endpoint_not_found' };
    }
    const throughput = getThroughput(endpointId, minutes);
    return { ok: true, throughput };
  });

  // ─── SLA Configuration ──────────────────────────────────────────

  app.post('/hl7/ops/sla', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { targetId, description, deliveryRateTarget, p95LatencyTargetMs, p99LatencyTargetMs } =
      body;
    if (!targetId) {
      reply.code(400);
      return { ok: false, error: 'targetId is required' };
    }
    const config = createSlaConfig({
      targetId,
      tenantId,
      description: description || '',
      deliveryRateTarget: deliveryRateTarget ?? 0.995,
      p95LatencyTargetMs: p95LatencyTargetMs ?? 500,
      p99LatencyTargetMs: p99LatencyTargetMs ?? 2000,
      windowMinutes: body.windowMinutes ?? 60,
      enabled: body.enabled !== false,
    });
    reply.code(201);
    return { ok: true, sla: config };
  });

  app.get('/hl7/ops/sla', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const configs = listSlaConfigs(tenantId);
    return { ok: true, count: configs.length, slaConfigs: configs };
  });

  app.get('/hl7/ops/sla/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const config = getSlaConfig(id);
    if (!config || config.tenantId !== tenantId) {
      reply.code(404);
      return { ok: false, error: 'sla_config_not_found' };
    }
    return { ok: true, sla: config };
  });

  app.delete('/hl7/ops/sla/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const deleted = deleteSlaConfig(id, tenantId);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: 'sla_config_not_found' };
    }
    return { ok: true, deleted: true };
  });

  app.post('/hl7/ops/sla/evaluate', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const violations = evaluateSlas().filter((violation) => {
      const config = getSlaConfig(violation.slaId);
      return config?.tenantId === tenantId;
    });
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

  app.get('/hl7/ops/sla/violations', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const query = request.query as Record<string, string>;
    const violations = listSlaViolations({
      tenantId,
      slaId: query.slaId,
      acknowledged:
        query.acknowledged === 'true' ? true : query.acknowledged === 'false' ? false : undefined,
      limit: parseInt(query.limit || '100', 10),
    });
    return { ok: true, count: violations.length, violations };
  });

  app.post('/hl7/ops/sla/violations/:id/ack', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const success = acknowledgeSlaViolation(id, tenantId);
    if (!success) {
      reply.code(404);
      return { ok: false, error: 'violation_not_found' };
    }
    return { ok: true, acknowledged: true };
  });

  // ─── Retry Queue ─────────────────────────────────────────────────

  app.post('/hl7/ops/retry/:dlqId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { dlqId } = request.params as { dlqId: string };
    const body = (request.body as any) || {};
    const policy = body.policy || DEFAULT_RETRY_POLICY;
    const entry = queueForRetry(dlqId, tenantId, policy);
    reply.code(201);
    return { ok: true, retryEntry: entry };
  });

  app.get('/hl7/ops/retry', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const queue = listRetryQueue(tenantId);
    return { ok: true, count: queue.length, retryQueue: queue };
  });

  app.get('/hl7/ops/retry/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const stats = getRetryQueueStats(tenantId);
    return { ok: true, ...stats };
  });

  app.get('/hl7/ops/retry/due', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const due = getRetryDueEntries(tenantId);
    return { ok: true, count: due.length, dueEntries: due };
  });

  // ─── Retry State per DLQ entry ──────────────────────────────────

  app.get('/hl7/ops/retry/:dlqId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { dlqId } = request.params as { dlqId: string };
    const entry = getRetryState(dlqId, tenantId);
    if (!entry) {
      reply.code(404);
      return { ok: false, error: 'retry_entry_not_found' };
    }
    return { ok: true, retryEntry: entry };
  });

  app.post('/hl7/ops/retry/:dlqId/result', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { dlqId } = request.params as { dlqId: string };
    const body = (request.body as any) || {};
    recordRetryResult(dlqId, tenantId, !!body.success, body.error);
    return { ok: true };
  });

  // ─── Store Stats ────────────────────────────────────────────────

  app.get('/hl7/ops/store-stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, ...getOpsStoreStats(tenantId) };
  });
}
