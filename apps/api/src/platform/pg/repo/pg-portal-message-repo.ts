/**
 * PG Portal Message Repository -- Async durable portal messaging
 *
 * Phase 127: Portal + Telehealth Durability (Map stores -> Postgres)
 *
 * Mirrors the SQLite portal-message-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, or, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getPgDb } from '../pg-db.js';
import { pgPortalMessage } from '../pg-schema.js';

export type PortalMessageRow = typeof pgPortalMessage.$inferSelect;

/* -- Create -------------------------------------------------- */

export async function insertMessage(data: {
  id?: string;
  tenantId?: string;
  threadId: string;
  fromDfn: string;
  fromName: string;
  toDfn: string;
  toName: string;
  subject: string;
  category?: string;
  body: string;
  status?: string;
  attachmentsJson?: string;
  replyToId?: string;
  vistaSync?: boolean;
  vistaRef?: string;
}): Promise<PortalMessageRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = data.id ?? randomUUID();

  await db.insert(pgPortalMessage).values({
    id,
    tenantId: data.tenantId ?? 'default',
    threadId: data.threadId,
    fromDfn: data.fromDfn,
    fromName: data.fromName,
    toDfn: data.toDfn,
    toName: data.toName,
    subject: data.subject,
    category: data.category ?? 'general',
    body: data.body,
    status: data.status ?? 'draft',
    attachmentsJson: data.attachmentsJson ?? '[]',
    replyToId: data.replyToId ?? null,
    vistaSync: data.vistaSync ?? false,
    vistaRef: data.vistaRef ?? null,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const row = await findMessageById(id);
  return row!;
}

/* -- Lookup -------------------------------------------------- */

export async function findMessageById(
  id: string,
  tenantId?: string
): Promise<PortalMessageRow | undefined> {
  const db = getPgDb();
  const where = tenantId
    ? and(eq(pgPortalMessage.id, id), eq(pgPortalMessage.tenantId, tenantId))
    : eq(pgPortalMessage.id, id);
  const rows = await db.select().from(pgPortalMessage).where(where);
  return rows[0];
}

export async function findThread(threadId: string, tenantId: string): Promise<PortalMessageRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgPortalMessage)
    .where(and(eq(pgPortalMessage.threadId, threadId), eq(pgPortalMessage.tenantId, tenantId)))
    .orderBy(pgPortalMessage.createdAt);
}

export async function findInbox(tenantId: string, dfn: string): Promise<PortalMessageRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgPortalMessage)
    .where(
      and(
        eq(pgPortalMessage.tenantId, tenantId),
        or(eq(pgPortalMessage.toDfn, dfn), eq(pgPortalMessage.fromDfn, dfn)),
        sql`${pgPortalMessage.status} != 'draft'`
      )
    )
    .orderBy(desc(pgPortalMessage.createdAt));
}

export async function findDrafts(tenantId: string, dfn: string): Promise<PortalMessageRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgPortalMessage)
    .where(
      and(
        eq(pgPortalMessage.tenantId, tenantId),
        eq(pgPortalMessage.fromDfn, dfn),
        eq(pgPortalMessage.status, 'draft')
      )
    )
    .orderBy(desc(pgPortalMessage.createdAt));
}

export async function findSent(tenantId: string, dfn: string): Promise<PortalMessageRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgPortalMessage)
    .where(
      and(
        eq(pgPortalMessage.tenantId, tenantId),
        eq(pgPortalMessage.fromDfn, dfn),
        or(eq(pgPortalMessage.status, 'sent'), eq(pgPortalMessage.status, 'read'))
      )
    )
    .orderBy(desc(pgPortalMessage.createdAt));
}

export async function findStaffQueue(tenantId: string): Promise<PortalMessageRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgPortalMessage)
    .where(
      and(
        eq(pgPortalMessage.tenantId, tenantId),
        eq(pgPortalMessage.status, 'sent'),
        eq(pgPortalMessage.toDfn, 'clinic')
      )
    )
    .orderBy(desc(pgPortalMessage.createdAt));
}

/* -- Update -------------------------------------------------- */

export async function updateMessage(
  id: string,
  tenantId: string,
  updates: Partial<{
    subject: string;
    body: string;
    status: string;
    attachmentsJson: string;
    readAt: string | null;
    vistaSync: boolean;
    vistaRef: string | null;
  }>
): Promise<PortalMessageRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(pgPortalMessage)
    .set({ ...updates, updatedAt: now } as any)
    .where(and(eq(pgPortalMessage.id, id), eq(pgPortalMessage.tenantId, tenantId)));
  return findMessageById(id, tenantId);
}

/* -- Delete -------------------------------------------------- */

export async function deleteMessage(id: string, tenantId: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db
    .delete(pgPortalMessage)
    .where(and(eq(pgPortalMessage.id, id), eq(pgPortalMessage.tenantId, tenantId)));
  return (result as any)?.rowCount > 0;
}

/* -- Count --------------------------------------------------- */

export async function countMessages(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(pgPortalMessage);
  return result[0]?.count ?? 0;
}
