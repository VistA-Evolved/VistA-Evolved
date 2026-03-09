/**
 * Support Ops Automation Service (Phase 373 / W20-P4)
 *
 * Provides:
 * - Ticket integration hooks (provider-agnostic)
 * - Automated diagnostic bundle generator per tenant
 * - SLA timers (created -> acknowledged -> resolved timestamps)
 * - Runbooks index linked from support console
 *
 * All stores in-memory with PG migration targets.
 */

import crypto from "node:crypto";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "closed" | "escalated";

export interface SupportTicket {
  id: string;
  tenantId: string;
  externalId: string | null;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  assignedTo: string | null;
  reportedBy: string;
  sla: SlaTimestamps;
  diagnosticsBundleId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SlaTimestamps {
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  /** Time to acknowledge in ms */
  ttaMs: number | null;
  /** Time to resolve in ms */
  ttrMs: number | null;
}

export interface DiagnosticsBundle {
  id: string;
  tenantId: string;
  ticketId: string | null;
  generatedAt: string;
  sections: DiagnosticsSection[];
}

export interface DiagnosticsSection {
  name: string;
  status: "ok" | "warning" | "error" | "unknown";
  data: Record<string, unknown>;
}

export interface RunbookEntry {
  id: string;
  title: string;
  path: string;
  category: string;
  phase: string;
  description: string;
}

/* ================================================================== */
/* SLA Targets (configurable per priority)                            */
/* ================================================================== */

const SLA_TARGETS: Record<TicketPriority, { ackMinutes: number; resolveMinutes: number }> = {
  critical: { ackMinutes: 15, resolveMinutes: 240 },
  high: { ackMinutes: 60, resolveMinutes: 480 },
  medium: { ackMinutes: 240, resolveMinutes: 1440 },
  low: { ackMinutes: 1440, resolveMinutes: 4320 },
};

/* ================================================================== */
/* Stores                                                              */
/* ================================================================== */

const ticketStore = new Map<string, SupportTicket>();
const diagnosticsStore = new Map<string, DiagnosticsBundle>();

const MAX_STORE_SIZE = 10_000;

function uid(): string {
  return crypto.randomBytes(12).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function boundedSet<T>(store: Map<string, T>, key: string, value: T): void {
  if (store.size >= MAX_STORE_SIZE) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, value);
}

/* ================================================================== */
/* Ticket Lifecycle                                                    */
/* ================================================================== */

export function createTicket(
  tenantId: string,
  input: {
    title: string;
    description: string;
    priority: TicketPriority;
    category?: string;
    reportedBy: string;
    tags?: string[];
    externalId?: string;
    metadata?: Record<string, unknown>;
  }
): SupportTicket {
  const createdAt = now();
  const ticket: SupportTicket = {
    id: uid(),
    tenantId,
    externalId: input.externalId || null,
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: "open",
    category: input.category || "general",
    assignedTo: null,
    reportedBy: input.reportedBy,
    sla: {
      createdAt,
      acknowledgedAt: null,
      resolvedAt: null,
      closedAt: null,
      ttaMs: null,
      ttrMs: null,
    },
    diagnosticsBundleId: null,
    tags: input.tags || [],
    metadata: input.metadata || {},
    createdAt,
    updatedAt: createdAt,
  };
  boundedSet(ticketStore, ticket.id, ticket);
  return ticket;
}

export function acknowledgeTicket(tenantId: string, id: string, assignedTo: string): SupportTicket | null {
  const ticket = ticketStore.get(id);
  if (!ticket || ticket.tenantId !== tenantId || ticket.status !== "open") return null;
  const ackTime = now();
  const ttaMs = new Date(ackTime).getTime() - new Date(ticket.sla.createdAt).getTime();
  const updated: SupportTicket = {
    ...ticket,
    status: "acknowledged",
    assignedTo,
    sla: { ...ticket.sla, acknowledgedAt: ackTime, ttaMs },
    updatedAt: ackTime,
  };
  ticketStore.set(id, updated);
  return updated;
}

export function startWork(tenantId: string, id: string): SupportTicket | null {
  const ticket = ticketStore.get(id);
  if (!ticket || ticket.tenantId !== tenantId || ticket.status !== "acknowledged") return null;
  const updated: SupportTicket = {
    ...ticket,
    status: "in_progress",
    updatedAt: now(),
  };
  ticketStore.set(id, updated);
  return updated;
}

export function resolveTicket(tenantId: string, id: string, resolution?: string): SupportTicket | null {
  const ticket = ticketStore.get(id);
  if (
    !ticket ||
    ticket.tenantId !== tenantId ||
    (ticket.status !== "in_progress" && ticket.status !== "acknowledged" && ticket.status !== "open")
  ) return null;
  const resolveTime = now();
  const ttrMs = new Date(resolveTime).getTime() - new Date(ticket.sla.createdAt).getTime();
  const updated: SupportTicket = {
    ...ticket,
    status: "resolved",
    sla: { ...ticket.sla, resolvedAt: resolveTime, ttrMs },
    metadata: { ...ticket.metadata, resolution: resolution || "" },
    updatedAt: resolveTime,
  };
  ticketStore.set(id, updated);
  return updated;
}

export function closeTicket(tenantId: string, id: string): SupportTicket | null {
  const ticket = ticketStore.get(id);
  if (!ticket || ticket.tenantId !== tenantId || ticket.status !== "resolved") return null;
  const closeTime = now();
  const updated: SupportTicket = {
    ...ticket,
    status: "closed",
    sla: { ...ticket.sla, closedAt: closeTime },
    updatedAt: closeTime,
  };
  ticketStore.set(id, updated);
  return updated;
}

export function escalateTicket(tenantId: string, id: string, reason: string): SupportTicket | null {
  const ticket = ticketStore.get(id);
  if (!ticket || ticket.tenantId !== tenantId || ticket.status === "closed" || ticket.status === "resolved") return null;
  const updated: SupportTicket = {
    ...ticket,
    status: "escalated",
    metadata: { ...ticket.metadata, escalationReason: reason },
    updatedAt: now(),
  };
  ticketStore.set(id, updated);
  return updated;
}

export function getTicket(id: string, tenantId: string): SupportTicket | undefined {
  const ticket = ticketStore.get(id);
  if (!ticket) return undefined;
  if (ticket.tenantId !== tenantId) return undefined;
  return ticket;
}

export function listTickets(tenantId: string, status?: TicketStatus): SupportTicket[] {
  const all = [...ticketStore.values()].filter((t) => t.tenantId === tenantId);
  if (status) return all.filter((t) => t.status === status);
  return all;
}

function attachDiagnostics(tenantId: string, ticketId: string, bundleId: string): SupportTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket || ticket.tenantId !== tenantId) return null;
  const updated: SupportTicket = {
    ...ticket,
    diagnosticsBundleId: bundleId,
    updatedAt: now(),
  };
  ticketStore.set(ticketId, updated);
  return updated;
}

/* ================================================================== */
/* Diagnostics Bundle Generator                                        */
/* ================================================================== */

export function generateDiagnosticsBundle(tenantId: string, ticketId?: string): DiagnosticsBundle {
  const tenantTicketCount = [...ticketStore.values()].filter((ticket) => ticket.tenantId === tenantId).length;
  const tenantDiagnosticsCount = [...diagnosticsStore.values()].filter(
    (bundle) => bundle.tenantId === tenantId
  ).length;

  const sections: DiagnosticsSection[] = [
    {
      name: "memory",
      status: "unknown",
      data: {
        note: "Platform memory metrics are available via /posture/performance.",
      },
    },
    {
      name: "uptime",
      status: "unknown",
      data: { note: "Platform uptime is available via /posture/performance." },
    },
    {
      name: "node_version",
      status: "ok",
      data: { version: process.version, platform: process.platform, arch: process.arch },
    },
    {
      name: "store_inventory",
      status: "ok",
      data: {
        tenantTicketCount,
        tenantDiagnosticsCount,
      },
    },
    {
      name: "environment",
      status: "ok",
      data: {
        nodeEnv: process.env.NODE_ENV || "development",
        runtimeMode: process.env.PLATFORM_RUNTIME_MODE || "dev",
        tenantId,
      },
    },
  ];

  const bundle: DiagnosticsBundle = {
    id: uid(),
    tenantId,
    ticketId: ticketId || null,
    generatedAt: now(),
    sections,
  };
  boundedSet(diagnosticsStore, bundle.id, bundle);

  // Auto-attach to ticket if provided
  if (ticketId) {
    attachDiagnostics(tenantId, ticketId, bundle.id);
  }

  return bundle;
}

export function getDiagnosticsBundle(id: string, tenantId: string): DiagnosticsBundle | undefined {
  const bundle = diagnosticsStore.get(id);
  if (!bundle) return undefined;
  if (bundle.tenantId !== tenantId) return undefined;
  return bundle;
}

export function listDiagnosticsBundles(tenantId: string): DiagnosticsBundle[] {
  return [...diagnosticsStore.values()].filter((b) => b.tenantId === tenantId);
}

/* ================================================================== */
/* Runbook Index                                                       */
/* ================================================================== */

const RUNBOOK_INDEX: RunbookEntry[] = [
  { id: "rb-001", title: "VistA RPC Default Patient List", path: "docs/runbooks/vista-rpc-default-patient-list.md", category: "vista", phase: "Phase 1", description: "Setting up and verifying VistA RPC broker connection" },
  { id: "rb-002", title: "VistA RPC Add Allergy", path: "docs/runbooks/vista-rpc-add-allergy.md", category: "vista", phase: "Phase 7", description: "Adding allergies via GMRAGNT RPC" },
  { id: "rb-003", title: "Imaging Enterprise Security", path: "docs/runbooks/imaging-enterprise-security.md", category: "imaging", phase: "Phase 24", description: "Imaging RBAC and break-glass procedures" },
  { id: "rb-004", title: "Analytics Octo/ROcto", path: "docs/runbooks/analytics-octo-rocto.md", category: "analytics", phase: "Phase 25D", description: "Analytics SQL layer setup" },
  { id: "rb-005", title: "Telehealth", path: "docs/runbooks/phase30-telehealth.md", category: "telehealth", phase: "Phase 30", description: "Telehealth room management" },
  { id: "rb-006", title: "IAM Authorization & Audit", path: "docs/runbooks/phase35-iam-authz-audit.md", category: "security", phase: "Phase 35", description: "OIDC, policy engine, immutable audit" },
  { id: "rb-007", title: "Observability & Reliability", path: "docs/runbooks/phase36-observability-reliability.md", category: "observability", phase: "Phase 36", description: "OTel, Prometheus, Jaeger setup" },
  { id: "rb-008", title: "RCM Payer Connectivity", path: "docs/runbooks/rcm-payer-connectivity.md", category: "rcm", phase: "Phase 38", description: "Revenue cycle payer integration" },
  { id: "rb-009", title: "VistA Provisioning", path: "docs/runbooks/vista-provisioning.md", category: "vista", phase: "Phase 155", description: "VistA routine installation" },
  { id: "rb-010", title: "Production Posture", path: "docs/runbooks/phase107-production-posture.md", category: "operations", phase: "Phase 107", description: "Production readiness posture checks" },
  { id: "rb-011", title: "PostgreSQL Data Plane", path: "docs/runbooks/postgres-only-dataplane.md", category: "data", phase: "Phase 125", description: "PG-only data plane for rc/prod" },
  { id: "rb-012", title: "GA Readiness Checklist", path: "docs/ga/GA_READINESS_CHECKLIST.md", category: "ga", phase: "Phase 370", description: "GA readiness gate verification" },
];

export function getRunbookIndex(): RunbookEntry[] {
  return RUNBOOK_INDEX;
}

export function getRunbooksByCategory(category: string): RunbookEntry[] {
  return RUNBOOK_INDEX.filter((r) => r.category === category);
}

/* ================================================================== */
/* SLA Summary                                                         */
/* ================================================================== */

export function getSlaReport(tenantId: string): {
  totalTickets: number;
  byPriority: Record<TicketPriority, { count: number; avgTtaMs: number; avgTtrMs: number }>;
  slaBreach: { priority: TicketPriority; ticketId: string; type: "ack" | "resolve" }[];
} {
  const tickets = listTickets(tenantId);
  const byPriority: Record<string, { count: number; totalTta: number; totalTtr: number; ttaCount: number; ttrCount: number }> = {};
  const breaches: { priority: TicketPriority; ticketId: string; type: "ack" | "resolve" }[] = [];

  for (const t of tickets) {
    if (!byPriority[t.priority]) {
      byPriority[t.priority] = { count: 0, totalTta: 0, totalTtr: 0, ttaCount: 0, ttrCount: 0 };
    }
    const bp = byPriority[t.priority];
    bp.count++;
    if (t.sla.ttaMs !== null) {
      bp.totalTta += t.sla.ttaMs;
      bp.ttaCount++;
      if (t.sla.ttaMs > SLA_TARGETS[t.priority].ackMinutes * 60000) {
        breaches.push({ priority: t.priority, ticketId: t.id, type: "ack" });
      }
    }
    if (t.sla.ttrMs !== null) {
      bp.totalTtr += t.sla.ttrMs;
      bp.ttrCount++;
      if (t.sla.ttrMs > SLA_TARGETS[t.priority].resolveMinutes * 60000) {
        breaches.push({ priority: t.priority, ticketId: t.id, type: "resolve" });
      }
    }
  }

  const result: Record<string, { count: number; avgTtaMs: number; avgTtrMs: number }> = {};
  for (const [p, d] of Object.entries(byPriority)) {
    result[p] = {
      count: d.count,
      avgTtaMs: d.ttaCount > 0 ? Math.round(d.totalTta / d.ttaCount) : 0,
      avgTtrMs: d.ttrCount > 0 ? Math.round(d.totalTtr / d.ttrCount) : 0,
    };
  }

  return {
    totalTickets: tickets.length,
    byPriority: result as Record<TicketPriority, { count: number; avgTtaMs: number; avgTtrMs: number }>,
    slaBreach: breaches,
  };
}
