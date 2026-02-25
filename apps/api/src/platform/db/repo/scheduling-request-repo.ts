/**
 * Scheduling Request Repository — DB-backed durable scheduling requests
 *
 * Phase 121: Durability Wave 1
 *
 * CRUD for the scheduling request store (adapters/scheduling/vista-adapter.ts).
 * Wait list entries and appointment requests survive API restart.
 * Booking locks remain in-memory (intentionally ephemeral, TTL-based).
 */

import { eq, and, desc, sql, ne } from "drizzle-orm";
import { getDb } from "../db.js";
import { schedulingRequest } from "../schema.js";

export type SchedulingRequestRow = typeof schedulingRequest.$inferSelect;

/* ── Insert ────────────────────────────────────────────────── */

export function insertSchedulingRequest(data: {
  id: string;
  patientDfn: string;
  clinicName: string;
  preferredDate: string;
  priority?: string;
  status?: string;
  reason?: string;
  requestType?: string;
  createdAt: string;
  updatedAt: string;
}): SchedulingRequestRow {
  const db = getDb();
  db.insert(schedulingRequest).values({
    id: data.id,
    patientDfn: data.patientDfn,
    clinicName: data.clinicName,
    preferredDate: data.preferredDate,
    priority: data.priority ?? "routine",
    status: data.status ?? "pending",
    reason: data.reason ?? null,
    requestType: data.requestType ?? "new_appointment",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }).run();
  return findSchedulingRequestById(data.id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findSchedulingRequestById(id: string): SchedulingRequestRow | undefined {
  const db = getDb();
  return db.select().from(schedulingRequest).where(eq(schedulingRequest.id, id)).get();
}

export function findSchedulingRequestsByPatient(patientDfn: string): SchedulingRequestRow[] {
  const db = getDb();
  return db.select().from(schedulingRequest)
    .where(and(
      eq(schedulingRequest.patientDfn, patientDfn),
      ne(schedulingRequest.status, "cancelled"),
    ))
    .orderBy(desc(schedulingRequest.createdAt))
    .all();
}

export function findAllActiveRequests(): SchedulingRequestRow[] {
  const db = getDb();
  return db.select().from(schedulingRequest)
    .where(ne(schedulingRequest.status, "cancelled"))
    .orderBy(schedulingRequest.createdAt)
    .all();
}

export function findPendingByPatientClinicDate(
  patientDfn: string,
  clinicName: string,
  preferredDate: string,
): SchedulingRequestRow | undefined {
  const db = getDb();
  return db.select().from(schedulingRequest)
    .where(and(
      eq(schedulingRequest.patientDfn, patientDfn),
      eq(schedulingRequest.clinicName, clinicName),
      eq(schedulingRequest.preferredDate, preferredDate),
      eq(schedulingRequest.status, "pending"),
    ))
    .get();
}

/* ── Update ────────────────────────────────────────────────── */

export function updateSchedulingRequest(id: string, updates: Partial<{
  status: string;
  reason: string;
}>): SchedulingRequestRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(schedulingRequest)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(schedulingRequest.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findSchedulingRequestById(id);
}

/* ── Count ─────────────────────────────────────────────────── */

export function countAllRequests(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` }).from(schedulingRequest).get();
  return result?.count ?? 0;
}
