/**
 * PG Telehealth Room Repository — Async durable room state
 *
 * Phase 127: Portal + Telehealth Durability (Map stores -> Postgres)
 *
 * Mirrors the SQLite telehealth-room-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, or, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgTelehealthRoom } from '../pg-schema.js';

export type TelehealthRoomRow = typeof pgTelehealthRoom.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export async function insertRoom(data: {
  id: string;
  tenantId?: string;
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
}): Promise<TelehealthRoomRow> {
  const db = getPgDb();
  const now = new Date().toISOString();

  await db.insert(pgTelehealthRoom).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    appointmentId: data.appointmentId ?? null,
    patientDfn: data.patientDfn,
    providerDuz: data.providerDuz,
    providerName: data.providerName ?? null,
    roomStatus: data.roomStatus ?? 'scheduled',
    meetingUrl: data.meetingUrl ?? null,
    accessToken: data.accessToken ?? null,
    participantsJson: data.participantsJson ?? '{}',
    scheduledStart: data.scheduledStart ?? null,
    actualStart: null,
    actualEnd: null,
    expiresAt: data.expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  const row = await findRoomById(data.id);
  return row!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export async function findRoomById(id: string): Promise<TelehealthRoomRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgTelehealthRoom).where(eq(pgTelehealthRoom.id, id));
  return rows[0];
}

export async function findRoomByAppointment(
  appointmentId: string
): Promise<TelehealthRoomRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgTelehealthRoom)
    .where(eq(pgTelehealthRoom.appointmentId, appointmentId));
  return rows[0];
}

export async function findActiveRooms(): Promise<TelehealthRoomRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgTelehealthRoom)
    .where(
      or(
        eq(pgTelehealthRoom.roomStatus, 'created'),
        eq(pgTelehealthRoom.roomStatus, 'scheduled'),
        eq(pgTelehealthRoom.roomStatus, 'waiting'),
        eq(pgTelehealthRoom.roomStatus, 'active')
      )
    );
}

/* ── Update ────────────────────────────────────────────────── */

export async function updateRoom(
  id: string,
  updates: Partial<{
    roomStatus: string;
    meetingUrl: string | null;
    accessToken: string | null;
    participantsJson: string;
    actualStart: string | null;
    actualEnd: string | null;
    expiresAt: string;
  }>
): Promise<TelehealthRoomRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(pgTelehealthRoom)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgTelehealthRoom.id, id));
  return findRoomById(id);
}

/* ── Expire / End ──────────────────────────────────────────── */

export async function expireRoom(id: string): Promise<boolean> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .update(pgTelehealthRoom)
    .set({ roomStatus: 'ended', actualEnd: now, updatedAt: now })
    .where(eq(pgTelehealthRoom.id, id));
  return (result as any)?.rowCount > 0;
}

export async function cleanupExpiredRooms(): Promise<number> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .update(pgTelehealthRoom)
    .set({ roomStatus: 'ended', updatedAt: now })
    .where(
      and(
        sql`${pgTelehealthRoom.expiresAt} < ${now}`,
        or(
          eq(pgTelehealthRoom.roomStatus, 'created'),
          eq(pgTelehealthRoom.roomStatus, 'scheduled'),
          eq(pgTelehealthRoom.roomStatus, 'waiting'),
          eq(pgTelehealthRoom.roomStatus, 'active')
        )
      )
    );
  return (result as any)?.rowCount ?? 0;
}

/* ── Stats ─────────────────────────────────────────────────── */

export async function countRooms(): Promise<{ total: number; active: number }> {
  const db = getPgDb();
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(pgTelehealthRoom);
  const activeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgTelehealthRoom)
    .where(
      or(
        eq(pgTelehealthRoom.roomStatus, 'created'),
        eq(pgTelehealthRoom.roomStatus, 'scheduled'),
        eq(pgTelehealthRoom.roomStatus, 'waiting'),
        eq(pgTelehealthRoom.roomStatus, 'active')
      )
    );
  return {
    total: totalResult[0]?.count ?? 0,
    active: activeResult[0]?.count ?? 0,
  };
}
