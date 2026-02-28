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

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { collectDiagnostics } from "../support/diagnostics.js";
import {
  createTicket,
  getTicket,
  listTickets,
  updateTicketStatus,
  addTicketNote,
  getTicketStats,
  type CreateTicketInput,
  type TicketStatus,
  type TicketCategory,
  type TicketPriority,
} from "../support/ticket-store.js";

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export default async function supportRoutes(server: FastifyInstance): Promise<void> {
  /* ---- GET /admin/support/diagnostics ---- */
  server.get("/admin/support/diagnostics", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const report = await collectDiagnostics();
    return reply.send({ ok: true, report });
  });

  /* ---- GET /admin/support/tickets ---- */
  server.get("/admin/support/tickets", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const query = request.query as {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      tenantId?: string;
    };
    const items = listTickets(query);
    return reply.send({ ok: true, tickets: items, total: items.length });
  });

  /* ---- POST /admin/support/tickets ---- */
  server.post("/admin/support/tickets", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as CreateTicketInput) || {};
    if (!body.title || !body.description || !body.category || !body.priority) {
      return reply.code(400).send({ ok: false, error: "title, description, category, priority required" });
    }

    const ticket = createTicket(body, session.duz);
    return reply.code(201).send({ ok: true, ticket });
  });

  /* ---- GET /admin/support/tickets/:id ---- */
  server.get("/admin/support/tickets/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const ticket = getTicket(id);
    if (!ticket) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket });
  });

  /* ---- PATCH /admin/support/tickets/:id ---- */
  server.patch("/admin/support/tickets/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = (request.body as { status?: TicketStatus }) || {};
    if (!body.status) return reply.code(400).send({ ok: false, error: "status required" });

    const ticket = updateTicketStatus(id, body.status);
    if (!ticket) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket });
  });

  /* ---- POST /admin/support/tickets/:id/notes ---- */
  server.post("/admin/support/tickets/:id/notes", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = (request.body as { text?: string }) || {};
    if (!body.text) return reply.code(400).send({ ok: false, error: "text required" });

    const ticket = addTicketNote(id, body.text, session.duz);
    if (!ticket) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket });
  });

  /* ---- GET /admin/support/stats ---- */
  server.get("/admin/support/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const stats = getTicketStats();
    return reply.send({ ok: true, stats });
  });
}
