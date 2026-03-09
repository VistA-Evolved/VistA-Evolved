/**
 * PG Workqueue Repository — Async durable work queue for multi-instance
 *
 * Phase 117: Postgres-first prod posture
 *
 * Mirrors the SQLite workqueue-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries against rcm_work_item table.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgRcmWorkItem, pgRcmWorkItemEvent } from '../pg-schema.js';

export type WorkItemRow = typeof pgRcmWorkItem.$inferSelect;
export type WorkItemEventRow = typeof pgRcmWorkItemEvent.$inferSelect;

function requireTenantId(tenantId?: string): string {
  if (typeof tenantId === 'string' && tenantId.trim().length > 0) {
    return tenantId.trim();
  }
  throw new Error('Tenant context required for workqueue repository');
}

/* -- Create ---------------------------------------------------- */

export async function createWorkItem(data: {
  type: string;
  claimId: string;
  payerId?: string;
  payerName?: string;
  patientDfn?: string;
  reasonCode: string;
  reasonDescription: string;
  reasonCategory?: string;
  recommendedAction: string;
  fieldToFix?: string;
  triggeringRule?: string;
  sourceType: string;
  sourceId?: string;
  sourceTimestamp?: string;
  priority?: string;
  tenantId?: string;
}): Promise<WorkItemRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const tid = requireTenantId(data.tenantId);

  await db.insert(pgRcmWorkItem).values({
    id,
    tenantId: tid,
    type: data.type,
    status: 'open',
    claimId: data.claimId,
    payerId: data.payerId ?? null,
    payerName: data.payerName ?? null,
    patientDfn: data.patientDfn ?? null,
    reasonCode: data.reasonCode,
    reasonDescription: data.reasonDescription,
    reasonCategory: data.reasonCategory ?? null,
    recommendedAction: data.recommendedAction,
    fieldToFix: data.fieldToFix ?? null,
    triggeringRule: data.triggeringRule ?? null,
    sourceType: data.sourceType,
    sourceId: data.sourceId ?? null,
    sourceTimestamp: data.sourceTimestamp ?? null,
    priority: data.priority ?? 'medium',
    assignedTo: null,
    dueDate: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
    lockedBy: null,
    lockedAt: null,
    lockExpiresAt: null,
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });

  // Audit event
  await appendEvent(id, tid, 'created', null, 'open', 'system', null);

  const row = await findWorkItemById(tid, id);
  return row!;
}

/* -- Lookup ---------------------------------------------------- */

export async function findWorkItemById(
  tenantId: string,
  id: string
): Promise<WorkItemRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgRcmWorkItem)
    .where(and(eq(pgRcmWorkItem.tenantId, tenantId), eq(pgRcmWorkItem.id, id)));
  return rows[0];
}

export async function findWorkItemsForClaim(
  tenantId: string,
  claimId: string
): Promise<WorkItemRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgRcmWorkItem)
    .where(and(eq(pgRcmWorkItem.tenantId, tenantId), eq(pgRcmWorkItem.claimId, claimId)));
}

/* -- Update ---------------------------------------------------- */

export async function updateWorkItem(
  tenantId: string,
  id: string,
  updates: Partial<{
    status: string;
    assignedTo: string | null;
    priority: string;
    dueDate: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
    resolutionNote: string | null;
    lockedBy: string | null;
    lockedAt: string | null;
    lockExpiresAt: string | null;
    attempts: number;
    lastError: string | null;
    payerId: string | null;
    payerName: string | null;
    reasonCode: string;
    reasonDescription: string;
    reasonCategory: string | null;
    recommendedAction: string;
    fieldToFix: string | null;
    triggeringRule: string | null;
  }>,
  actor?: string
): Promise<WorkItemRow | undefined> {
  const db = getPgDb();
  const existing = await findWorkItemById(tenantId, id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const merged = { ...updates, updatedAt: now };

  await db
    .update(pgRcmWorkItem)
    .set(merged)
    .where(and(eq(pgRcmWorkItem.tenantId, tenantId), eq(pgRcmWorkItem.id, id)));

  // Audit status change
  if (updates.status && updates.status !== existing.status) {
    await appendEvent(
      id,
      existing.tenantId,
      'status_changed',
      existing.status,
      updates.status,
      actor ?? 'system',
      null
    );
  }
  if (updates.assignedTo !== undefined && updates.assignedTo !== existing.assignedTo) {
    await appendEvent(
      id,
      existing.tenantId,
      'assigned',
      null,
      null,
      actor ?? 'system',
      JSON.stringify({ assignedTo: updates.assignedTo })
    );
  }

  return findWorkItemById(tenantId, id);
}

/* -- List with filters ----------------------------------------- */

export async function listWorkItems(filters?: {
  type?: string;
  status?: string;
  claimId?: string;
  payerId?: string;
  priority?: string;
  tenantId?: string;
  sourceType?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: WorkItemRow[]; total: number }> {
  const db = getPgDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.type) conditions.push(eq(pgRcmWorkItem.type, filters.type));
  if (filters?.status) conditions.push(eq(pgRcmWorkItem.status, filters.status));
  if (filters?.claimId) conditions.push(eq(pgRcmWorkItem.claimId, filters.claimId));
  if (filters?.payerId) conditions.push(eq(pgRcmWorkItem.payerId, filters.payerId));
  if (filters?.priority) conditions.push(eq(pgRcmWorkItem.priority, filters.priority));
  if (filters?.tenantId) conditions.push(eq(pgRcmWorkItem.tenantId, filters.tenantId));
  if (filters?.sourceType) conditions.push(eq(pgRcmWorkItem.sourceType, filters.sourceType));
  if (filters?.sourceId) conditions.push(eq(pgRcmWorkItem.sourceId, filters.sourceId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgRcmWorkItem)
    .where(where);
  const total = countResult[0]?.count ?? 0;

  // Fetch page with priority sort then newest first
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const rows = await db
    .select()
    .from(pgRcmWorkItem)
    .where(where)
    .orderBy(
      sql`CASE ${pgRcmWorkItem.priority} WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
      desc(pgRcmWorkItem.createdAt)
    )
    .limit(limit)
    .offset(offset);

  return { items: rows, total };
}

/* -- Stats ----------------------------------------------------- */

export async function getWorkItemStats(tenantId?: string): Promise<{
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const db = getPgDb();
  const where = tenantId ? eq(pgRcmWorkItem.tenantId, tenantId) : undefined;

  const rows = await db
    .select({
      type: pgRcmWorkItem.type,
      status: pgRcmWorkItem.status,
      priority: pgRcmWorkItem.priority,
    })
    .from(pgRcmWorkItem)
    .where(where);

  const byType: Record<string, number> = { rejection: 0, denial: 0, missing_info: 0 };
  const byStatus: Record<string, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    escalated: 0,
    dismissed: 0,
  };
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1;
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + 1;
  }

  return { total: rows.length, byType, byStatus, byPriority };
}

/* -- Append audit event ---------------------------------------- */

async function appendEvent(
  workItemId: string,
  tenantId: string,
  action: string,
  beforeStatus: string | null,
  afterStatus: string | null,
  actor: string,
  detail: string | null
): Promise<void> {
  try {
    const db = getPgDb();
    await db.insert(pgRcmWorkItemEvent).values({
      id: randomUUID(),
      tenantId,
      workItemId,
      action,
      beforeStatus,
      afterStatus,
      actor,
      detail,
      createdAt: new Date().toISOString(),
    });
  } catch {
    /* non-fatal -- audit failure must not break operations */
  }
}

/* -- Events listing -------------------------------------------- */

export async function getEventsForWorkItem(workItemId: string): Promise<WorkItemEventRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgRcmWorkItemEvent)
    .where(eq(pgRcmWorkItemEvent.workItemId, workItemId))
    .orderBy(asc(pgRcmWorkItemEvent.createdAt));
}

/* -- Reset (for testing) --------------------------------------- */

export async function resetWorkItems(): Promise<void> {
  const db = getPgDb();
  await db.delete(pgRcmWorkItemEvent);
  await db.delete(pgRcmWorkItem);
}
