/**
 * Immutable Audit Store — Phase 35.
 *
 * Append-only, hash-chained audit log for security-relevant events.
 * Each entry includes a SHA-256 hash of the previous entry for tamper evidence.
 *
 * Design:
 *   - Append-only: entries cannot be modified or deleted at the application layer
 *   - Hash-chained: each entry references the hash of its predecessor
 *   - PHI-safe: no patient names, SSN, DOB, or clinical payload content
 *   - RPC categories logged (e.g., "ORWPT LIST ALL") but NOT the response data
 *   - Dual sink: in-memory ring buffer + file (JSONL)
 *
 * Production target: database table with immutability constraints
 *   - INSERT only (no UPDATE/DELETE grants)
 *   - Row-level hash verification
 *   - Separate audit DB with restricted credentials
 */

import { createHash } from "crypto";
import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname } from "path";
import { log } from "./logger.js";
import { getCurrentTraceId } from "../telemetry/tracing.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ImmutableAuditAction =
  // Authentication lifecycle
  | "auth.login"
  | "auth.logout"
  | "auth.session-create"
  | "auth.session-expire"
  | "auth.session-rotate"
  | "auth.failed"
  | "auth.oidc-login"
  | "auth.passkey-register"
  | "auth.passkey-login"
  // Patient context
  | "context.patient-select"
  | "context.patient-change"
  | "context.patient-clear"
  // RPC call categories (no payloads)
  | "rpc.read"
  | "rpc.write"
  | "rpc.admin"
  | "rpc.context-set"
  // Write attempts
  | "write.allergy"
  | "write.vitals"
  | "write.note"
  | "write.medication"
  | "write.problem"
  | "write.order"
  | "write.draft"
  // Policy decisions
  | "policy.allowed"
  | "policy.denied"
  | "policy.break-glass"
  // Security events
  | "security.rbac-denied"
  | "security.rate-limited"
  | "security.origin-rejected"
  | "security.invalid-token"
  | "security.jwt-expired"
  | "security.tenant-violation"
  // System events
  | "system.startup"
  | "system.shutdown"
  | "system.config-change"
  // Audit access (meta-audit)
  | "audit.view"
  | "audit.export"
  | "audit.verify"
  // Migration toolkit events (Phase 50)
  | "migration.import.start"
  | "migration.import.complete"
  | "migration.export.start"
  | "migration.export.complete"
  | "migration.validate"
  | "migration.dry-run"
  | "migration.rollback"
  | "migration.template.create"
  | "migration.template.delete"
  | "migration.job.delete"
  // Scheduling events (Phase 63)
  | "scheduling.list"
  | "scheduling.request"
  | "scheduling.cancel"
  | "scheduling.reschedule"
  // Secure messaging events (Phase 70)
  | "messaging.send"
  | "messaging.read"
  | "messaging.manage"
  | "messaging.portal-send"
  // Phase 66: Production IAM v1 immutable audit events
  | "auth.idp.login"
  | "auth.idp.failed"
  | "auth.vista-bind"
  // Phase 76: Module toggle events
  | "module.toggle"
  | "module.override-clear";

export type ImmutableAuditOutcome = "success" | "failure" | "denied" | "error";

export interface ImmutableAuditEntry {
  /** Sequential entry number (monotonic) */
  seq: number;
  /** SHA-256 hash of this entry (computed from all fields + prevHash) */
  hash: string;
  /** SHA-256 hash of previous entry (empty string for first entry) */
  prevHash: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** What happened */
  action: ImmutableAuditAction;
  /** Outcome */
  outcome: ImmutableAuditOutcome;
  /** Actor identifier (DUZ, sub, or "anonymous") — never a name */
  actorId: string;
  /** Actor display name (sanitized — no PHI) */
  actorName: string;
  /** Actor roles */
  actorRoles: string[];
  /** Correlation request ID */
  requestId?: string;
  /** OTel trace ID for cross-system correlation */
  traceId?: string;
  /** Source IP (hashed in production) */
  sourceIp?: string;
  /** Tenant context */
  tenantId?: string;
  /** Structured detail (NO PHI — action categories only) */
  detail?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const MAX_MEMORY_ENTRIES = Number(process.env.IMMUTABLE_AUDIT_MAX_ENTRIES || 10000);
const AUDIT_FILE_PATH = process.env.IMMUTABLE_AUDIT_FILE_PATH || "logs/immutable-audit.jsonl";
const AUDIT_SINK = process.env.IMMUTABLE_AUDIT_SINK || "both"; // "memory" | "file" | "both"
const HASH_SOURCE_IP = process.env.NODE_ENV === "production";

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

/** Append-only ring buffer. Oldest entries evicted when full. */
const auditRing: ImmutableAuditEntry[] = [];
let seq = 0;
let lastHash = "";

/* ------------------------------------------------------------------ */
/* Hash computation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compute SHA-256 hash for an audit entry.
 * Hash includes all fields except `hash` itself.
 */
function computeEntryHash(entry: Omit<ImmutableAuditEntry, "hash">): string {
  const data = JSON.stringify({
    seq: entry.seq,
    prevHash: entry.prevHash,
    timestamp: entry.timestamp,
    action: entry.action,
    outcome: entry.outcome,
    actorId: entry.actorId,
    actorName: entry.actorName,
    actorRoles: entry.actorRoles,
    requestId: entry.requestId,
    traceId: entry.traceId,
    sourceIp: entry.sourceIp,
    tenantId: entry.tenantId,
    detail: entry.detail,
  });
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Hash an IP address (for production — never store raw IPs in audit).
 */
function hashIp(ip: string): string {
  if (!HASH_SOURCE_IP) return ip;
  return createHash("sha256").update(ip + "vista-evolved-ip-salt").digest("hex").slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* PHI sanitization                                                    */
/* ------------------------------------------------------------------ */

/** Patterns that indicate PHI — strip from detail values. */
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,   // SSN
  /\b\d{9}\b/g,                 // SSN without dashes
  /\d{4}-\d{2}-\d{2}T/g,       // ISO dates (could be DOB)
  /\b[A-Z]+,[A-Z ]+\b/g,       // VistA patient name format
];

function sanitizeDetail(detail?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    // Strip known PHI field names
    const lowerKey = key.toLowerCase();
    if (["ssn", "dob", "dateofbirth", "socialSecurityNumber", "notetext", "notecontent"].includes(lowerKey)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      let clean = value;
      for (const pattern of PHI_PATTERNS) {
        clean = clean.replace(pattern, "[REDACTED]");
      }
      sanitized[key] = clean;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/* ------------------------------------------------------------------ */
/* Sink writers                                                        */
/* ------------------------------------------------------------------ */

let fileReady = false;

function writeToFile(entry: ImmutableAuditEntry): void {
  if (AUDIT_SINK !== "file" && AUDIT_SINK !== "both") return;
  try {
    if (!fileReady) {
      const dir = dirname(AUDIT_FILE_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      fileReady = true;
    }
    appendFileSync(AUDIT_FILE_PATH, JSON.stringify(entry) + "\n");
  } catch (err: any) {
    log.error("Immutable audit file write failed", { error: err.message });
  }
}

function writeToMemory(entry: ImmutableAuditEntry): void {
  if (AUDIT_SINK !== "memory" && AUDIT_SINK !== "both") return;
  auditRing.push(entry);
  // Evict oldest when over limit
  while (auditRing.length > MAX_MEMORY_ENTRIES) {
    auditRing.shift();
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Record an immutable audit event.
 *
 * This is the primary entry point. Events are append-only and hash-chained.
 * PHI is automatically sanitized from detail payloads.
 */
export function immutableAudit(
  action: ImmutableAuditAction,
  outcome: ImmutableAuditOutcome,
  actor: { sub?: string; name?: string; roles?: string[] },
  opts?: {
    requestId?: string;
    sourceIp?: string;
    tenantId?: string;
    detail?: Record<string, unknown>;
  },
): ImmutableAuditEntry {
  const entryBase = {
    seq: ++seq,
    prevHash: lastHash,
    timestamp: new Date().toISOString(),
    action,
    outcome,
    actorId: actor.sub || "anonymous",
    actorName: actor.name || "unknown",
    actorRoles: actor.roles || [],
    requestId: opts?.requestId,
    traceId: getCurrentTraceId() || undefined,
    sourceIp: opts?.sourceIp ? hashIp(opts.sourceIp) : undefined,
    tenantId: opts?.tenantId,
    detail: sanitizeDetail(opts?.detail),
  };

  const hash = computeEntryHash(entryBase);
  const entry: ImmutableAuditEntry = { ...entryBase, hash };
  lastHash = hash;

  // Write to sinks
  writeToMemory(entry);
  writeToFile(entry);

  // Also emit to structured log
  log.info(`IMMUTABLE_AUDIT: ${action} -> ${outcome}`, {
    auditSeq: entry.seq,
    action,
    outcome,
    actorId: entry.actorId,
    requestId: entry.requestId,
  });

  return entry;
}

/**
 * Query immutable audit events from the in-memory ring buffer.
 */
export function queryImmutableAudit(filters?: {
  actionPrefix?: string;
  actorId?: string;
  tenantId?: string;
  since?: string;
  limit?: number;
  outcome?: ImmutableAuditOutcome;
}): ImmutableAuditEntry[] {
  let results = [...auditRing];

  if (filters?.actionPrefix) {
    results = results.filter((e) => e.action.startsWith(filters.actionPrefix!));
  }
  if (filters?.actorId) {
    results = results.filter((e) => e.actorId === filters.actorId);
  }
  if (filters?.tenantId) {
    results = results.filter((e) => e.tenantId === filters.tenantId);
  }
  if (filters?.outcome) {
    results = results.filter((e) => e.outcome === filters.outcome);
  }
  if (filters?.since) {
    const sinceTime = new Date(filters.since).getTime();
    results = results.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }

  const limit = filters?.limit || 100;
  return results.slice(-limit);
}

/**
 * Verify the hash chain integrity of the in-memory audit log.
 * Returns { valid: true } if the chain is intact, { valid: false, brokenAt }
 * if tampered.
 */
export function verifyAuditChain(): {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  error?: string;
} {
  if (auditRing.length === 0) {
    return { valid: true, totalEntries: 0 };
  }

  for (let i = 0; i < auditRing.length; i++) {
    const entry = auditRing[i];

    // Verify this entry's hash
    const { hash: _storedHash, ...rest } = entry;
    const expectedHash = computeEntryHash(rest);
    if (entry.hash !== expectedHash) {
      return {
        valid: false,
        totalEntries: auditRing.length,
        brokenAt: entry.seq,
        error: `Hash mismatch at seq ${entry.seq}`,
      };
    }

    // Verify chain linkage (skip first entry — its prevHash is "")
    if (i > 0 && entry.prevHash !== auditRing[i - 1].hash) {
      return {
        valid: false,
        totalEntries: auditRing.length,
        brokenAt: entry.seq,
        error: `Chain broken at seq ${entry.seq}: prevHash mismatch`,
      };
    }
  }

  return { valid: true, totalEntries: auditRing.length };
}

/**
 * Get audit statistics.
 */
export function getImmutableAuditStats(): {
  totalEntries: number;
  byAction: Record<string, number>;
  byOutcome: Record<string, number>;
  chainValid: boolean;
  oldestTimestamp: string | null;
  newestTimestamp: string | null;
} {
  const byAction: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};

  for (const e of auditRing) {
    byAction[e.action] = (byAction[e.action] || 0) + 1;
    byOutcome[e.outcome] = (byOutcome[e.outcome] || 0) + 1;
  }

  const chain = verifyAuditChain();

  return {
    totalEntries: auditRing.length,
    byAction,
    byOutcome,
    chainValid: chain.valid,
    oldestTimestamp: auditRing[0]?.timestamp ?? null,
    newestTimestamp: auditRing[auditRing.length - 1]?.timestamp ?? null,
  };
}

/**
 * Verify the file-based audit chain.
 * Reads the JSONL file and verifies each entry's hash + chain linkage.
 */
export function verifyFileAuditChain(): {
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  error?: string;
} {
  try {
    if (!existsSync(AUDIT_FILE_PATH)) {
      return { valid: true, totalEntries: 0 };
    }

    const content = readFileSync(AUDIT_FILE_PATH, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    let prevHashExpected = "";

    for (let i = 0; i < lines.length; i++) {
      const entry: ImmutableAuditEntry = JSON.parse(lines[i]);

      // Verify entry hash
      const { hash: storedHash, ...rest } = entry;
      const expectedHash = computeEntryHash(rest);
      if (storedHash !== expectedHash) {
        return {
          valid: false,
          totalEntries: lines.length,
          brokenAt: entry.seq,
          error: `File hash mismatch at seq ${entry.seq}`,
        };
      }

      // Verify chain
      if (i > 0 && entry.prevHash !== prevHashExpected) {
        return {
          valid: false,
          totalEntries: lines.length,
          brokenAt: entry.seq,
          error: `File chain broken at seq ${entry.seq}`,
        };
      }
      prevHashExpected = storedHash;
    }

    return { valid: true, totalEntries: lines.length };
  } catch (err: any) {
    return { valid: false, totalEntries: 0, error: err.message };
  }
}
