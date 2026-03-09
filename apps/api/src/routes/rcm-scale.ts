/**
 * RCM Scale Hardening — API Routes
 *
 * Phase 242 (Wave 6 P5): Batch submission, health monitoring dashboard,
 * and circuit breaker management endpoints.
 *
 * Routes:
 *   POST /rcm/batch/submit           — Submit a batch of claims
 *   GET  /rcm/batch/:batchId         — Get batch status
 *   GET  /rcm/batch                  — List recent batches
 *   GET  /rcm/connectors/health/live — Live health probe (triggers immediate probe)
 *   GET  /rcm/connectors/health/history — Health timeline for all connectors
 *   GET  /rcm/connectors/health/:id  — Health history for one connector
 *   GET  /rcm/connectors/circuit-breakers — Circuit breaker states
 *   POST /rcm/connectors/circuit-breakers/:id/reset — Reset a circuit breaker
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { submitBatch, getBatchStatus, listBatches } from '../rcm/edi/batch-processor.js';
import {
  probeAllConnectors,
  getHealthHistory,
  getConnectorHealthHistory,
  isHealthMonitorRunning,
} from '../rcm/connectors/health-monitor.js';
import { getConnectorCbStats, resetConnectorCb } from '../rcm/connectors/connector-resilience.js';

export default async function rcmScaleRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any): string | null {
    const headerTenantId = request?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    const requestTenantId =
      typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
        ? request.tenantId.trim()
        : undefined;
    const sessionTenantId =
      typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
        ? request.session.tenantId.trim()
        : undefined;
    return headerTenant || requestTenantId || sessionTenantId || null;
  }

  function requireTenantId(request: any, reply: any): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  /** POST /rcm/batch/submit — Submit a batch of claims */
  server.post('/rcm/batch/submit', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const claimIds = body.claimIds;
    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return reply.code(400).send({ ok: false, error: 'claimIds array required' });
    }

    const batch = submitBatch({
      claimIds,
      concurrency: body.concurrency,
      tenantId,
    });

    return reply.code(202).send({ ok: true, batch });
  });

  /** GET /rcm/batch/:batchId — Get batch status */
  server.get('/rcm/batch/:batchId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { batchId } = request.params as { batchId: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const batch = getBatchStatus(batchId, tenantId);
    if (!batch) {
      return reply.code(404).send({ ok: false, error: 'Batch not found' });
    }
    return reply.send({ ok: true, batch });
  });

  /** GET /rcm/batch — List recent batches */
  server.get('/rcm/batch', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50', 10);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const batches = listBatches(limit, tenantId);
    return reply.send({ ok: true, count: batches.length, batches });
  });

  /** GET /rcm/connectors/health/live — Trigger live health probe */
  server.get('/rcm/connectors/health/live', async (_request, reply) => {
    const results = await probeAllConnectors();
    return reply.send({
      ok: true,
      monitorRunning: isHealthMonitorRunning(),
      count: results.length,
      results,
    });
  });

  /** GET /rcm/connectors/health/history — Get health timeline */
  server.get('/rcm/connectors/health/history', async (_request, reply) => {
    const history = getHealthHistory();
    return reply.send({ ok: true, count: history.length, connectors: history });
  });

  /** GET /rcm/connectors/health/:id — Health history for one connector */
  server.get('/rcm/connectors/health/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = getConnectorHealthHistory(id);
    if (!history) {
      return reply.code(404).send({ ok: false, error: 'Connector not found' });
    }
    return reply.send({ ok: true, connector: history });
  });

  /** GET /rcm/connectors/circuit-breakers — All CB states */
  server.get('/rcm/connectors/circuit-breakers', async (_request, reply) => {
    const stats = getConnectorCbStats();
    return reply.send({ ok: true, count: stats.length, circuitBreakers: stats });
  });

  /** POST /rcm/connectors/circuit-breakers/:id/reset — Reset one CB */
  server.post('/rcm/connectors/circuit-breakers/:id/reset', async (request, reply) => {
    const { id } = request.params as { id: string };
    resetConnectorCb(id);
    return reply.send({ ok: true, connectorId: id, message: 'Circuit breaker reset' });
  });
}
