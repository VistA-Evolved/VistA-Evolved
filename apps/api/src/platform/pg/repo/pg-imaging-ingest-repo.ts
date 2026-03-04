/**
 * PG Imaging Ingest Repository — Async durable study linkage + unmatched state
 *
 * Phase 128: Imaging + Scheduling Durability (Map stores -> Postgres)
 *
 * Mirrors the SQLite imaging-ingest-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgImagingIngestEvent } from '../pg-schema.js';

export type ImagingIngestEventRow = typeof pgImagingIngestEvent.$inferSelect;

/* ── Create (linkage) ──────────────────────────────────────── */

export async function insertStudyLink(data: {
  id: string;
  tenantId?: string;
  eventType?: string;
  orderId?: string;
  patientDfn?: string;
  studyInstanceUid: string;
  orthancStudyId: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesCount?: number;
  instanceCount?: number;
  reconciliationType?: string;
  source?: string;
}): Promise<ImagingIngestEventRow> {
  const db = getPgDb();
  const now = new Date().toISOString();

  await db.insert(pgImagingIngestEvent).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    eventType: data.eventType ?? 'linkage',
    orderId: data.orderId ?? null,
    patientDfn: data.patientDfn ?? '',
    studyInstanceUid: data.studyInstanceUid,
    orthancStudyId: data.orthancStudyId,
    accessionNumber: data.accessionNumber ?? '',
    modality: data.modality ?? '',
    studyDate: data.studyDate ?? '',
    studyDescription: data.studyDescription ?? '',
    seriesCount: data.seriesCount ?? 0,
    instanceCount: data.instanceCount ?? 0,
    reconciliationType: data.reconciliationType ?? 'manual',
    source: data.source ?? 'prototype-sidecar',
    reason: null,
    resolved: false,
    createdAt: now,
  });

  const row = await findEventById(data.id);
  return row!;
}

/* ── Create (unmatched / quarantined) ─────────────────────── */

export async function insertUnmatched(data: {
  id: string;
  tenantId?: string;
  orthancStudyId: string;
  studyInstanceUid: string;
  dicomPatientId?: string;
  dicomPatientName?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesCount?: number;
  instanceCount?: number;
  reason: string;
}): Promise<ImagingIngestEventRow> {
  const db = getPgDb();
  const now = new Date().toISOString();

  await db.insert(pgImagingIngestEvent).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    eventType: 'unmatched',
    orderId: null,
    patientDfn: data.dicomPatientId ?? '',
    studyInstanceUid: data.studyInstanceUid,
    orthancStudyId: data.orthancStudyId,
    accessionNumber: data.accessionNumber ?? '',
    modality: data.modality ?? '',
    studyDate: data.studyDate ?? '',
    studyDescription: data.studyDescription ?? '',
    seriesCount: data.seriesCount ?? 0,
    instanceCount: data.instanceCount ?? 0,
    reconciliationType: null,
    source: 'prototype-sidecar',
    reason: data.reason,
    resolved: false,
    dicomPatientName: data.dicomPatientName ?? '',
    createdAt: now,
  });

  const row = await findEventById(data.id);
  return row!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export async function findEventById(id: string): Promise<ImagingIngestEventRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgImagingIngestEvent).where(eq(pgImagingIngestEvent.id, id));
  return rows[0];
}

export async function findLinkagesByPatient(patientDfn: string): Promise<ImagingIngestEventRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgImagingIngestEvent)
    .where(
      and(
        eq(pgImagingIngestEvent.patientDfn, patientDfn),
        eq(pgImagingIngestEvent.eventType, 'linkage')
      )
    );
}

export async function findLinkageByStudyUid(
  studyUid: string
): Promise<ImagingIngestEventRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgImagingIngestEvent)
    .where(
      and(
        eq(pgImagingIngestEvent.studyInstanceUid, studyUid),
        eq(pgImagingIngestEvent.eventType, 'linkage')
      )
    );
  return rows[0];
}

export async function findLinkageByOrderId(
  orderId: string
): Promise<ImagingIngestEventRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgImagingIngestEvent)
    .where(
      and(eq(pgImagingIngestEvent.orderId, orderId), eq(pgImagingIngestEvent.eventType, 'linkage'))
    );
  return rows[0];
}

export async function findAllUnmatched(): Promise<ImagingIngestEventRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgImagingIngestEvent)
    .where(
      and(eq(pgImagingIngestEvent.eventType, 'unmatched'), eq(pgImagingIngestEvent.resolved, false))
    );
}

export async function findUnmatchedByStudyUid(
  studyUid: string
): Promise<ImagingIngestEventRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgImagingIngestEvent)
    .where(
      and(
        eq(pgImagingIngestEvent.studyInstanceUid, studyUid),
        eq(pgImagingIngestEvent.eventType, 'unmatched'),
        eq(pgImagingIngestEvent.resolved, false)
      )
    );
  return rows[0];
}

export async function findAllLinkages(): Promise<ImagingIngestEventRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgImagingIngestEvent)
    .where(eq(pgImagingIngestEvent.eventType, 'linkage'));
}

/* ── Update ────────────────────────────────────────────────── */

export async function markResolved(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db
    .update(pgImagingIngestEvent)
    .set({ resolved: true })
    .where(eq(pgImagingIngestEvent.id, id));
  return (result as any)?.rowCount > 0;
}

/* ── Stats ─────────────────────────────────────────────────── */

export async function countEvents(): Promise<{ linkages: number; unmatched: number }> {
  const db = getPgDb();
  const linkageResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgImagingIngestEvent)
    .where(eq(pgImagingIngestEvent.eventType, 'linkage'));
  const unmatchedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgImagingIngestEvent)
    .where(
      and(eq(pgImagingIngestEvent.eventType, 'unmatched'), eq(pgImagingIngestEvent.resolved, false))
    );
  return {
    linkages: linkageResult[0]?.count ?? 0,
    unmatched: unmatchedResult[0]?.count ?? 0,
  };
}

/* ── Aliases matching IngestRepo interface (imaging-ingest.ts) ────── */

export const findStudyLinksForPatient = findLinkagesByPatient;
export const findStudyLinkByStudyUid = findLinkageByStudyUid;
export const findStudyLinkByOrderId = findLinkageByOrderId;
export const findAllStudyLinks = findAllLinkages;
export const findAllUnresolved = findAllUnmatched;
export const findUnmatchedById = findEventById;
export const resolveUnmatched = markResolved;
