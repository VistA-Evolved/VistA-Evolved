/**
 * Accreditation Status Repository -- Phase 110
 *
 * CRUD for accreditation_status and accreditation_task tables.
 * All operations are tenant-scoped.
 */

import { eq, and, desc, count } from 'drizzle-orm';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { accreditationStatus, accreditationTask } from '../../platform/pg/pg-schema.js';
import { randomUUID } from 'node:crypto';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AccreditationStatusRow {
  id: string;
  tenantId: string;
  payerId: string;
  payerName: string;
  providerEntityId: string;
  status: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  lastVerifiedAt: string | null;
  lastVerifiedBy: string | null;
  notes: Array<{ date: string; author: string; text: string }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AccreditationTaskRow {
  id: string;
  accreditationId: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccreditationInput {
  tenantId?: string;
  payerId: string;
  payerName: string;
  providerEntityId: string;
  status?: string;
  effectiveDate?: string;
  expirationDate?: string;
  createdBy: string;
}

export interface CreateTaskInput {
  accreditationId: string;
  tenantId?: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function parseAccreditation(row: any): AccreditationStatusRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    payerId: row.payerId,
    payerName: row.payerName,
    providerEntityId: row.providerEntityId,
    status: row.status,
    effectiveDate: row.effectiveDate,
    expirationDate: row.expirationDate,
    lastVerifiedAt: row.lastVerifiedAt,
    lastVerifiedBy: row.lastVerifiedBy,
    notes: safeJsonParse(row.notesJson, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

function parseTask(row: any): AccreditationTaskRow {
  return {
    id: row.id,
    accreditationId: row.accreditationId,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    assignedTo: row.assignedTo,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Accreditation Status CRUD                                           */
/* ------------------------------------------------------------------ */

export async function createAccreditation(
  input: CreateAccreditationInput
): Promise<AccreditationStatusRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || 'default';

  await db.insert(accreditationStatus).values({
    id,
    tenantId,
    payerId: input.payerId,
    payerName: input.payerName,
    providerEntityId: input.providerEntityId,
    status: input.status || 'pending',
    effectiveDate: input.effectiveDate || null,
    expirationDate: input.expirationDate || null,
    notesJson: '[]',
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  });

  return (await getAccreditationById(tenantId, id))!;
}

export async function getAccreditationById(
  tenantId: string,
  id: string
): Promise<AccreditationStatusRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(accreditationStatus)
    .where(and(eq(accreditationStatus.tenantId, tenantId), eq(accreditationStatus.id, id)));
  const row = rows[0] ?? null;
  return row ? parseAccreditation(row) : null;
}

export async function listAccreditations(
  tenantId: string,
  filters?: { payerId?: string; providerEntityId?: string; status?: string }
): Promise<AccreditationStatusRow[]> {
  const db = getPgDb();
  const conditions = [eq(accreditationStatus.tenantId, tenantId)];
  if (filters?.payerId) conditions.push(eq(accreditationStatus.payerId, filters.payerId));
  if (filters?.providerEntityId)
    conditions.push(eq(accreditationStatus.providerEntityId, filters.providerEntityId));
  if (filters?.status) conditions.push(eq(accreditationStatus.status, filters.status));

  const rows = await db
    .select()
    .from(accreditationStatus)
    .where(and(...conditions))
    .orderBy(desc(accreditationStatus.updatedAt));
  return rows.map(parseAccreditation);
}

export async function updateAccreditation(
  tenantId: string,
  id: string,
  updates: Partial<
    Pick<CreateAccreditationInput, 'payerName' | 'status' | 'effectiveDate' | 'expirationDate'>
  >
): Promise<AccreditationStatusRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.payerName !== undefined) setClause.payerName = updates.payerName;
  if (updates.status !== undefined) setClause.status = updates.status;
  if (updates.effectiveDate !== undefined) setClause.effectiveDate = updates.effectiveDate;
  if (updates.expirationDate !== undefined) setClause.expirationDate = updates.expirationDate;

  await db
    .update(accreditationStatus)
    .set(setClause)
    .where(and(eq(accreditationStatus.tenantId, tenantId), eq(accreditationStatus.id, id)));

  return getAccreditationById(tenantId, id);
}

export async function verifyAccreditation(
  tenantId: string,
  id: string,
  verifiedBy: string
): Promise<AccreditationStatusRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(accreditationStatus)
    .set({ lastVerifiedAt: now, lastVerifiedBy: verifiedBy, updatedAt: now })
    .where(and(eq(accreditationStatus.tenantId, tenantId), eq(accreditationStatus.id, id)));
  return getAccreditationById(tenantId, id);
}

export async function addNote(
  tenantId: string,
  id: string,
  author: string,
  text: string
): Promise<AccreditationStatusRow | null> {
  const current = await getAccreditationById(tenantId, id);
  if (!current) return null;
  const notes = [...current.notes, { date: new Date().toISOString(), author, text }];
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(accreditationStatus)
    .set({ notesJson: JSON.stringify(notes), updatedAt: now })
    .where(and(eq(accreditationStatus.tenantId, tenantId), eq(accreditationStatus.id, id)));
  return getAccreditationById(tenantId, id);
}

export async function countAccreditations(tenantId: string): Promise<number> {
  const db = getPgDb();
  const rows = await db
    .select({ cnt: count() })
    .from(accreditationStatus)
    .where(eq(accreditationStatus.tenantId, tenantId));
  const result = rows[0] ?? null;
  return (result as any)?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/* Accreditation Task CRUD                                             */
/* ------------------------------------------------------------------ */

export async function createTask(input: CreateTaskInput): Promise<AccreditationTaskRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || 'default';

  await db.insert(accreditationTask).values({
    id,
    accreditationId: input.accreditationId,
    tenantId,
    title: input.title,
    description: input.description || null,
    status: 'pending',
    priority: input.priority || 'medium',
    dueDate: input.dueDate || null,
    assignedTo: input.assignedTo || null,
    createdAt: now,
    updatedAt: now,
  });

  return (await getTaskById(id))!;
}

export async function getTaskById(id: string): Promise<AccreditationTaskRow | null> {
  const db = getPgDb();
  const rows = await db.select().from(accreditationTask).where(eq(accreditationTask.id, id));
  const row = rows[0] ?? null;
  return row ? parseTask(row) : null;
}

export async function listTasks(accreditationId: string): Promise<AccreditationTaskRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(accreditationTask)
    .where(eq(accreditationTask.accreditationId, accreditationId))
    .orderBy(desc(accreditationTask.updatedAt));
  return rows.map(parseTask);
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<CreateTaskInput, 'title' | 'description' | 'priority' | 'dueDate' | 'assignedTo'> & {
      status: string;
    }
  >
): Promise<AccreditationTaskRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.title !== undefined) setClause.title = updates.title;
  if (updates.description !== undefined) setClause.description = updates.description;
  if (updates.priority !== undefined) setClause.priority = updates.priority;
  if (updates.dueDate !== undefined) setClause.dueDate = updates.dueDate;
  if (updates.assignedTo !== undefined) setClause.assignedTo = updates.assignedTo;
  if (updates.status !== undefined) {
    setClause.status = updates.status;
    if (updates.status === 'completed') setClause.completedAt = now;
  }

  await db.update(accreditationTask).set(setClause).where(eq(accreditationTask.id, id));

  return getTaskById(id);
}

export async function completeTask(
  id: string,
  completedBy: string
): Promise<AccreditationTaskRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(accreditationTask)
    .set({ status: 'completed', completedAt: now, completedBy, updatedAt: now })
    .where(eq(accreditationTask.id, id));
  return getTaskById(id);
}

export async function deleteTask(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(accreditationTask).where(eq(accreditationTask.id, id)).returning();
  return result.length > 0;
}
