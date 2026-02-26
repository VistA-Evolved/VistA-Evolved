/**
 * Enterprise Break-Glass — Phase 141: Enterprise IAM Posture.
 *
 * A platform-level break-glass system that allows authorized users to request
 * elevated access in emergency situations. Unlike the Phase 24 imaging-specific
 * break-glass, this is a general-purpose mechanism usable across all modules.
 *
 * Lifecycle:
 *   1. User requests break-glass (POST /admin/break-glass/request)
 *      → creates a PENDING session
 *   2. Admin approves (POST /admin/break-glass/approve)
 *      → activates the session with a time limit
 *   3. Admin revokes (POST /admin/break-glass/revoke)
 *      → terminates immediately, OR session auto-expires
 *
 * All transitions are immutably audited. Sessions are tenant-scoped and
 * timeboxed (max 4 hours, default 30 minutes).
 *
 * Classification: Ephemeral Operational State (in-memory, resets on restart).
 * This is intentional — approved break-glass sessions should not survive
 * a restart for security reasons. Historical audit records persist in the
 * immutable audit chain.
 */

import { randomUUID } from "crypto";
import { log } from "../lib/logger.js";
import { immutableAudit } from "../lib/immutable-audit.js";
import type { UserRole } from "./session-store.js";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type BreakGlassStatus = "pending" | "active" | "expired" | "revoked" | "denied";

export interface EnterpriseBreakGlassSession {
  id: string;
  /** Requester info */
  requesterDuz: string;
  requesterName: string;
  requesterRole: UserRole;
  /** What they're requesting access to */
  targetModule: string;
  targetPermission: string;
  /** Patient DFN if patient-scoped (optional) */
  patientDfn: string | null;
  /** Justification (min 10 chars) */
  reason: string;
  /** Tenant scope */
  tenantId: string;
  /** Current status */
  status: BreakGlassStatus;
  /** Timestamps */
  requestedAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  revokedAt: number | null;
  /** Approver info (null until approved) */
  approverDuz: string | null;
  approverName: string | null;
  /** Revoker/denier info (null until revoked or denied).
   *  For "denied" status, these fields store the denier's identity.
   *  Field names are reused to keep the model flat — use `status` to
   *  distinguish revoke vs deny. */
  revokerDuz: string | null;
  revokerName: string | null;
  /** Request source IP */
  sourceIp: string;
}

/* ================================================================== */
/* Configuration                                                       */
/* ================================================================== */

/** Maximum break-glass TTL: 4 hours. Cannot be infinite. */
const MAX_BREAK_GLASS_TTL_MS = 4 * 60 * 60 * 1000;
/** Default break-glass TTL: 30 minutes. */
const DEFAULT_BREAK_GLASS_TTL_MS = 30 * 60 * 1000;
/** Minimum reason length */
const MIN_REASON_LENGTH = 10;
/** Maximum active sessions per user */
const MAX_ACTIVE_PER_USER = 3;
/** Cleanup interval: every 5 minutes check for expired sessions */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/* ================================================================== */
/* Store (in-memory, ephemeral)                                        */
/* ================================================================== */

const breakGlassStore = new Map<string, EnterpriseBreakGlassSession>();

/** Auto-expire timers keyed by session ID */
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

/* ================================================================== */
/* Core operations                                                     */
/* ================================================================== */

/**
 * Request a break-glass session. Creates a PENDING entry awaiting admin approval.
 */
export function requestBreakGlass(params: {
  requesterDuz: string;
  requesterName: string;
  requesterRole: UserRole;
  targetModule: string;
  targetPermission: string;
  patientDfn?: string;
  reason: string;
  tenantId: string;
  sourceIp: string;
}): { ok: boolean; session?: EnterpriseBreakGlassSession; error?: string } {
  // Validate reason length
  if (!params.reason || params.reason.trim().length < MIN_REASON_LENGTH) {
    return {
      ok: false,
      error: `Reason must be at least ${MIN_REASON_LENGTH} characters`,
    };
  }

  // Check max active sessions per user
  const activeCount = getActiveSessionsForUser(params.requesterDuz).length;
  if (activeCount >= MAX_ACTIVE_PER_USER) {
    return {
      ok: false,
      error: `Maximum ${MAX_ACTIVE_PER_USER} active break-glass sessions per user`,
    };
  }

  const session: EnterpriseBreakGlassSession = {
    id: randomUUID(),
    requesterDuz: params.requesterDuz,
    requesterName: params.requesterName,
    requesterRole: params.requesterRole,
    targetModule: params.targetModule,
    targetPermission: params.targetPermission,
    patientDfn: params.patientDfn || null,
    reason: params.reason.trim(),
    tenantId: params.tenantId,
    status: "pending",
    requestedAt: Date.now(),
    activatedAt: null,
    expiresAt: null,
    revokedAt: null,
    approverDuz: null,
    approverName: null,
    revokerDuz: null,
    revokerName: null,
    sourceIp: params.sourceIp,
  };

  breakGlassStore.set(session.id, session);

  // Immutable audit
  immutableAudit("iam.break-glass.request", "success", {
    sub: params.requesterDuz,
    name: params.requesterName,
    roles: [params.requesterRole],
  }, {
    sourceIp: params.sourceIp,
    tenantId: params.tenantId,
    detail: {
      sessionId: session.id,
      targetModule: params.targetModule,
      targetPermission: params.targetPermission,
      patientDfn: params.patientDfn || null,
    },
  });

  log.info("Break-glass requested", {
    sessionId: session.id,
    requester: params.requesterDuz,
    module: params.targetModule,
  });

  return { ok: true, session };
}

/**
 * Approve a pending break-glass session. Activates it with a TTL.
 */
export function approveBreakGlass(params: {
  sessionId: string;
  approverDuz: string;
  approverName: string;
  ttlMinutes?: number;
  sourceIp: string;
}): { ok: boolean; session?: EnterpriseBreakGlassSession; error?: string } {
  const session = breakGlassStore.get(params.sessionId);
  if (!session) {
    return { ok: false, error: "Break-glass session not found" };
  }

  if (session.status !== "pending") {
    return { ok: false, error: `Cannot approve session in '${session.status}' state` };
  }

  // Self-approval blocked
  if (session.requesterDuz === params.approverDuz) {
    return { ok: false, error: "Self-approval is not permitted" };
  }

  // Calculate TTL
  const ttlMs = params.ttlMinutes
    ? Math.min(params.ttlMinutes * 60 * 1000, MAX_BREAK_GLASS_TTL_MS)
    : DEFAULT_BREAK_GLASS_TTL_MS;

  const now = Date.now();
  session.status = "active";
  session.activatedAt = now;
  session.expiresAt = now + ttlMs;
  session.approverDuz = params.approverDuz;
  session.approverName = params.approverName;

  // Set auto-expire timer
  const timer = setTimeout(() => {
    expireSession(session.id);
  }, ttlMs);
  timer.unref(); // Don't keep process alive
  expiryTimers.set(session.id, timer);

  // Immutable audit
  immutableAudit("iam.break-glass.approve", "success", {
    sub: params.approverDuz,
    name: params.approverName,
    roles: ["admin"],
  }, {
    sourceIp: params.sourceIp,
    tenantId: session.tenantId,
    detail: {
      sessionId: session.id,
      requester: session.requesterDuz,
      ttlMinutes: Math.round(ttlMs / 60000),
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
  });

  log.info("Break-glass approved", {
    sessionId: session.id,
    approver: params.approverDuz,
    ttlMinutes: Math.round(ttlMs / 60000),
  });

  return { ok: true, session };
}

/**
 * Revoke an active or pending break-glass session.
 */
export function revokeBreakGlass(params: {
  sessionId: string;
  revokerDuz: string;
  revokerName: string;
  sourceIp: string;
}): { ok: boolean; session?: EnterpriseBreakGlassSession; error?: string } {
  const session = breakGlassStore.get(params.sessionId);
  if (!session) {
    return { ok: false, error: "Break-glass session not found" };
  }

  if (session.status !== "active" && session.status !== "pending") {
    return { ok: false, error: `Cannot revoke session in '${session.status}' state` };
  }

  session.status = "revoked";
  session.revokedAt = Date.now();
  session.revokerDuz = params.revokerDuz;
  session.revokerName = params.revokerName;

  // Clear expiry timer
  const timer = expiryTimers.get(session.id);
  if (timer) {
    clearTimeout(timer);
    expiryTimers.delete(session.id);
  }

  // Immutable audit
  immutableAudit("iam.break-glass.revoke", "success", {
    sub: params.revokerDuz,
    name: params.revokerName,
    roles: ["admin"],
  }, {
    sourceIp: params.sourceIp,
    tenantId: session.tenantId,
    detail: {
      sessionId: session.id,
      requester: session.requesterDuz,
      wasActive: session.activatedAt !== null,
    },
  });

  log.info("Break-glass revoked", {
    sessionId: session.id,
    revoker: params.revokerDuz,
  });

  return { ok: true, session };
}

/**
 * Deny a pending break-glass request.
 */
export function denyBreakGlass(params: {
  sessionId: string;
  denierDuz: string;
  denierName: string;
  sourceIp: string;
}): { ok: boolean; session?: EnterpriseBreakGlassSession; error?: string } {
  const session = breakGlassStore.get(params.sessionId);
  if (!session) {
    return { ok: false, error: "Break-glass session not found" };
  }

  if (session.status !== "pending") {
    return { ok: false, error: `Cannot deny session in '${session.status}' state` };
  }

  session.status = "denied";
  session.revokedAt = Date.now();
  session.revokerDuz = params.denierDuz;
  session.revokerName = params.denierName;

  // Immutable audit
  immutableAudit("iam.break-glass.deny", "success", {
    sub: params.denierDuz,
    name: params.denierName,
    roles: ["admin"],
  }, {
    sourceIp: params.sourceIp,
    tenantId: session.tenantId,
    detail: {
      sessionId: session.id,
      requester: session.requesterDuz,
    },
  });

  log.info("Break-glass denied", {
    sessionId: session.id,
    denier: params.denierDuz,
  });

  return { ok: true, session };
}

/* ================================================================== */
/* Queries                                                             */
/* ================================================================== */

/**
 * Get a break-glass session by ID.
 */
export function getBreakGlassSession(id: string): EnterpriseBreakGlassSession | null {
  return breakGlassStore.get(id) || null;
}

/**
 * Check if a user has an active break-glass grant for a specific module/permission.
 * Intended for middleware integration — not yet wired into route guards.
 */
export function hasActiveBreakGlass(
  duz: string,
  targetModule: string,
  targetPermission?: string
): boolean {
  for (const session of breakGlassStore.values()) {
    if (
      session.status === "active" &&
      session.requesterDuz === duz &&
      session.targetModule === targetModule &&
      session.expiresAt !== null &&
      session.expiresAt > Date.now()
    ) {
      if (!targetPermission || session.targetPermission === targetPermission) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get all active sessions for a user.
 */
export function getActiveSessionsForUser(duz: string): EnterpriseBreakGlassSession[] {
  const result: EnterpriseBreakGlassSession[] = [];
  for (const session of breakGlassStore.values()) {
    if (
      session.requesterDuz === duz &&
      (session.status === "active" || session.status === "pending")
    ) {
      result.push(session);
    }
  }
  return result;
}

/**
 * List all break-glass sessions (for admin dashboard).
 * Optionally filter by status.
 */
export function listBreakGlassSessions(options?: {
  status?: BreakGlassStatus;
  tenantId?: string;
  limit?: number;
}): EnterpriseBreakGlassSession[] {
  const limit = options?.limit || 100;
  const result: EnterpriseBreakGlassSession[] = [];

  for (const session of breakGlassStore.values()) {
    if (options?.status && session.status !== options.status) continue;
    if (options?.tenantId && session.tenantId !== options.tenantId) continue;
    result.push(session);
    if (result.length >= limit) break;
  }

  // Sort by requestedAt descending (most recent first)
  result.sort((a, b) => b.requestedAt - a.requestedAt);
  return result;
}

/**
 * Get summary statistics for break-glass sessions.
 */
export function getBreakGlassStats(): {
  total: number;
  byStatus: Record<string, number>;
  activeCount: number;
  pendingCount: number;
} {
  const byStatus: Record<string, number> = {};
  let activeCount = 0;
  let pendingCount = 0;

  for (const session of breakGlassStore.values()) {
    byStatus[session.status] = (byStatus[session.status] || 0) + 1;
    if (session.status === "active") activeCount++;
    if (session.status === "pending") pendingCount++;
  }

  return {
    total: breakGlassStore.size,
    byStatus,
    activeCount,
    pendingCount,
  };
}

/* ================================================================== */
/* Internal helpers                                                    */
/* ================================================================== */

function expireSession(id: string): void {
  const session = breakGlassStore.get(id);
  if (!session || session.status !== "active") return;

  session.status = "expired";
  expiryTimers.delete(id);

  immutableAudit("iam.break-glass.expire", "success", {
    sub: "system",
    name: "Break-glass auto-expire",
    roles: [],
  }, {
    tenantId: session.tenantId,
    detail: {
      sessionId: session.id,
      requester: session.requesterDuz,
      durationMinutes: session.activatedAt
        ? Math.round((Date.now() - session.activatedAt) / 60000)
        : 0,
    },
  });

  log.info("Break-glass expired", { sessionId: id, requester: session.requesterDuz });
}

/* ================================================================== */
/* Cleanup                                                             */
/* ================================================================== */

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startBreakGlassCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of breakGlassStore) {
      // Expire active sessions past their TTL
      if (session.status === "active" && session.expiresAt && session.expiresAt <= now) {
        expireSession(id);
      }
      // Remove terminal sessions older than 24 hours
      const terminalAge = 24 * 60 * 60 * 1000;
      if (
        (session.status === "expired" || session.status === "revoked" || session.status === "denied") &&
        session.requestedAt + terminalAge < now
      ) {
        breakGlassStore.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopBreakGlassCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/** Get store size (for posture checks — intended for data-plane-posture.ts). */
export function getBreakGlassStoreSize(): number {
  return breakGlassStore.size;
}
