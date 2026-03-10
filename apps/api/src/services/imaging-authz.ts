/**
 * Imaging Authorization & Break-Glass -- Phase 24.
 *
 * Implements imaging-specific RBAC (imaging_view, imaging_diagnostic,
 * imaging_admin) and time-limited break-glass access for emergency
 * clinical scenarios.
 *
 * VistA-first: These are platform-level access controls that complement
 * VistA's own OPTION/key-based security. When VistA MAG keys become
 * available (MAG SYSTEM, MAG ANNOTATE, MAG EDIT, MAG DELETE), map
 * these roles to the corresponding VistA security keys.
 *
 * Target VistA keys for future mapping:
 *   - MAG SYSTEM -> imaging_admin
 *   - MAG ANNOTATE -> imaging_diagnostic
 *   - MAG EDIT -> imaging_diagnostic
 *   - MAG DELETE -> imaging_admin
 *   - MAG REASON -> imaging_view (any clinician)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { log } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { imagingAudit } from "./imaging-audit.js";
import type { SessionData, UserRole } from "../auth/session-store.js";

/* ================================================================== */
/* Imaging permission model                                             */
/* ================================================================== */

export type ImagingPermission =
  | "imaging_view"        // View studies, launch viewer, DICOMweb read
  | "imaging_diagnostic"  // Advanced viewer tools, annotations (radiologists)
  | "imaging_admin"       // Device onboarding, ingest admin, audit access
  | "break_glass";        // Time-limited emergency override

/**
 * Default imaging permission mapping by UserRole (platform-level).
 * In production, this would read from VistA security keys or an IdP claim.
 */
const ROLE_PERMISSIONS: Record<UserRole, ImagingPermission[]> = {
  provider:   ["imaging_view"],
  nurse:      ["imaging_view"],
  pharmacist: ["imaging_view"],
  clerk:      [],                  // No imaging access by default
  admin:      ["imaging_view", "imaging_diagnostic", "imaging_admin"],
  billing:    [],                  // No imaging access for billing
  support:    [],                  // No imaging access for support
};

/**
 * Check whether a session has a given imaging permission.
 * Checks role-based permissions first, then active break-glass grants.
 */
export function hasImagingPermission(session: SessionData, perm: ImagingPermission): boolean {
  // 1. Check role-based permissions
  const rolePerms = ROLE_PERMISSIONS[session.role] || [];
  if (rolePerms.includes(perm)) return true;

  // 2. Check active break-glass grants
  if (perm === "imaging_view" || perm === "break_glass") {
    const bg = getActiveBreakGlass(session.duz);
    if (bg) return true;
  }

  return false;
}

/**
 * Express middleware-style check for imaging routes.
 * Returns 403 if permission is not granted.
 */
export function requireImagingPermission(perm: ImagingPermission) {
  return function checkPermission(request: FastifyRequest, reply: FastifyReply): boolean {
    const session = request.session;
    if (!session) {
      reply.code(401).send({ ok: false, error: "Authentication required" });
      return false;
    }
    if (!hasImagingPermission(session, perm)) {
      audit("security.rbac-denied", "denied", {
        duz: session.duz, name: session.userName, role: session.role,
      }, {
        sourceIp: request.ip,
        detail: { permission: perm, url: request.url },
      });
      reply.code(403).send({
        ok: false,
        error: `Imaging permission '${perm}' required`,
      });
      return false;
    }
    return true;
  };
}

/* ================================================================== */
/* Break-glass system                                                   */
/* ================================================================== */

export interface BreakGlassSession {
  id: string;
  duz: string;
  userName: string;
  role: UserRole;
  reason: string;
  patientDfn: string;
  tenantId: string;
  startedAt: number;
  expiresAt: number;
  stoppedAt: number | null;
  sourceIp: string;
}

/** Maximum break-glass TTL: 4 hours. Cannot be infinite. */
const MAX_BREAK_GLASS_TTL_MS = 4 * 60 * 60 * 1000;
/** Default break-glass TTL: 30 minutes. */
const DEFAULT_BREAK_GLASS_TTL_MS = 30 * 60 * 1000;
/** Minimum reason length */
const MIN_REASON_LENGTH = 10;

/**
 * In-memory break-glass store.
 * Production: persist to database with audit chain.
 */
const breakGlassStore = new Map<string, BreakGlassSession>();

/** Auto-expire timer IDs for cleanup. */
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Get active break-glass session for a user (any patient).
 * Returns null if none active or all expired.
 */
export function getActiveBreakGlass(duz: string, patientDfn?: string): BreakGlassSession | null {
  const now = Date.now();
  for (const bg of breakGlassStore.values()) {
    if (bg.duz !== duz) continue;
    if (bg.stoppedAt !== null) continue;
    if (bg.expiresAt <= now) continue;
    if (patientDfn && bg.patientDfn !== patientDfn) continue;
    return bg;
  }
  return null;
}

/** Get all break-glass sessions (for audit). */
export function getAllBreakGlassSessions(): BreakGlassSession[] {
  return Array.from(breakGlassStore.values());
}

function cleanupExpiredBreakGlass(): void {
  const now = Date.now();
  for (const [id, bg] of breakGlassStore) {
    if (bg.stoppedAt !== null) continue;
    if (bg.expiresAt <= now) {
      bg.stoppedAt = now;
      log.info("Break-glass session auto-expired", {
        breakGlassId: id, duz: bg.duz, patientDfn: bg.patientDfn,
      });
      imagingAudit("BREAK_GLASS_STOP", {
        duz: bg.duz, name: bg.userName, role: bg.role,
      }, bg.tenantId, {
        patientDfn: bg.patientDfn,
        detail: { breakGlassId: id, reason: "auto-expired", ttlMs: bg.expiresAt - bg.startedAt },
      });
    }
  }
}

// Periodic cleanup every 60s
setInterval(cleanupExpiredBreakGlass, 60_000).unref();

/* ================================================================== */
/* Routes                                                               */
/* ================================================================== */

export async function imagingAuthzRoutes(server: FastifyInstance): Promise<void> {

  /**
   * POST /security/break-glass/start
   * Start a time-limited break-glass session.
   */
  server.post("/security/break-glass/start", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });

    const body = request.body as {
      reason?: string;
      patientDfn?: string;
      ttlMinutes?: number;
    } | null;

    if (!body) return reply.code(400).send({ ok: false, error: "Request body required" });

    // Validate required fields
    const reason = body.reason?.trim();
    if (!reason || reason.length < MIN_REASON_LENGTH) {
      return reply.code(400).send({
        ok: false,
        error: `Reason required (minimum ${MIN_REASON_LENGTH} characters)`,
      });
    }

    const patientDfn = body.patientDfn?.trim();
    if (!patientDfn) {
      return reply.code(400).send({
        ok: false,
        error: "Patient DFN required (break-glass must be patient-scoped)",
      });
    }

    // Check for existing active break-glass for this user+patient
    const existing = getActiveBreakGlass(session.duz, patientDfn);
    if (existing) {
      return reply.code(409).send({
        ok: false,
        error: "Break-glass already active for this patient",
        breakGlassId: existing.id,
        expiresAt: new Date(existing.expiresAt).toISOString(),
      });
    }

    // Calculate TTL (bounded: min 1 minute, max 4 hours) -- BUG-041 fix
    if (body.ttlMinutes !== undefined && body.ttlMinutes <= 0) {
      return reply.code(400).send({
        ok: false,
        error: "TTL must be a positive number of minutes",
      });
    }
    const requestedTtlMs = body.ttlMinutes
      ? Math.min(Math.max(body.ttlMinutes * 60 * 1000, 60_000), MAX_BREAK_GLASS_TTL_MS)
      : DEFAULT_BREAK_GLASS_TTL_MS;

    const now = Date.now();
    const bg: BreakGlassSession = {
      id: randomUUID(),
      duz: session.duz,
      userName: session.userName,
      role: session.role,
      reason,
      patientDfn,
      tenantId: session.tenantId,
      startedAt: now,
      expiresAt: now + requestedTtlMs,
      stoppedAt: null,
      sourceIp: request.ip,
    };

    breakGlassStore.set(bg.id, bg);

    // Set auto-expiry timer
    const timer = setTimeout(() => {
      cleanupExpiredBreakGlass();
      expiryTimers.delete(bg.id);
    }, requestedTtlMs + 1000);
    expiryTimers.set(bg.id, timer);

    // Audit
    log.warn("Break-glass session started", {
      breakGlassId: bg.id, duz: bg.duz, patientDfn, ttlMs: requestedTtlMs,
    });
    imagingAudit("BREAK_GLASS_START", {
      duz: session.duz, name: session.userName, role: session.role,
    }, session.tenantId, {
      patientDfn,
      sourceIp: request.ip,
      detail: { breakGlassId: bg.id, reason, ttlMinutes: requestedTtlMs / 60000 },
    });

    return reply.code(201).send({
      ok: true,
      breakGlass: {
        id: bg.id,
        patientDfn: bg.patientDfn,
        reason: bg.reason,
        startedAt: new Date(bg.startedAt).toISOString(),
        expiresAt: new Date(bg.expiresAt).toISOString(),
        ttlMinutes: Math.round(requestedTtlMs / 60000),
      },
    });
  });

  /**
   * POST /security/break-glass/stop
   * Manually stop a break-glass session early.
   */
  server.post("/security/break-glass/stop", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });

    const body = request.body as { breakGlassId?: string } | null;
    if (!body?.breakGlassId) {
      return reply.code(400).send({ ok: false, error: "breakGlassId required" });
    }

    const bg = breakGlassStore.get(body.breakGlassId);
    if (!bg) {
      return reply.code(404).send({ ok: false, error: "Break-glass session not found" });
    }

    // Only the user who started it or an admin can stop it
    if (bg.duz !== session.duz && session.role !== "admin") {
      return reply.code(403).send({ ok: false, error: "Only the initiator or an admin can stop break-glass" });
    }

    if (bg.stoppedAt !== null) {
      return reply.code(409).send({ ok: false, error: "Break-glass already stopped" });
    }

    bg.stoppedAt = Date.now();

    // Clear auto-expiry timer
    const timer = expiryTimers.get(bg.id);
    if (timer) { clearTimeout(timer); expiryTimers.delete(bg.id); }

    log.info("Break-glass session stopped manually", {
      breakGlassId: bg.id, duz: session.duz, stoppedBy: session.userName,
    });
    imagingAudit("BREAK_GLASS_STOP", {
      duz: session.duz, name: session.userName, role: session.role,
    }, session.tenantId, {
      patientDfn: bg.patientDfn,
      sourceIp: request.ip,
      detail: { breakGlassId: bg.id, reason: "manual-stop", durationMs: bg.stoppedAt - bg.startedAt },
    });

    return { ok: true, breakGlassId: bg.id, stoppedAt: new Date(bg.stoppedAt).toISOString() };
  });

  /**
   * GET /security/break-glass/active
   * List active break-glass sessions for the current user.
   */
  server.get("/security/break-glass/active", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });

    const now = Date.now();
    const active: BreakGlassSession[] = [];
    for (const bg of breakGlassStore.values()) {
      if (bg.stoppedAt !== null) continue;
      if (bg.expiresAt <= now) continue;
      // Admin sees all; others see only their own
      if (session.role !== "admin" && bg.duz !== session.duz) continue;
      active.push(bg);
    }

    return {
      ok: true,
      count: active.length,
      sessions: active.map((bg) => ({
        id: bg.id,
        duz: bg.duz,
        userName: bg.userName,
        patientDfn: bg.patientDfn,
        reason: bg.reason,
        startedAt: new Date(bg.startedAt).toISOString(),
        expiresAt: new Date(bg.expiresAt).toISOString(),
        remainingMinutes: Math.max(0, Math.round((bg.expiresAt - now) / 60000)),
      })),
    };
  });

  /**
   * GET /security/break-glass/history
   * Break-glass history for compliance (imaging_admin only).
   */
  server.get("/security/break-glass/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const all = Array.from(breakGlassStore.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 200);

    return {
      ok: true,
      count: all.length,
      sessions: all.map((bg) => ({
        id: bg.id,
        duz: bg.duz,
        userName: bg.userName,
        role: bg.role,
        patientDfn: bg.patientDfn,
        reason: bg.reason,
        startedAt: new Date(bg.startedAt).toISOString(),
        expiresAt: new Date(bg.expiresAt).toISOString(),
        stoppedAt: bg.stoppedAt ? new Date(bg.stoppedAt).toISOString() : null,
        durationMs: (bg.stoppedAt || Math.min(Date.now(), bg.expiresAt)) - bg.startedAt,
        sourceIp: bg.sourceIp,
      })),
    };
  });
}
