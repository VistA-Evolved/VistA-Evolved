/**
 * Telehealth Room Repository — DB-backed durable room state
 *
 * Phase 115: Durability Wave 2
 *
 * Stores telehealth room lifecycle (scheduled -> waiting -> active -> ended).
 * Participants stored as JSON blob. No PHI in room IDs or meeting URLs.
 */

import { eq, and, sql, or } from "drizzle-orm";
import { getDb } from "../db.js";
import { telehealthRoom } from "../schema.js";

export type TelehealthRoomRow = typeof telehealthRoom.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function insertRoom(data: {
  id: string;
  appointmentId?: string;
  patientDfn: string;
  providerDuz: string;
  providerName?: string;
  roomStatus?: string;
  meetingUrl?: string;
  accessToken?: string;
  participantsJson?: string;
  scheduledStart?: string;
  expiresAt: string;
}): TelehealthRoomRow {
  const db = getDb();
  const now = new Date().toISOString();

  db.insert(telehealthRoom).values({
    id: data.id,
    appointmentId: data.appointmentId ?? null,
    patientDfn: data.patientDfn,
    providerDuz: data.providerDuz,
    providerName: data.providerName ?? null,
    roomStatus: data.roomStatus ?? "scheduled",
    meetingUrl: data.meetingUrl ?? null,
    accessToken: data.accessToken ?? null,
    participantsJson: data.participantsJson ?? "{}",
    scheduledStart: data.scheduledStart ?? null,
    actualStart: null,
    actualEnd: null,
    expiresAt: data.expiresAt,
    createdAt: now,
    updatedAt: now,
  }).run();

  return findRoomById(data.id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findRoomById(id: string): TelehealthRoomRow | undefined {
  const db = getDb();
  return db.select().from(telehealthRoom).where(eq(telehealthRoom.id, id)).get();
}

export function findRoomByAppointment(appointmentId: string): TelehealthRoomRow | undefined {
  const db = getDb();
  return db.select().from(telehealthRoom)
    .where(eq(telehealthRoom.appointmentId, appointmentId))
    .get();
}

export function findActiveRooms(): TelehealthRoomRow[] {
  const db = getDb();
  return db.select().from(telehealthRoom)
    .where(
      or(
        eq(telehealthRoom.roomStatus, "created"),
        eq(telehealthRoom.roomStatus, "scheduled"),
        eq(telehealthRoom.roomStatus, "waiting"),
        eq(telehealthRoom.roomStatus, "active"),
      ),
    )
    .all();
}

/* ── Update ────────────────────────────────────────────────── */

export function updateRoom(id: string, updates: Partial<{
  roomStatus: string;
  meetingUrl: string | null;
  accessToken: string | null;
  participantsJson: string;
  actualStart: string | null;
  actualEnd: string | null;
  expiresAt: string;
}>): TelehealthRoomRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(telehealthRoom)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(telehealthRoom.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findRoomById(id);
}

/* ── Expire / End ──────────────────────────────────────────── */

export function expireRoom(id: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(telehealthRoom)
    .set({ roomStatus: "expired", actualEnd: now, updatedAt: now })
    .where(eq(telehealthRoom.id, id))
    .run();
  return result.changes > 0;
}

export function cleanupExpiredRooms(): number {
  const db = getDb();
  const now = new Date().toISOString();
  // Mark expired rooms that haven't been ended yet
  const result = db.update(telehealthRoom)
    .set({ roomStatus: "expired", updatedAt: now })
    .where(and(
      sql`${telehealthRoom.expiresAt} < ${now}`,
      or(
        eq(telehealthRoom.roomStatus, "created"),
        eq(telehealthRoom.roomStatus, "scheduled"),
        eq(telehealthRoom.roomStatus, "waiting"),
        eq(telehealthRoom.roomStatus, "active"),
      ),
    ))
    .run();
  return result.changes;
}

/* ── Stats ─────────────────────────────────────────────────── */

export function countRooms(): { total: number; active: number } {
  const db = getDb();
  const total = db.select({ count: sql<number>`count(*)` })
    .from(telehealthRoom).get()?.count ?? 0;
  const active = db.select({ count: sql<number>`count(*)` })
    .from(telehealthRoom)
    .where(or(
      eq(telehealthRoom.roomStatus, "created"),
      eq(telehealthRoom.roomStatus, "scheduled"),
      eq(telehealthRoom.roomStatus, "waiting"),
      eq(telehealthRoom.roomStatus, "active"),
    ))
    .get()?.count ?? 0;
  return { total, active };
}
