/**
 * PG Session Repository — Async durable session store for multi-instance
 *
 * Phase 117: Postgres-first prod posture
 *
 * Mirrors the SQLite session-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries against auth_session table.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgAuthSession } from '../pg-schema.js';

export type AuthSessionRow = typeof pgAuthSession.$inferSelect;

/* -- Create ---------------------------------------------------- */

export async function createAuthSession(data: {
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
}): Promise<AuthSessionRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  await db.insert(pgAuthSession).values({
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
    metadataJson: '{}',
  });

  const row = await findSessionById(id);
  return row!;
}

/* -- Lookup ---------------------------------------------------- */

export async function findSessionById(id: string): Promise<AuthSessionRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgAuthSession).where(eq(pgAuthSession.id, id));
  return rows[0];
}

export async function findSessionByTokenHash(
  tokenHash: string
): Promise<AuthSessionRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgAuthSession)
    .where(and(eq(pgAuthSession.tokenHash, tokenHash), isNull(pgAuthSession.revokedAt)));
  return rows[0];
}

/* -- Touch (update last_seen_at) ------------------------------- */

export async function touchSession(id: string): Promise<void> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db.update(pgAuthSession).set({ lastSeenAt: now }).where(eq(pgAuthSession.id, id));
}

/* -- Revoke ---------------------------------------------------- */

export async function revokeSession(id: string): Promise<boolean> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .update(pgAuthSession)
    .set({ revokedAt: now })
    .where(and(eq(pgAuthSession.id, id), isNull(pgAuthSession.revokedAt)));
  return (result as any).rowCount > 0;
}

export async function revokeSessionByTokenHash(tokenHash: string): Promise<boolean> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .update(pgAuthSession)
    .set({ revokedAt: now })
    .where(and(eq(pgAuthSession.tokenHash, tokenHash), isNull(pgAuthSession.revokedAt)));
  return (result as any).rowCount > 0;
}

/* -- List active sessions -------------------------------------- */

export async function listActiveSessions(tenantId?: string): Promise<AuthSessionRow[]> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const conditions = [isNull(pgAuthSession.revokedAt), sql`${pgAuthSession.expiresAt} > ${now}`];
  if (tenantId) {
    conditions.push(eq(pgAuthSession.tenantId, tenantId));
  }
  return db
    .select()
    .from(pgAuthSession)
    .where(and(...conditions));
}

/* -- Cleanup expired/revoked ----------------------------------- */

export async function cleanupExpiredSessions(): Promise<number> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();
  const result = await db
    .delete(pgAuthSession)
    .where(
      sql`${pgAuthSession.expiresAt} < ${now} OR (${pgAuthSession.revokedAt} IS NOT NULL AND ${pgAuthSession.revokedAt} < ${oneDayAgo})`
    );
  return (result as any).rowCount ?? 0;
}

/* -- Replace token hash (for rotation) ------------------------- */

export async function replaceTokenHash(id: string, newTokenHash: string): Promise<boolean> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .update(pgAuthSession)
    .set({ tokenHash: newTokenHash, lastSeenAt: now })
    .where(and(eq(pgAuthSession.id, id), isNull(pgAuthSession.revokedAt)));
  return (result as any).rowCount > 0;
}

/* -- Count ----------------------------------------------------- */

export async function countActiveSessions(): Promise<number> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgAuthSession)
    .where(and(isNull(pgAuthSession.revokedAt), sql`${pgAuthSession.expiresAt} > ${now}`));
  return result[0]?.count ?? 0;
}
