/**
 * Portal Appointment Repository — DB-backed durable appointment requests
 *
 * Phase 115: Durability Wave 2
 *
 * CRUD for patient appointment requests and scheduling intents.
 * PHI-safe: stores DFN, not SSN/DOB.
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";
import { getDb } from "../db.js";
import { portalAppointment } from "../schema.js";

export type PortalAppointmentRow = typeof portalAppointment.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function insertAppointment(data: {
  patientDfn: string;
  patientName: string;
  clinicId: string;
  clinicName: string;
  providerName?: string;
  appointmentType?: string;
  scheduledAt: string;
  duration?: number;
  status?: string;
  reason?: string;
  notes?: string;
  vistaSync?: boolean;
  vistaRef?: string;
}): PortalAppointmentRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  db.insert(portalAppointment).values({
    id,
    patientDfn: data.patientDfn,
    patientName: data.patientName,
    clinicId: data.clinicId,
    clinicName: data.clinicName,
    providerName: data.providerName ?? null,
    appointmentType: data.appointmentType ?? "in-person",
    scheduledAt: data.scheduledAt,
    duration: data.duration ?? 30,
    status: data.status ?? "requested",
    reason: data.reason ?? null,
    notes: data.notes ?? null,
    vistaSync: data.vistaSync ?? false,
    vistaRef: data.vistaRef ?? null,
    cancelReason: null,
    reschedulePreference: null,
    createdAt: now,
    updatedAt: now,
  }).run();

  return findAppointmentById(id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findAppointmentById(id: string): PortalAppointmentRow | undefined {
  const db = getDb();
  return db.select().from(portalAppointment).where(eq(portalAppointment.id, id)).get();
}

export function findUpcoming(dfn: string): PortalAppointmentRow[] {
  const db = getDb();
  const now = new Date().toISOString();
  return db.select().from(portalAppointment)
    .where(and(
      eq(portalAppointment.patientDfn, dfn),
      gte(portalAppointment.scheduledAt, now),
    ))
    .orderBy(portalAppointment.scheduledAt)
    .all();
}

export function findPast(dfn: string): PortalAppointmentRow[] {
  const db = getDb();
  const now = new Date().toISOString();
  return db.select().from(portalAppointment)
    .where(and(
      eq(portalAppointment.patientDfn, dfn),
      lt(portalAppointment.scheduledAt, now),
    ))
    .orderBy(desc(portalAppointment.scheduledAt))
    .all();
}

export function findByDfn(dfn: string): PortalAppointmentRow[] {
  const db = getDb();
  return db.select().from(portalAppointment)
    .where(eq(portalAppointment.patientDfn, dfn))
    .orderBy(portalAppointment.scheduledAt)
    .all();
}

/* ── Update ────────────────────────────────────────────────── */

export function updateAppointment(id: string, updates: Partial<{
  status: string;
  cancelReason: string | null;
  reschedulePreference: string | null;
  scheduledAt: string;
  notes: string | null;
  vistaSync: boolean;
  vistaRef: string | null;
}>): PortalAppointmentRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(portalAppointment)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(portalAppointment.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findAppointmentById(id);
}

/* ── Count ─────────────────────────────────────────────────── */

export function countAppointments(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(portalAppointment)
    .get();
  return result?.count ?? 0;
}
