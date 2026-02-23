/**
 * Task Repository — contracting + implementation tasks
 *
 * Phase 95B: Platform Persistence Unification
 */

import { randomUUID } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db.js";
import { payerTask, payerAuditEvent } from "../schema.js";

export type TaskRow = typeof payerTask.$inferSelect;

export function listTasks(payerId: string, tenantId?: string | null): TaskRow[] {
  const db = getDb();
  if (tenantId) {
    // Include tenant-specific + global tasks
    return db.select().from(payerTask)
      .where(eq(payerTask.payerId, payerId))
      .all()
      .filter(t => t.tenantId === tenantId || t.tenantId === null);
  }
  return db.select().from(payerTask)
    .where(and(eq(payerTask.payerId, payerId), isNull(payerTask.tenantId)))
    .all();
}

export function findTaskById(id: string): TaskRow | undefined {
  const db = getDb();
  return db.select().from(payerTask).where(eq(payerTask.id, id)).get();
}

export function createTask(
  data: { payerId: string; tenantId?: string | null; title: string; description?: string; dueDate?: string },
  actor?: string,
): TaskRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.insert(payerTask).values({
    id,
    tenantId: data.tenantId ?? null,
    payerId: data.payerId,
    title: data.title,
    description: data.description ?? null,
    status: "open",
    dueDate: data.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = findTaskById(id)!;

  db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId ?? null,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "payer_task",
    entityId: id,
    action: "create",
    beforeJson: null,
    afterJson: JSON.stringify(created),
    reason: "Task created",
    evidenceSnapshotId: null,
    createdAt: now,
  }).run();

  return created;
}

export function updateTaskStatus(
  id: string,
  status: "open" | "in_progress" | "blocked" | "done",
  reason: string,
  actor?: string,
): TaskRow | null {
  const db = getDb();
  const before = findTaskById(id);
  if (!before) return null;

  const now = new Date().toISOString();
  db.update(payerTask).set({
    status,
    updatedAt: now,
  } as any).where(eq(payerTask.id, id)).run();

  const after = findTaskById(id)!;

  db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "payer_task",
    entityId: id,
    action: "update",
    beforeJson: JSON.stringify(before),
    afterJson: JSON.stringify(after),
    reason,
    evidenceSnapshotId: null,
    createdAt: now,
  }).run();

  return after;
}
