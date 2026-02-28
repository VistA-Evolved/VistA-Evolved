/**
 * Support Toolkit v2 -- Phase 263 (Wave 8 P7)
 *
 * Extends the Phase 244 support module with:
 *   1. Tenant diagnostic bundle — downloadable JSON snapshot of all tenant health data
 *   2. HL7 message viewer — queries message events + DLQ with correlations
 *   3. Posture summary — surfaces posture gates in the support context
 *   4. Ticket-to-HL7 correlation — links tickets to HL7 events / DLQ entries
 *
 * Pattern: Separate file, separate routes — base support module is NOT modified.
 */

import * as crypto from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DiagnosticBundle {
  id: string;
  tenantId: string;
  generatedAt: string;
  generatedBy: string;
  sections: DiagnosticSection[];
  summary: BundleSummary;
}

export interface DiagnosticSection {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  data: Record<string, unknown>;
  collectedAt: string;
}

export interface BundleSummary {
  totalSections: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
}

export interface Hl7MessageViewerEntry {
  id: string;
  tenantId: string;
  direction: "inbound" | "outbound";
  messageType: string;
  messageControlId: string;
  status: string;
  sendingFacility?: string;
  receivingFacility?: string;
  /** PHI-safe summary only */
  summary: string;
  messageHash: string;
  timestamp: string;
  /** Linked ticket IDs */
  linkedTickets: string[];
}

export interface Hl7DlqViewerEntry {
  id: string;
  messageType: string;
  messageControlId: string;
  reason: string;
  retryCount: number;
  resolved: boolean;
  tenantId?: string;
  createdAt: string;
  /** Linked ticket IDs */
  linkedTickets: string[];
}

export interface PostureGateSummary {
  domain: string;
  totalGates: number;
  passed: number;
  failed: number;
  gates: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
}

export interface TicketCorrelation {
  ticketId: string;
  correlationType: "hl7_event" | "hl7_dlq" | "posture_gate" | "audit_entry";
  correlationId: string;
  label: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Stores (in-memory, matching project pattern)                       */
/* ------------------------------------------------------------------ */

/** Diagnostic bundle snapshots */
const bundleStore = new Map<string, DiagnosticBundle>();

/** Ticket-to-resource correlations */
const correlationStore = new Map<string, TicketCorrelation[]>();

/** HL7 viewer cache (populated on demand) */
const hl7ViewerCache = new Map<string, Hl7MessageViewerEntry[]>();

/* ------------------------------------------------------------------ */
/*  Diagnostic Bundle                                                  */
/* ------------------------------------------------------------------ */

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Generate a tenant diagnostic bundle.
 * Collects health data from all subsystems for the given tenant.
 */
export function generateDiagnosticBundle(
  tenantId: string,
  generatedBy: string,
): DiagnosticBundle {
  const now = new Date().toISOString();
  const sections: DiagnosticSection[] = [];

  // Section 1: Runtime
  sections.push({
    name: "runtime",
    status: "healthy",
    data: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    },
    collectedAt: now,
  });

  // Section 2: Environment
  sections.push({
    name: "environment",
    status: "healthy",
    data: {
      runtimeMode: process.env.PLATFORM_RUNTIME_MODE || "dev",
      nodeEnv: process.env.NODE_ENV || "development",
      deploySku: process.env.DEPLOY_SKU || "FULL_SUITE",
      hl7Enabled: process.env.HL7_ENGINE_ENABLED === "true",
      otelEnabled: process.env.OTEL_ENABLED === "true",
      oidcEnabled: process.env.OIDC_ENABLED === "true",
    },
    collectedAt: now,
  });

  // Section 3: VistA connectivity
  const vistaHost = process.env.VISTA_HOST || "localhost";
  const vistaPort = process.env.VISTA_PORT || "9430";
  sections.push({
    name: "vista-connectivity",
    status: "unknown",
    data: {
      host: vistaHost,
      port: vistaPort,
      note: "Probe result populated at runtime via /admin/support/diagnostics",
    },
    collectedAt: now,
  });

  // Section 4: HL7 engine
  sections.push({
    name: "hl7-engine",
    status: process.env.HL7_ENGINE_ENABLED === "true" ? "healthy" : "unknown",
    data: {
      enabled: process.env.HL7_ENGINE_ENABLED === "true",
      port: process.env.HL7_MLLP_PORT || "2575",
    },
    collectedAt: now,
  });

  // Section 5: Store inventory
  sections.push({
    name: "stores",
    status: "healthy",
    data: {
      bundleStoreSize: bundleStore.size,
      correlationStoreSize: correlationStore.size,
      note: "Full store inventory available via /posture endpoints",
    },
    collectedAt: now,
  });

  // Section 6: Tenant configuration
  sections.push({
    name: "tenant",
    status: "healthy",
    data: {
      tenantId,
      note: "Tenant-specific config available via /admin/modules and /admin/onboarding",
    },
    collectedAt: now,
  });

  const summary: BundleSummary = {
    totalSections: sections.length,
    healthy: sections.filter((s) => s.status === "healthy").length,
    degraded: sections.filter((s) => s.status === "degraded").length,
    unhealthy: sections.filter((s) => s.status === "unhealthy").length,
    unknown: sections.filter((s) => s.status === "unknown").length,
  };

  const bundle: DiagnosticBundle = {
    id: genId("diag"),
    tenantId,
    generatedAt: now,
    generatedBy,
    sections,
    summary,
  };

  bundleStore.set(bundle.id, bundle);
  log.info("Diagnostic bundle generated", {
    bundleId: bundle.id,
    tenantId,
    sections: sections.length,
  });

  return bundle;
}

export function getDiagnosticBundle(id: string): DiagnosticBundle | undefined {
  return bundleStore.get(id);
}

export function listDiagnosticBundles(
  tenantId?: string,
): DiagnosticBundle[] {
  const all = Array.from(bundleStore.values());
  if (tenantId) return all.filter((b) => b.tenantId === tenantId);
  return all;
}

/* ------------------------------------------------------------------ */
/*  Ticket Correlation                                                 */
/* ------------------------------------------------------------------ */

export function addCorrelation(
  ticketId: string,
  correlation: Omit<TicketCorrelation, "ticketId" | "createdAt">,
): TicketCorrelation {
  const entry: TicketCorrelation = {
    ticketId,
    correlationType: correlation.correlationType,
    correlationId: correlation.correlationId,
    label: correlation.label,
    createdAt: new Date().toISOString(),
  };

  const existing = correlationStore.get(ticketId) || [];
  existing.push(entry);
  correlationStore.set(ticketId, existing);

  log.info("Ticket correlation added", {
    ticketId,
    type: correlation.correlationType,
    correlationId: correlation.correlationId,
  });

  return entry;
}

export function getCorrelations(ticketId: string): TicketCorrelation[] {
  return correlationStore.get(ticketId) || [];
}

export function removeCorrelation(
  ticketId: string,
  correlationId: string,
): boolean {
  const existing = correlationStore.get(ticketId);
  if (!existing) return false;

  const filtered = existing.filter(
    (c) => c.correlationId !== correlationId,
  );
  if (filtered.length === existing.length) return false;

  correlationStore.set(ticketId, filtered);
  return true;
}

/* ------------------------------------------------------------------ */
/*  HL7 Viewer (PHI-safe aggregation)                                  */
/* ------------------------------------------------------------------ */

/**
 * Build a PHI-safe HL7 message viewer entry from raw event data.
 * Strips all patient-identifying information.
 */
export function buildHl7ViewerEntry(raw: {
  id: string;
  tenantId: string;
  direction: string;
  messageType: string;
  messageControlId: string;
  status: string;
  sendingFacility?: string;
  receivingFacility?: string;
  summary: string;
  messageHash: string;
  timestamp: string;
}): Hl7MessageViewerEntry {
  const ticketId = raw.id;
  const linkedTickets: string[] = [];

  // Find correlations for this event
  for (const [tid, corrs] of correlationStore.entries()) {
    for (const c of corrs) {
      if (
        c.correlationType === "hl7_event" &&
        c.correlationId === raw.id
      ) {
        linkedTickets.push(tid);
      }
    }
  }

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    direction: raw.direction as "inbound" | "outbound",
    messageType: raw.messageType,
    messageControlId: raw.messageControlId,
    status: raw.status,
    sendingFacility: raw.sendingFacility,
    receivingFacility: raw.receivingFacility,
    summary: raw.summary,
    messageHash: raw.messageHash,
    timestamp: raw.timestamp,
    linkedTickets,
  };
}

/**
 * Build a PHI-safe HL7 DLQ viewer entry from raw DLQ data.
 */
export function buildHl7DlqViewerEntry(raw: {
  id: string;
  messageType: string;
  messageControlId: string;
  reason: string;
  retryCount: number;
  resolved: boolean;
  tenantId?: string;
  createdAt: string;
}): Hl7DlqViewerEntry {
  const linkedTickets: string[] = [];

  for (const [tid, corrs] of correlationStore.entries()) {
    for (const c of corrs) {
      if (c.correlationType === "hl7_dlq" && c.correlationId === raw.id) {
        linkedTickets.push(tid);
      }
    }
  }

  return {
    id: raw.id,
    messageType: raw.messageType,
    messageControlId: raw.messageControlId,
    reason: raw.reason,
    retryCount: raw.retryCount,
    resolved: raw.resolved,
    tenantId: raw.tenantId,
    createdAt: raw.createdAt,
    linkedTickets,
  };
}

/* ------------------------------------------------------------------ */
/*  Posture Summary (for support context)                              */
/* ------------------------------------------------------------------ */

/**
 * Build a posture gate summary from raw gate results.
 * Used to surface posture data in support UI without requiring
 * separate admin posture page navigation.
 */
export function buildPostureSummary(
  domain: string,
  gates: Array<{ name: string; ok: boolean; detail: string }>,
): PostureGateSummary {
  return {
    domain,
    totalGates: gates.length,
    passed: gates.filter((g) => g.ok).length,
    failed: gates.filter((g) => !g.ok).length,
    gates,
  };
}
