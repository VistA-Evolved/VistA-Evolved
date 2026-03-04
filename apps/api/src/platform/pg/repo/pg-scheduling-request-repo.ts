/**
 * PG Scheduling Request Repository — Async durable waitlist request state
 *
 * Phase 128: Imaging + Scheduling Durability (Map stores -> Postgres)
 *
 * Persists only operational tracking (waitlist requests), NOT appointment truth.
 * VistA remains the source of truth for appointments.
 * Mirrors the SQLite scheduling-request-repo function signatures but returns Promises.
 */

import { eq, and, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgSchedulingWaitlistRequest } from '../pg-schema.js';

export type SchedulingRequestRow = typeof pgSchedulingWaitlistRequest.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export async function insertSchedulingRequest(data: {
  id: string;
  tenantId?: string;
  patientDfn: string;
  clinicName: string;
  preferredDate: string;
  priority?: string;
  status?: string;
  reason?: string;
  requestType?: string;
  createdAt: string;
  updatedAt: string;
}): Promise<SchedulingRequestRow> {
  const db = getPgDb();

  await db.insert(pgSchedulingWaitlistRequest).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    patientDfn: data.patientDfn,
    clinicName: data.clinicName,
    preferredDate: data.preferredDate,
    priority: data.priority ?? 'routine',
    status: data.status ?? 'pending',
    reason: data.reason ?? null,
    requestType: data.requestType ?? 'new_appointment',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });

  const row = await findSchedulingRequestById(data.id);
  return row!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export async function findSchedulingRequestById(
  id: string
): Promise<SchedulingRequestRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgSchedulingWaitlistRequest)
    .where(eq(pgSchedulingWaitlistRequest.id, id));
  return rows[0];
}

export async function findSchedulingRequestsByPatient(
  patientDfn: string
): Promise<SchedulingRequestRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgSchedulingWaitlistRequest)
    .where(eq(pgSchedulingWaitlistRequest.patientDfn, patientDfn));
}

export async function findAllActiveRequests(): Promise<SchedulingRequestRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgSchedulingWaitlistRequest)
    .where(sql`${pgSchedulingWaitlistRequest.status} IN ('pending', 'waitlisted', 'approved')`);
}

export async function findPendingByPatientClinicDate(
  patientDfn: string,
  clinicName: string,
  preferredDate: string
): Promise<SchedulingRequestRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgSchedulingWaitlistRequest)
    .where(
      and(
        eq(pgSchedulingWaitlistRequest.patientDfn, patientDfn),
        eq(pgSchedulingWaitlistRequest.clinicName, clinicName),
        eq(pgSchedulingWaitlistRequest.preferredDate, preferredDate),
        eq(pgSchedulingWaitlistRequest.status, 'pending')
      )
    );
  return rows[0];
}

/* ── Update ────────────────────────────────────────────────── */

export async function updateSchedulingRequest(
  id: string,
  updates: Partial<{
    status: string;
    reason: string;
  }>
): Promise<SchedulingRequestRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(pgSchedulingWaitlistRequest)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgSchedulingWaitlistRequest.id, id));
  return findSchedulingRequestById(id);
}

/* ── Stats ─────────────────────────────────────────────────── */

export async function countRequests(): Promise<{ total: number; pending: number }> {
  const db = getPgDb();
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgSchedulingWaitlistRequest);
  const pendingResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgSchedulingWaitlistRequest)
    .where(eq(pgSchedulingWaitlistRequest.status, 'pending'));
  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
  };
}
