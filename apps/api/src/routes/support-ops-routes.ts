/**
 * Support Ops Routes (Phase 373 / W20-P4)
 *
 * Admin endpoints for support operations automation:
 * - Ticket lifecycle management
 * - Diagnostics bundle generation
 * - SLA reporting
 * - Runbook index
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  createTicket,
  acknowledgeTicket,
  startWork,
  resolveTicket,
  closeTicket,
  escalateTicket,
  getTicket,
  listTickets,
  generateDiagnosticsBundle,
  getDiagnosticsBundle,
  listDiagnosticsBundles,
  getRunbookIndex,
  getRunbooksByCategory,
  getSlaReport,
} from '../services/support-ops-service.js';
import type { TicketPriority, TicketStatus } from '../services/support-ops-service.js';

function getTenantId(request: any): string | null {
  const sessionTenantId = request?.session?.tenantId;
  if (typeof sessionTenantId === 'string' && sessionTenantId.trim().length > 0) {
    return sessionTenantId.trim();
  }
  return null;
}

function requireTenantId(request: any, reply: any): string | null {
  const tenantId = getTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export default async function supportOpsRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Tickets                                                        */
  /* ============================================================= */

  server.post('/support-ops/tickets', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.title || !body.description || !body.priority || !body.reportedBy) {
      return reply
        .code(400)
        .send({ ok: false, error: 'title, description, priority, reportedBy required' });
    }
    const ticket = createTicket(tenantId, {
      title: body.title as string,
      description: body.description as string,
      priority: body.priority as TicketPriority,
      category: body.category as string | undefined,
      reportedBy: body.reportedBy as string,
      tags: body.tags as string[] | undefined,
      externalId: body.externalId as string | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    });
    return reply.code(201).send({ ok: true, ticket });
  });

  server.get('/support-ops/tickets', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const q = request.query as Record<string, string>;
    const tickets = listTickets(tenantId, q.status as TicketStatus | undefined);
    return reply.send({ ok: true, tickets, count: tickets.length });
  });

  server.get('/support-ops/tickets/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const ticket = getTicket(id, tenantId);
    if (!ticket) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    return reply.send({ ok: true, ticket });
  });

  server.post('/support-ops/tickets/:id/acknowledge', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const existing = getTicket(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    if (!body.assignedTo) return reply.code(400).send({ ok: false, error: 'assignedTo required' });
    const ticket = acknowledgeTicket(tenantId, id, body.assignedTo as string);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot acknowledge ticket' });
    return reply.send({ ok: true, ticket });
  });

  server.post('/support-ops/tickets/:id/start-work', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getTicket(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    const ticket = startWork(tenantId, id);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot start work on ticket' });
    return reply.send({ ok: true, ticket });
  });

  server.post('/support-ops/tickets/:id/resolve', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const existing = getTicket(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    const ticket = resolveTicket(tenantId, id, body.resolution as string);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot resolve ticket' });
    return reply.send({ ok: true, ticket });
  });

  server.post('/support-ops/tickets/:id/close', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getTicket(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    const ticket = closeTicket(tenantId, id);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot close ticket' });
    return reply.send({ ok: true, ticket });
  });

  server.post('/support-ops/tickets/:id/escalate', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const existing = getTicket(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    if (!body.reason) return reply.code(400).send({ ok: false, error: 'reason required' });
    const ticket = escalateTicket(tenantId, id, body.reason as string);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot escalate ticket' });
    return reply.send({ ok: true, ticket });
  });

  /* ============================================================= */
  /* Diagnostics Bundles                                            */
  /* ============================================================= */

  server.post('/support-ops/diagnostics', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as Record<string, unknown>) || {};
    if (body.ticketId && !getTicket(body.ticketId as string, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    }
    const bundle = generateDiagnosticsBundle(tenantId, body.ticketId as string | undefined);
    return reply.code(201).send({ ok: true, bundle });
  });

  server.get('/support-ops/diagnostics', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const bundles = listDiagnosticsBundles(tenantId);
    return reply.send({ ok: true, bundles, count: bundles.length });
  });

  server.get('/support-ops/diagnostics/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const bundle = getDiagnosticsBundle(id, tenantId);
    if (!bundle) {
      return reply.code(404).send({ ok: false, error: 'Bundle not found' });
    }
    return reply.send({ ok: true, bundle });
  });

  /* ============================================================= */
  /* SLA Reporting                                                   */
  /* ============================================================= */

  server.get('/support-ops/sla-report', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const report = getSlaReport(tenantId);
    return reply.send({ ok: true, report });
  });

  /* ============================================================= */
  /* Runbook Index                                                   */
  /* ============================================================= */

  server.get('/support-ops/runbooks', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const q = request.query as Record<string, string>;
    const runbooks = q.category ? getRunbooksByCategory(q.category) : getRunbookIndex();
    return reply.send({ ok: true, runbooks, count: runbooks.length });
  });
}
