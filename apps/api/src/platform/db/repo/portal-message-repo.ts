/**
 * Portal Message Repository — DB-backed durable portal messaging
 *
 * Phase 115: Durability Wave 2
 *
 * CRUD for secure messages. Attachments stored as JSON blob
 * (no separate table for V1). PHI-safe: stores DFN references,
 * not SSN/DOB.
 */

import { randomUUID } from "node:crypto";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { portalMessage } from "../schema.js";

export type PortalMessageRow = typeof portalMessage.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function insertMessage(data: {
  id?: string;
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
}): PortalMessageRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = data.id ?? randomUUID();

  db.insert(portalMessage).values({
    id,
    threadId: data.threadId,
    fromDfn: data.fromDfn,
    fromName: data.fromName,
    toDfn: data.toDfn,
    toName: data.toName,
    subject: data.subject,
    category: data.category ?? "general",
    body: data.body,
    status: data.status ?? "draft",
    attachmentsJson: data.attachmentsJson ?? "[]",
    replyToId: data.replyToId ?? null,
    vistaSync: data.vistaSync ?? false,
    vistaRef: data.vistaRef ?? null,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  }).run();

  return findMessageById(id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findMessageById(id: string): PortalMessageRow | undefined {
  const db = getDb();
  return db.select().from(portalMessage).where(eq(portalMessage.id, id)).get();
}

export function findThread(threadId: string): PortalMessageRow[] {
  const db = getDb();
  return db.select().from(portalMessage)
    .where(eq(portalMessage.threadId, threadId))
    .orderBy(portalMessage.createdAt)
    .all();
}

export function findInbox(dfn: string): PortalMessageRow[] {
  const db = getDb();
  return db.select().from(portalMessage)
    .where(and(
      eq(portalMessage.toDfn, dfn),
      eq(portalMessage.status, "sent"),
    ))
    .orderBy(desc(portalMessage.createdAt))
    .all();
}

export function findDrafts(dfn: string): PortalMessageRow[] {
  const db = getDb();
  return db.select().from(portalMessage)
    .where(and(
      eq(portalMessage.fromDfn, dfn),
      eq(portalMessage.status, "draft"),
    ))
    .orderBy(desc(portalMessage.createdAt))
    .all();
}

export function findSent(dfn: string): PortalMessageRow[] {
  const db = getDb();
  return db.select().from(portalMessage)
    .where(and(
      eq(portalMessage.fromDfn, dfn),
      or(eq(portalMessage.status, "sent"), eq(portalMessage.status, "read")),
    ))
    .orderBy(desc(portalMessage.createdAt))
    .all();
}

export function findStaffQueue(): PortalMessageRow[] {
  const db = getDb();
  return db.select().from(portalMessage)
    .where(and(
      eq(portalMessage.status, "sent"),
      eq(portalMessage.toDfn, "STAFF"),
    ))
    .orderBy(desc(portalMessage.createdAt))
    .all();
}

/* ── Update ────────────────────────────────────────────────── */

export function updateMessage(id: string, updates: Partial<{
  subject: string;
  body: string;
  status: string;
  attachmentsJson: string;
  readAt: string | null;
  vistaSync: boolean;
  vistaRef: string | null;
}>): PortalMessageRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(portalMessage)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(portalMessage.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findMessageById(id);
}

/* ── Delete ────────────────────────────────────────────────── */

export function deleteMessage(id: string): boolean {
  const db = getDb();
  const result = db.delete(portalMessage)
    .where(eq(portalMessage.id, id))
    .run();
  return result.changes > 0;
}

/* ── Count ─────────────────────────────────────────────────── */

export function countMessages(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(portalMessage)
    .get();
  return result?.count ?? 0;
}
