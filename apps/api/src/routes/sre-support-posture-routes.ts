/**
 * Phase 335 (W15-P9): Enterprise SRE / Support Posture Routes
 *
 * REST endpoints for incidents, status pages, maintenance, on-call,
 * runbooks, SLAs, support tickets, and tenant communications.
 */
import { FastifyInstance } from "fastify";
import {
  declareIncident,
  updateIncidentStatus,
  addPostmortemUrl,
  listIncidents,
  getIncident,
  upsertStatusComponent,
  getStatusPage,
  listStatusComponents,
  createMaintenanceWindow,
  updateMaintenanceState,
  listMaintenanceWindows,
  upsertOnCallSchedule,
  getCurrentOnCall,
  listOnCallSchedules,
  createRunbook,
  updateRunbook,
  markRunbookTested,
  listRunbooks,
  getRunbook,
  createSlaDefinition,
  listSlaDefinitions,
  generateSlaReport,
  createSupportTicket,
  updateTicketStatus,
  assignTicket,
  addTicketMessage,
  listSupportTickets,
  getSupportTicket,
  sendTenantCommunication,
  listTenantCommunications,
  getSreAuditLog,
  getSrePosture,
} from "../services/sre-support-posture.js";

export default async function sreSupportPostureRoutes(server: FastifyInstance): Promise<void> {
  const defaultTenant = "default";

  // ── Incidents ─────────────────────────────────────────────────────

  server.get("/platform/sre/incidents", async (_req, reply) => {
    const tenantId = (_req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, incidents: listIncidents(tenantId) });
  });

  server.get("/platform/sre/incidents/:id", async (req, reply) => {
    const { id } = req.params as any;
    const inc = getIncident(id);
    if (!inc) return reply.code(404).send({ ok: false, error: "Incident not found" });
    return reply.send({ ok: true, incident: inc });
  });

  server.post("/platform/sre/incidents", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, title, severity = "sev3", commander = "system", affectedServices = [] } = body;
    if (!title) return reply.code(400).send({ ok: false, error: "title required" });
    const incident = declareIncident(tenantId, title, severity, commander, affectedServices);
    return reply.code(201).send({ ok: true, incident });
  });

  server.post("/platform/sre/incidents/:id/status", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status, actor = "system", detail = "" } = body;
    if (!status) return reply.code(400).send({ ok: false, error: "status required" });
    const inc = updateIncidentStatus(id, status, actor, detail);
    if (!inc) return reply.code(404).send({ ok: false, error: "Incident not found" });
    return reply.send({ ok: true, incident: inc });
  });

  server.post("/platform/sre/incidents/:id/postmortem", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { url, actor = "system" } = body;
    if (!url) return reply.code(400).send({ ok: false, error: "url required" });
    const inc = addPostmortemUrl(id, url, actor);
    if (!inc) return reply.code(404).send({ ok: false, error: "Incident not found" });
    return reply.send({ ok: true, incident: inc });
  });

  // ── Status Page ───────────────────────────────────────────────────

  server.get("/platform/sre/status-page", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, statusPage: getStatusPage(tenantId) });
  });

  server.get("/platform/sre/status-components", async (_req, reply) => {
    return reply.send({ ok: true, components: listStatusComponents() });
  });

  server.put("/platform/sre/status-components/:id", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { name = id, state = "operational", description = "", group } = body;
    const comp = upsertStatusComponent(id, name, state, description, group);
    return reply.send({ ok: true, component: comp });
  });

  // ── Maintenance Windows ───────────────────────────────────────────

  server.get("/platform/sre/maintenance", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, maintenanceWindows: listMaintenanceWindows(tenantId) });
  });

  server.post("/platform/sre/maintenance", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, title, description = "", affectedComponents = [], scheduledStart, scheduledEnd, createdBy = "system" } = body;
    if (!title || !scheduledStart || !scheduledEnd) {
      return reply.code(400).send({ ok: false, error: "title, scheduledStart, scheduledEnd required" });
    }
    const mw = createMaintenanceWindow(tenantId, title, description, affectedComponents, scheduledStart, scheduledEnd, createdBy);
    return reply.code(201).send({ ok: true, maintenanceWindow: mw });
  });

  server.post("/platform/sre/maintenance/:id/state", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { state, actor = "system" } = body;
    if (!state) return reply.code(400).send({ ok: false, error: "state required" });
    const mw = updateMaintenanceState(id, state, actor);
    if (!mw) return reply.code(404).send({ ok: false, error: "Maintenance window not found" });
    return reply.send({ ok: true, maintenanceWindow: mw });
  });

  // ── On-Call ────────────────────────────────────────────────────────

  server.get("/platform/sre/oncall", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, schedules: listOnCallSchedules(tenantId) });
  });

  server.get("/platform/sre/oncall/current", async (req, reply) => {
    const { tenantId = defaultTenant, teamName } = req.query as any;
    if (!teamName) return reply.code(400).send({ ok: false, error: "teamName required" });
    const current = getCurrentOnCall(tenantId, teamName);
    return reply.send({ ok: true, currentOnCall: current });
  });

  server.put("/platform/sre/oncall", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, teamName, rotation = [], escalationPolicy = [], timezone = "UTC", actor = "system" } = body;
    if (!teamName) return reply.code(400).send({ ok: false, error: "teamName required" });
    const sched = upsertOnCallSchedule(tenantId, teamName, rotation, escalationPolicy, timezone, actor);
    return reply.send({ ok: true, schedule: sched });
  });

  // ── Runbooks ──────────────────────────────────────────────────────

  server.get("/platform/sre/runbooks", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, runbooks: listRunbooks(tenantId) });
  });

  server.get("/platform/sre/runbooks/:id", async (req, reply) => {
    const { id } = req.params as any;
    const rb = getRunbook(id);
    if (!rb) return reply.code(404).send({ ok: false, error: "Runbook not found" });
    return reply.send({ ok: true, runbook: rb });
  });

  server.post("/platform/sre/runbooks", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, title, service = "", severity = "sev3", steps = [], actor = "system" } = body;
    if (!title) return reply.code(400).send({ ok: false, error: "title required" });
    const rb = createRunbook(tenantId, title, service, severity, steps, actor);
    return reply.code(201).send({ ok: true, runbook: rb });
  });

  server.patch("/platform/sre/runbooks/:id", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { actor = "system", ...updates } = body;
    const rb = updateRunbook(id, updates, actor);
    if (!rb) return reply.code(404).send({ ok: false, error: "Runbook not found" });
    return reply.send({ ok: true, runbook: rb });
  });

  server.post("/platform/sre/runbooks/:id/test", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const rb = markRunbookTested(id, body.actor || "system");
    if (!rb) return reply.code(404).send({ ok: false, error: "Runbook not found" });
    return reply.send({ ok: true, runbook: rb });
  });

  // ── SLA Definitions & Reports ─────────────────────────────────────

  server.get("/platform/sre/slas", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, slaDefinitions: listSlaDefinitions(tenantId) });
  });

  server.post("/platform/sre/slas", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, name, metric, targetValue, unit = "%", window = "monthly", actor = "system" } = body;
    if (!name || !metric || targetValue === undefined) {
      return reply.code(400).send({ ok: false, error: "name, metric, targetValue required" });
    }
    const sla = createSlaDefinition(tenantId, name, metric, targetValue, unit, window, actor);
    return reply.code(201).send({ ok: true, slaDefinition: sla });
  });

  server.get("/platform/sre/sla-report", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, reports: generateSlaReport(tenantId) });
  });

  // ── Support Tickets ───────────────────────────────────────────────

  server.get("/platform/sre/tickets", async (req, reply) => {
    const { tenantId = defaultTenant, status } = req.query as any;
    return reply.send({ ok: true, tickets: listSupportTickets(tenantId, status) });
  });

  server.get("/platform/sre/tickets/:id", async (req, reply) => {
    const { id } = req.params as any;
    const t = getSupportTicket(id);
    if (!t) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket: t });
  });

  server.post("/platform/sre/tickets", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, subject, description = "", priority = "medium", category = "general", createdBy = "system", relatedIncidentId } = body;
    if (!subject) return reply.code(400).send({ ok: false, error: "subject required" });
    const ticket = createSupportTicket(tenantId, subject, description, priority, category, createdBy, relatedIncidentId);
    return reply.code(201).send({ ok: true, ticket });
  });

  server.post("/platform/sre/tickets/:id/status", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status, actor = "system" } = body;
    if (!status) return reply.code(400).send({ ok: false, error: "status required" });
    const t = updateTicketStatus(id, status, actor);
    if (!t) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket: t });
  });

  server.post("/platform/sre/tickets/:id/assign", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { assignee, actor = "system" } = body;
    if (!assignee) return reply.code(400).send({ ok: false, error: "assignee required" });
    const t = assignTicket(id, assignee, actor);
    if (!t) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket: t });
  });

  server.post("/platform/sre/tickets/:id/messages", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { author = "system", body: msgBody, internal = false } = body;
    if (!msgBody) return reply.code(400).send({ ok: false, error: "body required" });
    const t = addTicketMessage(id, author, msgBody, internal);
    if (!t) return reply.code(404).send({ ok: false, error: "Ticket not found" });
    return reply.send({ ok: true, ticket: t });
  });

  // ── Tenant Communications ─────────────────────────────────────────

  server.get("/platform/sre/communications", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, communications: listTenantCommunications(tenantId) });
  });

  server.post("/platform/sre/communications", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, channel = "in_app", subject, body: msgBody, createdBy = "system", relatedIncidentId, relatedMaintenanceId } = body;
    if (!subject || !msgBody) return reply.code(400).send({ ok: false, error: "subject and body required" });
    const comm = sendTenantCommunication(tenantId, channel, subject, msgBody, createdBy, relatedIncidentId, relatedMaintenanceId);
    return reply.code(201).send({ ok: true, communication: comm });
  });

  // ── Posture & Audit ───────────────────────────────────────────────

  server.get("/platform/sre/posture", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, posture: getSrePosture(tenantId) });
  });

  server.get("/platform/sre/audit", async (req, reply) => {
    const limit = parseInt((req.query as any)?.limit || "200", 10);
    return reply.send({ ok: true, entries: getSreAuditLog(limit) });
  });
}
