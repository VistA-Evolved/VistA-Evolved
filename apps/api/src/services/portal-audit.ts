/**
 * Portal Audit — PHI-safe audit trail for patient portal access events.
 * Phase 26: Separate from clinician audit to maintain domain isolation.
 *
 * Events are stored in-memory with configurable max size.
 * No patient DFN in audit events — uses hashed patient ID.
 */

import { createHash } from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type PortalAuditAction =
  | "portal.login"
  | "portal.login.failed"
  | "portal.logout"
  | "portal.session.expired"
  | "portal.data.access"
  | "portal.navigation"
  | "portal.export.section"
  | "portal.export.full"
  | "portal.export.json"
  | "portal.export.shc"
  | "portal.message.send"
  | "portal.message.read"
  | "portal.message.draft"
  | "portal.appointment.view"
  | "portal.appointment.request"
  | "portal.appointment.cancel"
  | "portal.share.create"
  | "portal.share.access"
  | "portal.share.revoke"
  | "portal.share.view"
  | "portal.proxy.grant"
  | "portal.proxy.revoke"
  | "portal.proxy.access"
  | "portal.settings.update"
  | "portal.telehealth.room.created"
  | "portal.telehealth.joined"
  | "portal.telehealth.ended"
  | "portal.telehealth.device.check";

export interface PortalAuditEvent {
  id: string;
  timestamp: string;
  action: PortalAuditAction;
  outcome: "success" | "failure";
  /** Hashed patient identifier — never raw DFN */
  actorHash: string;
  /** Source IP (anonymized in production) */
  sourceIp: string;
  /** Additional context (no PHI) */
  detail?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const MAX_ENTRIES = 5000;
const HASH_SALT = process.env.PORTAL_AUDIT_SALT || "portal-audit-v1";

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const store: PortalAuditEvent[] = [];
let seq = 0;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/**
 * Hash a patient identifier (DFN) for audit storage.
 * Never store raw DFN in portal audit events.
 */
export function hashPatientId(dfn: string): string {
  return createHash("sha256")
    .update(`${HASH_SALT}:${dfn}`)
    .digest("hex")
    .slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export function portalAudit(
  action: PortalAuditAction,
  outcome: "success" | "failure",
  actorDfn: string,
  opts?: {
    sourceIp?: string;
    detail?: Record<string, unknown>;
  }
): PortalAuditEvent {
  const event: PortalAuditEvent = {
    id: `paudit-${++seq}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    outcome,
    actorHash: hashPatientId(actorDfn),
    sourceIp: opts?.sourceIp || "unknown",
    detail: opts?.detail,
  };

  store.push(event);
  while (store.length > MAX_ENTRIES) {
    store.shift();
  }

  log.info("Portal audit event", {
    action: event.action,
    outcome: event.outcome,
    // No PHI in log output
  });

  return event;
}

export function queryPortalAuditEvents(filters?: {
  action?: PortalAuditAction;
  since?: string;
  limit?: number;
}): PortalAuditEvent[] {
  let result = [...store];

  if (filters?.action) {
    result = result.filter((e) => e.action === filters.action);
  }
  if (filters?.since) {
    const since = filters.since;
    result = result.filter((e) => e.timestamp >= since);
  }

  result.reverse(); // Newest first
  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

export function getPortalAuditStats(): {
  totalEvents: number;
  loginCount: number;
  dataAccessCount: number;
  failureCount: number;
} {
  return {
    totalEvents: store.length,
    loginCount: store.filter((e) => e.action === "portal.login").length,
    dataAccessCount: store.filter((e) => e.action === "portal.data.access").length,
    failureCount: store.filter((e) => e.outcome === "failure").length,
  };
}
