/**
 * Audit Repository — READ-ONLY access to payer audit events
 *
 * Phase 95B: Platform Persistence Unification
 *
 * IMPORTANT: This repository has NO update or delete methods.
 * The audit trail is append-only. Writes happen through the
 * other repositories when they record changes.
 *
 * This module provides read/query access only.
 */

import { eq, and, desc, sql, like } from "drizzle-orm";
import { getDb } from "../db.js";
import { payerAuditEvent } from "../schema.js";

export type AuditRow = typeof payerAuditEvent.$inferSelect;

export function getAuditForEntity(entityType: string, entityId: string): AuditRow[] {
  const db = getDb();
  return db.select().from(payerAuditEvent)
    .where(and(
      eq(payerAuditEvent.entityType, entityType),
      eq(payerAuditEvent.entityId, entityId),
    ))
    .orderBy(desc(payerAuditEvent.createdAt))
    .all();
}

export function getAuditForPayer(payerId: string): AuditRow[] {
  const db = getDb();
  return db.select().from(payerAuditEvent)
    .where(eq(payerAuditEvent.entityId, payerId))
    .orderBy(desc(payerAuditEvent.createdAt))
    .all();
}

export function getAuditForTenant(tenantId: string, limit = 100): AuditRow[] {
  const db = getDb();
  return db.select().from(payerAuditEvent)
    .where(eq(payerAuditEvent.tenantId, tenantId))
    .orderBy(desc(payerAuditEvent.createdAt))
    .limit(limit)
    .all();
}

export function getRecentAudit(limit = 50): AuditRow[] {
  const db = getDb();
  return db.select().from(payerAuditEvent)
    .orderBy(desc(payerAuditEvent.createdAt))
    .limit(limit)
    .all();
}

export function getAuditStats(): {
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
} {
  const db = getDb();

  const total = db.select({ count: sql<number>`count(*)` })
    .from(payerAuditEvent).get()?.count ?? 0;

  const byAction: Record<string, number> = {};
  const actionRows = db.select({
    action: payerAuditEvent.action,
    count: sql<number>`count(*)`,
  }).from(payerAuditEvent).groupBy(payerAuditEvent.action).all();
  for (const row of actionRows) {
    byAction[row.action] = row.count;
  }

  const byEntityType: Record<string, number> = {};
  const entityRows = db.select({
    entityType: payerAuditEvent.entityType,
    count: sql<number>`count(*)`,
  }).from(payerAuditEvent).groupBy(payerAuditEvent.entityType).all();
  for (const row of entityRows) {
    byEntityType[row.entityType] = row.count;
  }

  return { total, byAction, byEntityType };
}

export function searchAudit(filters: {
  action?: string;
  entityType?: string;
  actorId?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): { rows: AuditRow[]; total: number } {
  const db = getDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.action) conditions.push(eq(payerAuditEvent.action, filters.action));
  if (filters.entityType) conditions.push(eq(payerAuditEvent.entityType, filters.entityType));
  if (filters.actorId) conditions.push(eq(payerAuditEvent.actorId, filters.actorId));
  if (filters.tenantId) conditions.push(eq(payerAuditEvent.tenantId, filters.tenantId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const totalResult = db.select({ count: sql<number>`count(*)` })
    .from(payerAuditEvent).where(where).get();
  const total = totalResult?.count ?? 0;

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = db.select().from(payerAuditEvent)
    .where(where)
    .orderBy(desc(payerAuditEvent.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return { rows, total };
}
