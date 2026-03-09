/**
 * Event Bus Routes -- Phase 355
 *
 * Admin endpoints for event bus management: outbox, DLQ, replay, consumers, health.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  publishEvent,
  getOutbox,
  getDlq,
  retryDlqEntry,
  replayEvents,
  getEventBusStats,
  getDeliveryLog,
  listConsumers,
  EVENT_TYPES,
  hashSubjectRef,
} from '../services/event-bus.js';

function resolveTenantId(request: FastifyRequest): string | null {
  const sessionTenantId =
    typeof ((request as any).session?.tenantId) === 'string' &&
    (request as any).session.tenantId.trim().length > 0
      ? (request as any).session.tenantId.trim()
      : undefined;
  return sessionTenantId || null;
}

function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export async function eventBusRoutes(server: FastifyInstance): Promise<void> {
  // ─── Health ────────────────────────────────────────

  server.get('/events/health', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getEventBusStats(tenantId);
    return reply.send({ ok: true, phase: 355, ...stats });
  });

  // ─── Event Types ───────────────────────────────────

  server.get('/events/types', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, eventTypes: EVENT_TYPES });
  });

  // ─── Publish (for testing / manual triggering) ─────

  server.post('/events/publish', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    if (!body.eventType || !body.source) {
      return reply.code(400).send({ ok: false, error: 'eventType and source are required' });
    }
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const event = await publishEvent({
      eventType: body.eventType,
      version: body.version || 1,
      tenantId,
      subjectRefHash: body.subjectRef ? hashSubjectRef(body.subjectRef) : hashSubjectRef('unknown'),
      payload: body.payload || {},
      source: body.source,
      correlationId: body.correlationId,
    });
    return reply.code(201).send({ ok: true, event });
  });

  // ─── Outbox ────────────────────────────────────────

  server.get('/events/outbox', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const { eventType, limit } = (req.query as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const events = getOutbox({
      tenantId,
      eventType,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ ok: true, events, count: events.length });
  });

  // ─── DLQ ──────────────────────────────────────────

  server.get('/events/dlq', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const { consumerId, limit } = (req.query as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const entries = getDlq({
      tenantId,
      consumerId,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ ok: true, entries, count: entries.length });
  });

  server.post('/events/dlq/:id/retry', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const { id } = req.params as { id: string };
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const result = await retryDlqEntry(id, tenantId);
    const code = result.ok ? 200 : 422;
    return reply.code(code).send(result);
  });

  // ─── Replay ────────────────────────────────────────

  server.post('/events/replay', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const result = await replayEvents({
      tenantId,
      fromTime: body.fromTime,
      toTime: body.toTime,
      eventType: body.eventType,
      consumerId: body.consumerId,
    });
    return reply.send({ ok: true, ...result });
  });

  // ─── Consumers ─────────────────────────────────────

  server.get('/events/consumers', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const list = listConsumers(tenantId).map((c) => ({
      id: c.id,
      name: c.name,
      eventFilters: c.eventFilters,
    }));
    return reply.send({ ok: true, consumers: list });
  });

  // ─── Delivery Log ─────────────────────────────────

  server.get('/events/deliveries', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const { limit } = (req.query as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const log = getDeliveryLog({
      tenantId,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ ok: true, deliveries: log, count: log.length });
  });
}
