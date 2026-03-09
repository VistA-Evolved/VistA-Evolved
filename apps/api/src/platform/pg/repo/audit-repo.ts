/**
 * Audit Repository (PostgreSQL) — READ-ONLY queries for payer audit events
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Mirrors apps/api/src/platform/db/repo/audit-repo.ts using Postgres.
 */

import { eq, and, or, ilike, sql, desc, isNull } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { payerAuditEvent } from '../pg-schema.js';

export type AuditRow = typeof payerAuditEvent.$inferSelect;

export async function getAuditForEntity(entityType: string, entityId: string): Promise<AuditRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(payerAuditEvent)
    .where(and(eq(payerAuditEvent.entityType, entityType), eq(payerAuditEvent.entityId, entityId)))
    .orderBy(desc(payerAuditEvent.createdAt));
}

export async function getAuditForPayer(payerId: string, tenantId?: string): Promise<AuditRow[]> {
  const db = getPgDb();
  const payerCondition = eq(payerAuditEvent.entityId, payerId);
  const where = tenantId
    ? and(payerCondition, or(eq(payerAuditEvent.tenantId, tenantId), isNull(payerAuditEvent.tenantId)))
    : payerCondition;
  return db
    .select()
    .from(payerAuditEvent)
    .where(where)
    .orderBy(desc(payerAuditEvent.createdAt));
}

export async function getAuditForTenant(tenantId: string, limit = 200): Promise<AuditRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(payerAuditEvent)
    .where(eq(payerAuditEvent.tenantId, tenantId))
    .orderBy(desc(payerAuditEvent.createdAt))
    .limit(limit);
}

export async function getRecentAudit(limit = 50): Promise<AuditRow[]> {
  const db = getPgDb();
  return db.select().from(payerAuditEvent).orderBy(desc(payerAuditEvent.createdAt)).limit(limit);
}

export async function getAuditStats(tenantId?: string): Promise<{
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
}> {
  const db = getPgDb();
  const where = tenantId
    ? or(eq(payerAuditEvent.tenantId, tenantId), isNull(payerAuditEvent.tenantId))
    : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payerAuditEvent)
    .where(where);
  const total = countResult[0]?.count ?? 0;

  const actionRows = await db
    .select({
      action: payerAuditEvent.action,
      count: sql<number>`count(*)::int`,
    })
    .from(payerAuditEvent)
    .where(where)
    .groupBy(payerAuditEvent.action);

  const byAction: Record<string, number> = {};
  for (const r of actionRows) {
    byAction[r.action] = r.count;
  }

  const entityRows = await db
    .select({
      entityType: payerAuditEvent.entityType,
      count: sql<number>`count(*)::int`,
    })
    .from(payerAuditEvent)
    .where(where)
    .groupBy(payerAuditEvent.entityType);

  const byEntityType: Record<string, number> = {};
  for (const r of entityRows) {
    byEntityType[r.entityType] = r.count;
  }

  return { total, byAction, byEntityType };
}

export async function searchAudit(filters: {
  action?: string;
  entityType?: string;
  actorId?: string;
  tenantId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AuditRow[]; total: number }> {
  const db = getPgDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.entityType) {
    conditions.push(eq(payerAuditEvent.entityType, filters.entityType));
  }
  if (filters.action) {
    conditions.push(eq(payerAuditEvent.action, filters.action));
  }
  if (filters.actorId) {
    conditions.push(eq(payerAuditEvent.actorId, filters.actorId));
  }
  if (filters.tenantId) {
    conditions.push(eq(payerAuditEvent.tenantId, filters.tenantId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(payerAuditEvent.entityId, term), ilike(payerAuditEvent.reason, term))!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payerAuditEvent)
    .where(where);
  const total = countResult[0]?.count ?? 0;

  let query = db
    .select()
    .from(payerAuditEvent)
    .where(where)
    .orderBy(desc(payerAuditEvent.createdAt));
  if (filters.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  const rows = await query;

  return { rows, total };
}
