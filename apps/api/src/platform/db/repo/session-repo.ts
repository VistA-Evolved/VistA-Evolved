/**
 * Session Repository — DB-backed durable sessions
 *
 * Phase 114: Durability Wave 1
 *
 * Stores session token hashes (NEVER raw tokens). Supports:
 * - create / validate / revoke / list / cleanup
 * - last_seen_at touch on each validation
 * - expiry by absolute TTL and idle timeout
 */

import { randomUUID } from "node:crypto";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { authSession } from "../schema.js";

export type AuthSessionRow = typeof authSession.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function createAuthSession(data: {
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
}): AuthSessionRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.insert(authSession).values({
    id,
    tenantId: data.tenantId,
    userId: data.userId,
    userName: data.userName,
    userRole: data.userRole,
    facilityStation: data.facilityStation,
    facilityName: data.facilityName,
    divisionIen: data.divisionIen,
    tokenHash: data.tokenHash,
    csrfSecret: data.csrfSecret ?? null,
    ipHash: data.ipHash ?? null,
    userAgentHash: data.userAgentHash ?? null,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: data.expiresAt,
    revokedAt: null,
    metadataJson: "{}",
  }).run();

  return findSessionById(id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findSessionById(id: string): AuthSessionRow | undefined {
  const db = getDb();
  return db.select().from(authSession).where(eq(authSession.id, id)).get();
}

export function findSessionByTokenHash(tokenHash: string): AuthSessionRow | undefined {
  const db = getDb();
  return db.select().from(authSession)
    .where(and(
      eq(authSession.tokenHash, tokenHash),
      isNull(authSession.revokedAt),
    ))
    .get();
}

/* ── Touch (update last_seen_at) ──────────────────────────── */

export function touchSession(id: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.update(authSession)
    .set({ lastSeenAt: now })
    .where(eq(authSession.id, id))
    .run();
}

/* ── Revoke ────────────────────────────────────────────────── */

export function revokeSession(id: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(authSession)
    .set({ revokedAt: now })
    .where(and(eq(authSession.id, id), isNull(authSession.revokedAt)))
    .run();
  return result.changes > 0;
}

export function revokeSessionByTokenHash(tokenHash: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(authSession)
    .set({ revokedAt: now })
    .where(and(eq(authSession.tokenHash, tokenHash), isNull(authSession.revokedAt)))
    .run();
  return result.changes > 0;
}

/* ── List active sessions ─────────────────────────────────── */

export function listActiveSessions(tenantId?: string): AuthSessionRow[] {
  const db = getDb();
  const now = new Date().toISOString();
  const conditions = [
    isNull(authSession.revokedAt),
    sql`${authSession.expiresAt} > ${now}`,
  ];
  if (tenantId) {
    conditions.push(eq(authSession.tenantId, tenantId));
  }
  return db.select().from(authSession).where(and(...conditions)).all();
}

/* ── Cleanup expired/revoked ──────────────────────────────── */

export function cleanupExpiredSessions(): number {
  const db = getDb();
  const now = new Date().toISOString();
  // Delete sessions that are either expired or revoked more than 24h ago
  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();
  const result = db.delete(authSession)
    .where(
      sql`${authSession.expiresAt} < ${now} OR (${authSession.revokedAt} IS NOT NULL AND ${authSession.revokedAt} < ${oneDayAgo})`
    )
    .run();
  return result.changes;
}

/* ── Replace token hash (for rotation) ────────────────────── */

export function replaceTokenHash(id: string, newTokenHash: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(authSession)
    .set({ tokenHash: newTokenHash, lastSeenAt: now })
    .where(and(eq(authSession.id, id), isNull(authSession.revokedAt)))
    .run();
  return result.changes > 0;
}

/* ── Count ─────────────────────────────────────────────────── */

export function countActiveSessions(): number {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(authSession)
    .where(and(
      isNull(authSession.revokedAt),
      sql`${authSession.expiresAt} > ${now}`,
    ))
    .get();
  return result?.count ?? 0;
}
