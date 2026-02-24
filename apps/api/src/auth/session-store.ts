/**
 * Session Store -- DB-backed durable sessions (Phase 114 + Phase 117)
 *
 * Classification: Durable Domain State (per docs/architecture/store-policy.md)
 *
 * Previously in-memory Map (Phase 13/15). Now persisted in auth_session table.
 * Sessions survive API restart. Token hashes stored, never raw tokens.
 *
 * An in-memory LRU cache (Ephemeral Cache, 60s TTL) avoids hitting DB on
 * every request while still being fully reconstructable from DB on cache miss.
 *
 * Phase 117: Functions are async to support both SQLite (sync, awaited as no-op)
 * and PG (async) repo backends. The store-resolver STORE_BACKEND env var
 * controls which repo is wired at startup.
 *
 * The public API: createSession(), getSession(), destroySession(),
 * listSessions(), rotateSession(), mapUserRole().
 */

import { randomBytes, createHash } from "crypto";
import { SESSION_CONFIG } from "../config/server-config.js";

/* ------------------------------------------------------------------ */
/* Types (unchanged -- same exports as Phase 13/15)                    */
/* ------------------------------------------------------------------ */

export type UserRole = "provider" | "nurse" | "pharmacist" | "clerk" | "admin" | "billing" | "support";

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
/* Token hashing -- raw tokens NEVER stored, only SHA-256 hashes       */
/* ------------------------------------------------------------------ */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ------------------------------------------------------------------ */
/* DB session repo -- lazy-wired after initPlatformDb()                 */
/* Phase 117: Accepts both sync (SQLite) and async (PG) repos          */
/* ------------------------------------------------------------------ */

/**
 * Session repo interface — both sync and async repos satisfy this.
 * sync return values are auto-promoted to Promise via await.
 */
interface SessionRepoLike {
  createAuthSession(data: {
    tenantId: string;
    userId: string;
    userName: string;
    userRole: string;
    facilityStation: string;
    facilityName: string;
    divisionIen: string;
    tokenHash: string;
    csrfSecret?: string;
    ipHash?: string;
    userAgentHash?: string;
    expiresAt: string;
  }): any; // AuthSessionRow | Promise<AuthSessionRow>
  findSessionById(id: string): any;
  findSessionByTokenHash(tokenHash: string): any;
  touchSession(id: string): any;
  revokeSession(id: string): any;
  revokeSessionByTokenHash(tokenHash: string): any;
  listActiveSessions(tenantId?: string): any;
  cleanupExpiredSessions(): any;
  replaceTokenHash(id: string, newTokenHash: string): any;
  countActiveSessions(): any;
}

let _repo: SessionRepoLike | null = null;

/**
 * Wire the session repo after DB init.
 * Called from index.ts once initPlatformDb() succeeds.
 * Accepts either the SQLite session-repo module or the PG session-repo module.
 */
export function initSessionRepo(repo: SessionRepoLike): void {
  _repo = repo;
}

/* ------------------------------------------------------------------ */
/* In-memory cache (Ephemeral -- 60s TTL, reconstructable from DB)     */
/* ------------------------------------------------------------------ */

interface CachedSession {
  data: SessionData;
  dbId: string;         // DB row id for touch/revoke operations
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000;
const sessionCache = new Map<string, CachedSession>(); // tokenHash -> cached

/** Periodic cleanup of cache entries and expired DB sessions */
setInterval(() => {
  const now = Date.now();
  for (const [hash, cached] of sessionCache) {
    if (now - cached.cachedAt > CACHE_TTL_MS) {
      sessionCache.delete(hash);
    }
  }
  // Phase 117: repo may be async (PG) — fire-and-forget with .catch
  try {
    const result = _repo?.cleanupExpiredSessions();
    if (result && typeof result === "object" && "catch" in result) {
      (result as Promise<any>).catch(() => { /* non-fatal */ });
    }
  } catch { /* non-fatal */ }
}, SESSION_CONFIG.cleanupIntervalMs);

/* ------------------------------------------------------------------ */
/* Public API (signatures unchanged from Phase 13/15)                  */
/* ------------------------------------------------------------------ */

/** Create a new session and return its token. */
export async function createSession(data: Omit<SessionData, "token" | "createdAt" | "lastActivity">): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const tokenH = hashToken(token);
  const sessionData: SessionData = { ...data, token, createdAt: now, lastActivity: now };

  if (_repo) {
    try {
      const expiresAt = new Date(now + SESSION_CONFIG.absoluteTtlMs).toISOString();
      const row = await _repo.createAuthSession({
        tenantId: data.tenantId,
        userId: data.duz,
        userName: data.userName,
        userRole: data.role,
        facilityStation: data.facilityStation,
        facilityName: data.facilityName,
        divisionIen: data.divisionIen,
        tokenHash: tokenH,
        expiresAt,
      });
      sessionCache.set(tokenH, { data: sessionData, dbId: row.id, cachedAt: now });
    } catch {
      // DB write failed -- degraded to cache-only
      sessionCache.set(tokenH, { data: sessionData, dbId: "", cachedAt: now });
    }
  } else {
    // No DB yet (pre-init) -- cache-only
    sessionCache.set(tokenH, { data: sessionData, dbId: "", cachedAt: now });
  }
  return token;
}

/** Retrieve a session by token. Returns null if expired or unknown. */
export async function getSession(token: string): Promise<SessionData | null> {
  const now = Date.now();
  const tokenH = hashToken(token);

  // 1. Check cache first (hot path)
  const cached = sessionCache.get(tokenH);
  if (cached && (now - cached.cachedAt < CACHE_TTL_MS)) {
    if (now - cached.data.createdAt > SESSION_CONFIG.absoluteTtlMs) {
      sessionCache.delete(tokenH);
      if (_repo && cached.dbId) try { await _repo.revokeSession(cached.dbId); } catch { /* */ }
      return null;
    }
    if (now - cached.data.lastActivity > SESSION_CONFIG.idleTtlMs) {
      sessionCache.delete(tokenH);
      if (_repo && cached.dbId) try { await _repo.revokeSession(cached.dbId); } catch { /* */ }
      return null;
    }
    cached.data.lastActivity = now;
    if (_repo && cached.dbId) try { await _repo.touchSession(cached.dbId); } catch { /* */ }
    return cached.data;
  }

  // 2. Cache miss -- check DB
  if (_repo) {
    try {
      const row = await _repo.findSessionByTokenHash(tokenH);
      if (!row) return null;

      const expiresMs = new Date(row.expiresAt).getTime();
      if (now > expiresMs) {
        await _repo.revokeSession(row.id);
        return null;
      }
      const lastSeen = new Date(row.lastSeenAt).getTime();
      if (now - lastSeen > SESSION_CONFIG.idleTtlMs) {
        await _repo.revokeSession(row.id);
        return null;
      }

      const sessionData: SessionData = {
        token,
        duz: row.userId,
        userName: row.userName,
        role: row.userRole as UserRole,
        facilityStation: row.facilityStation,
        facilityName: row.facilityName,
        divisionIen: row.divisionIen,
        tenantId: row.tenantId,
        createdAt: new Date(row.createdAt).getTime(),
        lastActivity: now,
      };
      sessionCache.set(tokenH, { data: sessionData, dbId: row.id, cachedAt: now });
      await _repo.touchSession(row.id);
      return sessionData;
    } catch {
      // DB read failed -- check stale cache
      if (cached) { cached.data.lastActivity = now; return cached.data; }
      return null;
    }
  }

  // 3. No repo and no cache -- session unknown
  if (cached) {
    if (now - cached.data.createdAt > SESSION_CONFIG.absoluteTtlMs) { sessionCache.delete(tokenH); return null; }
    if (now - cached.data.lastActivity > SESSION_CONFIG.idleTtlMs) { sessionCache.delete(tokenH); return null; }
    cached.data.lastActivity = now;
    cached.cachedAt = now;
    return cached.data;
  }
  return null;
}

/** Destroy a session. */
export async function destroySession(token: string): Promise<boolean> {
  const tokenH = hashToken(token);
  const cached = sessionCache.get(tokenH);
  sessionCache.delete(tokenH);

  if (_repo) {
    try {
      if (cached?.dbId) return await _repo.revokeSession(cached.dbId);
      return await _repo.revokeSessionByTokenHash(tokenH);
    } catch {
      return !!cached;
    }
  }
  return !!cached;
}

/** Get all active sessions (for admin audit). */
export async function listSessions(): Promise<SessionData[]> {
  if (_repo) {
    try {
      const rows = await _repo.listActiveSessions();
      return rows.map((row: any) => ({
        token: "[redacted]",
        duz: row.userId,
        userName: row.userName,
        role: row.userRole as UserRole,
        facilityStation: row.facilityStation,
        facilityName: row.facilityName,
        divisionIen: row.divisionIen,
        tenantId: row.tenantId,
        createdAt: new Date(row.createdAt).getTime(),
        lastActivity: new Date(row.lastSeenAt).getTime(),
      }));
    } catch { /* fall through */ }
  }
  // Cache-based listing (degraded)
  const now = Date.now();
  const result: SessionData[] = [];
  for (const [hash, cached] of sessionCache) {
    if (now - cached.data.createdAt > SESSION_CONFIG.absoluteTtlMs || now - cached.data.lastActivity > SESSION_CONFIG.idleTtlMs) {
      sessionCache.delete(hash);
    } else {
      result.push({ ...cached.data, token: "[redacted]" });
    }
  }
  return result;
}

/**
 * Rotate session token (Phase 15 -- session fixation prevention).
 * Creates a new token for an existing session, deletes the old one.
 * Returns the new token.
 */
export async function rotateSession(oldToken: string): Promise<string | null> {
  const oldHash = hashToken(oldToken);
  const cached = sessionCache.get(oldHash);
  const newToken = randomBytes(32).toString("hex");
  const newHash = hashToken(newToken);

  if (_repo && cached?.dbId) {
    try {
      const ok = await _repo.replaceTokenHash(cached.dbId, newHash);
      if (!ok) return null;
      sessionCache.delete(oldHash);
      const now = Date.now();
      cached.data.token = newToken;
      cached.data.lastActivity = now;
      sessionCache.set(newHash, { data: cached.data, dbId: cached.dbId, cachedAt: now });
      return newToken;
    } catch { /* fall through to cache-only rotation */ }
  }

  if (cached) {
    sessionCache.delete(oldHash);
    const now = Date.now();
    cached.data.token = newToken;
    cached.data.lastActivity = now;
    sessionCache.set(newHash, { data: cached.data, dbId: cached.dbId, cachedAt: now });
    return newToken;
  }
  return null;
}

/**
 * Map VistA user to a role.
 *
 * Phase 49: Extended with billing + support roles and VistA security key hints.
 * In production, this should be driven by VistA security keys (e.g., PROVIDER,
 * ORES, ORELSE, IB BILLING, etc.) rather than name-matching. The sandbox
 * Docker image only has 3 users, so name matching is the practical fallback.
 *
 * Priority order: admin > billing > pharmacist > nurse > provider > clerk
 */
export function mapUserRole(userName: string, securityKeys?: string[]): UserRole {
  // Phase 49: If VistA security keys are available, use them first
  if (securityKeys && securityKeys.length > 0) {
    const keys = new Set(securityKeys.map((k) => k.toUpperCase()));
    // Admin: XUPROGMODE or system-level keys
    if (keys.has("XUPROGMODE") || keys.has("XUMGR")) return "admin";
    // Billing: IB-prefixed keys
    if (keys.has("IB BILLING") || keys.has("IB EDIT BILLING INFO") || keys.has("IBCNE HCSR EDIT")) return "billing";
    // Pharmacist: PSJ/PSO keys
    if (keys.has("PSJ RPHARM") || keys.has("PSO PHARMACIST")) return "pharmacist";
    // Nurse: nurse-related keys
    if (keys.has("ORES") || keys.has("ORELSE")) return "nurse";
    // Provider: PROVIDER key
    if (keys.has("PROVIDER")) return "provider";
  }

  // Fallback: name-substring matching for Docker sandbox users
  const upper = userName.toUpperCase();
  // PROV123 (PROVIDER,CLYDE WV DUZ 87) is the primary admin in Docker sandbox
  if (upper.includes("PROVIDER") || upper.includes("CLYDE")) return "admin";
  if (upper.includes("NURSE") || upper.includes("HELEN")) return "nurse";
  if (upper.includes("PHARM") || upper.includes("LINDA")) return "pharmacist";
  if (upper.includes("BILLING") || upper.includes("BILLER")) return "billing";
  if (upper.includes("CLERK")) return "clerk";
  if (upper.includes("SUPPORT") || upper.includes("HELPDESK")) return "support";
  return "provider"; // default
}
