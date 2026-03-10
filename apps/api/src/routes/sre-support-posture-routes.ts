/**
 * Phase 335 (W15-P9): Enterprise SRE / Support Posture Routes
 *
 * REST endpoints for incidents, status pages, maintenance, on-call,
 * runbooks, SLAs, support tickets, and tenant communications.
 */
import { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
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
} from '../services/sre-support-posture.js';

export default async function sreSupportPostureRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any, session: any): string | null {
    const sessionTenantId =
      typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
        ? session.tenantId.trim()
        : undefined;
    const requestTenantId =
      typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
        ? request.tenantId.trim()
        : undefined;
    const headerTenantId = request?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return sessionTenantId || requestTenantId || headerTenant || null;
  }

  function requireTenantId(request: any, reply: any, session: any): string | null {
    const tenantId = resolveTenantId(request, session);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function resolveActor(session: any): string {
    return session?.userName || session?.duz || 'system';
  }

  // -- Incidents -----------------------------------------------------

  server.get('/platform/sre/incidents', async (_req, reply) => {
    const session = await requireSession(_req, reply);
    if (!session) return;
    const tenantId = requireTenantId(_req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, incidents: listIncidents(tenantId) });
  });

  server.get('/platform/sre/incidents/:id', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const inc = getIncident(id, tenantId);
    if (!inc) return reply.code(404).send({ ok: false, error: 'Incident not found' });
    return reply.send({ ok: true, incident: inc });
  });

  server.post('/platform/sre/incidents', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      title,
      severity = 'sev3',
      affectedServices = [],
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const commander = resolveActor(session);
    if (!title) return reply.code(400).send({ ok: false, error: 'title required' });
    const validSeverities = ['sev1', 'sev2', 'sev3', 'sev4'];
    if (!validSeverities.includes(severity)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
      });
    }
    const incident = declareIncident(tenantId, title, severity, commander, affectedServices);
    return reply.code(201).send({ ok: true, incident });
  });

  server.post('/platform/sre/incidents/:id/status', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status, detail = '' } = body;
    const actor = resolveActor(session);
    if (!status) return reply.code(400).send({ ok: false, error: 'status required' });
    const validStatuses = [
      'declared',
      'investigating',
      'identified',
      'mitigating',
      'resolved',
      'postmortem',
    ];
    if (!validStatuses.includes(status)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const inc = updateIncidentStatus(id, status, actor, detail, tenantId);
    if (!inc) return reply.code(404).send({ ok: false, error: 'Incident not found' });
    return reply.send({ ok: true, incident: inc });
  });

  server.post('/platform/sre/incidents/:id/postmortem', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { url } = body;
    const actor = resolveActor(session);
    if (!url) return reply.code(400).send({ ok: false, error: 'url required' });
    const inc = addPostmortemUrl(id, url, actor, tenantId);
    if (!inc) return reply.code(404).send({ ok: false, error: 'Incident not found' });
    return reply.send({ ok: true, incident: inc });
  });

  // -- Status Page ---------------------------------------------------

  server.get('/platform/sre/status-page', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, statusPage: getStatusPage(tenantId) });
  });

  server.get('/platform/sre/status-components', async (_req, reply) => {
    return reply.send({ ok: true, components: listStatusComponents() });
  });

  server.put('/platform/sre/status-components/:id', async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { name = id, state = 'operational', description = '', group } = body;
    const comp = upsertStatusComponent(id, name, state, description, group);
    return reply.send({ ok: true, component: comp });
  });

  // -- Maintenance Windows -------------------------------------------

  server.get('/platform/sre/maintenance', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, maintenanceWindows: listMaintenanceWindows(tenantId) });
  });

  server.post('/platform/sre/maintenance', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      title,
      description = '',
      affectedComponents = [],
      scheduledStart,
      scheduledEnd,
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const createdBy = resolveActor(session);
    if (!title || !scheduledStart || !scheduledEnd) {
      return reply
        .code(400)
        .send({ ok: false, error: 'title, scheduledStart, scheduledEnd required' });
    }
    const mw = createMaintenanceWindow(
      tenantId,
      title,
      description,
      affectedComponents,
      scheduledStart,
      scheduledEnd,
      createdBy
    );
    return reply.code(201).send({ ok: true, maintenanceWindow: mw });
  });

  server.post('/platform/sre/maintenance/:id/state', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { state } = body;
    const actor = resolveActor(session);
    if (!state) return reply.code(400).send({ ok: false, error: 'state required' });
    const validStates = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!validStates.includes(state)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid state. Must be one of: ${validStates.join(', ')}` });
    }
    const mw = updateMaintenanceState(id, state, actor, tenantId);
    if (!mw) return reply.code(404).send({ ok: false, error: 'Maintenance window not found' });
    return reply.send({ ok: true, maintenanceWindow: mw });
  });

  // -- On-Call --------------------------------------------------------

  server.get('/platform/sre/oncall', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, schedules: listOnCallSchedules(tenantId) });
  });

  server.get('/platform/sre/oncall/current', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { teamName } = req.query as any;
    if (!teamName) return reply.code(400).send({ ok: false, error: 'teamName required' });
    const current = getCurrentOnCall(tenantId, teamName);
    return reply.send({ ok: true, currentOnCall: current });
  });

  server.put('/platform/sre/oncall', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      teamName,
      rotation = [],
      escalationPolicy = [],
      timezone = 'UTC',
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const actor = resolveActor(session);
    if (!teamName) return reply.code(400).send({ ok: false, error: 'teamName required' });
    const sched = upsertOnCallSchedule(
      tenantId,
      teamName,
      rotation,
      escalationPolicy,
      timezone,
      actor
    );
    return reply.send({ ok: true, schedule: sched });
  });

  // -- Runbooks ------------------------------------------------------

  server.get('/platform/sre/runbooks', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, runbooks: listRunbooks(tenantId) });
  });

  server.get('/platform/sre/runbooks/:id', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const rb = getRunbook(id, tenantId);
    if (!rb) return reply.code(404).send({ ok: false, error: 'Runbook not found' });
    return reply.send({ ok: true, runbook: rb });
  });

  server.post('/platform/sre/runbooks', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      title,
      service = '',
      severity = 'sev3',
      steps = [],
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const actor = resolveActor(session);
    if (!title) return reply.code(400).send({ ok: false, error: 'title required' });
    const rb = createRunbook(tenantId, title, service, severity, steps, actor);
    return reply.code(201).send({ ok: true, runbook: rb });
  });

  server.patch('/platform/sre/runbooks/:id', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { ...updates } = body;
    const actor = resolveActor(session);
    const rb = updateRunbook(id, updates, actor, tenantId);
    if (!rb) return reply.code(404).send({ ok: false, error: 'Runbook not found' });
    return reply.send({ ok: true, runbook: rb });
  });

  server.post('/platform/sre/runbooks/:id/test', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const rb = markRunbookTested(id, resolveActor(session), tenantId);
    if (!rb) return reply.code(404).send({ ok: false, error: 'Runbook not found' });
    return reply.send({ ok: true, runbook: rb });
  });

  // -- SLA Definitions & Reports -------------------------------------

  server.get('/platform/sre/slas', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, slaDefinitions: listSlaDefinitions(tenantId) });
  });

  server.post('/platform/sre/slas', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      name,
      metric,
      targetValue,
      unit = '%',
      window = 'monthly',
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const actor = resolveActor(session);
    if (!name || !metric || targetValue === undefined) {
      return reply.code(400).send({ ok: false, error: 'name, metric, targetValue required' });
    }
    const validMetrics = ['uptime', 'response_time', 'resolution_time', 'first_response'];
    if (!validMetrics.includes(metric)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` });
    }
    const validWindows = ['monthly', 'quarterly', 'annual'];
    if (!validWindows.includes(window)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid window. Must be one of: ${validWindows.join(', ')}` });
    }
    const sla = createSlaDefinition(tenantId, name, metric, targetValue, unit, window, actor);
    return reply.code(201).send({ ok: true, slaDefinition: sla });
  });

  server.get('/platform/sre/sla-report', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, reports: generateSlaReport(tenantId) });
  });

  // -- Support Tickets -----------------------------------------------

  server.get('/platform/sre/tickets', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { status } = req.query as any;
    return reply.send({ ok: true, tickets: listSupportTickets(tenantId, status) });
  });

  server.get('/platform/sre/tickets/:id', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const t = getSupportTicket(id, tenantId);
    if (!t) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return reply.send({ ok: true, ticket: t });
  });

  server.post('/platform/sre/tickets', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      subject,
      description = '',
      priority = 'medium',
      category = 'general',
      relatedIncidentId,
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const createdBy = resolveActor(session);
    if (!subject) return reply.code(400).send({ ok: false, error: 'subject required' });
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
      });
    }
    const ticket = createSupportTicket(
      tenantId,
      subject,
      description,
      priority,
      category,
      createdBy,
      relatedIncidentId
    );
    return reply.code(201).send({ ok: true, ticket });
  });

  server.post('/platform/sre/tickets/:id/status', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status } = body;
    const actor = resolveActor(session);
    if (!status) return reply.code(400).send({ ok: false, error: 'status required' });
    const validStatuses = [
      'open',
      'triaged',
      'in_progress',
      'waiting_on_customer',
      'resolved',
      'closed',
    ];
    if (!validStatuses.includes(status)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const t = updateTicketStatus(id, status, actor, tenantId);
    if (!t) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return reply.send({ ok: true, ticket: t });
  });

  server.post('/platform/sre/tickets/:id/assign', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { assignee } = body;
    const actor = resolveActor(session);
    if (!assignee) return reply.code(400).send({ ok: false, error: 'assignee required' });
    const t = assignTicket(id, assignee, actor, tenantId);
    if (!t) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return reply.send({ ok: true, ticket: t });
  });

  server.post('/platform/sre/tickets/:id/messages', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { body: msgBody, internal = false } = body;
    const author = resolveActor(session);
    if (!msgBody) return reply.code(400).send({ ok: false, error: 'body required' });
    const t = addTicketMessage(id, author, msgBody, internal, tenantId);
    if (!t) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return reply.send({ ok: true, ticket: t });
  });

  // -- Tenant Communications -----------------------------------------

  server.get('/platform/sre/communications', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, communications: listTenantCommunications(tenantId) });
  });

  server.post('/platform/sre/communications', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const body = (req.body as any) || {};
    const {
      channel = 'in_app',
      subject,
      body: msgBody,
      relatedIncidentId,
      relatedMaintenanceId,
    } = body;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const createdBy = resolveActor(session);
    if (!subject || !msgBody)
      return reply.code(400).send({ ok: false, error: 'subject and body required' });
    const comm = sendTenantCommunication(
      tenantId,
      channel,
      subject,
      msgBody,
      createdBy,
      relatedIncidentId,
      relatedMaintenanceId
    );
    return reply.code(201).send({ ok: true, communication: comm });
  });

  // -- Posture & Audit -----------------------------------------------

  server.get('/platform/sre/posture', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    return reply.send({ ok: true, posture: getSrePosture(tenantId) });
  });

  server.get('/platform/sre/audit', async (req, reply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply, session);
    if (!tenantId) return;
    const limit = parseInt((req.query as any)?.limit || '200', 10);
    return reply.send({ ok: true, entries: getSreAuditLog(limit, tenantId) });
  });
}
