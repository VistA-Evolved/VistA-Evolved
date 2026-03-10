/**
 * Portal Audit -- PHI-safe audit trail for patient portal access events.
 * Phase 26: Separate from clinician audit to maintain domain isolation.
 *
 * Events are stored in-memory with configurable max size.
 * No patient DFN in audit events -- uses hashed patient ID.
 */

import { createHash } from "node:crypto";
import { log } from "../lib/logger.js";
import { sanitizeAuditDetail } from "../lib/phi-redaction.js";

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
  | "portal.appointment.reschedule"
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
  | "portal.telehealth.device.check"
  /* Phase 32: Refills */
  | "portal.refill.request"
  | "portal.refill.cancel"
  | "portal.refill.approve"
  | "portal.refill.deny"
  /* Phase 32: Tasks */
  | "portal.task.create"
  | "portal.task.complete"
  | "portal.task.dismiss"
  /* Phase 32: Messaging enhancements */
  | "portal.message.proxy"
  | "portal.message.clinician.reply"
  | "portal.message.blocked"
  /* Phase 80: Record Portability */
  | "portal.record.export"
  | "portal.record.download"
  | "portal.record.export.revoke"
  | "portal.record.share.create"
  | "portal.record.share.revoke"
  | "portal.record.share.access";

export interface PortalAuditEvent {
  id: string;
  timestamp: string;
  action: PortalAuditAction;
  outcome: "success" | "failure";
  tenantId: string;
  /** Hashed patient identifier -- never raw DFN */
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
const _portalRtMode = (process.env.PLATFORM_RUNTIME_MODE || process.env.NODE_ENV || 'dev').toLowerCase();
const _portalIsProd = _portalRtMode === 'rc' || _portalRtMode === 'prod' || _portalRtMode === 'production';
if (_portalIsProd && !process.env.PORTAL_AUDIT_SALT) {
  throw new Error('PORTAL_AUDIT_SALT must be set in rc/prod mode');
}
const HASH_SALT = process.env.PORTAL_AUDIT_SALT || "portal-audit-v1-dev";

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
export function hashPatientId(dfn: string, tenantId: string = "default"): string {
  return createHash("sha256")
    .update(`${HASH_SALT}:${tenantId}:${dfn}`)
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
    tenantId?: string;
    sourceIp?: string;
    detail?: Record<string, unknown>;
  }
): PortalAuditEvent {
  const tenantId = opts?.tenantId || "default";
  const event: PortalAuditEvent = {
    id: `paudit-${++seq}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    outcome,
    tenantId,
    actorHash: hashPatientId(actorDfn, tenantId),
    sourceIp: opts?.sourceIp || "unknown",
    detail: sanitizeAuditDetail(opts?.detail),
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
  tenantId?: string;
  action?: PortalAuditAction;
  since?: string;
  limit?: number;
  actorHash?: string;
}): PortalAuditEvent[] {
  let result = [...store];

  if (filters?.tenantId) {
    result = result.filter((e) => e.tenantId === filters.tenantId);
  }
  if (filters?.actorHash) {
    result = result.filter((e) => e.actorHash === filters.actorHash);
  }
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

export function getPortalAuditStats(filters?: { tenantId?: string; actorHash?: string }): {
  totalEvents: number;
  loginCount: number;
  dataAccessCount: number;
  failureCount: number;
} {
  let scoped = [...store];
  if (filters?.tenantId) {
    scoped = scoped.filter((e) => e.tenantId === filters.tenantId);
  }
  if (filters?.actorHash) {
    scoped = scoped.filter((e) => e.actorHash === filters.actorHash);
  }
  return {
    totalEvents: scoped.length,
    loginCount: scoped.filter((e) => e.action === "portal.login").length,
    dataAccessCount: scoped.filter((e) => e.action === "portal.data.access").length,
    failureCount: scoped.filter((e) => e.outcome === "failure").length,
  };
}
