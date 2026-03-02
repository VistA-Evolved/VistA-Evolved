/**
 * PG ED Repository — Async durable Emergency Department state
 *
 * Phase 523 (W38-C2): ED Durability
 *
 * Tables: ed_visit, ed_bed
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { pgEdVisit, pgEdBed } from "../pg-schema.js";

export type EdVisitRow = typeof pgEdVisit.$inferSelect;
export type EdBedRow = typeof pgEdBed.$inferSelect;

/* ═══════════════════ ED VISIT ═══════════════════ */

/* ── Create ──────────────────────────────────────── */

export async function insertEdVisit(data: {
  id: string;
  tenantId?: string;
  patientDfn: string;
  status?: string;
  arrivalTime: string;
  arrivalMode: string;
  triageJson?: unknown;
  bedAssignmentJson?: unknown;
  attendingProvider?: string;
  disposition?: string;
  dispositionTime?: string;
  dispositionBy?: string;
  admitOrderIen?: string;
  createdBy?: string;
  totalMinutes?: number;
  doorToProviderMinutes?: number;
  doorToDispositionMinutes?: number;
}): Promise<EdVisitRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgEdVisit).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    patientDfn: data.patientDfn,
    status: data.status ?? "waiting",
    arrivalTime: data.arrivalTime,
    arrivalMode: data.arrivalMode,
    triageJson: data.triageJson ?? null,
    bedAssignmentJson: data.bedAssignmentJson ?? null,
    attendingProvider: data.attendingProvider ?? null,
    disposition: data.disposition ?? null,
    dispositionTime: data.dispositionTime ?? null,
    dispositionBy: data.dispositionBy ?? null,
    admitOrderIen: data.admitOrderIen ?? null,
    createdBy: data.createdBy ?? null,
    totalMinutes: data.totalMinutes ?? null,
    doorToProviderMinutes: data.doorToProviderMinutes ?? null,
    doorToDispositionMinutes: data.doorToDispositionMinutes ?? null,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findEdVisitById(data.id);
  return row!;
}

/* ── Lookup ──────────────────────────────────────── */

export async function findEdVisitById(id: string): Promise<EdVisitRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdVisit).where(eq(pgEdVisit.id, id));
  return rows[0];
}

export async function findEdVisitsByStatus(status: string, tenantId = "default"): Promise<EdVisitRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdVisit)
    .where(and(eq(pgEdVisit.tenantId, tenantId), eq(pgEdVisit.status, status)))
    .orderBy(desc(pgEdVisit.arrivalTime));
}

export async function findEdVisitsByPatient(patientDfn: string, tenantId = "default"): Promise<EdVisitRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdVisit)
    .where(and(eq(pgEdVisit.tenantId, tenantId), eq(pgEdVisit.patientDfn, patientDfn)))
    .orderBy(desc(pgEdVisit.arrivalTime));
}

export async function findAllEdVisits(tenantId = "default"): Promise<EdVisitRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdVisit)
    .where(eq(pgEdVisit.tenantId, tenantId))
    .orderBy(desc(pgEdVisit.arrivalTime));
}

/* ── Update ──────────────────────────────────────── */

export async function updateEdVisit(id: string, patch: Partial<{
  status: string;
  triageJson: unknown;
  bedAssignmentJson: unknown;
  attendingProvider: string;
  disposition: string;
  dispositionTime: string;
  dispositionBy: string;
  admitOrderIen: string;
  totalMinutes: number;
  doorToProviderMinutes: number;
  doorToDispositionMinutes: number;
}>): Promise<EdVisitRow | undefined> {
  const db = getPgDb();
  await db.update(pgEdVisit).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgEdVisit.id, id));
  return findEdVisitById(id);
}

/* ── Delete ──────────────────────────────────────── */

export async function deleteEdVisit(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgEdVisit).where(eq(pgEdVisit.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ ED BED ═══════════════════ */

/* ── Create ──────────────────────────────────────── */

export async function insertEdBed(data: {
  id: string;
  tenantId?: string;
  zone: string;
  bedNumber: string;
  status?: string;
  currentVisitId?: string;
  lastCleanedAt?: string;
}): Promise<EdBedRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgEdBed).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    zone: data.zone,
    bedNumber: data.bedNumber,
    status: data.status ?? "available",
    currentVisitId: data.currentVisitId ?? null,
    lastCleanedAt: data.lastCleanedAt ?? null,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findEdBedById(data.id);
  return row!;
}

/* ── Lookup ──────────────────────────────────────── */

export async function findEdBedById(id: string): Promise<EdBedRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgEdBed).where(eq(pgEdBed.id, id));
  return rows[0];
}

export async function findEdBedsByStatus(status: string, tenantId = "default"): Promise<EdBedRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdBed)
    .where(and(eq(pgEdBed.tenantId, tenantId), eq(pgEdBed.status, status)));
}

export async function findAllEdBeds(tenantId = "default"): Promise<EdBedRow[]> {
  const db = getPgDb();
  return db.select().from(pgEdBed).where(eq(pgEdBed.tenantId, tenantId));
}

/* ── Update ──────────────────────────────────────── */

export async function updateEdBed(id: string, patch: Partial<{
  status: string;
  currentVisitId: string | null;
  lastCleanedAt: string;
}>): Promise<EdBedRow | undefined> {
  const db = getPgDb();
  await db.update(pgEdBed).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgEdBed.id, id));
  return findEdBedById(id);
}

export async function deleteEdBed(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgEdBed).where(eq(pgEdBed.id, id));
  return (result as any).rowCount > 0;
}
