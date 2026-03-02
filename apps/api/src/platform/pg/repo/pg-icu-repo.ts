/**
 * PG ICU Repository — Async durable Intensive Care Unit state
 *
 * Phase 525 (W38-C4): ICU Durability
 *
 * Tables: icu_admission, icu_bed, icu_flowsheet_entry, icu_vent_record,
 *         icu_io_record, icu_score
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import {
  pgIcuAdmission,
  pgIcuBed,
  pgIcuFlowsheetEntry,
  pgIcuVentRecord,
  pgIcuIoRecord,
  pgIcuScore,
} from "../pg-schema.js";

export type IcuAdmissionRow = typeof pgIcuAdmission.$inferSelect;
export type IcuBedRow = typeof pgIcuBed.$inferSelect;
export type IcuFlowsheetEntryRow = typeof pgIcuFlowsheetEntry.$inferSelect;
export type IcuVentRecordRow = typeof pgIcuVentRecord.$inferSelect;
export type IcuIoRecordRow = typeof pgIcuIoRecord.$inferSelect;
export type IcuScoreRow = typeof pgIcuScore.$inferSelect;

/* ═══════════════════ ICU ADMISSION ═══════════════════ */

export async function insertIcuAdmission(data: {
  id: string;
  tenantId?: string;
  patientDfn: string;
  bedId: string;
  unit: string;
  status?: string;
  admitTime: string;
  admitSource: string;
  attendingProvider: string;
  diagnosis: string;
  codeStatus?: string;
  isolationPrecautions?: unknown;
  dischargeTime?: string;
  dischargeDisposition?: string;
}): Promise<IcuAdmissionRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgIcuAdmission).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    patientDfn: data.patientDfn,
    bedId: data.bedId,
    unit: data.unit,
    status: data.status ?? "active",
    admitTime: data.admitTime,
    admitSource: data.admitSource,
    attendingProvider: data.attendingProvider,
    diagnosis: data.diagnosis,
    codeStatus: data.codeStatus ?? "full",
    isolationPrecautions: data.isolationPrecautions ?? null,
    dischargeTime: data.dischargeTime ?? null,
    dischargeDisposition: data.dischargeDisposition ?? null,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findIcuAdmissionById(data.id);
  return row!;
}

export async function findIcuAdmissionById(id: string): Promise<IcuAdmissionRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgIcuAdmission).where(eq(pgIcuAdmission.id, id));
  return rows[0];
}

export async function findIcuAdmissionsByStatus(status: string, tenantId = "default"): Promise<IcuAdmissionRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuAdmission)
    .where(and(eq(pgIcuAdmission.tenantId, tenantId), eq(pgIcuAdmission.status, status)))
    .orderBy(desc(pgIcuAdmission.admitTime));
}

export async function findIcuAdmissionsByUnit(unit: string, tenantId = "default"): Promise<IcuAdmissionRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuAdmission)
    .where(and(eq(pgIcuAdmission.tenantId, tenantId), eq(pgIcuAdmission.unit, unit)))
    .orderBy(desc(pgIcuAdmission.admitTime));
}

export async function findIcuAdmissionsByPatient(patientDfn: string, tenantId = "default"): Promise<IcuAdmissionRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuAdmission)
    .where(and(eq(pgIcuAdmission.tenantId, tenantId), eq(pgIcuAdmission.patientDfn, patientDfn)))
    .orderBy(desc(pgIcuAdmission.admitTime));
}

export async function findAllIcuAdmissions(tenantId = "default"): Promise<IcuAdmissionRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuAdmission)
    .where(eq(pgIcuAdmission.tenantId, tenantId))
    .orderBy(desc(pgIcuAdmission.admitTime));
}

export async function updateIcuAdmission(id: string, patch: Partial<{
  status: string;
  bedId: string;
  attendingProvider: string;
  codeStatus: string;
  isolationPrecautions: unknown;
  dischargeTime: string;
  dischargeDisposition: string;
}>): Promise<IcuAdmissionRow | undefined> {
  const db = getPgDb();
  await db.update(pgIcuAdmission).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgIcuAdmission.id, id));
  return findIcuAdmissionById(id);
}

export async function deleteIcuAdmission(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgIcuAdmission).where(eq(pgIcuAdmission.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ ICU BED ═══════════════════ */

export async function insertIcuBed(data: {
  id: string;
  tenantId?: string;
  unit: string;
  bedNumber: string;
  status?: string;
  currentAdmissionId?: string;
  monitors?: unknown[];
}): Promise<IcuBedRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgIcuBed).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    unit: data.unit,
    bedNumber: data.bedNumber,
    status: data.status ?? "available",
    currentAdmissionId: data.currentAdmissionId ?? null,
    monitors: data.monitors ?? [],
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findIcuBedById(data.id);
  return row!;
}

export async function findIcuBedById(id: string): Promise<IcuBedRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgIcuBed).where(eq(pgIcuBed.id, id));
  return rows[0];
}

export async function findIcuBedsByUnit(unit: string, tenantId = "default"): Promise<IcuBedRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuBed)
    .where(and(eq(pgIcuBed.tenantId, tenantId), eq(pgIcuBed.unit, unit)));
}

export async function findAllIcuBeds(tenantId = "default"): Promise<IcuBedRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuBed).where(eq(pgIcuBed.tenantId, tenantId));
}

export async function updateIcuBed(id: string, patch: Partial<{
  status: string;
  currentAdmissionId: string | null;
  monitors: unknown[];
}>): Promise<IcuBedRow | undefined> {
  const db = getPgDb();
  await db.update(pgIcuBed).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgIcuBed.id, id));
  return findIcuBedById(id);
}

export async function deleteIcuBed(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgIcuBed).where(eq(pgIcuBed.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ ICU FLOWSHEET ENTRY ═══════════════════ */

export async function insertIcuFlowsheetEntry(data: {
  id: string;
  tenantId?: string;
  admissionId: string;
  category: string;
  timestamp: string;
  recordedBy: string;
  valuesJson?: unknown;
  validated?: boolean;
}): Promise<IcuFlowsheetEntryRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgIcuFlowsheetEntry).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    admissionId: data.admissionId,
    category: data.category,
    timestamp: data.timestamp,
    recordedBy: data.recordedBy,
    valuesJson: data.valuesJson ?? {},
    validated: data.validated ?? false,
    createdAt: now,
  } as any);
  const row = await findIcuFlowsheetEntryById(data.id);
  return row!;
}

export async function findIcuFlowsheetEntryById(id: string): Promise<IcuFlowsheetEntryRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgIcuFlowsheetEntry).where(eq(pgIcuFlowsheetEntry.id, id));
  return rows[0];
}

export async function findIcuFlowsheetByAdmission(admissionId: string, tenantId = "default"): Promise<IcuFlowsheetEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuFlowsheetEntry)
    .where(and(eq(pgIcuFlowsheetEntry.tenantId, tenantId), eq(pgIcuFlowsheetEntry.admissionId, admissionId)))
    .orderBy(desc(pgIcuFlowsheetEntry.timestamp));
}

export async function findIcuFlowsheetByCategory(admissionId: string, category: string, tenantId = "default"): Promise<IcuFlowsheetEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuFlowsheetEntry)
    .where(and(
      eq(pgIcuFlowsheetEntry.tenantId, tenantId),
      eq(pgIcuFlowsheetEntry.admissionId, admissionId),
      eq(pgIcuFlowsheetEntry.category, category),
    ))
    .orderBy(desc(pgIcuFlowsheetEntry.timestamp));
}

export async function deleteIcuFlowsheetEntry(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgIcuFlowsheetEntry).where(eq(pgIcuFlowsheetEntry.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ ICU VENT RECORD ═══════════════════ */

export async function insertIcuVentRecord(data: {
  id: string;
  tenantId?: string;
  admissionId: string;
  timestamp: string;
  mode: string;
  tidalVolume?: number;
  respiratoryRate?: number;
  peep: number;
  fio2: string;
  pressureSupport?: number;
  inspiratoryPressure?: number;
  pip?: number;
  plateau?: number;
  compliance?: number;
  recordedBy: string;
}): Promise<IcuVentRecordRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgIcuVentRecord).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    admissionId: data.admissionId,
    timestamp: data.timestamp,
    mode: data.mode,
    tidalVolume: data.tidalVolume ?? null,
    respiratoryRate: data.respiratoryRate ?? null,
    peep: data.peep,
    fio2: data.fio2,
    pressureSupport: data.pressureSupport ?? null,
    inspiratoryPressure: data.inspiratoryPressure ?? null,
    pip: data.pip ?? null,
    plateau: data.plateau ?? null,
    compliance: data.compliance ?? null,
    recordedBy: data.recordedBy,
    createdAt: now,
  } as any);
  const row = await findIcuVentRecordById(data.id);
  return row!;
}

export async function findIcuVentRecordById(id: string): Promise<IcuVentRecordRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgIcuVentRecord).where(eq(pgIcuVentRecord.id, id));
  return rows[0];
}

export async function findIcuVentByAdmission(admissionId: string, tenantId = "default"): Promise<IcuVentRecordRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuVentRecord)
    .where(and(eq(pgIcuVentRecord.tenantId, tenantId), eq(pgIcuVentRecord.admissionId, admissionId)))
    .orderBy(desc(pgIcuVentRecord.timestamp));
}

export async function deleteIcuVentRecord(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgIcuVentRecord).where(eq(pgIcuVentRecord.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ ICU I/O RECORD ═══════════════════ */

export async function insertIcuIoRecord(data: {
  id: string;
  tenantId?: string;
  admissionId: string;
  type: string;
  source: string;
  volumeMl: number;
  timestamp: string;
  recordedBy: string;
  description?: string;
}): Promise<IcuIoRecordRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgIcuIoRecord).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    admissionId: data.admissionId,
    type: data.type,
    source: data.source,
    volumeMl: data.volumeMl,
    timestamp: data.timestamp,
    recordedBy: data.recordedBy,
    description: data.description ?? null,
    createdAt: now,
  } as any);
  const row = await findIcuIoRecordById(data.id);
  return row!;
}

export async function findIcuIoRecordById(id: string): Promise<IcuIoRecordRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgIcuIoRecord).where(eq(pgIcuIoRecord.id, id));
  return rows[0];
}

export async function findIcuIoByAdmission(admissionId: string, tenantId = "default"): Promise<IcuIoRecordRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuIoRecord)
    .where(and(eq(pgIcuIoRecord.tenantId, tenantId), eq(pgIcuIoRecord.admissionId, admissionId)))
    .orderBy(desc(pgIcuIoRecord.timestamp));
}

export async function findIcuIoByType(admissionId: string, type: string, tenantId = "default"): Promise<IcuIoRecordRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuIoRecord)
    .where(and(
      eq(pgIcuIoRecord.tenantId, tenantId),
      eq(pgIcuIoRecord.admissionId, admissionId),
      eq(pgIcuIoRecord.type, type),
    ))
    .orderBy(desc(pgIcuIoRecord.timestamp));
}

export async function deleteIcuIoRecord(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgIcuIoRecord).where(eq(pgIcuIoRecord.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ ICU SCORE ═══════════════════ */

export async function insertIcuScore(data: {
  id: string;
  tenantId?: string;
  admissionId: string;
  scoreType: string;
  score: number;
  componentsJson?: unknown;
  timestamp: string;
  calculatedBy: string;
}): Promise<IcuScoreRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgIcuScore).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    admissionId: data.admissionId,
    scoreType: data.scoreType,
    score: data.score,
    componentsJson: data.componentsJson ?? null,
    timestamp: data.timestamp,
    calculatedBy: data.calculatedBy,
    createdAt: now,
  } as any);
  const row = await findIcuScoreById(data.id);
  return row!;
}

export async function findIcuScoreById(id: string): Promise<IcuScoreRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgIcuScore).where(eq(pgIcuScore.id, id));
  return rows[0];
}

export async function findIcuScoresByAdmission(admissionId: string, tenantId = "default"): Promise<IcuScoreRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuScore)
    .where(and(eq(pgIcuScore.tenantId, tenantId), eq(pgIcuScore.admissionId, admissionId)))
    .orderBy(desc(pgIcuScore.timestamp));
}

export async function findIcuScoresByType(admissionId: string, scoreType: string, tenantId = "default"): Promise<IcuScoreRow[]> {
  const db = getPgDb();
  return db.select().from(pgIcuScore)
    .where(and(
      eq(pgIcuScore.tenantId, tenantId),
      eq(pgIcuScore.admissionId, admissionId),
      eq(pgIcuScore.scoreType, scoreType),
    ))
    .orderBy(desc(pgIcuScore.timestamp));
}

export async function deleteIcuScore(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgIcuScore).where(eq(pgIcuScore.id, id));
  return (result as any).rowCount > 0;
}
