/**
 * PG Radiology Repository — Async durable radiology workflow state
 *
 * Phase 528 (W38-C7): Radiology Durability
 *
 * Tables: radiology_order, reading_worklist_item, rad_report,
 *         dose_registry_entry, rad_critical_alert, peer_review
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import {
  pgRadiologyOrder,
  pgReadingWorklistItem,
  pgRadReport,
  pgDoseRegistryEntry,
  pgRadCriticalAlert,
  pgPeerReview,
} from "../pg-schema.js";

export type RadiologyOrderRow = typeof pgRadiologyOrder.$inferSelect;
export type ReadingWorklistItemRow = typeof pgReadingWorklistItem.$inferSelect;
export type RadReportRow = typeof pgRadReport.$inferSelect;
export type DoseRegistryEntryRow = typeof pgDoseRegistryEntry.$inferSelect;
export type RadCriticalAlertRow = typeof pgRadCriticalAlert.$inferSelect;
export type PeerReviewRow = typeof pgPeerReview.$inferSelect;

/* ═══════════════════ RADIOLOGY ORDER ═══════════════════ */

export async function insertRadiologyOrder(data: {
  id: string;
  tenantId?: string;
  patientDfn: string;
  vistaOrderIen?: string;
  vistaRadProcIen?: string;
  status?: string;
  procedureName: string;
  procedureCode?: string;
  cptCode?: string;
  modality: string;
  priority?: string;
  clinicalIndication: string;
  orderingProviderDuz: string;
  orderingProviderName: string;
  protocolName?: string;
  protocolAssignedByDuz?: string;
  protocolAssignedAt?: string;
  mwlWorklistItemId?: string;
  mppsRecordId?: string;
  studyInstanceUid?: string;
  accessionNumber?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
}): Promise<RadiologyOrderRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgRadiologyOrder).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    patientDfn: data.patientDfn,
    vistaOrderIen: data.vistaOrderIen ?? null,
    vistaRadProcIen: data.vistaRadProcIen ?? null,
    status: data.status ?? "ordered",
    procedureName: data.procedureName,
    procedureCode: data.procedureCode ?? null,
    cptCode: data.cptCode ?? null,
    modality: data.modality,
    priority: data.priority ?? "routine",
    clinicalIndication: data.clinicalIndication,
    orderingProviderDuz: data.orderingProviderDuz,
    orderingProviderName: data.orderingProviderName,
    protocolName: data.protocolName ?? null,
    protocolAssignedByDuz: data.protocolAssignedByDuz ?? null,
    protocolAssignedAt: data.protocolAssignedAt ?? null,
    mwlWorklistItemId: data.mwlWorklistItemId ?? null,
    mppsRecordId: data.mppsRecordId ?? null,
    studyInstanceUid: data.studyInstanceUid ?? null,
    accessionNumber: data.accessionNumber ?? null,
    scheduledAt: data.scheduledAt ?? null,
    startedAt: data.startedAt ?? null,
    completedAt: data.completedAt ?? null,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findRadiologyOrderById(data.id);
  return row!;
}

export async function findRadiologyOrderById(id: string): Promise<RadiologyOrderRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRadiologyOrder).where(eq(pgRadiologyOrder.id, id));
  return rows[0];
}

export async function findRadiologyOrdersByStatus(status: string, tenantId = "default"): Promise<RadiologyOrderRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadiologyOrder)
    .where(and(eq(pgRadiologyOrder.tenantId, tenantId), eq(pgRadiologyOrder.status, status)))
    .orderBy(desc(pgRadiologyOrder.createdAt));
}

export async function findRadiologyOrdersByPatient(patientDfn: string, tenantId = "default"): Promise<RadiologyOrderRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadiologyOrder)
    .where(and(eq(pgRadiologyOrder.tenantId, tenantId), eq(pgRadiologyOrder.patientDfn, patientDfn)))
    .orderBy(desc(pgRadiologyOrder.createdAt));
}

export async function findRadiologyOrderByAccession(accessionNumber: string, tenantId = "default"): Promise<RadiologyOrderRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRadiologyOrder)
    .where(and(eq(pgRadiologyOrder.tenantId, tenantId), eq(pgRadiologyOrder.accessionNumber, accessionNumber)));
  return rows[0];
}

export async function findAllRadiologyOrders(tenantId = "default"): Promise<RadiologyOrderRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadiologyOrder)
    .where(eq(pgRadiologyOrder.tenantId, tenantId))
    .orderBy(desc(pgRadiologyOrder.createdAt));
}

export async function updateRadiologyOrder(id: string, patch: Partial<{
  status: string;
  protocolName: string;
  protocolAssignedByDuz: string;
  protocolAssignedAt: string;
  mwlWorklistItemId: string;
  mppsRecordId: string;
  studyInstanceUid: string;
  accessionNumber: string;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
}>): Promise<RadiologyOrderRow | undefined> {
  const db = getPgDb();
  await db.update(pgRadiologyOrder).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgRadiologyOrder.id, id));
  return findRadiologyOrderById(id);
}

export async function deleteRadiologyOrder(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgRadiologyOrder).where(eq(pgRadiologyOrder.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ READING WORKLIST ITEM ═══════════════════ */

export async function insertReadingWorklistItem(data: {
  id: string;
  tenantId?: string;
  radOrderId: string;
  patientDfn: string;
  studyInstanceUid: string;
  accessionNumber: string;
  modality: string;
  procedureName: string;
  status?: string;
  priority?: string;
  assignedRadiologistDuz?: string;
  assignedRadiologistName?: string;
  assignedAt?: string;
  reportStartedAt?: string;
  reportFinalizedAt?: string;
  priorStudyCount?: number;
}): Promise<ReadingWorklistItemRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgReadingWorklistItem).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    radOrderId: data.radOrderId,
    patientDfn: data.patientDfn,
    studyInstanceUid: data.studyInstanceUid,
    accessionNumber: data.accessionNumber,
    modality: data.modality,
    procedureName: data.procedureName,
    status: data.status ?? "unread",
    priority: data.priority ?? "routine",
    assignedRadiologistDuz: data.assignedRadiologistDuz ?? null,
    assignedRadiologistName: data.assignedRadiologistName ?? null,
    assignedAt: data.assignedAt ?? null,
    reportStartedAt: data.reportStartedAt ?? null,
    reportFinalizedAt: data.reportFinalizedAt ?? null,
    priorStudyCount: data.priorStudyCount ?? 0,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findReadingWorklistItemById(data.id);
  return row!;
}

export async function findReadingWorklistItemById(id: string): Promise<ReadingWorklistItemRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgReadingWorklistItem).where(eq(pgReadingWorklistItem.id, id));
  return rows[0];
}

export async function findReadingWorklistByStatus(status: string, tenantId = "default"): Promise<ReadingWorklistItemRow[]> {
  const db = getPgDb();
  return db.select().from(pgReadingWorklistItem)
    .where(and(eq(pgReadingWorklistItem.tenantId, tenantId), eq(pgReadingWorklistItem.status, status)))
    .orderBy(desc(pgReadingWorklistItem.createdAt));
}

export async function findReadingWorklistByRadiologist(duz: string, tenantId = "default"): Promise<ReadingWorklistItemRow[]> {
  const db = getPgDb();
  return db.select().from(pgReadingWorklistItem)
    .where(and(eq(pgReadingWorklistItem.tenantId, tenantId), eq(pgReadingWorklistItem.assignedRadiologistDuz, duz)))
    .orderBy(desc(pgReadingWorklistItem.createdAt));
}

export async function findAllReadingWorklistItems(tenantId = "default"): Promise<ReadingWorklistItemRow[]> {
  const db = getPgDb();
  return db.select().from(pgReadingWorklistItem)
    .where(eq(pgReadingWorklistItem.tenantId, tenantId))
    .orderBy(desc(pgReadingWorklistItem.createdAt));
}

export async function updateReadingWorklistItem(id: string, patch: Partial<{
  status: string;
  assignedRadiologistDuz: string;
  assignedRadiologistName: string;
  assignedAt: string;
  reportStartedAt: string;
  reportFinalizedAt: string;
}>): Promise<ReadingWorklistItemRow | undefined> {
  const db = getPgDb();
  await db.update(pgReadingWorklistItem).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgReadingWorklistItem.id, id));
  return findReadingWorklistItemById(id);
}

export async function deleteReadingWorklistItem(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgReadingWorklistItem).where(eq(pgReadingWorklistItem.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ RAD REPORT ═══════════════════ */

export async function insertRadReport(data: {
  id: string;
  tenantId?: string;
  radOrderId: string;
  readingWorklistItemId: string;
  patientDfn: string;
  studyInstanceUid: string;
  accessionNumber: string;
  status?: string;
  findings?: string;
  impression?: string;
  reportText?: string;
  templateId?: string;
  dictatedByDuz: string;
  dictatedByName: string;
  dictatedAt: string;
  prelimSignedByDuz?: string;
  prelimSignedByName?: string;
  prelimSignedAt?: string;
  verifiedByDuz?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  vistaTiuNoteIen?: string;
  criticalFinding?: boolean;
}): Promise<RadReportRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgRadReport).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    radOrderId: data.radOrderId,
    readingWorklistItemId: data.readingWorklistItemId,
    patientDfn: data.patientDfn,
    studyInstanceUid: data.studyInstanceUid,
    accessionNumber: data.accessionNumber,
    status: data.status ?? "draft",
    findings: data.findings ?? "",
    impression: data.impression ?? "",
    reportText: data.reportText ?? "",
    templateId: data.templateId ?? null,
    dictatedByDuz: data.dictatedByDuz,
    dictatedByName: data.dictatedByName,
    dictatedAt: data.dictatedAt,
    prelimSignedByDuz: data.prelimSignedByDuz ?? null,
    prelimSignedByName: data.prelimSignedByName ?? null,
    prelimSignedAt: data.prelimSignedAt ?? null,
    verifiedByDuz: data.verifiedByDuz ?? null,
    verifiedByName: data.verifiedByName ?? null,
    verifiedAt: data.verifiedAt ?? null,
    vistaTiuNoteIen: data.vistaTiuNoteIen ?? null,
    criticalFinding: data.criticalFinding ?? false,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findRadReportById(data.id);
  return row!;
}

export async function findRadReportById(id: string): Promise<RadReportRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRadReport).where(eq(pgRadReport.id, id));
  return rows[0];
}

export async function findRadReportsByStatus(status: string, tenantId = "default"): Promise<RadReportRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadReport)
    .where(and(eq(pgRadReport.tenantId, tenantId), eq(pgRadReport.status, status)))
    .orderBy(desc(pgRadReport.createdAt));
}

export async function findRadReportByOrder(radOrderId: string, tenantId = "default"): Promise<RadReportRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRadReport)
    .where(and(eq(pgRadReport.tenantId, tenantId), eq(pgRadReport.radOrderId, radOrderId)));
  return rows[0];
}

export async function findAllRadReports(tenantId = "default"): Promise<RadReportRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadReport)
    .where(eq(pgRadReport.tenantId, tenantId))
    .orderBy(desc(pgRadReport.createdAt));
}

export async function updateRadReport(id: string, patch: Partial<{
  status: string;
  findings: string;
  impression: string;
  reportText: string;
  prelimSignedByDuz: string;
  prelimSignedByName: string;
  prelimSignedAt: string;
  verifiedByDuz: string;
  verifiedByName: string;
  verifiedAt: string;
  vistaTiuNoteIen: string;
  criticalFinding: boolean;
}>): Promise<RadReportRow | undefined> {
  const db = getPgDb();
  await db.update(pgRadReport).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgRadReport.id, id));
  return findRadReportById(id);
}

export async function deleteRadReport(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgRadReport).where(eq(pgRadReport.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ DOSE REGISTRY ENTRY ═══════════════════ */

export async function insertDoseRegistryEntry(data: {
  id: string;
  tenantId?: string;
  patientDfn: string;
  radOrderId: string;
  studyInstanceUid: string;
  accessionNumber: string;
  modality: string;
  procedureName: string;
  ctdiVol?: string;
  dlp?: string;
  dap?: string;
  fluoroTimeSec?: number;
  exposureCount?: number;
  effectiveDoseMsv?: string;
  exceedsDrl?: boolean;
  drlThreshold?: string;
  drlMetric?: string;
  mppsRecordId?: string;
  performedAt: string;
}): Promise<DoseRegistryEntryRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgDoseRegistryEntry).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    patientDfn: data.patientDfn,
    radOrderId: data.radOrderId,
    studyInstanceUid: data.studyInstanceUid,
    accessionNumber: data.accessionNumber,
    modality: data.modality,
    procedureName: data.procedureName,
    ctdiVol: data.ctdiVol ?? null,
    dlp: data.dlp ?? null,
    dap: data.dap ?? null,
    fluoroTimeSec: data.fluoroTimeSec ?? null,
    exposureCount: data.exposureCount ?? null,
    effectiveDoseMsv: data.effectiveDoseMsv ?? null,
    exceedsDrl: data.exceedsDrl ?? false,
    drlThreshold: data.drlThreshold ?? null,
    drlMetric: data.drlMetric ?? null,
    mppsRecordId: data.mppsRecordId ?? null,
    performedAt: data.performedAt,
    createdAt: now,
  } as any);
  const row = await findDoseRegistryEntryById(data.id);
  return row!;
}

export async function findDoseRegistryEntryById(id: string): Promise<DoseRegistryEntryRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgDoseRegistryEntry).where(eq(pgDoseRegistryEntry.id, id));
  return rows[0];
}

export async function findDoseRegistryByPatient(patientDfn: string, tenantId = "default"): Promise<DoseRegistryEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgDoseRegistryEntry)
    .where(and(eq(pgDoseRegistryEntry.tenantId, tenantId), eq(pgDoseRegistryEntry.patientDfn, patientDfn)))
    .orderBy(desc(pgDoseRegistryEntry.performedAt));
}

export async function findDoseRegistryByModality(modality: string, tenantId = "default"): Promise<DoseRegistryEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgDoseRegistryEntry)
    .where(and(eq(pgDoseRegistryEntry.tenantId, tenantId), eq(pgDoseRegistryEntry.modality, modality)))
    .orderBy(desc(pgDoseRegistryEntry.performedAt));
}

export async function findDoseRegistryExceedingDrl(tenantId = "default"): Promise<DoseRegistryEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgDoseRegistryEntry)
    .where(and(eq(pgDoseRegistryEntry.tenantId, tenantId), eq(pgDoseRegistryEntry.exceedsDrl, true)))
    .orderBy(desc(pgDoseRegistryEntry.performedAt));
}

export async function findAllDoseRegistryEntries(tenantId = "default"): Promise<DoseRegistryEntryRow[]> {
  const db = getPgDb();
  return db.select().from(pgDoseRegistryEntry)
    .where(eq(pgDoseRegistryEntry.tenantId, tenantId))
    .orderBy(desc(pgDoseRegistryEntry.performedAt));
}

export async function deleteDoseRegistryEntry(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgDoseRegistryEntry).where(eq(pgDoseRegistryEntry.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ RAD CRITICAL ALERT ═══════════════════ */

export async function insertRadCriticalAlert(data: {
  id: string;
  tenantId?: string;
  radReportId: string;
  radOrderId: string;
  patientDfn: string;
  finding: string;
  category: string;
  status?: string;
  notifyProviderDuz: string;
  notifyProviderName: string;
  communicatedToDuz?: string;
  communicatedToName?: string;
  communicatedAt?: string;
  communicationMethod?: string;
  acknowledgedByDuz?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  communicationDeadlineMinutes: number;
}): Promise<RadCriticalAlertRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgRadCriticalAlert).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    radReportId: data.radReportId,
    radOrderId: data.radOrderId,
    patientDfn: data.patientDfn,
    finding: data.finding,
    category: data.category,
    status: data.status ?? "active",
    notifyProviderDuz: data.notifyProviderDuz,
    notifyProviderName: data.notifyProviderName,
    communicatedToDuz: data.communicatedToDuz ?? null,
    communicatedToName: data.communicatedToName ?? null,
    communicatedAt: data.communicatedAt ?? null,
    communicationMethod: data.communicationMethod ?? null,
    acknowledgedByDuz: data.acknowledgedByDuz ?? null,
    acknowledgedByName: data.acknowledgedByName ?? null,
    acknowledgedAt: data.acknowledgedAt ?? null,
    communicationDeadlineMinutes: data.communicationDeadlineMinutes,
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findRadCriticalAlertById(data.id);
  return row!;
}

export async function findRadCriticalAlertById(id: string): Promise<RadCriticalAlertRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRadCriticalAlert).where(eq(pgRadCriticalAlert.id, id));
  return rows[0];
}

export async function findRadCriticalAlertsByStatus(status: string, tenantId = "default"): Promise<RadCriticalAlertRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadCriticalAlert)
    .where(and(eq(pgRadCriticalAlert.tenantId, tenantId), eq(pgRadCriticalAlert.status, status)))
    .orderBy(desc(pgRadCriticalAlert.createdAt));
}

export async function findRadCriticalAlertsByPatient(patientDfn: string, tenantId = "default"): Promise<RadCriticalAlertRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadCriticalAlert)
    .where(and(eq(pgRadCriticalAlert.tenantId, tenantId), eq(pgRadCriticalAlert.patientDfn, patientDfn)))
    .orderBy(desc(pgRadCriticalAlert.createdAt));
}

export async function findAllRadCriticalAlerts(tenantId = "default"): Promise<RadCriticalAlertRow[]> {
  const db = getPgDb();
  return db.select().from(pgRadCriticalAlert)
    .where(eq(pgRadCriticalAlert.tenantId, tenantId))
    .orderBy(desc(pgRadCriticalAlert.createdAt));
}

export async function updateRadCriticalAlert(id: string, patch: Partial<{
  status: string;
  communicatedToDuz: string;
  communicatedToName: string;
  communicatedAt: string;
  communicationMethod: string;
  acknowledgedByDuz: string;
  acknowledgedByName: string;
  acknowledgedAt: string;
}>): Promise<RadCriticalAlertRow | undefined> {
  const db = getPgDb();
  await db.update(pgRadCriticalAlert).set({
    ...patch,
    updatedAt: new Date(),
  } as any).where(eq(pgRadCriticalAlert.id, id));
  return findRadCriticalAlertById(id);
}

export async function deleteRadCriticalAlert(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgRadCriticalAlert).where(eq(pgRadCriticalAlert.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ PEER REVIEW ═══════════════════ */

export async function insertPeerReview(data: {
  id: string;
  tenantId?: string;
  radReportId: string;
  radOrderId: string;
  patientDfn: string;
  reviewerDuz: string;
  reviewerName: string;
  originalDictatorDuz: string;
  originalDictatorName: string;
  score: number;
  comments: string;
  discrepancyCategory?: string;
}): Promise<PeerReviewRow> {
  const db = getPgDb();
  const now = new Date();
  await db.insert(pgPeerReview).values({
    id: data.id,
    tenantId: data.tenantId ?? "default",
    radReportId: data.radReportId,
    radOrderId: data.radOrderId,
    patientDfn: data.patientDfn,
    reviewerDuz: data.reviewerDuz,
    reviewerName: data.reviewerName,
    originalDictatorDuz: data.originalDictatorDuz,
    originalDictatorName: data.originalDictatorName,
    score: data.score,
    comments: data.comments,
    discrepancyCategory: data.discrepancyCategory ?? null,
    createdAt: now,
  } as any);
  const row = await findPeerReviewById(data.id);
  return row!;
}

export async function findPeerReviewById(id: string): Promise<PeerReviewRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgPeerReview).where(eq(pgPeerReview.id, id));
  return rows[0];
}

export async function findPeerReviewsByReport(radReportId: string, tenantId = "default"): Promise<PeerReviewRow[]> {
  const db = getPgDb();
  return db.select().from(pgPeerReview)
    .where(and(eq(pgPeerReview.tenantId, tenantId), eq(pgPeerReview.radReportId, radReportId)))
    .orderBy(desc(pgPeerReview.createdAt));
}

export async function findPeerReviewsByReviewer(reviewerDuz: string, tenantId = "default"): Promise<PeerReviewRow[]> {
  const db = getPgDb();
  return db.select().from(pgPeerReview)
    .where(and(eq(pgPeerReview.tenantId, tenantId), eq(pgPeerReview.reviewerDuz, reviewerDuz)))
    .orderBy(desc(pgPeerReview.createdAt));
}

export async function findAllPeerReviews(tenantId = "default"): Promise<PeerReviewRow[]> {
  const db = getPgDb();
  return db.select().from(pgPeerReview)
    .where(eq(pgPeerReview.tenantId, tenantId))
    .orderBy(desc(pgPeerReview.createdAt));
}

export async function deletePeerReview(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgPeerReview).where(eq(pgPeerReview.id, id));
  return (result as any).rowCount > 0;
}
