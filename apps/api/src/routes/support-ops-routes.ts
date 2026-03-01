/**
 * Support Ops Routes (Phase 373 / W20-P4)
 *
 * Admin endpoints for support operations automation:
 * - Ticket lifecycle management
 * - Diagnostics bundle generation
 * - SLA reporting
 * - Runbook index
 */

import type { FastifyInstance } from "fastify";
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
} from "../services/support-ops-service.js";
import type { TicketPriority, TicketStatus } from "../services/support-ops-service.js";

const DEFAULT_TENANT = "default";

function getTenantId(request: { headers: Record<string, string | string[] | undefined> }): string {
  return (request.headers["x-tenant-id"] as string) || DEFAULT_TENANT;
}

export default async function supportOpsRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Tickets                                                        */
  /* ============================================================= */

  server.post("/support-ops/tickets", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.title || !body.description || !body.priority || !body.reportedBy) {
      return reply.code(400).send({ ok: false, error: "title, description, priority, reportedBy required" });
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

  server.get("/support-ops/tickets", async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as Record<string, string>;
    const tickets = listTickets(tenantId, q.status as TicketStatus | undefined);
    return reply.send({ ok: true, tickets, count: tickets.length });
  });

  server.get("/support-ops/tickets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = getTicket(id);
    if (!ticket) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket });
  });

  server.post("/support-ops/tickets/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.assignedTo) return reply.code(400).send({ ok: false, error: "assignedTo required" });
    const ticket = acknowledgeTicket(id, body.assignedTo as string);
    if (!ticket) return reply.code(400).send({ ok: false, error: "Cannot acknowledge ticket" });
    return reply.send({ ok: true, ticket });
  });

  server.post("/support-ops/tickets/:id/start-work", async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = startWork(id);
    if (!ticket) return reply.code(400).send({ ok: false, error: "Cannot start work on ticket" });
    return reply.send({ ok: true, ticket });
  });

  server.post("/support-ops/tickets/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const ticket = resolveTicket(id, body.resolution as string);
    if (!ticket) return reply.code(400).send({ ok: false, error: "Cannot resolve ticket" });
    return reply.send({ ok: true, ticket });
  });

  server.post("/support-ops/tickets/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = closeTicket(id);
    if (!ticket) return reply.code(400).send({ ok: false, error: "Cannot close ticket" });
    return reply.send({ ok: true, ticket });
  });

  server.post("/support-ops/tickets/:id/escalate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.reason) return reply.code(400).send({ ok: false, error: "reason required" });
    const ticket = escalateTicket(id, body.reason as string);
    if (!ticket) return reply.code(400).send({ ok: false, error: "Cannot escalate ticket" });
    return reply.send({ ok: true, ticket });
  });

  /* ============================================================= */
  /* Diagnostics Bundles                                            */
  /* ============================================================= */

  server.post("/support-ops/diagnostics", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = (request.body as Record<string, unknown>) || {};
    const bundle = generateDiagnosticsBundle(tenantId, body.ticketId as string | undefined);
    return reply.code(201).send({ ok: true, bundle });
  });

  server.get("/support-ops/diagnostics", async (request, reply) => {
    const tenantId = getTenantId(request);
    const bundles = listDiagnosticsBundles(tenantId);
    return reply.send({ ok: true, bundles, count: bundles.length });
  });

  server.get("/support-ops/diagnostics/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const bundle = getDiagnosticsBundle(id);
    if (!bundle) return reply.code(404).send({ ok: false, error: "Bundle not found" });
    return reply.send({ ok: true, bundle });
  });

  /* ============================================================= */
  /* SLA Reporting                                                   */
  /* ============================================================= */

  server.get("/support-ops/sla-report", async (request, reply) => {
    const tenantId = getTenantId(request);
    const report = getSlaReport(tenantId);
    return reply.send({ ok: true, report });
  });

  /* ============================================================= */
  /* Runbook Index                                                   */
  /* ============================================================= */

  server.get("/support-ops/runbooks", async (request, reply) => {
    const q = request.query as Record<string, string>;
    const runbooks = q.category ? getRunbooksByCategory(q.category) : getRunbookIndex();
    return reply.send({ ok: true, runbooks, count: runbooks.length });
  });
}
