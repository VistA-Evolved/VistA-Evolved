/**
 * Support Tooling Routes
 *
 * Phase 244 (Wave 6 P7): Admin endpoints for system diagnostics
 * and support ticket management.
 *
 * All routes under /admin/support/* — caught by admin auth rule.
 *
 * Endpoints:
 *   GET    /admin/support/diagnostics       — Collect live system diagnostics
 *   GET    /admin/support/tickets           — List support tickets
 *   POST   /admin/support/tickets           — Create support ticket
 *   GET    /admin/support/tickets/:id       — Get ticket details
 *   PATCH  /admin/support/tickets/:id       — Update ticket status
 *   POST   /admin/support/tickets/:id/notes — Add note to ticket
 *   GET    /admin/support/stats             — Ticket statistics
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { collectDiagnostics } from '../support/diagnostics.js';
import {
  createTicket,
  getTicket,
  listTickets,
  updateTicketStatus,
  addTicketNote,
  type CreateTicketInput,
  type TicketStatus,
  type TicketCategory,
  type TicketPriority,
} from '../support/ticket-store.js';

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export default async function supportRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: FastifyRequest): string | null {
    const headerTenantId = request.headers['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : null;
    const requestTenantId =
      typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
        ? (request as any).tenantId.trim()
        : null;
    const sessionTenantId =
      typeof (request as any).session?.tenantId === 'string' &&
      (request as any).session.tenantId.trim().length > 0
        ? (request as any).session.tenantId.trim()
        : null;
    return headerTenant || requestTenantId || sessionTenantId || null;
  }

  function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function getScopedTicket(id: string, tenantId: string) {
    return getTicket(id, tenantId) || null;
  }

  /* ---- GET /admin/support/diagnostics ---- */
  server.get('/admin/support/diagnostics', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const report = await collectDiagnostics(tenantId);
    return reply.send({ ok: true, report });
  });

  /* ---- GET /admin/support/tickets ---- */
  server.get('/admin/support/tickets', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const query = request.query as {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      tenantId?: string;
    };
    const items = listTickets({ ...query, tenantId });
    return reply.send({ ok: true, tickets: items, total: items.length });
  });

  /* ---- POST /admin/support/tickets ---- */
  server.post('/admin/support/tickets', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as CreateTicketInput) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!body.title || !body.description || !body.category || !body.priority) {
      return reply
        .code(400)
        .send({ ok: false, error: 'title, description, category, priority required' });
    }

    const ticket = createTicket(
      {
        ...body,
        tenantId,
      },
      session.duz
    );
    return reply.code(201).send({ ok: true, ticket });
  });

  /* ---- GET /admin/support/tickets/:id ---- */
  server.get('/admin/support/tickets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const ticket = getScopedTicket(id, tenantId);
    if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return reply.send({ ok: true, ticket });
  });

  /* ---- PATCH /admin/support/tickets/:id ---- */
  server.patch(
    '/admin/support/tickets/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const body = (request.body as { status?: TicketStatus }) || {};
      if (!body.status) return reply.code(400).send({ ok: false, error: 'status required' });

      if (!getScopedTicket(id, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Ticket not found' });
      }

      const ticket = updateTicketStatus(tenantId, id, body.status);
      if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
      return reply.send({ ok: true, ticket });
    }
  );

  /* ---- POST /admin/support/tickets/:id/notes ---- */
  server.post(
    '/admin/support/tickets/:id/notes',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const body = (request.body as { text?: string }) || {};
      if (!body.text) return reply.code(400).send({ ok: false, error: 'text required' });

      if (!getScopedTicket(id, tenantId)) {
        return reply.code(404).send({ ok: false, error: 'Ticket not found' });
      }

      const ticket = addTicketNote(tenantId, id, body.text, session.duz);
      if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
      return reply.send({ ok: true, ticket });
    }
  );

  /* ---- GET /admin/support/stats ---- */
  server.get('/admin/support/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const items = listTickets({ tenantId });
    const stats = {
      total: items.length,
      byStatus: items.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
      byPriority: items.reduce<Record<string, number>>((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {}),
      byCategory: items.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {}),
    };
    return reply.send({ ok: true, stats });
  });
}
