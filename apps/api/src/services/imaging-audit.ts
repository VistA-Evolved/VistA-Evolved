/**
 * Imaging Audit Trail — Phase 24.
 *
 * Append-only, hash-chained audit log for imaging compliance.
 * Each entry includes a SHA-256 hash of the previous entry,
 * creating a tamper-evident chain. Tenant-scoped.
 *
 * VistA-first: Mirrors the purpose of VistA's ^MAG(2005.1)
 * IMAGE AUDIT file. When VistA Imaging is fully available,
 * this can write to ^MAG(2005.1) via MagAudit RPCs.
 *
 * Compliance requirements:
 *   - No DICOM pixel data in audit entries
 *   - No HL7 message bodies
 *   - No credentials/tokens
 *   - DFN is included (for PHI audit trail purposes)
 *   - All entries are immutable once written
 */

import { createHash, randomUUID } from "crypto";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { log } from "../lib/logger.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export type ImagingAuditAction =
  | "VIEW_STUDY"
  | "VIEW_SERIES"
  | "SEARCH_STUDIES"
  | "INGEST_STUDY"
  | "LINK_STUDY_TO_ORDER"
  | "UNMATCHED_STUDY"
  | "BREAK_GLASS_START"
  | "BREAK_GLASS_STOP"
  | "DEVICE_REGISTER"
  | "DEVICE_UPDATE"
  | "DEVICE_DELETE"
  | "STOW_UPLOAD"
  | "VIEWER_LAUNCH"
  | "AUDIT_QUERY"
  | "AUDIT_EXPORT";

export interface ImagingAuditEntry {
  /** Unique entry ID */
  id: string;
  /** Sequence number within the chain (monotonically increasing) */
  seq: number;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** SHA-256 hash of the previous entry (hex). First entry: "0".repeat(64) */
  prevHash: string;
  /** SHA-256 hash of this entry (hex) */
  hash: string;
  /** Action performed */
  action: ImagingAuditAction;
  /** Outcome */
  outcome: "success" | "denied" | "error";
  /** Actor info */
  actorDuz: string;
  actorName: string;
  actorRole: string;
  /** Tenant scope */
  tenantId: string;
  /** Patient scope (optional) */
  patientDfn?: string;
  /** Study UID (optional — NEVER pixel data) */
  studyInstanceUid?: string;
  /** Request ID for correlation */
  requestId?: string;
  /** Source IP */
  sourceIp?: string;
  /** Additional details (MUST NOT contain pixel data, HL7 bodies, or credentials) */
  detail?: Record<string, unknown>;
}

/** Actor descriptor for audit calls. */
export interface AuditActor {
  duz: string;
  name: string;
  role: string;
}

/** Options for imaging audit logging. */
export interface ImagingAuditOptions {
  patientDfn?: string;
  studyInstanceUid?: string;
  requestId?: string;
  sourceIp?: string;
  detail?: Record<string, unknown>;
}

/* ================================================================== */
/* In-memory append-only store with hash chaining                       */
/* ================================================================== */

const auditChain: ImagingAuditEntry[] = [];
let currentSeq = 0;
const GENESIS_HASH = "0".repeat(64);

/** Max in-memory entries before we start evicting old ones (keep last N). */
const MAX_MEMORY_ENTRIES = Number(process.env.IMAGING_AUDIT_MAX_ENTRIES || 10000);

/** File path for JSONL persistence (default: logs/imaging-audit.jsonl — Phase 118). */
const AUDIT_JSONL_PATH = process.env.IMAGING_AUDIT_FILE || "logs/imaging-audit.jsonl";

/**
 * Compute SHA-256 hash of an audit entry's content (excluding the hash field itself).
 */
function computeEntryHash(entry: Omit<ImagingAuditEntry, "hash">): string {
  const content = JSON.stringify({
    id: entry.id,
    seq: entry.seq,
    timestamp: entry.timestamp,
    prevHash: entry.prevHash,
    action: entry.action,
    outcome: entry.outcome,
    actorDuz: entry.actorDuz,
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    tenantId: entry.tenantId,
    patientDfn: entry.patientDfn,
    studyInstanceUid: entry.studyInstanceUid,
    requestId: entry.requestId,
    sourceIp: entry.sourceIp,
    detail: entry.detail,
  });
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Append an imaging audit entry to the chain.
 * This is the primary public API for logging imaging actions.
 */
export function imagingAudit(
  action: ImagingAuditAction,
  actor: AuditActor,
  tenantId: string,
  opts: ImagingAuditOptions = {},
): ImagingAuditEntry {
  const prevHash = auditChain.length > 0
    ? auditChain[auditChain.length - 1].hash
    : GENESIS_HASH;

  currentSeq++;

  const partial: Omit<ImagingAuditEntry, "hash"> = {
    id: randomUUID(),
    seq: currentSeq,
    timestamp: new Date().toISOString(),
    prevHash,
    action,
    outcome: "success",
    actorDuz: actor.duz,
    actorName: actor.name,
    actorRole: actor.role,
    tenantId,
    patientDfn: opts.patientDfn,
    studyInstanceUid: opts.studyInstanceUid,
    requestId: opts.requestId,
    sourceIp: opts.sourceIp,
    detail: sanitizeDetail(opts.detail),
  };

  const hash = computeEntryHash(partial);
  const entry: ImagingAuditEntry = { ...partial, hash };

  auditChain.push(entry);

  // Persist to JSONL if configured
  if (AUDIT_JSONL_PATH) {
    try {
      const dir = dirname(AUDIT_JSONL_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(AUDIT_JSONL_PATH, JSON.stringify(entry) + "\n", "utf-8");
    } catch (err) {
      log.error("Failed to write imaging audit JSONL", { error: String(err) });
    }
  }

  // Evict old entries if over limit (keep newest)
  if (auditChain.length > MAX_MEMORY_ENTRIES) {
    const excess = auditChain.length - MAX_MEMORY_ENTRIES;
    auditChain.splice(0, excess);
  }

  return entry;
}

/**
 * Log a denied imaging audit entry.
 * BUG-038 fix: Builds the denied entry directly instead of delegating
 * to imagingAudit() and patching. This prevents orphaned "success"
 * entries in the JSONL persist file.
 */
export function imagingAuditDenied(
  action: ImagingAuditAction,
  actor: AuditActor,
  tenantId: string,
  opts: ImagingAuditOptions = {},
): ImagingAuditEntry {
  const prevHash = auditChain.length > 0
    ? auditChain[auditChain.length - 1].hash
    : GENESIS_HASH;

  currentSeq++;

  const partial: Omit<ImagingAuditEntry, "hash"> = {
    id: randomUUID(),
    seq: currentSeq,
    timestamp: new Date().toISOString(),
    prevHash,
    action,
    outcome: "denied",
    actorDuz: actor.duz,
    actorName: actor.name,
    actorRole: actor.role,
    tenantId,
    patientDfn: opts.patientDfn,
    studyInstanceUid: opts.studyInstanceUid,
    requestId: opts.requestId,
    sourceIp: opts.sourceIp,
    detail: sanitizeDetail(opts.detail),
  };

  const hash = computeEntryHash(partial);
  const deniedEntry: ImagingAuditEntry = { ...partial, hash };
  auditChain.push(deniedEntry);

  // Persist to JSONL if configured
  if (AUDIT_JSONL_PATH) {
    try {
      const dir = dirname(AUDIT_JSONL_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(AUDIT_JSONL_PATH, JSON.stringify(deniedEntry) + "\n", "utf-8");
    } catch (err) {
      log.error("Failed to write imaging audit JSONL (denied)", { error: String(err) });
    }
  }

  // Evict old entries if over limit
  if (auditChain.length > MAX_MEMORY_ENTRIES) {
    const excess = auditChain.length - MAX_MEMORY_ENTRIES;
    auditChain.splice(0, excess);
  }

  return deniedEntry;
}

/**
 * Sanitize detail object to ensure no DICOM pixel data or sensitive content.
 * Checks keys case-insensitively and recurses into nested objects.
 */
function sanitizeDetail(detail?: Record<string, unknown>, depth = 0): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  if (depth > 5) return { _truncated: "max depth exceeded" };
  const sanitized: Record<string, unknown> = {};
  const BLOCKED_KEYS = new Set([
    "pixeldata", "pixel_data", "bulkdatauri", "inlinebinary",
    "hl7body", "hl7message", "messagebody",
    "accesscode", "verifycode", "password", "token", "secret",
    "ssn", "socialsecuritynumber", "dateofbirth",
  ]);
  for (const [key, value] of Object.entries(detail)) {
    if (BLOCKED_KEYS.has(key.toLowerCase())) continue;
    // Recurse into nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeDetail(value as Record<string, unknown>, depth + 1);
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "...[truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/* ================================================================== */
/* Query API                                                            */
/* ================================================================== */

export interface ImagingAuditQuery {
  tenantId?: string;
  action?: ImagingAuditAction;
  actorDuz?: string;
  patientDfn?: string;
  studyInstanceUid?: string;
  since?: string;   // ISO date
  until?: string;   // ISO date
  limit?: number;
  offset?: number;
}

/**
 * Query imaging audit entries with filters.
 */
export function queryImagingAudit(q: ImagingAuditQuery): {
  entries: ImagingAuditEntry[];
  total: number;
  chainValid: boolean;
} {
  let filtered = auditChain.slice(); // Work on copy

  if (q.tenantId) filtered = filtered.filter((e) => e.tenantId === q.tenantId);
  if (q.action) filtered = filtered.filter((e) => e.action === q.action);
  if (q.actorDuz) filtered = filtered.filter((e) => e.actorDuz === q.actorDuz);
  if (q.patientDfn) filtered = filtered.filter((e) => e.patientDfn === q.patientDfn);
  if (q.studyInstanceUid) filtered = filtered.filter((e) => e.studyInstanceUid === q.studyInstanceUid);

  if (q.since) {
    const sinceMs = new Date(q.since).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceMs);
  }
  if (q.until) {
    const untilMs = new Date(q.until).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= untilMs);
  }

  const total = filtered.length;
  const offset = q.offset || 0;
  const limit = Math.min(q.limit || 100, 1000);
  const paged = filtered.slice(offset, offset + limit);

  return { entries: paged, total, chainValid: verifyChain() };
}

/**
 * Verify the integrity of the audit chain.
 * Returns true if all hashes are valid and chain is unbroken.
 */
export function verifyChain(): boolean {
  if (auditChain.length === 0) return true;

  for (let i = 0; i < auditChain.length; i++) {
    const entry = auditChain[i];

    // Verify prevHash linkage
    if (i === 0) {
      // First entry in memory — may not start from genesis if evicted
      // Can only verify hash integrity, not chain continuity from genesis
    } else {
      if (entry.prevHash !== auditChain[i - 1].hash) return false;
    }

    // Verify entry hash
    const { hash: _h, ...rest } = entry;
    const computed = computeEntryHash(rest as Omit<ImagingAuditEntry, "hash">);
    if (computed !== entry.hash) return false;
  }

  return true;
}

/**
 * Get chain statistics.
 */
export function getChainStats(): {
  totalEntries: number;
  firstSeq: number;
  lastSeq: number;
  chainValid: boolean;
  actionCounts: Record<string, number>;
} {
  const actionCounts: Record<string, number> = {};
  for (const entry of auditChain) {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
  }

  return {
    totalEntries: auditChain.length,
    firstSeq: auditChain.length > 0 ? auditChain[0].seq : 0,
    lastSeq: auditChain.length > 0 ? auditChain[auditChain.length - 1].seq : 0,
    chainValid: verifyChain(),
    actionCounts,
  };
}

/**
 * Export audit entries as CSV string.
 * Only for imaging_admin users in compliance review.
 */
export function exportAuditCsv(q: ImagingAuditQuery): string {
  const { entries } = queryImagingAudit({ ...q, limit: 10000 });
  const header = "seq,timestamp,action,outcome,actorDuz,actorName,actorRole,tenantId,patientDfn,studyInstanceUid,sourceIp,hash,prevHash";
  const rows = entries.map((e) =>
    [
      e.seq, e.timestamp, e.action, e.outcome,
      e.actorDuz, `"${(e.actorName || "").replace(/"/g, '""')}"`, e.actorRole,
      e.tenantId, e.patientDfn || "", e.studyInstanceUid || "",
      e.sourceIp || "", e.hash, e.prevHash,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
