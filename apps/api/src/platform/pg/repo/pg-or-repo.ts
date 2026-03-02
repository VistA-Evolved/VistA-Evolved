/**
 * PG OR Repository — Async durable Operating Room / Anesthesia state
 *
 * Phase 524 (W38-C3): OR Durability
 *
 * Tables: or_case, or_room, or_block
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { pgOrCase, pgOrRoom, pgOrBlock } from "../pg-schema.js";

export type OrCaseRow = typeof pgOrCase.$inferSelect;
export type OrRoomRow = typeof pgOrRoom.$inferSelect;
export type OrBlockRow = typeof pgOrBlock.$inferSelect;

/* ═══════════════════ OR CASE ═══════════════════ */

/* ── Create ──────────────────────────────────────── */

export async function insertOrCase(data: {
  id: string;
  tenantId?: string;
  patientDfn: string;
  status?: string;
  priority?: string;
  roomId?: string;
  scheduledDate: string;
  scheduledStartTime?: string;
  estimatedDurationMin: number;
  surgeon: string;
  assistants?: unknown[];
  procedure: string;
  procedureCpt?: string;
  laterality?: string;
  anesthesiaJson?: unknown;
  milestonesJson?: unknown[];
}): Promise<OrCaseRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgOrCase).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    patientDfn: data.patientDfn,
    status: data.status ?? "scheduled",
    priority: data.priority ?? "elective",
    roomId: data.roomId ?? null,
    scheduledDate: data.scheduledDate,
    scheduledStartTime: data.scheduledStartTime ?? null,
    estimatedDurationMin: data.estimatedDurationMin,
    surgeon: data.surgeon,
    assistants: data.assistants ?? [],
    procedure: data.procedure,
    procedureCpt: data.procedureCpt ?? null,
    laterality: data.laterality ?? null,
    anesthesiaJson: data.anesthesiaJson ?? null,
    milestonesJson: data.milestonesJson ?? [],
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findOrCaseById(data.id);
  return row!;
}

/* ── Lookup ──────────────────────────────────────── */

export async function findOrCaseById(id: string): Promise<OrCaseRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgOrCase).where(eq(pgOrCase.id, id));
  return rows[0];
}

export async function findOrCasesByStatus(status: string, tenantId = "default"): Promise<OrCaseRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrCase)
    .where(and(eq(pgOrCase.tenantId, tenantId), eq(pgOrCase.status, status)))
    .orderBy(desc(pgOrCase.scheduledDate));
}

export async function findOrCasesByDate(date: string, tenantId = "default"): Promise<OrCaseRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrCase)
    .where(and(eq(pgOrCase.tenantId, tenantId), eq(pgOrCase.scheduledDate, date)));
}

export async function findOrCasesByPatient(patientDfn: string, tenantId = "default"): Promise<OrCaseRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrCase)
    .where(and(eq(pgOrCase.tenantId, tenantId), eq(pgOrCase.patientDfn, patientDfn)))
    .orderBy(desc(pgOrCase.scheduledDate));
}

export async function findAllOrCases(tenantId = "default"): Promise<OrCaseRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrCase)
    .where(eq(pgOrCase.tenantId, tenantId))
    .orderBy(desc(pgOrCase.scheduledDate));
}

/* ── Update ──────────────────────────────────────── */

export async function updateOrCase(id: string, patch: Partial<{
  status: string;
  priority: string;
  roomId: string | null;
  scheduledStartTime: string;
  estimatedDurationMin: number;
  surgeon: string;
  assistants: unknown[];
  anesthesiaJson: unknown;
  milestonesJson: unknown[];
  laterality: string;
}>): Promise<OrCaseRow | undefined> {
  const db = getPgDb();
  await db.update(pgOrCase).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgOrCase.id, id));
  return findOrCaseById(id);
}

export async function deleteOrCase(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgOrCase).where(eq(pgOrCase.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ OR ROOM ═══════════════════ */

/* ── Create ──────────────────────────────────────── */

export async function insertOrRoom(data: {
  id: string;
  tenantId?: string;
  name: string;
  location: string;
  status?: string;
  currentCaseId?: string;
  capabilities?: unknown[];
}): Promise<OrRoomRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgOrRoom).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    name: data.name,
    location: data.location,
    status: data.status ?? "available",
    currentCaseId: data.currentCaseId ?? null,
    capabilities: data.capabilities ?? [],
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findOrRoomById(data.id);
  return row!;
}

/* ── Lookup ──────────────────────────────────────── */

export async function findOrRoomById(id: string): Promise<OrRoomRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgOrRoom).where(eq(pgOrRoom.id, id));
  return rows[0];
}

export async function findAllOrRooms(tenantId = "default"): Promise<OrRoomRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrRoom).where(eq(pgOrRoom.tenantId, tenantId));
}

export async function findOrRoomsByStatus(status: string, tenantId = "default"): Promise<OrRoomRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrRoom)
    .where(and(eq(pgOrRoom.tenantId, tenantId), eq(pgOrRoom.status, status)));
}

/* ── Update ──────────────────────────────────────── */

export async function updateOrRoom(id: string, patch: Partial<{
  status: string;
  currentCaseId: string | null;
  capabilities: unknown[];
}>): Promise<OrRoomRow | undefined> {
  const db = getPgDb();
  await db.update(pgOrRoom).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgOrRoom.id, id));
  return findOrRoomById(id);
}

export async function deleteOrRoom(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgOrRoom).where(eq(pgOrRoom.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ OR BLOCK ═══════════════════ */

/* ── Create ──────────────────────────────────────── */

export async function insertOrBlock(data: {
  id: string;
  tenantId?: string;
  roomId: string;
  serviceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  surgeon?: string;
}): Promise<OrBlockRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgOrBlock).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    roomId: data.roomId,
    serviceId: data.serviceId,
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    surgeon: data.surgeon ?? null,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findOrBlockById(data.id);
  return row!;
}

/* ── Lookup ──────────────────────────────────────── */

export async function findOrBlockById(id: string): Promise<OrBlockRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgOrBlock).where(eq(pgOrBlock.id, id));
  return rows[0];
}

export async function findOrBlocksByRoom(roomId: string, tenantId = "default"): Promise<OrBlockRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrBlock)
    .where(and(eq(pgOrBlock.tenantId, tenantId), eq(pgOrBlock.roomId, roomId)));
}

export async function findAllOrBlocks(tenantId = "default"): Promise<OrBlockRow[]> {
  const db = getPgDb();
  return db.select().from(pgOrBlock).where(eq(pgOrBlock.tenantId, tenantId));
}

/* ── Update ──────────────────────────────────────── */

export async function updateOrBlock(id: string, patch: Partial<{
  serviceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  surgeon: string | null;
}>): Promise<OrBlockRow | undefined> {
  const db = getPgDb();
  await db.update(pgOrBlock).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgOrBlock.id, id));
  return findOrBlockById(id);
}

export async function deleteOrBlock(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgOrBlock).where(eq(pgOrBlock.id, id));
  return (result as any).rowCount > 0;
}
