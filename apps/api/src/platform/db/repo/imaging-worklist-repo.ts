/**
 * Imaging Worklist Repository — DB-backed durable imaging orders
 *
 * Phase 115: Durability Wave 2
 *
 * CRUD for imaging worklist items (orders). Accession numbers are
 * stored for DICOM reconciliation. PHI-safe: DFN only, no SSN/DOB.
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { imagingWorkOrder } from "../schema.js";

export type ImagingWorkOrderRow = typeof imagingWorkOrder.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function insertWorkOrder(data: {
  id?: string;
  vistaOrderId?: string;
  patientDfn: string;
  patientName: string;
  accessionNumber: string;
  scheduledProcedure: string;
  procedureCode?: string;
  modality: string;
  scheduledTime: string;
  facility?: string;
  location?: string;
  orderingProviderDuz: string;
  orderingProviderName: string;
  clinicalIndication?: string;
  priority?: string;
  status?: string;
  source?: string;
}): ImagingWorkOrderRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = data.id ?? randomUUID();

  db.insert(imagingWorkOrder).values({
    id,
    vistaOrderId: data.vistaOrderId ?? null,
    patientDfn: data.patientDfn,
    patientName: data.patientName,
    accessionNumber: data.accessionNumber,
    scheduledProcedure: data.scheduledProcedure,
    procedureCode: data.procedureCode ?? null,
    modality: data.modality,
    scheduledTime: data.scheduledTime,
    facility: data.facility ?? "DEFAULT",
    location: data.location ?? "Radiology",
    orderingProviderDuz: data.orderingProviderDuz,
    orderingProviderName: data.orderingProviderName,
    clinicalIndication: data.clinicalIndication ?? null,
    priority: data.priority ?? "routine",
    status: data.status ?? "ordered",
    linkedStudyUid: null,
    linkedOrthancStudyId: null,
    source: data.source ?? "prototype-sidecar",
    createdAt: now,
    updatedAt: now,
  }).run();

  return findWorkOrderById(id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findWorkOrderById(id: string): ImagingWorkOrderRow | undefined {
  const db = getDb();
  return db.select().from(imagingWorkOrder).where(eq(imagingWorkOrder.id, id)).get();
}

export function findByAccessionNumber(accessionNumber: string): ImagingWorkOrderRow | undefined {
  const db = getDb();
  return db.select().from(imagingWorkOrder)
    .where(eq(imagingWorkOrder.accessionNumber, accessionNumber))
    .get();
}

export function findByPatientDfn(dfn: string): ImagingWorkOrderRow[] {
  const db = getDb();
  return db.select().from(imagingWorkOrder)
    .where(eq(imagingWorkOrder.patientDfn, dfn))
    .orderBy(desc(imagingWorkOrder.scheduledTime))
    .all();
}

export function findAllWorkOrders(): ImagingWorkOrderRow[] {
  const db = getDb();
  return db.select().from(imagingWorkOrder)
    .orderBy(imagingWorkOrder.scheduledTime)
    .all();
}

/* ── Update ────────────────────────────────────────────────── */

export function updateWorkOrder(id: string, updates: Partial<{
  status: string;
  linkedStudyUid: string | null;
  linkedOrthancStudyId: string | null;
  scheduledTime: string;
  priority: string;
}>): ImagingWorkOrderRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(imagingWorkOrder)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(imagingWorkOrder.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findWorkOrderById(id);
}

/* ── Count ─────────────────────────────────────────────────── */

export function countWorkOrders(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(imagingWorkOrder)
    .get();
  return result?.count ?? 0;
}
