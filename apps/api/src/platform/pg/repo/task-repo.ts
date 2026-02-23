/**
 * Task Repository (PostgreSQL) — payer onboarding tasks
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Mirrors apps/api/src/platform/db/repo/task-repo.ts using Postgres.
 */

import { randomUUID } from "node:crypto";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { payerTask, payerAuditEvent } from "../pg-schema.js";

export type TaskRow = typeof payerTask.$inferSelect;

export async function listTasks(
  payerId: string,
  tenantId?: string | null,
): Promise<TaskRow[]> {
  const db = getPgDb();
  if (tenantId) {
    const all = await db
      .select()
      .from(payerTask)
      .where(eq(payerTask.payerId, payerId))
      .orderBy(desc(payerTask.createdAt));
    return all.filter((t) => t.tenantId === tenantId || t.tenantId === null);
  }
  return db
    .select()
    .from(payerTask)
    .where(and(eq(payerTask.payerId, payerId), isNull(payerTask.tenantId)))
    .orderBy(desc(payerTask.createdAt));
}

export async function findTaskById(id: string): Promise<TaskRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(payerTask).where(eq(payerTask.id, id));
  return rows[0];
}

export async function createTask(
  data: {
    payerId: string;
    title: string;
    description?: string;
    dueDate?: string;
    tenantId?: string | null;
  },
  actor?: string,
): Promise<TaskRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(payerTask).values({
    id,
    tenantId: data.tenantId ?? null,
    payerId: data.payerId,
    title: data.title,
    description: data.description ?? null,
    status: "open",
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  const created = await findTaskById(id);

  // Audit
  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId ?? null,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "payer_task",
    entityId: id,
    action: "create",
    beforeJson: null,
    afterJson: created ? JSON.parse(JSON.stringify(created)) : null,
    reason: "Task created",
    evidenceSnapshotId: null,
    createdAt: new Date(now),
  });

  return created!;
}

export async function updateTaskStatus(
  id: string,
  status: string,
  reason: string,
  actor?: string,
): Promise<TaskRow | null> {
  const db = getPgDb();
  const before = await findTaskById(id);
  if (!before) return null;

  const now = new Date().toISOString();

  await db
    .update(payerTask)
    .set({ status, updatedAt: new Date(now) } as any)
    .where(eq(payerTask.id, id));

  const after = await findTaskById(id);

  // Audit
  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId ?? null,
    actorType: actor ? "user" : "system",
    actorId: actor ?? null,
    entityType: "payer_task",
    entityId: id,
    action: "update",
    beforeJson: JSON.parse(JSON.stringify(before)),
    afterJson: after ? JSON.parse(JSON.stringify(after)) : null,
    reason,
    evidenceSnapshotId: null,
    createdAt: new Date(now),
  });

  return after ?? null;
}
