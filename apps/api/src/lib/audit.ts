/**
 * HIPAA-posture audit logging — Phase 15C.
 *
 * Records structured AuditEvent entries for:
 *   - Authentication (login, logout, session expired)
 *   - PHI access (patient record viewed, searched)
 *   - Clinical write-backs (allergy added, vitals recorded, note created)
 *   - Configuration changes (session rotation, capability refresh)
 *   - Security events (RBAC denial, rate-limit breach, invalid input)
 *
 * Audit events are immutable once written. Supports memory, file, and stdout sinks.
 */

import { AUDIT_CONFIG, PHI_CONFIG } from "../config/server-config.js";
import { log, getRequestId } from "./logger.js";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
// Phase 133: audit events counter metric
import { auditEventsTotal } from "../telemetry/metrics.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.session-expired"
  | "auth.session-rotated"
  | "auth.failed"
  | "phi.patient-search"
  | "phi.patient-select"
  | "phi.patient-list"
  | "phi.demographics-view"
  | "phi.allergies-view"
  | "phi.vitals-view"
  | "phi.notes-view"
  | "phi.medications-view"
  | "phi.problems-view"
  | "phi.labs-view"
  | "phi.reports-view"
  | "phi.imaging-view"
  | "phi.orders-view"
  | "phi.reminders-view"
  | "clinical.allergy-add"
  | "clinical.vitals-add"
  | "clinical.note-create"
  | "clinical.medication-add"
  | "clinical.problem-add"
  | "clinical.order-sign"
  | "clinical.order-release"
  | "clinical.lab-ack"
  | "clinical.consult-create"
  | "clinical.surgery-create"
  | "clinical.problem-save"
  // Phase 57: Write-back safety model audit events
  | "clinical.note-sign"
  | "clinical.note-addendum"
  | "clinical.note-view-text"
  | "clinical.problem-edit"
  | "clinical.order-draft"
  | "clinical.order-verify"
  | "clinical.order-dc"
  | "clinical.order-flag"
  | "clinical.consult-complete"
  | "config.capability-refresh"
  | "config.tenant-update"
  | "config.feature-flag-update"
  | "config.ui-defaults-update"
  | "config.ui-prefs-save"
  | "config.modules-update"
  | "config.template-upsert"
  | "config.template-delete"
  | "config.connector-update"
  | "config.rpc-catalog"
  | "security.rbac-denied"
  | "security.rate-limited"
  | "security.invalid-input"
  | "security.session-hijack-attempt"
  | "security.origin-rejected"
  | "security.csrf-failed"
  | "auth.locked"
  | "system.startup"
  | "system.shutdown"
  | "system.circuit-breaker-open"
  | "system.circuit-breaker-close"
  | "rpc.console-connect"
  | "rpc.console-disconnect"
  | "rpc.console-call"
  | "clinical.draft-create"
  | "clinical.draft-submit"
  | "clinical.draft-delete"
  // Phase 18: Integration + Imaging audit events
  | "integration.config-change"
  | "integration.probe"
  | "integration.dashboard-view"
  | "integration.device-onboard"
  | "imaging.viewer-launch"
  // Phase 22: Imaging platform audit events
  | "imaging.study-view"
  | "imaging.series-view"
  | "imaging.dicom-upload"
  | "imaging.proxy-request"
  | "imaging.orthanc-health"
  // Phase 23: Imaging workflow audit events
  | "imaging.order-create"
  | "imaging.order-status-change"
  | "imaging.worklist-view"
  | "imaging.study-linked"
  | "imaging.study-quarantined"
  | "imaging.study-ingested"
  // Phase 19: Reporting & export governance audit events
  | "report.generate"
  | "export.request"
  | "export.download"
  | "export.policy-check"
  // Phase 39: VistA billing grounding audit events
  | "phi.rcm-encounters-view"
  | "phi.rcm-insurance-view"
  | "phi.rcm-charges-view"
  | "phi.rcm-claims-status-view"
  | "phi.rcm-ar-status-view"
  | "data.icd-search"
  // Phase 58: Interop monitor v2 audit events
  | "interop.message-unmask"
  | "interop.message-list"
  | "interop.message-detail"
  // Phase 59: CPOE parity audit events
  | "clinical.order-lab"
  | "clinical.order-imaging"
  | "clinical.order-consult"
  | "clinical.order-check"
  // Phase 66: Production IAM v1 audit events
  | "auth.idp.authorize"
  | "auth.idp.callback"
  | "auth.idp.login"
  | "auth.vista-bind"
  // Phase 86: Shift Handoff + Signout audit events
  | "clinical.handoff-create"
  | "clinical.handoff-update"
  | "clinical.handoff-submit"
  | "clinical.handoff-accept"
  | "clinical.handoff-archive"
  | "clinical.handoff-view";

export type AuditOutcome = "success" | "failure" | "denied" | "error";

export interface AuditEvent {
  /** Unique event ID */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** What happened */
  action: AuditAction;
  /** Success/failure/denied */
  outcome: AuditOutcome;
  /** Who performed the action (DUZ or 'anonymous') */
  actorDuz: string;
  /** Actor display name */
  actorName: string;
  /** Actor role */
  actorRole: string;
  /** Patient DFN if applicable */
  patientDfn?: string;
  /** Correlation request ID */
  requestId?: string;
  /** Source IP */
  sourceIp?: string;
  /** Additional structured detail */
  detail?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* In-memory store                                                      */
/* ------------------------------------------------------------------ */

const auditStore: AuditEvent[] = [];
let auditSeq = 0;

/* ------------------------------------------------------------------ */
/* Sink writers                                                         */
/* ------------------------------------------------------------------ */

function writeToMemory(event: AuditEvent): void {
  auditStore.push(event);
  // Evict oldest when over limit
  while (auditStore.length > AUDIT_CONFIG.maxMemoryEntries) {
    auditStore.shift();
  }
}

let fileReady = false;
function writeToFile(event: AuditEvent): void {
  try {
    if (!fileReady) {
      const dir = dirname(AUDIT_CONFIG.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      fileReady = true;
    }
    appendFileSync(AUDIT_CONFIG.filePath, JSON.stringify(event) + "\n");
  } catch (err: any) {
    log.error("Audit file write failed", { error: err.message, filePath: AUDIT_CONFIG.filePath });
    // Fallback to memory
    writeToMemory(event);
  }
}

function writeToStdout(event: AuditEvent): void {
  // Use process.stdout directly for audit -- structured logger would recurse
  process.stdout.write(JSON.stringify({ _audit: true, ...event }) + "\n");
}

function writeSink(event: AuditEvent): void {
  switch (AUDIT_CONFIG.sink) {
    case "file":
      writeToFile(event);
      writeToMemory(event); // Also keep in memory for API access
      break;
    case "stdout":
      writeToStdout(event);
      writeToMemory(event);
      break;
    case "memory":
    default:
      writeToMemory(event);
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Record an audit event. This is the primary entry point for all audit logging.
 * Events are immutable once recorded.
 */
export function audit(
  action: AuditAction,
  outcome: AuditOutcome,
  actor: { duz?: string; name?: string; role?: string },
  opts?: {
    patientDfn?: string;
    requestId?: string;
    sourceIp?: string;
    detail?: Record<string, unknown>;
  },
): AuditEvent {
  const event: AuditEvent = {
    id: `audit-${++auditSeq}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    outcome,
    actorDuz: actor.duz || "anonymous",
    actorName: actor.name || "unknown",
    actorRole: actor.role || "unknown",
    patientDfn: PHI_CONFIG.auditIncludesDfn ? opts?.patientDfn : undefined,
    // Phase 133: auto-inject correlationId from request context
    requestId: opts?.requestId || getRequestId(),
    sourceIp: opts?.sourceIp,
    detail: opts?.detail,
  };

  writeSink(event);

  // Phase 133: increment audit events counter
  const actionPrefix = action.split(".")[0] || "unknown";
  try { auditEventsTotal.inc({ action_prefix: actionPrefix }); } catch { /* metric not critical */ }

  // Also emit to structured log for correlation — Phase 151: no PHI in logs
  log.info(`AUDIT: ${action} → ${outcome}`, {
    auditId: event.id,
    action,
    outcome,
    actorDuz: event.actorDuz,
    requestId: event.requestId,
  });

  return event;
}

/**
 * Query audit events from the in-memory store.
 * Supports filtering by action prefix, actor, patient, and time range.
 */
export function queryAuditEvents(filters?: {
  actionPrefix?: string;
  actorDuz?: string;
  patientDfn?: string;
  since?: string;
  limit?: number;
}): AuditEvent[] {
  let results = [...auditStore];

  if (filters?.actionPrefix) {
    results = results.filter((e) => e.action.startsWith(filters.actionPrefix!));
  }
  if (filters?.actorDuz) {
    results = results.filter((e) => e.actorDuz === filters.actorDuz);
  }
  if (filters?.patientDfn) {
    results = results.filter((e) => e.patientDfn === filters.patientDfn);
  }
  if (filters?.since) {
    const sinceTime = new Date(filters.since).getTime();
    results = results.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }

  const limit = filters?.limit || 100;
  return results.slice(-limit);
}

/** Get audit statistics. */
export function getAuditStats(): {
  total: number;
  byAction: Record<string, number>;
  byOutcome: Record<string, number>;
  oldestTimestamp: string | null;
  newestTimestamp: string | null;
} {
  const byAction: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};

  for (const e of auditStore) {
    byAction[e.action] = (byAction[e.action] || 0) + 1;
    byOutcome[e.outcome] = (byOutcome[e.outcome] || 0) + 1;
  }

  return {
    total: auditStore.length,
    byAction,
    byOutcome,
    oldestTimestamp: auditStore[0]?.timestamp ?? null,
    newestTimestamp: auditStore[auditStore.length - 1]?.timestamp ?? null,
  };
}
