/**
 * PG Imaging Worklist Repository -- Async durable imaging work item state
 *
 * Phase 128: Imaging + Scheduling Durability (Map stores -> Postgres)
 *
 * Mirrors the SQLite imaging-worklist-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgImagingWorkItem } from '../pg-schema.js';

export type ImagingWorkItemRow = typeof pgImagingWorkItem.$inferSelect;

/* -- Create -------------------------------------------------- */

export async function insertWorkOrder(data: {
  id: string;
  tenantId?: string;
  vistaOrderId?: string | null;
  patientDfn: string;
  patientName?: string;
  accessionNumber: string;
  scheduledProcedure?: string;
  procedureCode?: string | null;
  modality: string;
  scheduledTime?: string;
  facility?: string;
  location?: string;
  orderingProviderDuz?: string;
  orderingProviderName?: string;
  clinicalIndication?: string;
  priority?: string;
  status?: string;
  linkedStudyUid?: string | null;
  linkedOrthancStudyId?: string | null;
  source?: string;
}): Promise<ImagingWorkItemRow> {
  const db = getPgDb();
  const now = new Date().toISOString();

  await db.insert(pgImagingWorkItem).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    vistaOrderId: data.vistaOrderId ?? null,
    patientDfn: data.patientDfn,
    patientName: data.patientName ?? '',
    accessionNumber: data.accessionNumber,
    scheduledProcedure: data.scheduledProcedure ?? '',
    procedureCode: data.procedureCode ?? null,
    modality: data.modality,
    scheduledTime: data.scheduledTime ?? '',
    facility: data.facility ?? 'DEFAULT',
    location: data.location ?? 'Radiology',
    orderingProviderDuz: data.orderingProviderDuz ?? '',
    orderingProviderName: data.orderingProviderName ?? '',
    clinicalIndication: data.clinicalIndication ?? '',
    priority: data.priority ?? 'routine',
    status: data.status ?? 'ordered',
    linkedStudyUid: data.linkedStudyUid ?? null,
    linkedOrthancStudyId: data.linkedOrthancStudyId ?? null,
    source: data.source ?? 'prototype-sidecar',
    createdAt: now,
    updatedAt: now,
  });

  const row = await findWorkOrderById(data.id);
  return row!;
}

/* -- Lookup -------------------------------------------------- */

export async function findWorkOrderById(id: string): Promise<ImagingWorkItemRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgImagingWorkItem).where(eq(pgImagingWorkItem.id, id));
  return rows[0];
}

export async function findByAccessionNumber(
  accessionNumber: string
): Promise<ImagingWorkItemRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgImagingWorkItem)
    .where(eq(pgImagingWorkItem.accessionNumber, accessionNumber));
  return rows[0];
}

export async function findByPatientDfn(patientDfn: string): Promise<ImagingWorkItemRow[]> {
  const db = getPgDb();
  return db.select().from(pgImagingWorkItem).where(eq(pgImagingWorkItem.patientDfn, patientDfn));
}

export async function findAllWorkOrders(): Promise<ImagingWorkItemRow[]> {
  const db = getPgDb();
  return db.select().from(pgImagingWorkItem);
}

/* -- Update -------------------------------------------------- */

export async function updateWorkOrder(
  id: string,
  updates: Partial<{
    status: string;
    linkedStudyUid: string | null;
    linkedOrthancStudyId: string | null;
    priority: string;
  }>
): Promise<ImagingWorkItemRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(pgImagingWorkItem)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgImagingWorkItem.id, id));
  return findWorkOrderById(id);
}

/* -- Stats --------------------------------------------------- */

export async function countWorkOrders(): Promise<{ total: number; active: number }> {
  const db = getPgDb();
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(pgImagingWorkItem);
  const activeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgImagingWorkItem)
    .where(sql`${pgImagingWorkItem.status} NOT IN ('completed', 'cancelled', 'discontinued')`);
  return {
    total: totalResult[0]?.count ?? 0,
    active: activeResult[0]?.count ?? 0,
  };
}
