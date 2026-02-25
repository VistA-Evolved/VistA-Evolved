/**
 * Portal Access Log Repository — DB-backed durable access logs
 *
 * Phase 121: Durability Wave 1
 *
 * CRUD for the portal access log store (portal-iam/access-log-store.ts).
 * Append-only log of patient-visible activity events.
 * PHI-safe: no SSN, DOB, or clinical content stored.
 */

import { eq, and, desc, sql, gte } from "drizzle-orm";
import { getDb } from "../db.js";
import { portalAccessLog } from "../schema.js";

export type PortalAccessLogRow = typeof portalAccessLog.$inferSelect;

/* ── Insert ────────────────────────────────────────────────── */

export function insertAccessLog(data: {
  id: string;
  userId: string;
  actorName: string;
  isProxy: boolean;
  targetPatientDfn: string | null;
  eventType: string;
  description: string;
  metadataJson?: string;
  createdAt: string;
}): void {
  const db = getDb();
  db.insert(portalAccessLog).values({
    id: data.id,
    userId: data.userId,
    actorName: data.actorName,
    isProxy: data.isProxy,
    targetPatientDfn: data.targetPatientDfn,
    eventType: data.eventType,
    description: data.description,
    metadataJson: data.metadataJson ?? "{}",
    createdAt: data.createdAt,
  }).run();
}

/* ── Query ─────────────────────────────────────────────────── */

export function findAccessLogsByUser(
  userId: string,
  opts?: { eventType?: string; since?: string; limit?: number; offset?: number },
): PortalAccessLogRow[] {
  const db = getDb();
  const conditions = [eq(portalAccessLog.userId, userId)];
  if (opts?.eventType) conditions.push(eq(portalAccessLog.eventType, opts.eventType));
  if (opts?.since) conditions.push(gte(portalAccessLog.createdAt, opts.since));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db.select().from(portalAccessLog)
    .where(and(...conditions))
    .orderBy(desc(portalAccessLog.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function countAccessLogsByUser(userId: string): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(portalAccessLog)
    .where(eq(portalAccessLog.userId, userId))
    .get();
  return result?.count ?? 0;
}

/** Count with optional filters — matches findAccessLogsByUser filter logic */
export function countAccessLogsByUserFiltered(
  userId: string,
  opts?: { eventType?: string; since?: string },
): number {
  const db = getDb();
  const conditions = [eq(portalAccessLog.userId, userId)];
  if (opts?.eventType) conditions.push(eq(portalAccessLog.eventType, opts.eventType));
  if (opts?.since) conditions.push(gte(portalAccessLog.createdAt, opts.since));
  const result = db.select({ count: sql<number>`count(*)` })
    .from(portalAccessLog)
    .where(and(...conditions))
    .get();
  return result?.count ?? 0;
}

export function countAllAccessLogs(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` }).from(portalAccessLog).get();
  return result?.count ?? 0;
}

/* ── Stats ─────────────────────────────────────────────────── */

export function getAccessLogStats(): { total: number; users: number } {
  const db = getDb();
  const total = db.select({ count: sql<number>`count(*)` }).from(portalAccessLog).get();
  const users = db.select({ count: sql<number>`count(DISTINCT user_id)` }).from(portalAccessLog).get();
  return {
    total: total?.count ?? 0,
    users: users?.count ?? 0,
  };
}

/** Breakdown of total entries by event_type from DB — for cold-cache stats */
export function getAccessLogStatsByEventType(): Record<string, number> {
  const db = getDb();
  const rows = db.select({
    eventType: portalAccessLog.eventType,
    count: sql<number>`count(*)`,
  }).from(portalAccessLog)
    .groupBy(portalAccessLog.eventType)
    .all();
  const result: Record<string, number> = {};
  for (const r of rows) result[r.eventType] = r.count;
  return result;
}
