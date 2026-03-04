/**
 * global-routing-routes.ts -- REST endpoints for Global Routing
 *
 * Phase 329 (W15-P3)
 *
 * Admin-only via AUTH_RULES pattern /platform/routing/.
 *
 * Routes:
 *   GET    /platform/routing/config              -- get routing config
 *   POST   /platform/routing/config              -- update routing config
 *   GET    /platform/routing/summary             -- routing summary
 *   POST   /platform/routing/resolve             -- resolve a route (test)
 *   GET    /platform/routing/audit               -- routing audit log
 *
 *   POST   /platform/routing/ingresses           -- register regional ingress
 *   GET    /platform/routing/ingresses           -- list ingresses
 *   GET    /platform/routing/ingresses/:id       -- get ingress
 *   POST   /platform/routing/ingresses/:id/health -- update ingress health
 *
 *   POST   /platform/routing/dns                 -- create DNS record
 *   GET    /platform/routing/dns                 -- list DNS records
 *   GET    /platform/routing/dns/:tenantId       -- get tenant DNS
 *   POST   /platform/routing/dns/:tenantId/update -- update DNS target
 *
 *   POST   /platform/routing/failover            -- initiate failover
 *   POST   /platform/routing/failover/:id/complete -- complete failover
 *   GET    /platform/routing/failover            -- list failovers
 *   GET    /platform/routing/failover/:id        -- get failover event
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { log } from '../lib/logger.js';
import {
  getRoutingConfig,
  updateRoutingConfig,
  getRoutingSummary,
  resolveRoute,
  getRoutingAuditLog,
  registerIngress,
  listIngresses,
  getIngress,
  updateIngressHealth,
  createDnsRecord,
  listDnsRecords,
  getDnsRecord,
  updateDnsTarget,
  initiateFailover,
  completeFailover,
  listFailovers,
  getFailoverEvent,
  type FailoverStatus,
} from '../services/global-routing.js';

function getActor(request: FastifyRequest): string {
  return (request as any).session?.duz || 'unknown';
}

export async function globalRoutingRoutes(server: FastifyInstance): Promise<void> {
  // ─── Config ───────────────────────────────────────────────────────────

  server.get('/platform/routing/config', async () => {
    return { ok: true, config: getRoutingConfig() };
  });

  server.post('/platform/routing/config', async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    const config = updateRoutingConfig(body);
    return { ok: true, config };
  });

  server.get('/platform/routing/summary', async () => {
    return { ok: true, ...getRoutingSummary() };
  });

  // ─── Route Resolution (test endpoint) ─────────────────────────────────

  server.post('/platform/routing/resolve', async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    const result = resolveRoute(body.host || undefined, body.url || '/', body.headers || {});
    return { ok: true, ...result };
  });

  // ─── Audit ────────────────────────────────────────────────────────────

  server.get('/platform/routing/audit', async (request: FastifyRequest) => {
    const query = request.query as any;
    const limit = Math.min(parseInt(query.limit, 10) || 100, 500);
    const offset = parseInt(query.offset, 10) || 0;
    const entries = getRoutingAuditLog(limit, offset);
    return { ok: true, entries, count: entries.length };
  });

  // ─── Ingress Management ───────────────────────────────────────────────

  server.post(
    '/platform/routing/ingresses',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      if (!body.region || !body.clusterId || !body.endpoint) {
        return reply
          .code(400)
          .send({ ok: false, error: 'region, clusterId, and endpoint are required' });
      }
      try {
        const ingress = registerIngress(body, getActor(request));
        return reply.code(201).send({ ok: true, ingress });
      } catch (err: any) {
        log.warn('Ingress registration failed', { error: err.message });
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'Ingress registration failed' });
      }
    }
  );

  server.get('/platform/routing/ingresses', async () => {
    const ingresses = listIngresses();
    return { ok: true, ingresses, count: ingresses.length };
  });

  server.get(
    '/platform/routing/ingresses/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const ingress = getIngress(id);
      if (!ingress) return reply.code(404).send({ ok: false, error: 'Ingress not found' });
      return { ok: true, ingress };
    }
  );

  server.post(
    '/platform/routing/ingresses/:id/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const ingress = getIngress(id);
      if (!ingress) return reply.code(404).send({ ok: false, error: 'Ingress not found' });
      const body = (request.body as any) || {};
      const updated = updateIngressHealth(ingress.region, !!body.healthy);
      return { ok: true, ingress: updated };
    }
  );

  // ─── DNS Management ───────────────────────────────────────────────────

  server.post('/platform/routing/dns', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.tenantId || !body.targetValue || !body.region) {
      return reply
        .code(400)
        .send({ ok: false, error: 'tenantId, targetValue, and region are required' });
    }
    try {
      const record = createDnsRecord(body, getActor(request));
      return reply.code(201).send({ ok: true, record });
    } catch (err: any) {
      log.warn('DNS record creation failed', { error: err.message });
      return reply
        .code(err.statusCode || 500)
        .send({ ok: false, error: 'DNS record creation failed' });
    }
  });

  server.get('/platform/routing/dns', async (request: FastifyRequest) => {
    const query = request.query as any;
    const records = listDnsRecords({
      region: query.region,
      active: query.active === 'true' ? true : query.active === 'false' ? false : undefined,
    });
    return { ok: true, records, count: records.length };
  });

  server.get(
    '/platform/routing/dns/:tenantId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.params as any;
      const record = getDnsRecord(tenantId);
      if (!record)
        return reply.code(404).send({ ok: false, error: 'DNS record not found for tenant' });
      return { ok: true, record };
    }
  );

  server.post(
    '/platform/routing/dns/:tenantId/update',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.params as any;
      const body = (request.body as any) || {};
      if (!body.targetValue) {
        return reply.code(400).send({ ok: false, error: 'targetValue is required' });
      }
      try {
        const record = updateDnsTarget(
          tenantId,
          body.targetValue,
          body.ttlSeconds,
          getActor(request)
        );
        return { ok: true, record };
      } catch (err: any) {
        log.warn('DNS target update failed', { error: err.message });
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'DNS target update failed' });
      }
    }
  );

  // ─── Failover ─────────────────────────────────────────────────────────

  server.post(
    '/platform/routing/failover',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      if (!body.tenantId || !body.toRegion || !body.reason) {
        return reply
          .code(400)
          .send({ ok: false, error: 'tenantId, toRegion, and reason are required' });
      }
      try {
        const event = initiateFailover(body, getActor(request));
        return reply.code(201).send({ ok: true, event });
      } catch (err: any) {
        log.warn('Failover initiation failed', { error: err.message });
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'Failover initiation failed' });
      }
    }
  );

  server.post(
    '/platform/routing/failover/:id/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      if (!body.toClusterId || !body.newDnsTarget) {
        return reply
          .code(400)
          .send({ ok: false, error: 'toClusterId and newDnsTarget are required' });
      }
      try {
        const event = completeFailover(id, body.toClusterId, body.newDnsTarget, getActor(request));
        return { ok: true, event };
      } catch (err: any) {
        log.warn('Failover completion failed', { error: err.message });
        return reply
          .code(err.statusCode || 500)
          .send({ ok: false, error: 'Failover completion failed' });
      }
    }
  );

  server.get('/platform/routing/failover', async (request: FastifyRequest) => {
    const query = request.query as any;
    const events = listFailovers({
      tenantId: query.tenantId,
      status: query.status as FailoverStatus | undefined,
    });
    return { ok: true, events, count: events.length };
  });

  server.get(
    '/platform/routing/failover/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const event = getFailoverEvent(id);
      if (!event) return reply.code(404).send({ ok: false, error: 'Failover event not found' });
      return { ok: true, event };
    }
  );
}

export default globalRoutingRoutes;
