/**
 * In-memory session store for Phase 13 (hardened in Phase 15).
 *
 * Each session maps a random token → user metadata (DUZ, name, role, facility).
 * Sessions expire after absolute TTL or idle timeout (configurable via server-config).
 * Session tokens are rotated on login to prevent fixation attacks.
 *
 * Production would swap this for Redis or a database-backed store.
 */

import { randomBytes } from "crypto";
import { SESSION_CONFIG } from "../config/server-config.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type UserRole = "provider" | "nurse" | "pharmacist" | "clerk" | "admin";

export interface SessionData {
  /** Unique session token */
  token: string;
  /** VistA DUZ (internal user number) */
  duz: string;
  /** User display name */
  userName: string;
  /** Mapped role */
  role: UserRole;
  /** Facility station number (e.g., "500") */
  facilityStation: string;
  /** Facility name */
  facilityName: string;
  /** Division IEN */
  divisionIen: string;
  /** Resolved tenant ID (Phase 17) */
  tenantId: string;
  /** Created timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const sessions = new Map<string, SessionData>();

/** Periodic cleanup of expired sessions. */
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    const absoluteExpired = now - session.createdAt > SESSION_CONFIG.absoluteTtlMs;
    const idleExpired = now - session.lastActivity > SESSION_CONFIG.idleTtlMs;
    if (absoluteExpired || idleExpired) {
      sessions.delete(token);
    }
  }
}, SESSION_CONFIG.cleanupIntervalMs);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Create a new session and return its token. */
export function createSession(data: Omit<SessionData, "token" | "createdAt" | "lastActivity">): string {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(token, { ...data, token, createdAt: now, lastActivity: now });
  return token;
}

/** Retrieve a session by token. Returns null if expired or unknown. */
export function getSession(token: string): SessionData | null {
  const session = sessions.get(token);
  if (!session) return null;
  const now = Date.now();
  // Check absolute TTL
  if (now - session.createdAt > SESSION_CONFIG.absoluteTtlMs) {
    sessions.delete(token);
    return null;
  }
  // Check idle timeout
  if (now - session.lastActivity > SESSION_CONFIG.idleTtlMs) {
    sessions.delete(token);
    return null;
  }
  session.lastActivity = now;
  return session;
}

/** Destroy a session. */
export function destroySession(token: string): boolean {
  return sessions.delete(token);
}

/** Get all active sessions (for admin audit). */
export function listSessions(): SessionData[] {
  const now = Date.now();
  const result: SessionData[] = [];
  for (const [token, session] of sessions) {
    const absoluteExpired = now - session.createdAt > SESSION_CONFIG.absoluteTtlMs;
    const idleExpired = now - session.lastActivity > SESSION_CONFIG.idleTtlMs;
    if (absoluteExpired || idleExpired) {
      sessions.delete(token);
    } else {
      result.push(session);
    }
  }
  return result;
}

/**
 * Rotate session token (Phase 15 — session fixation prevention).
 * Creates a new token for an existing session, deletes the old one.
 * Returns the new token.
 */
export function rotateSession(oldToken: string): string | null {
  const session = sessions.get(oldToken);
  if (!session) return null;
  sessions.delete(oldToken);
  const newToken = randomBytes(32).toString("hex");
  session.token = newToken;
  session.lastActivity = Date.now();
  sessions.set(newToken, session);
  return newToken;
}

/** Map the known Docker default users to roles. */
export function mapUserRole(userName: string): UserRole {
  const upper = userName.toUpperCase();
  if (upper.includes("PROVIDER") || upper.includes("CLYDE")) return "provider";
  if (upper.includes("NURSE") || upper.includes("HELEN")) return "nurse";
  if (upper.includes("PHARM") || upper.includes("LINDA")) return "pharmacist";
  if (upper.includes("CLERK")) return "clerk";
  return "provider"; // default
}
