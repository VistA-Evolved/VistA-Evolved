/**
 * Imaging Ingest Repository — DB-backed study linkages + quarantine
 *
 * Phase 115: Durability Wave 2
 *
 * Two sub-stores:
 * - imaging_study_link: matched study-to-order linkages
 * - imaging_unmatched: quarantined unmatched studies
 */

import { randomUUID } from "node:crypto";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { imagingStudyLink, imagingUnmatched } from "../schema.js";

export type ImagingStudyLinkRow = typeof imagingStudyLink.$inferSelect;
export type ImagingUnmatchedRow = typeof imagingUnmatched.$inferSelect;

/* ================================================================== */
/* Study Linkage                                                       */
/* ================================================================== */

export function insertStudyLink(data: {
  id?: string;
  orderId: string;
  patientDfn: string;
  studyInstanceUid: string;
  orthancStudyId: string;
  accessionNumber: string;
  modality: string;
  studyDate?: string;
  studyDescription?: string;
  seriesCount?: number;
  instanceCount?: number;
  reconciliationType: string;
  source?: string;
}): ImagingStudyLinkRow {
  const db = getDb();
  const id = data.id ?? randomUUID();
  const now = new Date().toISOString();

  db.insert(imagingStudyLink).values({
    id,
    orderId: data.orderId,
    patientDfn: data.patientDfn,
    studyInstanceUid: data.studyInstanceUid,
    orthancStudyId: data.orthancStudyId,
    accessionNumber: data.accessionNumber,
    modality: data.modality,
    studyDate: data.studyDate ?? null,
    studyDescription: data.studyDescription ?? null,
    seriesCount: data.seriesCount ?? 0,
    instanceCount: data.instanceCount ?? 0,
    reconciliationType: data.reconciliationType,
    source: data.source ?? "prototype-sidecar",
    linkedAt: now,
  }).run();

  return findStudyLinkById(id)!;
}

export function findStudyLinkById(id: string): ImagingStudyLinkRow | undefined {
  const db = getDb();
  return db.select().from(imagingStudyLink).where(eq(imagingStudyLink.id, id)).get();
}

export function findStudyLinkByStudyUid(studyUid: string): ImagingStudyLinkRow | undefined {
  const db = getDb();
  return db.select().from(imagingStudyLink)
    .where(eq(imagingStudyLink.studyInstanceUid, studyUid))
    .get();
}

export function findStudyLinkByOrderId(orderId: string): ImagingStudyLinkRow | undefined {
  const db = getDb();
  return db.select().from(imagingStudyLink)
    .where(eq(imagingStudyLink.orderId, orderId))
    .get();
}

export function findStudyLinksForPatient(dfn: string): ImagingStudyLinkRow[] {
  const db = getDb();
  return db.select().from(imagingStudyLink)
    .where(eq(imagingStudyLink.patientDfn, dfn))
    .all();
}

export function findAllStudyLinks(): ImagingStudyLinkRow[] {
  const db = getDb();
  return db.select().from(imagingStudyLink).all();
}

/* ================================================================== */
/* Unmatched / Quarantine                                              */
/* ================================================================== */

export function insertUnmatched(data: {
  id?: string;
  orthancStudyId: string;
  studyInstanceUid: string;
  dicomPatientId: string;
  dicomPatientName?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesCount?: number;
  instanceCount?: number;
  reason: string;
}): ImagingUnmatchedRow {
  const db = getDb();
  const id = data.id ?? randomUUID();
  const now = new Date().toISOString();

  db.insert(imagingUnmatched).values({
    id,
    orthancStudyId: data.orthancStudyId,
    studyInstanceUid: data.studyInstanceUid,
    dicomPatientId: data.dicomPatientId,
    dicomPatientName: data.dicomPatientName ?? null,
    accessionNumber: data.accessionNumber ?? null,
    modality: data.modality ?? null,
    studyDate: data.studyDate ?? null,
    studyDescription: data.studyDescription ?? null,
    seriesCount: data.seriesCount ?? 0,
    instanceCount: data.instanceCount ?? 0,
    reason: data.reason,
    resolved: false,
    quarantinedAt: now,
  }).run();

  return findUnmatchedById(id)!;
}

export function findUnmatchedById(id: string): ImagingUnmatchedRow | undefined {
  const db = getDb();
  return db.select().from(imagingUnmatched).where(eq(imagingUnmatched.id, id)).get();
}

export function findUnmatchedByStudyUid(studyUid: string): ImagingUnmatchedRow | undefined {
  const db = getDb();
  return db.select().from(imagingUnmatched)
    .where(and(
      eq(imagingUnmatched.studyInstanceUid, studyUid),
      eq(imagingUnmatched.resolved, false),
    ))
    .get();
}

export function findAllUnresolved(): ImagingUnmatchedRow[] {
  const db = getDb();
  return db.select().from(imagingUnmatched)
    .where(eq(imagingUnmatched.resolved, false))
    .all();
}

export function resolveUnmatched(id: string): boolean {
  const db = getDb();
  const result = db.update(imagingUnmatched)
    .set({ resolved: true })
    .where(eq(imagingUnmatched.id, id))
    .run();
  return result.changes > 0;
}

/* ── Counts ────────────────────────────────────────────────── */

export function countStudyLinks(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(imagingStudyLink)
    .get();
  return result?.count ?? 0;
}

export function countUnmatched(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(imagingUnmatched)
    .where(eq(imagingUnmatched.resolved, false))
    .get();
  return result?.count ?? 0;
}
