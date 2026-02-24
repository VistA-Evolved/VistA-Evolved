/**
 * Workqueue Repository -- DB-backed durable RCM work queue
 *
 * Phase 114: Durability Wave 1
 *
 * Replaces in-memory Map with SQLite persistence. Work items and
 * their audit trail survive API restart.
 */

import { randomUUID } from "node:crypto";
import { eq, and, sql, isNull, desc, asc } from "drizzle-orm";
import { getDb } from "../db.js";
import { rcmWorkItem, rcmWorkItemEvent } from "../schema.js";

export type WorkItemRow = typeof rcmWorkItem.$inferSelect;
export type WorkItemEventRow = typeof rcmWorkItemEvent.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function createWorkItem(data: {
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
}): WorkItemRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.insert(rcmWorkItem).values({
    id,
    tenantId: data.tenantId ?? "default",
    type: data.type,
    status: "open",
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
    priority: data.priority ?? "medium",
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
  }).run();

  // Audit event
  appendEvent(id, data.tenantId ?? "default", "created", null, "open", "system", null);

  return findWorkItemById(id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findWorkItemById(id: string): WorkItemRow | undefined {
  const db = getDb();
  return db.select().from(rcmWorkItem).where(eq(rcmWorkItem.id, id)).get();
}

export function findWorkItemsForClaim(claimId: string): WorkItemRow[] {
  const db = getDb();
  return db.select().from(rcmWorkItem)
    .where(eq(rcmWorkItem.claimId, claimId))
    .all();
}

/* ── Update ────────────────────────────────────────────────── */

export function updateWorkItem(
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
  actor?: string,
): WorkItemRow | undefined {
  const db = getDb();
  const existing = findWorkItemById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const merged = { ...updates, updatedAt: now };

  db.update(rcmWorkItem)
    .set(merged)
    .where(eq(rcmWorkItem.id, id))
    .run();

  // Audit status change
  if (updates.status && updates.status !== existing.status) {
    appendEvent(id, existing.tenantId, "status_changed", existing.status, updates.status, actor ?? "system", null);
  }
  if (updates.assignedTo !== undefined && updates.assignedTo !== existing.assignedTo) {
    appendEvent(id, existing.tenantId, "assigned", null, null, actor ?? "system",
      JSON.stringify({ assignedTo: updates.assignedTo }));
  }

  return findWorkItemById(id);
}

/* ── List with filters ─────────────────────────────────────── */

export function listWorkItems(filters?: {
  type?: string;
  status?: string;
  claimId?: string;
  payerId?: string;
  priority?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): { items: WorkItemRow[]; total: number } {
  const db = getDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.type) conditions.push(eq(rcmWorkItem.type, filters.type));
  if (filters?.status) conditions.push(eq(rcmWorkItem.status, filters.status));
  if (filters?.claimId) conditions.push(eq(rcmWorkItem.claimId, filters.claimId));
  if (filters?.payerId) conditions.push(eq(rcmWorkItem.payerId, filters.payerId));
  if (filters?.priority) conditions.push(eq(rcmWorkItem.priority, filters.priority));
  if (filters?.tenantId) conditions.push(eq(rcmWorkItem.tenantId, filters.tenantId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = db.select({ count: sql<number>`count(*)` })
    .from(rcmWorkItem)
    .where(where)
    .get();
  const total = countResult?.count ?? 0;

  // Fetch page with priority sort (critical=0, high=1, medium=2, low=3) then newest first
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const rows = db.select().from(rcmWorkItem)
    .where(where)
    .orderBy(
      sql`CASE ${rcmWorkItem.priority} WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
      desc(rcmWorkItem.createdAt),
    )
    .limit(limit)
    .offset(offset)
    .all();

  return { items: rows, total };
}

/* ── Stats ─────────────────────────────────────────────────── */

export function getWorkItemStats(tenantId?: string): {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
} {
  const db = getDb();
  const where = tenantId ? eq(rcmWorkItem.tenantId, tenantId) : undefined;

  const rows = db.select({
    type: rcmWorkItem.type,
    status: rcmWorkItem.status,
    priority: rcmWorkItem.priority,
  }).from(rcmWorkItem).where(where).all();

  const byType: Record<string, number> = { rejection: 0, denial: 0, missing_info: 0 };
  const byStatus: Record<string, number> = { open: 0, in_progress: 0, resolved: 0, escalated: 0, dismissed: 0 };
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1;
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + 1;
  }

  return { total: rows.length, byType, byStatus, byPriority };
}

/* ── Append audit event ────────────────────────────────────── */

function appendEvent(
  workItemId: string,
  tenantId: string,
  action: string,
  beforeStatus: string | null,
  afterStatus: string | null,
  actor: string,
  detail: string | null,
): void {
  try {
    const db = getDb();
    db.insert(rcmWorkItemEvent).values({
      id: randomUUID(),
      tenantId,
      workItemId,
      action,
      beforeStatus,
      afterStatus,
      actor,
      detail,
      createdAt: new Date().toISOString(),
    }).run();
  } catch { /* non-fatal — audit failure must not break operations */ }
}

/* ── Events listing ────────────────────────────────────────── */

export function getEventsForWorkItem(workItemId: string): WorkItemEventRow[] {
  const db = getDb();
  return db.select().from(rcmWorkItemEvent)
    .where(eq(rcmWorkItemEvent.workItemId, workItemId))
    .orderBy(asc(rcmWorkItemEvent.createdAt))
    .all();
}

/* ── Reset (for testing) ───────────────────────────────────── */

export function resetWorkItems(): void {
  const db = getDb();
  db.delete(rcmWorkItemEvent).run();
  db.delete(rcmWorkItem).run();
}
