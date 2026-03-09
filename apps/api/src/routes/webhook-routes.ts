/**
 * Webhook Routes -- Phase 356
 *
 * Endpoints for webhook subscription management, testing, delivery log, DLQ.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createSubscription,
  listSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  testWebhook,
  getWebhookDeliveries,
  getWebhookDlq,
  getWebhookStats,
  verifyWebhookSignature,
} from '../services/webhook-service.js';

function resolveTenantId(request: FastifyRequest): string | null {
  const requestTenantId =
    typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  const sessionTenantId =
    typeof (request as any).session?.tenantId === 'string' &&
    (request as any).session.tenantId.trim().length > 0
      ? (request as any).session.tenantId.trim()
      : undefined;
  const headerTenantId = request.headers['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  return requestTenantId || sessionTenantId || headerTenant || null;
}

function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export async function webhookRoutes(server: FastifyInstance): Promise<void> {
  // ─── Health ────────────────────────────────────────

  server.get('/webhooks/health', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getWebhookStats(tenantId);
    return reply.send({ ok: true, phase: 356, ...stats });
  });

  // ─── Subscription CRUD ─────────────────────────────

  server.get('/webhooks', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return reply.send({ ok: true, subscriptions: listSubscriptions(tenantId) });
  });

  server.get('/webhooks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const sub = getSubscription(id);
    if (!sub || sub.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Subscription not found' });
    }
    // Redact secret
    return reply.send({ ok: true, subscription: { ...sub, secret: '***REDACTED***' } });
  });

  server.post('/webhooks', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    if (!body.name || !body.url || !body.eventFilters) {
      return reply.code(400).send({
        ok: false,
        error: 'name, url, and eventFilters are required',
      });
    }
    const sub = createSubscription(tenantId, {
      name: body.name,
      url: body.url,
      eventFilters: body.eventFilters,
      retryPolicy: body.retryPolicy,
      metadata: body.metadata || {},
    });
    return reply.code(201).send({
      ok: true,
      subscription: sub, // Includes secret on creation only
    });
  });

  server.patch('/webhooks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const raw = (req.body as any) || {};
    // Sanitize: only allow safe fields — never accept secret, tenantId, id, createdAt
    const { name, url, eventFilters, enabled, retryPolicy, metadata } = raw;
    const safeUpdates = Object.fromEntries(
      Object.entries({ name, url, eventFilters, enabled, retryPolicy, metadata }).filter(
        ([, v]) => v !== undefined
      )
    );
    const updated = updateSubscription(tenantId, id, safeUpdates);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: 'Subscription not found' });
    }
    return reply.send({ ok: true, subscription: { ...updated, secret: '***REDACTED***' } });
  });

  server.delete('/webhooks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const deleted = deleteSubscription(tenantId, id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: 'Subscription not found' });
    }
    return reply.send({ ok: true });
  });

  // ─── Test Webhook ──────────────────────────────────

  server.post('/webhooks/:id/test', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const result = await testWebhook(id, tenantId);
    const code = result.ok ? 200 : 422;
    return reply.code(code).send(result);
  });

  // ─── Signature Verification (utility) ──────────────

  server.post('/webhooks/verify-signature', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.secret || !body.payload || !body.signature || !body.timestamp || !body.nonce) {
      return reply.code(400).send({
        ok: false,
        error: 'secret, payload, signature, timestamp, and nonce are required',
      });
    }
    const result = verifyWebhookSignature(
      body.secret,
      body.payload,
      body.signature,
      body.timestamp,
      body.nonce
    );
    return reply.send({ ok: result.valid, ...result });
  });

  // ─── Deliveries ────────────────────────────────────

  server.get('/webhooks/deliveries', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { subscriptionId, status, limit } = (req.query as any) || {};
    const results = getWebhookDeliveries({
      subscriptionId,
      tenantId,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ ok: true, deliveries: results, count: results.length });
  });

  // ─── DLQ ──────────────────────────────────────────

  server.get('/webhooks/dlq', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { limit } = (req.query as any) || {};
    const entries = getWebhookDlq(tenantId, limit ? parseInt(limit, 10) : 50);
    return reply.send({ ok: true, entries, count: entries.length });
  });
}
