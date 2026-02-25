/**
 * Access Log Store — Phase 29 (DB-hybrid Phase 121)
 *
 * Patient-visible activity log: "events performed by you or your proxy"
 *
 * Event types: sign-in/out, view record section, export, share code
 * create/redeem, proxy switch, message send, refill request.
 *
 * PHI-safe: No SSN, DOB, or clinical content in log entries.
 * Only stores event type, actor name, timestamp, and generic metadata.
 *
 * Phase 121: DB-backed hybrid — writes go to both cache + DB,
 * reads try cache first then fall back to DB on miss.
 */

import { randomBytes } from "node:crypto";
import type { AccessLogEntry, AccessLogEventType } from "./types.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* DB-backed hybrid (Phase 121)                                          */
/* ------------------------------------------------------------------ */

export interface AccessLogRepo {
  insertAccessLog(data: {
    id: string;
    userId: string;
    actorName: string;
    isProxy: boolean;
    targetPatientDfn: string | null;
    eventType: string;
    description: string;
    metadataJson?: string;
    createdAt: string;
  }): void;
  findAccessLogsByUser(
    userId: string,
    opts?: { eventType?: string; since?: string; limit?: number; offset?: number },
  ): any[];
  countAccessLogsByUser(userId: string): number;
  countAllAccessLogs(): number;
  getAccessLogStats(): { total: number; users: number };
}

let dbRepo: AccessLogRepo | null = null;

/** Called from index.ts after initPlatformDb() */
export function initAccessLogRepo(repo: AccessLogRepo): void {
  dbRepo = repo;
  log.info("Access log store wired to DB (Phase 121)");
}

function dbWarn(op: string, err: unknown): void {
  log.warn(`Access log DB ${op} failed (cache-only)`, {
    error: err instanceof Error ? err.message : String(err),
  });
}

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const MAX_ENTRIES_PER_USER = Number(process.env.PORTAL_ACCESS_LOG_MAX || 5000);
const MAX_TOTAL_ENTRIES = Number(process.env.PORTAL_ACCESS_LOG_TOTAL_MAX || 100000);

/* ------------------------------------------------------------------ */
/* Store: userId -> AccessLogEntry[]                                    */
/* ------------------------------------------------------------------ */

const accessLogs = new Map<string, AccessLogEntry[]>();
let totalEntries = 0;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function genId(): string {
  return `al-${randomBytes(12).toString("hex")}`;
}

/* ------------------------------------------------------------------ */
/* PHI sanitization                                                     */
/* ------------------------------------------------------------------ */

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{2}[/-]\d{2}[/-]\d{4}\b/, // DOB format
  /\b[A-Z][a-z]+,[A-Z][a-z]+\b/, // Name patterns (VistA LAST,FIRST)
];

function sanitizeMetadata(meta: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta)) {
    // Strip any key that looks like PHI
    const lk = key.toLowerCase();
    if (lk.includes("ssn") || lk.includes("dob") || lk.includes("birth")) continue;

    let val = value;
    for (const pat of PHI_PATTERNS) {
      val = val.replace(pat, "[REDACTED]");
    }
    clean[key] = val.slice(0, 200); // truncate long values
  }
  return clean;
}

/* ------------------------------------------------------------------ */
/* Append Event                                                         */
/* ------------------------------------------------------------------ */

export function appendAccessLog(
  userId: string,
  entry: {
    actorName: string;
    isProxy: boolean;
    targetPatientDfn: string | null;
    eventType: AccessLogEventType;
    description: string;
    metadata?: Record<string, string>;
  }
): AccessLogEntry {
  const logEntry: AccessLogEntry = {
    id: genId(),
    timestamp: new Date().toISOString(),
    userId,
    actorName: entry.actorName,
    isProxy: entry.isProxy,
    targetPatientDfn: entry.targetPatientDfn,
    eventType: entry.eventType,
    description: entry.description,
    metadata: sanitizeMetadata(entry.metadata ?? {}),
  };

  let userLog = accessLogs.get(userId);
  if (!userLog) {
    userLog = [];
    accessLogs.set(userId, userLog);
  }

  // Evict oldest if at capacity
  if (userLog.length >= MAX_ENTRIES_PER_USER) {
    userLog.shift();
    totalEntries--;
  }

  // Global cap
  if (totalEntries >= MAX_TOTAL_ENTRIES) {
    evictOldest();
  }

  userLog.push(logEntry);
  totalEntries++;

  // Phase 121: Write-through to DB
  if (dbRepo) {
    try {
      dbRepo.insertAccessLog({
        id: logEntry.id,
        userId,
        actorName: logEntry.actorName,
        isProxy: logEntry.isProxy,
        targetPatientDfn: logEntry.targetPatientDfn,
        eventType: logEntry.eventType,
        description: logEntry.description,
        metadataJson: JSON.stringify(logEntry.metadata ?? {}),
        createdAt: logEntry.timestamp,
      });
    } catch (err) {
      dbWarn("insert", err);
    }
  }

  return logEntry;
}

function evictOldest(): void {
  // Find user with oldest first entry and remove it
  let oldestTime = Infinity;
  let oldestUserId = "";
  for (const [uid, entries] of accessLogs) {
    if (entries.length > 0) {
      const t = new Date(entries[0].timestamp).getTime();
      if (t < oldestTime) {
        oldestTime = t;
        oldestUserId = uid;
      }
    }
  }
  if (oldestUserId) {
    const entries = accessLogs.get(oldestUserId);
    if (entries && entries.length > 0) {
      entries.shift();
      totalEntries--;
      if (entries.length === 0) accessLogs.delete(oldestUserId);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Query                                                                */
/* ------------------------------------------------------------------ */

export function getAccessLog(
  userId: string,
  opts?: {
    limit?: number;
    offset?: number;
    eventType?: AccessLogEventType;
    since?: string;
  }
): { entries: AccessLogEntry[]; total: number } {
  const userLog = accessLogs.get(userId) ?? [];

  // Phase 121: If cache is empty for this user, try DB
  if (userLog.length === 0 && dbRepo) {
    try {
      const dbRows = dbRepo.findAccessLogsByUser(userId, {
        eventType: opts?.eventType,
        since: opts?.since,
        limit: opts?.limit ?? 50,
        offset: opts?.offset ?? 0,
      });
      if (dbRows.length > 0) {
        const total = dbRepo.countAccessLogsByUser(userId);
        const entries: AccessLogEntry[] = dbRows.map((r: any) => ({
          id: r.id,
          timestamp: r.createdAt,
          userId: r.userId,
          actorName: r.actorName,
          isProxy: Boolean(r.isProxy),
          targetPatientDfn: r.targetPatientDfn,
          eventType: r.eventType as AccessLogEventType,
          description: r.description,
          metadata: r.metadataJson ? JSON.parse(r.metadataJson) : {},
        }));
        // Rehydrate cache
        const all = dbRepo.findAccessLogsByUser(userId, { limit: MAX_ENTRIES_PER_USER });
        const rehydrated: AccessLogEntry[] = all.map((r: any) => ({
          id: r.id,
          timestamp: r.createdAt,
          userId: r.userId,
          actorName: r.actorName,
          isProxy: Boolean(r.isProxy),
          targetPatientDfn: r.targetPatientDfn,
          eventType: r.eventType as AccessLogEventType,
          description: r.description,
          metadata: r.metadataJson ? JSON.parse(r.metadataJson) : {},
        }));
        // DB returns newest-first, cache stores oldest-first
        rehydrated.reverse();
        accessLogs.set(userId, rehydrated);
        totalEntries += rehydrated.length;
        return { entries, total };
      }
    } catch (err) {
      dbWarn("fallback-read", err);
    }
  }

  let filtered: AccessLogEntry[] = userLog;

  if (opts?.eventType) {
    filtered = filtered.filter((e) => e.eventType === opts.eventType);
  }

  if (opts?.since) {
    const sinceTime = new Date(opts.since).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
  }

  const total = filtered.length;
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 50;

  // Return newest first
  const page = filtered
    .slice()
    .reverse()
    .slice(offset, offset + limit);

  return { entries: page, total };
}

/* ------------------------------------------------------------------ */
/* Convenience logging functions                                        */
/* ------------------------------------------------------------------ */

export function logSignIn(userId: string, actorName: string, meta?: Record<string, string>): void {
  appendAccessLog(userId, {
    actorName,
    isProxy: false,
    targetPatientDfn: null,
    eventType: "sign_in",
    description: "Signed in to portal",
    metadata: meta,
  });
}

export function logSignOut(userId: string, actorName: string): void {
  appendAccessLog(userId, {
    actorName,
    isProxy: false,
    targetPatientDfn: null,
    eventType: "sign_out",
    description: "Signed out of portal",
  });
}

export function logViewSection(
  userId: string,
  actorName: string,
  section: string,
  patientDfn: string | null,
  isProxy: boolean
): void {
  appendAccessLog(userId, {
    actorName,
    isProxy,
    targetPatientDfn: patientDfn,
    eventType: "view_record_section",
    description: `Viewed ${section}`,
    metadata: { section },
  });
}

export function logExport(
  userId: string,
  actorName: string,
  format: string,
  patientDfn: string | null,
  isProxy: boolean
): void {
  appendAccessLog(userId, {
    actorName,
    isProxy,
    targetPatientDfn: patientDfn,
    eventType: "export_record",
    description: `Exported records (${format})`,
    metadata: { format },
  });
}

export function logShareCode(
  userId: string,
  actorName: string,
  action: "create" | "redeem"
): void {
  appendAccessLog(userId, {
    actorName,
    isProxy: false,
    targetPatientDfn: null,
    eventType: action === "create" ? "share_code_create" : "share_code_redeem",
    description: `Share code ${action}d`,
  });
}

export function logProxySwitch(
  userId: string,
  actorName: string,
  targetDfn: string
): void {
  appendAccessLog(userId, {
    actorName,
    isProxy: true,
    targetPatientDfn: targetDfn,
    eventType: "proxy_switch",
    description: "Switched to proxy patient",
  });
}

export function logMessageSend(
  userId: string,
  actorName: string
): void {
  appendAccessLog(userId, {
    actorName,
    isProxy: false,
    targetPatientDfn: null,
    eventType: "message_send",
    description: "Secure message sent",
  });
}

export function logRefillRequest(
  userId: string,
  actorName: string,
  patientDfn: string | null
): void {
  appendAccessLog(userId, {
    actorName,
    isProxy: false,
    targetPatientDfn: patientDfn,
    eventType: "refill_request",
    description: "Medication refill requested",
  });
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

export function getAccessLogStats(): {
  totalEntries: number;
  usersWithLogs: number;
  byEventType: Record<string, number>;
} {
  const byEventType: Record<string, number> = {};
  for (const entries of accessLogs.values()) {
    for (const e of entries) {
      byEventType[e.eventType] = (byEventType[e.eventType] || 0) + 1;
    }
  }

  // Phase 121: Supplement with DB counts when cache is cold
  let effectiveTotal = totalEntries;
  let effectiveUsers = accessLogs.size;
  if (dbRepo && totalEntries === 0) {
    try {
      const dbStats = dbRepo.getAccessLogStats();
      effectiveTotal = dbStats.total;
      effectiveUsers = dbStats.users;
    } catch (err) {
      dbWarn("stats", err);
    }
  }

  return {
    totalEntries: effectiveTotal,
    usersWithLogs: effectiveUsers,
    byEventType,
  };
}
