/**
 * In-memory session store for Phase 13.
 *
 * Each session maps a random token → user metadata (DUZ, name, role, facility).
 * Sessions expire after SESSION_TTL_MS (default 8 hours).
 *
 * Production would swap this for Redis or a database-backed store.
 */

import { randomBytes } from "crypto";

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
  /** Created timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const sessions = new Map<string, SessionData>();

/** Periodic cleanup of expired sessions. */
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(token);
    }
  }
}, CLEANUP_INTERVAL_MS);

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
  if (Date.now() - session.lastActivity > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  session.lastActivity = Date.now();
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
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(token);
    } else {
      result.push(session);
    }
  }
  return result;
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
