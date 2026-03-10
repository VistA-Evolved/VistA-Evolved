/**
 * HL7v2 Message Pipeline Routes -- Phase 259 (Wave 8 P3)
 *
 * Endpoints for message event stream, dead-letter management, and replay.
 * Extends existing /hl7/* routes; does not replace them.
 *
 * Route convention: /hl7/pipeline/* for event stream, /hl7/dlq/* for DLQ.
 */
import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  queryMessageEvents,
  getMessageEvent,
  verifyMessageEventChain,
  getMessageEventStats,
  type Hl7ProcessingStatus,
  type Hl7MessageDirection,
} from '../hl7/message-event-store.js';
import {
  listEnhancedDeadLetters,
  getEnhancedDeadLetter,
  replayDeadLetter,
  resolveDeadLetter,
  getDlqStats,
} from '../hl7/dead-letter-enhanced.js';

export async function hl7PipelineRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any): string | null {
    const sessionTenantId =
      typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
        ? request.session.tenantId.trim()
        : undefined;
    return sessionTenantId || null;
  }

  function requireTenantId(request: any, reply: any): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  /* -- Message Event Stream ------------------------------- */

  /**
   * GET /hl7/pipeline/events -- Query message events
   */
  server.get('/hl7/pipeline/events', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const q = request.query as {
      tenantId?: string;
      messageType?: string;
      status?: string;
      direction?: string;
      limit?: string;
      offset?: string;
    };
    const result = queryMessageEvents({
      tenantId,
      messageType: q.messageType,
      status: q.status as Hl7ProcessingStatus | undefined,
      direction: q.direction as Hl7MessageDirection | undefined,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });

    return reply.send({ ok: true, ...result });
  });

  /**
   * GET /hl7/pipeline/events/:id -- Get single event
   */
  server.get('/hl7/pipeline/events/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const event = getMessageEvent(id, tenantId);
    if (!event) {
      return reply.code(404).send({ ok: false, error: 'Event not found' });
    }
    return reply.send({ ok: true, event });
  });

  /**
   * GET /hl7/pipeline/stats -- Event statistics by status
   */
  server.get('/hl7/pipeline/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const stats = getMessageEventStats(tenantId);
    return reply.send({ ok: true, stats });
  });

  /**
   * GET /hl7/pipeline/verify -- Verify hash chain integrity
   */
  server.get('/hl7/pipeline/verify', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const result = verifyMessageEventChain(tenantId);
    return reply.send({ ...result });
  });

  /* -- Enhanced Dead-Letter Queue ------------------------- */

  /**
   * GET /hl7/dlq -- List dead-lettered messages
   */
  server.get('/hl7/dlq', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const q = request.query as {
      tenantId?: string;
      resolved?: string;
      limit?: string;
    };
    const result = listEnhancedDeadLetters({
      tenantId,
      resolved: q.resolved === 'true' ? true : q.resolved === 'false' ? false : undefined,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
    });
    return reply.send({ ok: true, ...result });
  });

  /**
   * GET /hl7/dlq/stats -- DLQ summary stats
   */
  server.get('/hl7/dlq/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const stats = getDlqStats(tenantId);
    return reply.send({ ok: true, stats });
  });

  /**
   * GET /hl7/dlq/:id -- Get single DLQ entry
   */
  server.get('/hl7/dlq/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const entry = getEnhancedDeadLetter(id, tenantId);
    if (!entry) {
      return reply.code(404).send({ ok: false, error: 'DLQ entry not found' });
    }
    return reply.send({ ok: true, entry });
  });

  /**
   * POST /hl7/dlq/:id/replay -- Replay a dead-lettered message
   */
  server.post('/hl7/dlq/:id/replay', async (request, reply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const actorId = session?.duz || 'system';
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const entry = getEnhancedDeadLetter(id, tenantId);
    if (!entry) {
      return reply.code(404).send({ ok: false, action: 'not_found', detail: 'DLQ entry not found' });
    }

    const result = replayDeadLetter(id, actorId, tenantId);
    if (!result.ok) {
      return reply.code(result.action === 'not_found' ? 404 : 409).send({
        ok: false,
        action: result.action,
        detail: result.detail,
      });
    }

    // In a full implementation, result.rawMessage would be re-injected
    // into the routing pipeline. For now, return replay confirmation.
    return reply.send({
      ok: true,
      action: 'replayed',
      entryId: result.entryId,
      detail: result.detail,
      // rawMessage intentionally NOT returned in API response (PHI safety)
    });
  });

  /**
   * POST /hl7/dlq/:id/resolve -- Mark DLQ entry as manually resolved
   */
  server.post('/hl7/dlq/:id/resolve', async (request, reply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const actorId = session?.duz || 'system';
    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;
    const entry = getEnhancedDeadLetter(id, tenantId);
    if (!entry) {
      return reply.code(404).send({ ok: false, detail: 'DLQ entry not found' });
    }

    const result = resolveDeadLetter(id, actorId, tenantId);
    if (!result.ok) {
      return reply.code(404).send({ ok: false, detail: result.detail });
    }
    return reply.send({ ok: true, detail: result.detail });
  });
}
