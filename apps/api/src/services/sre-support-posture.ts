/**
 * Phase 335 (W15-P9): Enterprise SRE / Support Posture
 *
 * Status pages, incident workflows, tenant communications, on-call routing,
 * runbook library, SLA tracking, and support-ticket lifecycle.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type IncidentSeverity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentStatus =
  | "declared"
  | "investigating"
  | "identified"
  | "mitigating"
  | "resolved"
  | "postmortem";

export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  commander: string; // DUZ or on-call alias
  affectedServices: string[];
  timeline: IncidentTimelineEntry[];
  declaredAt: string;
  resolvedAt?: string;
  postmortemUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
}

export type StatusPageState =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

export interface StatusPageComponent {
  id: string;
  name: string;
  group?: string;
  state: StatusPageState;
  description: string;
  updatedAt: string;
}

export interface StatusPageSnapshot {
  tenantId: string;
  overallState: StatusPageState;
  components: StatusPageComponent[];
  activeIncidents: string[]; // incident IDs
  activeMaintenanceWindows: string[];
  generatedAt: string;
}

export type MaintenanceState = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface MaintenanceWindow {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  affectedComponents: string[];
  scheduledStart: string;
  scheduledEnd: string;
  state: MaintenanceState;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnCallSchedule {
  id: string;
  tenantId: string;
  teamName: string;
  rotation: OnCallRotationEntry[];
  escalationPolicy: EscalationStep[];
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnCallRotationEntry {
  userId: string;
  displayName: string;
  startDate: string;
  endDate: string;
  contactMethod: "page" | "sms" | "email" | "slack";
}

export interface EscalationStep {
  level: number;
  delayMinutes: number;
  targets: string[]; // user or team IDs
}

export interface Runbook {
  id: string;
  tenantId: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  steps: RunbookStep[];
  lastTestedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RunbookStep {
  order: number;
  title: string;
  command?: string;
  verification?: string;
  notes: string;
}

export interface SlaDefinition {
  id: string;
  tenantId: string;
  name: string;
  metric: "uptime" | "response_time" | "resolution_time" | "first_response";
  targetValue: number; // e.g. 99.9 for uptime %, 500 for ms, 60 for minutes
  unit: string;
  window: "monthly" | "quarterly" | "annual";
  createdAt: string;
  updatedAt: string;
}

export interface SlaReport {
  slaId: string;
  slaName: string;
  metric: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  met: boolean;
  window: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}

export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketStatus = "open" | "triaged" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";

export interface SupportTicket {
  id: string;
  tenantId: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  category: string;
  relatedIncidentId?: string;
  slaBreachAt?: string; // when SLA will be breached if unresolved
  messages: TicketMessage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  timestamp: string;
  author: string;
  body: string;
  internal: boolean; // internal notes vs customer-visible
}

export interface TenantCommunication {
  id: string;
  tenantId: string;
  channel: "email" | "in_app" | "sms" | "webhook";
  subject: string;
  body: string;
  relatedIncidentId?: string;
  relatedMaintenanceId?: string;
  sentAt: string;
  createdBy: string;
}

// ── In-memory stores ──────────────────────────────────────────────────

const incidents = new Map<string, Incident>();
const statusComponents = new Map<string, StatusPageComponent>();
const maintenanceWindows = new Map<string, MaintenanceWindow>();
const onCallSchedules = new Map<string, OnCallSchedule>();
const runbooks = new Map<string, Runbook>();
const slaDefinitions = new Map<string, SlaDefinition>();
const supportTickets = new Map<string, SupportTicket>();
const tenantCommunications = new Map<string, TenantCommunication>();
const auditLog: AuditEntry[] = [];

interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  detail: Record<string, unknown>;
}

function audit(action: string, actor: string, detail: Record<string, unknown>): void {
  if (auditLog.length >= 10_000) auditLog.splice(0, auditLog.length - 9_000);
  auditLog.push({ timestamp: new Date().toISOString(), action, actor, detail });
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Incidents ─────────────────────────────────────────────────────────

export function declareIncident(
  tenantId: string,
  title: string,
  severity: IncidentSeverity,
  commander: string,
  affectedServices: string[],
): Incident {
  const now = new Date().toISOString();
  const incident: Incident = {
    id: genId("inc"),
    tenantId,
    title,
    severity,
    status: "declared",
    commander,
    affectedServices,
    timeline: [{ timestamp: now, actor: commander, action: "declared", detail: `Incident declared: ${title}` }],
    declaredAt: now,
    createdAt: now,
    updatedAt: now,
  };
  incidents.set(incident.id, incident);
  audit("incident.declared", commander, { tenantId, incidentId: incident.id, severity });
  return incident;
}

export function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  actor: string,
  detail: string,
  tenantId?: string,
): Incident | null {
  const inc = incidents.get(id);
  if (!inc) return null;
  if (tenantId && inc.tenantId !== tenantId) return null;
  const now = new Date().toISOString();
  inc.status = status;
  inc.timeline.push({ timestamp: now, actor, action: `status -> ${status}`, detail });
  if (status === "resolved") inc.resolvedAt = now;
  inc.updatedAt = now;
  audit("incident.status_updated", actor, { tenantId: inc.tenantId, incidentId: id, status });
  return inc;
}

export function addPostmortemUrl(id: string, url: string, actor: string, tenantId?: string): Incident | null {
  const inc = incidents.get(id);
  if (!inc) return null;
  if (tenantId && inc.tenantId !== tenantId) return null;
  inc.postmortemUrl = url;
  inc.updatedAt = new Date().toISOString();
  audit("incident.postmortem_added", actor, { tenantId: inc.tenantId, incidentId: id, url });
  return inc;
}

export function listIncidents(tenantId: string): Incident[] {
  return [...incidents.values()].filter((i) => i.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getIncident(id: string, tenantId?: string): Incident | null {
  const incident = incidents.get(id) ?? null;
  if (!incident) return null;
  if (tenantId && incident.tenantId !== tenantId) return null;
  return incident;
}

// ── Status Page ────────────────────────────────────────────────────────

export function upsertStatusComponent(
  id: string,
  name: string,
  state: StatusPageState,
  description: string,
  group?: string,
): StatusPageComponent {
  const now = new Date().toISOString();
  const comp: StatusPageComponent = { id, name, group, state, description, updatedAt: now };
  statusComponents.set(id, comp);
  return comp;
}

export function getStatusPage(tenantId: string): StatusPageSnapshot {
  const components = [...statusComponents.values()];
  const activeIncidents = [...incidents.values()]
    .filter((i) => i.tenantId === tenantId && !["resolved", "postmortem"].includes(i.status))
    .map((i) => i.id);
  const activeMaint = [...maintenanceWindows.values()]
    .filter((m) => m.tenantId === tenantId && m.state === "in_progress")
    .map((m) => m.id);

  // Derive overall state from worst component
  let overallState: StatusPageState = "operational";
  const stateOrder: StatusPageState[] = ["operational", "degraded_performance", "partial_outage", "major_outage", "maintenance"];
  for (const c of components) {
    if (stateOrder.indexOf(c.state) > stateOrder.indexOf(overallState)) {
      overallState = c.state;
    }
  }

  return {
    tenantId,
    overallState,
    components,
    activeIncidents,
    activeMaintenanceWindows: activeMaint,
    generatedAt: new Date().toISOString(),
  };
}

export function listStatusComponents(): StatusPageComponent[] {
  return [...statusComponents.values()];
}

// ── Maintenance Windows ────────────────────────────────────────────────

export function createMaintenanceWindow(
  tenantId: string,
  title: string,
  description: string,
  affectedComponents: string[],
  scheduledStart: string,
  scheduledEnd: string,
  createdBy: string,
): MaintenanceWindow {
  const now = new Date().toISOString();
  const mw: MaintenanceWindow = {
    id: genId("maint"),
    tenantId,
    title,
    description,
    affectedComponents,
    scheduledStart,
    scheduledEnd,
    state: "scheduled",
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  maintenanceWindows.set(mw.id, mw);
  audit("maintenance.created", createdBy, { tenantId, maintenanceId: mw.id });
  return mw;
}

export function updateMaintenanceState(
  id: string,
  state: MaintenanceState,
  actor: string,
  tenantId?: string,
): MaintenanceWindow | null {
  const mw = maintenanceWindows.get(id);
  if (!mw) return null;
  if (tenantId && mw.tenantId !== tenantId) return null;
  mw.state = state;
  mw.updatedAt = new Date().toISOString();
  audit("maintenance.state_updated", actor, { tenantId: mw.tenantId, maintenanceId: id, state });
  return mw;
}

export function listMaintenanceWindows(tenantId: string): MaintenanceWindow[] {
  return [...maintenanceWindows.values()]
    .filter((m) => m.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── On-Call ────────────────────────────────────────────────────────────

export function upsertOnCallSchedule(
  tenantId: string,
  teamName: string,
  rotation: OnCallRotationEntry[],
  escalationPolicy: EscalationStep[],
  timezone: string,
  actor: string,
): OnCallSchedule {
  const existing = [...onCallSchedules.values()].find(
    (s) => s.tenantId === tenantId && s.teamName === teamName,
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.rotation = rotation;
    existing.escalationPolicy = escalationPolicy;
    existing.timezone = timezone;
    existing.updatedAt = now;
    audit("oncall.updated", actor, { tenantId, scheduleId: existing.id, teamName });
    return existing;
  }
  const sched: OnCallSchedule = {
    id: genId("oncall"),
    tenantId,
    teamName,
    rotation,
    escalationPolicy,
    timezone,
    createdAt: now,
    updatedAt: now,
  };
  onCallSchedules.set(sched.id, sched);
  audit("oncall.created", actor, { tenantId, scheduleId: sched.id, teamName });
  return sched;
}

export function getCurrentOnCall(tenantId: string, teamName: string): OnCallRotationEntry | null {
  const sched = [...onCallSchedules.values()].find(
    (s) => s.tenantId === tenantId && s.teamName === teamName,
  );
  if (!sched) return null;
  const now = new Date().toISOString();
  return sched.rotation.find((r) => r.startDate <= now && r.endDate > now) ?? sched.rotation[0] ?? null;
}

export function listOnCallSchedules(tenantId: string): OnCallSchedule[] {
  return [...onCallSchedules.values()].filter((s) => s.tenantId === tenantId);
}

// ── Runbooks ──────────────────────────────────────────────────────────

export function createRunbook(
  tenantId: string,
  title: string,
  service: string,
  severity: IncidentSeverity,
  steps: RunbookStep[],
  actor: string,
): Runbook {
  const now = new Date().toISOString();
  const rb: Runbook = {
    id: genId("rb"),
    tenantId,
    title,
    service,
    severity,
    steps,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  runbooks.set(rb.id, rb);
  audit("runbook.created", actor, { tenantId, runbookId: rb.id, title });
  return rb;
}

export function updateRunbook(
  id: string,
  updates: Partial<Pick<Runbook, "title" | "service" | "severity" | "steps">>,
  actor: string,
  tenantId?: string,
): Runbook | null {
  const rb = runbooks.get(id);
  if (!rb) return null;
  if (tenantId && rb.tenantId !== tenantId) return null;
  if (updates.title !== undefined) rb.title = updates.title;
  if (updates.service !== undefined) rb.service = updates.service;
  if (updates.severity !== undefined) rb.severity = updates.severity;
  if (updates.steps !== undefined) rb.steps = updates.steps;
  rb.version++;
  rb.updatedAt = new Date().toISOString();
  audit("runbook.updated", actor, { tenantId: rb.tenantId, runbookId: id, version: rb.version });
  return rb;
}

export function markRunbookTested(id: string, actor: string, tenantId?: string): Runbook | null {
  const rb = runbooks.get(id);
  if (!rb) return null;
  if (tenantId && rb.tenantId !== tenantId) return null;
  rb.lastTestedAt = new Date().toISOString();
  rb.updatedAt = rb.lastTestedAt;
  audit("runbook.tested", actor, { tenantId: rb.tenantId, runbookId: id });
  return rb;
}

export function listRunbooks(tenantId: string): Runbook[] {
  return [...runbooks.values()].filter((r) => r.tenantId === tenantId);
}

export function getRunbook(id: string, tenantId?: string): Runbook | null {
  const runbook = runbooks.get(id) ?? null;
  if (!runbook) return null;
  if (tenantId && runbook.tenantId !== tenantId) return null;
  return runbook;
}

// ── SLA Definitions & Reports ──────────────────────────────────────────

export function createSlaDefinition(
  tenantId: string,
  name: string,
  metric: SlaDefinition["metric"],
  targetValue: number,
  unit: string,
  window: SlaDefinition["window"],
  actor: string,
): SlaDefinition {
  const now = new Date().toISOString();
  const sla: SlaDefinition = {
    id: genId("sla"),
    tenantId,
    name,
    metric,
    targetValue,
    unit,
    window,
    createdAt: now,
    updatedAt: now,
  };
  slaDefinitions.set(sla.id, sla);
  audit("sla.created", actor, { tenantId, slaId: sla.id, name, metric });
  return sla;
}

export function listSlaDefinitions(tenantId: string): SlaDefinition[] {
  return [...slaDefinitions.values()].filter((s) => s.tenantId === tenantId);
}

export function generateSlaReport(tenantId: string): SlaReport[] {
  const defs = listSlaDefinitions(tenantId);
  const now = new Date();
  return defs.map((sla) => {
    // Simulated actual values based on metric type
    let actualValue: number;
    switch (sla.metric) {
      case "uptime":
        actualValue = 99.85 + Math.random() * 0.15; // 99.85-100%
        break;
      case "response_time":
        actualValue = sla.targetValue * (0.6 + Math.random() * 0.5); // 60-110% of target
        break;
      case "resolution_time":
        actualValue = sla.targetValue * (0.5 + Math.random() * 0.7); // 50-120% of target
        break;
      case "first_response":
        actualValue = sla.targetValue * (0.3 + Math.random() * 0.8); // 30-110% of target
        break;
      default:
        actualValue = sla.targetValue;
    }
    actualValue = Math.round(actualValue * 100) / 100;

    const met =
      sla.metric === "uptime"
        ? actualValue >= sla.targetValue
        : actualValue <= sla.targetValue;

    const periodStart = new Date(now);
    periodStart.setMonth(periodStart.getMonth() - 1);

    return {
      slaId: sla.id,
      slaName: sla.name,
      metric: sla.metric,
      targetValue: sla.targetValue,
      actualValue,
      unit: sla.unit,
      met,
      window: sla.window,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      generatedAt: now.toISOString(),
    };
  });
}

// ── Support Tickets ────────────────────────────────────────────────────

export function createSupportTicket(
  tenantId: string,
  subject: string,
  description: string,
  priority: TicketPriority,
  category: string,
  createdBy: string,
  relatedIncidentId?: string,
): SupportTicket {
  const now = new Date().toISOString();
  // SLA breach calculation based on priority
  const breachMinutes: Record<TicketPriority, number> = {
    critical: 30,
    high: 120,
    medium: 480,
    low: 1440,
  };
  const breachAt = new Date(Date.now() + breachMinutes[priority] * 60_000).toISOString();

  const ticket: SupportTicket = {
    id: genId("tkt"),
    tenantId,
    subject,
    description,
    priority,
    status: "open",
    category,
    relatedIncidentId,
    slaBreachAt: breachAt,
    messages: [],
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  supportTickets.set(ticket.id, ticket);
  audit("ticket.created", createdBy, { tenantId, ticketId: ticket.id, priority, category });
  return ticket;
}

export function updateTicketStatus(
  id: string,
  status: TicketStatus,
  actor: string,
  tenantId?: string,
): SupportTicket | null {
  const t = supportTickets.get(id);
  if (!t) return null;
  if (tenantId && t.tenantId !== tenantId) return null;
  t.status = status;
  t.updatedAt = new Date().toISOString();
  audit("ticket.status_updated", actor, { tenantId: t.tenantId, ticketId: id, status });
  return t;
}

export function assignTicket(id: string, assignee: string, actor: string, tenantId?: string): SupportTicket | null {
  const t = supportTickets.get(id);
  if (!t) return null;
  if (tenantId && t.tenantId !== tenantId) return null;
  t.assignee = assignee;
  t.status = t.status === "open" ? "triaged" : t.status;
  t.updatedAt = new Date().toISOString();
  audit("ticket.assigned", actor, { tenantId: t.tenantId, ticketId: id, assignee });
  return t;
}

export function addTicketMessage(
  id: string,
  author: string,
  body: string,
  internal: boolean,
  tenantId?: string,
): SupportTicket | null {
  const t = supportTickets.get(id);
  if (!t) return null;
  if (tenantId && t.tenantId !== tenantId) return null;
  t.messages.push({ timestamp: new Date().toISOString(), author, body, internal });
  t.updatedAt = new Date().toISOString();
  audit("ticket.message_added", author, { tenantId: t.tenantId, ticketId: id, internal });
  return t;
}

export function listSupportTickets(tenantId: string, status?: TicketStatus): SupportTicket[] {
  let list = [...supportTickets.values()].filter((t) => t.tenantId === tenantId);
  if (status) list = list.filter((t) => t.status === status);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSupportTicket(id: string, tenantId?: string): SupportTicket | null {
  const ticket = supportTickets.get(id) ?? null;
  if (!ticket) return null;
  if (tenantId && ticket.tenantId !== tenantId) return null;
  return ticket;
}

// ── Tenant Communications ──────────────────────────────────────────────

export function sendTenantCommunication(
  tenantId: string,
  channel: TenantCommunication["channel"],
  subject: string,
  body: string,
  createdBy: string,
  relatedIncidentId?: string,
  relatedMaintenanceId?: string,
): TenantCommunication {
  const comm: TenantCommunication = {
    id: genId("comm"),
    tenantId,
    channel,
    subject,
    body,
    relatedIncidentId,
    relatedMaintenanceId,
    sentAt: new Date().toISOString(),
    createdBy,
  };
  tenantCommunications.set(comm.id, comm);
  audit("communication.sent", createdBy, { commId: comm.id, channel, tenantId });
  return comm;
}

export function listTenantCommunications(tenantId: string): TenantCommunication[] {
  return [...tenantCommunications.values()]
    .filter((c) => c.tenantId === tenantId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

// ── Audit ──────────────────────────────────────────────────────────────

export function getSreAuditLog(limit = 200, tenantId?: string): AuditEntry[] {
  const scopedEntries = tenantId
    ? auditLog.filter((entry) => entry.detail?.tenantId === tenantId)
    : auditLog;
  return scopedEntries.slice(-limit);
}

// ── Summary / Posture ──────────────────────────────────────────────────

export interface SrePostureSummary {
  openIncidents: number;
  activeMaintenanceWindows: number;
  onCallTeams: number;
  runbookCount: number;
  slaDefinitionCount: number;
  openTickets: number;
  recentCommunications: number;
  auditEntryCount: number;
}

export function getSrePosture(tenantId: string): SrePostureSummary {
  const now = new Date();
  const last24h = new Date(now.getTime() - 86_400_000).toISOString();
  return {
    openIncidents: [...incidents.values()].filter(
      (i) => i.tenantId === tenantId && !["resolved", "postmortem"].includes(i.status),
    ).length,
    activeMaintenanceWindows: [...maintenanceWindows.values()].filter(
      (m) => m.tenantId === tenantId && m.state === "in_progress",
    ).length,
    onCallTeams: [...onCallSchedules.values()].filter((s) => s.tenantId === tenantId).length,
    runbookCount: [...runbooks.values()].filter((r) => r.tenantId === tenantId).length,
    slaDefinitionCount: [...slaDefinitions.values()].filter((s) => s.tenantId === tenantId).length,
    openTickets: [...supportTickets.values()].filter(
      (t) => t.tenantId === tenantId && !["resolved", "closed"].includes(t.status),
    ).length,
    recentCommunications: [...tenantCommunications.values()].filter(
      (c) => c.tenantId === tenantId && c.sentAt >= last24h,
    ).length,
    auditEntryCount: auditLog.filter((entry) => entry.detail?.tenantId === tenantId).length,
  };
}
