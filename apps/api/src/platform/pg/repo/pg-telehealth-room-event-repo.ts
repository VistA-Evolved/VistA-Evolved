/**
 * PG Telehealth Room Event Repository — Room lifecycle event log
 *
 * Phase 127: Portal + Telehealth Durability (Map stores -> Postgres)
 *
 * NEW repo (no SQLite predecessor). Tracks join/leave/start/end events
 * for telehealth rooms. Append-only audit trail.
 */

import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getPgDb } from "../pg-db.js";
import { pgTelehealthRoomEvent } from "../pg-schema.js";

export type TelehealthRoomEventRow = typeof pgTelehealthRoomEvent.$inferSelect;

/* ── Insert ────────────────────────────────────────────────── */

export async function insertRoomEvent(data: {
  id?: string;
  tenantId?: string;
  roomId: string;
  eventType: string;
  actorId?: string;
  actorRole?: string;
  detail?: string;
}): Promise<TelehealthRoomEventRow> {
  const db = getPgDb();
  const id = data.id ?? randomUUID();
  const now = new Date().toISOString();

  await db.insert(pgTelehealthRoomEvent).values({
    id,
    tenantId: data.tenantId ?? "default",
    roomId: data.roomId,
    eventType: data.eventType,
    actorId: data.actorId ?? null,
    actorRole: data.actorRole ?? null,
    detail: data.detail ?? null,
    createdAt: now,
  });

  const row = await findRoomEventById(id);
  return row!;
}

/* ── Query ─────────────────────────────────────────────────── */

export async function findRoomEventById(id: string): Promise<TelehealthRoomEventRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgTelehealthRoomEvent)
    .where(eq(pgTelehealthRoomEvent.id, id));
  return rows[0];
}

export async function findEventsByRoomId(roomId: string): Promise<TelehealthRoomEventRow[]> {
  const db = getPgDb();
  return db.select().from(pgTelehealthRoomEvent)
    .where(eq(pgTelehealthRoomEvent.roomId, roomId))
    .orderBy(desc(pgTelehealthRoomEvent.createdAt));
}

/* ── Count ─────────────────────────────────────────────────── */

export async function countRoomEvents(roomId: string): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pgTelehealthRoomEvent)
    .where(eq(pgTelehealthRoomEvent.roomId, roomId));
  return result[0]?.count ?? 0;
}
