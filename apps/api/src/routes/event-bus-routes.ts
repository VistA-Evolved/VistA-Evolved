/**
 * Event Bus Routes -- Phase 355
 *
 * Admin endpoints for event bus management: outbox, DLQ, replay, consumers, health.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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

export async function eventBusRoutes(server: FastifyInstance): Promise<void> {
  const tenantId = 'default';

  // ─── Health ────────────────────────────────────────

  server.get('/events/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    const stats = getEventBusStats();
    return reply.send({ ok: true, phase: 355, ...stats });
  });

  // ─── Event Types ───────────────────────────────────

  server.get('/events/types', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, eventTypes: EVENT_TYPES });
  });

  // ─── Publish (for testing / manual triggering) ─────

  server.post('/events/publish', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.eventType || !body.source) {
      return reply.code(400).send({ ok: false, error: 'eventType and source are required' });
    }
    const event = await publishEvent({
      eventType: body.eventType,
      version: body.version || 1,
      tenantId: body.tenantId || tenantId,
      subjectRefHash: body.subjectRef ? hashSubjectRef(body.subjectRef) : hashSubjectRef('unknown'),
      payload: body.payload || {},
      source: body.source,
      correlationId: body.correlationId,
    });
    return reply.code(201).send({ ok: true, event });
  });

  // ─── Outbox ────────────────────────────────────────

  server.get('/events/outbox', async (req: FastifyRequest, reply: FastifyReply) => {
    const { eventType, limit } = (req.query as any) || {};
    const events = getOutbox({
      tenantId,
      eventType,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ ok: true, events, count: events.length });
  });

  // ─── DLQ ──────────────────────────────────────────

  server.get('/events/dlq', async (req: FastifyRequest, reply: FastifyReply) => {
    const { consumerId, limit } = (req.query as any) || {};
    const entries = getDlq({
      tenantId,
      consumerId,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return reply.send({ ok: true, entries, count: entries.length });
  });

  server.post('/events/dlq/:id/retry', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = await retryDlqEntry(id);
    const code = result.ok ? 200 : 422;
    return reply.code(code).send(result);
  });

  // ─── Replay ────────────────────────────────────────

  server.post('/events/replay', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const result = await replayEvents({
      tenantId: body.tenantId || tenantId,
      fromTime: body.fromTime,
      toTime: body.toTime,
      eventType: body.eventType,
      consumerId: body.consumerId,
    });
    return reply.send({ ok: true, ...result });
  });

  // ─── Consumers ─────────────────────────────────────

  server.get('/events/consumers', async (_req: FastifyRequest, reply: FastifyReply) => {
    const list = listConsumers().map((c) => ({
      id: c.id,
      name: c.name,
      eventFilters: c.eventFilters,
      tenantIds: c.tenantIds || [],
    }));
    return reply.send({ ok: true, consumers: list });
  });

  // ─── Delivery Log ─────────────────────────────────

  server.get('/events/deliveries', async (req: FastifyRequest, reply: FastifyReply) => {
    const { limit } = (req.query as any) || {};
    const log = getDeliveryLog(limit ? parseInt(limit, 10) : 50);
    return reply.send({ ok: true, deliveries: log, count: log.length });
  });
}
