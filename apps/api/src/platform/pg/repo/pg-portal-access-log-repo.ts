/**
 * PG Portal Access Log Repository -- Async durable access logs
 *
 * Phase 127: Portal + Telehealth Durability (Map stores -> Postgres)
 *
 * Mirrors the SQLite access-log-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgPortalAccessLog } from '../pg-schema.js';

export type PortalAccessLogRow = typeof pgPortalAccessLog.$inferSelect;

/* -- Insert -------------------------------------------------- */

export async function insertAccessLog(data: {
  id: string;
  tenantId?: string;
  userId: string;
  actorName: string;
  isProxy: boolean;
  targetPatientDfn: string | null;
  eventType: string;
  description: string;
  metadataJson?: string;
  createdAt: string;
}): Promise<void> {
  const db = getPgDb();
  await db.insert(pgPortalAccessLog).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    userId: data.userId,
    actorName: data.actorName,
    isProxy: data.isProxy,
    targetPatientDfn: data.targetPatientDfn,
    eventType: data.eventType,
    description: data.description,
    metadataJson: data.metadataJson ?? '{}',
    createdAt: data.createdAt,
  });
}

/* -- Query --------------------------------------------------- */

export async function findAccessLogsByUser(
  userId: string,
  opts?: { eventType?: string; since?: string; limit?: number; offset?: number }
): Promise<PortalAccessLogRow[]> {
  const db = getPgDb();
  const conditions = [eq(pgPortalAccessLog.userId, userId)];
  if (opts?.eventType) conditions.push(eq(pgPortalAccessLog.eventType, opts.eventType));
  if (opts?.since) conditions.push(gte(pgPortalAccessLog.createdAt, opts.since));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db
    .select()
    .from(pgPortalAccessLog)
    .where(and(...conditions))
    .orderBy(desc(pgPortalAccessLog.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAccessLogsByUser(userId: string): Promise<number> {
  const db = getPgDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgPortalAccessLog)
    .where(eq(pgPortalAccessLog.userId, userId));
  return result[0]?.count ?? 0;
}

export async function countAccessLogsByUserFiltered(
  userId: string,
  opts?: { eventType?: string; since?: string }
): Promise<number> {
  const db = getPgDb();
  const conditions = [eq(pgPortalAccessLog.userId, userId)];
  if (opts?.eventType) conditions.push(eq(pgPortalAccessLog.eventType, opts.eventType));
  if (opts?.since) conditions.push(gte(pgPortalAccessLog.createdAt, opts.since));
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgPortalAccessLog)
    .where(and(...conditions));
  return result[0]?.count ?? 0;
}

export async function countAllAccessLogs(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(pgPortalAccessLog);
  return result[0]?.count ?? 0;
}

/* -- Stats --------------------------------------------------- */

export async function getAccessLogStats(): Promise<{ total: number; users: number }> {
  const db = getPgDb();
  const total = await db.select({ count: sql<number>`count(*)` }).from(pgPortalAccessLog);
  const users = await db
    .select({ count: sql<number>`count(DISTINCT user_id)` })
    .from(pgPortalAccessLog);
  return {
    total: total[0]?.count ?? 0,
    users: users[0]?.count ?? 0,
  };
}

export async function getAccessLogStatsByEventType(): Promise<Record<string, number>> {
  const db = getPgDb();
  const rows = await db
    .select({
      eventType: pgPortalAccessLog.eventType,
      count: sql<number>`count(*)`,
    })
    .from(pgPortalAccessLog)
    .groupBy(pgPortalAccessLog.eventType);
  const result: Record<string, number> = {};
  for (const r of rows) result[r.eventType] = r.count;
  return result;
}
