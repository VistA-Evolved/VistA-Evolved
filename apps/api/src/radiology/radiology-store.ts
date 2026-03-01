/**
 * Phase 394 (W22-P6): Imaging/Radiology Deep Workflows -- In-Memory Store
 *
 * Six stores:
 *  1. radOrderStore          -- Radiology order FSM with protocol assignment
 *  2. readingWorklistStore   -- Radiologist reading worklist
 *  3. radReportStore         -- Report lifecycle (draft -> prelim -> final)
 *  4. doseRegistryStore      -- Radiation dose registry with DRL comparison
 *  5. radCriticalAlertStore  -- Critical finding alerting (ACR guidelines)
 *  6. peerReviewStore        -- Peer review / RADPEER scoring
 *
 * All in-memory with FIFO eviction at MAX_ITEMS.
 */

import { randomUUID } from "node:crypto";
import type {
  RadOrder,
  RadOrderStatus,
  RadPriority,
  RadModality,
  ReadingWorklistItem,
  ReadingStatus,
  ReadingPriority,
  RadReport,
  ReportStatus,
  DoseRegistryEntry,
  RadCriticalAlert,
  RadCriticalAlertStatus,
  PeerReview,
  PeerReviewScore,
  RadDashboardStats,
  RadWritebackPosture,
} from "./types.js";

const MAX_ITEMS = 10000;

// -- Stores --

const radOrderStore = new Map<string, RadOrder>();
const readingWorklistStore = new Map<string, ReadingWorklistItem>();
const radReportStore = new Map<string, RadReport>();
const doseRegistryStore = new Map<string, DoseRegistryEntry>();
const radCriticalAlertStore = new Map<string, RadCriticalAlert>();
const peerReviewStore = new Map<string, PeerReview>();

// -- FSM: Rad Order Transitions --

const validRadOrderTransitions: Record<RadOrderStatus, RadOrderStatus[]> = {
  ordered: ["protocoled", "scheduled", "cancelled", "on_hold"],
  protocoled: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["reported", "cancelled"],
  reported: ["verified"],
  verified: [], // terminal
  cancelled: [], // terminal
  on_hold: ["ordered", "cancelled"],
};

// -- FSM: Reading Worklist Transitions --

const validReadingTransitions: Record<ReadingStatus, ReadingStatus[]> = {
  unread: ["in_progress"],
  in_progress: ["preliminary", "final"],
  preliminary: ["final", "addendum_pending"],
  final: ["addendum_pending"],
  addendum_pending: ["final"],
};

// -- FSM: Report Status Transitions --

const validReportTransitions: Record<ReportStatus, ReportStatus[]> = {
  draft: ["preliminary", "final", "cancelled"],
  preliminary: ["final", "addendum", "cancelled"],
  final: ["addendum", "amended"],
  addendum: ["final"],
  amended: ["final"],
  cancelled: [],
};

// -- DRL Thresholds (Diagnostic Reference Levels) --

interface DrlThreshold {
  procedure: string;
  modality: RadModality;
  metric: string;
  value: number;
}

const DRL_THRESHOLDS: DrlThreshold[] = [
  { procedure: "CT Head", modality: "CT", metric: "CTDIvol (mGy)", value: 60 },
  { procedure: "CT Chest", modality: "CT", metric: "DLP (mGy*cm)", value: 600 },
  { procedure: "CT Abdomen", modality: "CT", metric: "DLP (mGy*cm)", value: 1000 },
  { procedure: "CT Pelvis", modality: "CT", metric: "DLP (mGy*cm)", value: 700 },
  { procedure: "Chest X-Ray", modality: "CR", metric: "DAP (dGy*cm2)", value: 0.12 },
  { procedure: "Mammography", modality: "MG", metric: "DAP (dGy*cm2)", value: 2.5 },
  { procedure: "Fluoroscopy Upper GI", modality: "RF", metric: "fluoroTime (s)", value: 300 },
];

// -- FIFO Helper --

function enforceMax<T>(store: Map<string, T>): void {
  if (store.size >= MAX_ITEMS) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

// -- Accession Number Generator --

let dailyAccessionCounter = 0;
let lastAccessionDate = "";

function generateAccessionNumber(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (today !== lastAccessionDate) {
    lastAccessionDate = today;
    dailyAccessionCounter = 0;
  }
  dailyAccessionCounter++;
  return `RAD-${today}-${String(dailyAccessionCounter).padStart(4, "0")}`;
}

// ============================================================
// RAD ORDER OPERATIONS
// ============================================================

export function createRadOrder(input: {
  tenantId: string;
  patientDfn: string;
  procedureName: string;
  procedureCode?: string;
  cptCode?: string;
  modality: RadModality;
  priority?: RadPriority;
  clinicalIndication: string;
  orderingProviderDuz: string;
  orderingProviderName: string;
  scheduledAt?: string;
}): RadOrder {
  const now = new Date().toISOString();
  const order: RadOrder = {
    id: randomUUID(),
    tenantId: input.tenantId,
    patientDfn: input.patientDfn,
    vistaOrderIen: null,
    vistaRadProcIen: null,
    status: "ordered",
    procedureName: input.procedureName,
    procedureCode: input.procedureCode ?? null,
    cptCode: input.cptCode ?? null,
    modality: input.modality,
    priority: input.priority ?? "routine",
    clinicalIndication: input.clinicalIndication,
    orderingProviderDuz: input.orderingProviderDuz,
    orderingProviderName: input.orderingProviderName,
    protocolName: null,
    protocolAssignedByDuz: null,
    protocolAssignedAt: null,
    mwlWorklistItemId: null,
    mppsRecordId: null,
    studyInstanceUid: null,
    accessionNumber: generateAccessionNumber(),
    scheduledAt: input.scheduledAt ?? null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  radOrderStore.set(order.id, order);
  enforceMax(radOrderStore);
  return order;
}

export function getRadOrder(id: string): RadOrder | undefined {
  return radOrderStore.get(id);
}

export function listRadOrders(tenantId: string, filters?: {
  patientDfn?: string;
  status?: RadOrderStatus;
  modality?: RadModality;
}): RadOrder[] {
  const results: RadOrder[] = [];
  for (const o of radOrderStore.values()) {
    if (o.tenantId !== tenantId) continue;
    if (filters?.patientDfn && o.patientDfn !== filters.patientDfn) continue;
    if (filters?.status && o.status !== filters.status) continue;
    if (filters?.modality && o.modality !== filters.modality) continue;
    results.push(o);
  }
  return results;
}

export function transitionRadOrder(
  id: string,
  newStatus: RadOrderStatus,
  actor?: { duz: string; name: string },
): { ok: boolean; order?: RadOrder; error?: string } {
  const order = radOrderStore.get(id);
  if (!order) return { ok: false, error: "Rad order not found" };

  const allowed = validRadOrderTransitions[order.status];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  const now = new Date().toISOString();
  order.status = newStatus;
  order.updatedAt = now;

  if (newStatus === "in_progress") order.startedAt = now;
  if (newStatus === "completed") order.completedAt = now;

  return { ok: true, order };
}

export function assignProtocol(
  orderId: string,
  protocolName: string,
  assignedByDuz: string,
): { ok: boolean; order?: RadOrder; error?: string } {
  const order = radOrderStore.get(orderId);
  if (!order) return { ok: false, error: "Rad order not found" };
  order.protocolName = protocolName;
  order.protocolAssignedByDuz = assignedByDuz;
  order.protocolAssignedAt = new Date().toISOString();
  order.updatedAt = order.protocolAssignedAt;
  if (order.status === "ordered") {
    order.status = "protocoled";
  }
  return { ok: true, order };
}

export function linkMwlToRadOrder(
  orderId: string,
  mwlWorklistItemId: string,
): { ok: boolean; error?: string } {
  const order = radOrderStore.get(orderId);
  if (!order) return { ok: false, error: "Rad order not found" };
  order.mwlWorklistItemId = mwlWorklistItemId;
  order.updatedAt = new Date().toISOString();
  return { ok: true };
}

export function linkMppsToRadOrder(
  orderId: string,
  mppsRecordId: string,
  studyInstanceUid?: string,
): { ok: boolean; error?: string } {
  const order = radOrderStore.get(orderId);
  if (!order) return { ok: false, error: "Rad order not found" };
  order.mppsRecordId = mppsRecordId;
  if (studyInstanceUid) order.studyInstanceUid = studyInstanceUid;
  order.updatedAt = new Date().toISOString();
  return { ok: true };
}

// ============================================================
// READING WORKLIST OPERATIONS
// ============================================================

export function createReadingWorklistItem(input: {
  tenantId: string;
  radOrderId: string;
  patientDfn: string;
  studyInstanceUid: string;
  accessionNumber: string;
  modality: RadModality;
  procedureName: string;
  priority?: ReadingPriority;
}): ReadingWorklistItem {
  const now = new Date().toISOString();
  const item: ReadingWorklistItem = {
    id: randomUUID(),
    tenantId: input.tenantId,
    radOrderId: input.radOrderId,
    patientDfn: input.patientDfn,
    studyInstanceUid: input.studyInstanceUid,
    accessionNumber: input.accessionNumber,
    modality: input.modality,
    procedureName: input.procedureName,
    status: "unread",
    priority: input.priority ?? "routine",
    assignedRadiologistDuz: null,
    assignedRadiologistName: null,
    assignedAt: null,
    reportStartedAt: null,
    reportFinalizedAt: null,
    priorStudyCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  readingWorklistStore.set(item.id, item);
  enforceMax(readingWorklistStore);
  return item;
}

export function listReadingWorklist(tenantId: string, filters?: {
  status?: ReadingStatus;
  assignedRadiologistDuz?: string;
  modality?: RadModality;
  priority?: ReadingPriority;
}): ReadingWorklistItem[] {
  const results: ReadingWorklistItem[] = [];
  for (const item of readingWorklistStore.values()) {
    if (item.tenantId !== tenantId) continue;
    if (filters?.status && item.status !== filters.status) continue;
    if (filters?.assignedRadiologistDuz && item.assignedRadiologistDuz !== filters.assignedRadiologistDuz) continue;
    if (filters?.modality && item.modality !== filters.modality) continue;
    if (filters?.priority && item.priority !== filters.priority) continue;
    results.push(item);
  }
  return results;
}

export function assignRadiologist(
  itemId: string,
  radiologistDuz: string,
  radiologistName: string,
): { ok: boolean; item?: ReadingWorklistItem; error?: string } {
  const item = readingWorklistStore.get(itemId);
  if (!item) return { ok: false, error: "Reading worklist item not found" };
  item.assignedRadiologistDuz = radiologistDuz;
  item.assignedRadiologistName = radiologistName;
  item.assignedAt = new Date().toISOString();
  item.updatedAt = item.assignedAt;
  return { ok: true, item };
}

export function transitionReadingItem(
  itemId: string,
  newStatus: ReadingStatus,
): { ok: boolean; item?: ReadingWorklistItem; error?: string } {
  const item = readingWorklistStore.get(itemId);
  if (!item) return { ok: false, error: "Reading worklist item not found" };
  const allowed = validReadingTransitions[item.status];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition reading from ${item.status} to ${newStatus}` };
  }
  const now = new Date().toISOString();
  item.status = newStatus;
  item.updatedAt = now;
  if (newStatus === "in_progress") item.reportStartedAt = now;
  if (newStatus === "final") item.reportFinalizedAt = now;
  return { ok: true, item };
}

// ============================================================
// RADIOLOGY REPORT OPERATIONS
// ============================================================

export function createRadReport(input: {
  tenantId: string;
  radOrderId: string;
  readingWorklistItemId: string;
  patientDfn: string;
  studyInstanceUid: string;
  accessionNumber: string;
  findings: string;
  impression: string;
  reportText?: string;
  templateId?: string;
  dictatedByDuz: string;
  dictatedByName: string;
  criticalFinding?: boolean;
}): RadReport {
  const now = new Date().toISOString();
  const report: RadReport = {
    id: randomUUID(),
    tenantId: input.tenantId,
    radOrderId: input.radOrderId,
    readingWorklistItemId: input.readingWorklistItemId,
    patientDfn: input.patientDfn,
    studyInstanceUid: input.studyInstanceUid,
    accessionNumber: input.accessionNumber,
    status: "draft",
    findings: input.findings,
    impression: input.impression,
    reportText: input.reportText ?? `FINDINGS:\n${input.findings}\n\nIMPRESSION:\n${input.impression}`,
    templateId: input.templateId ?? null,
    dictatedByDuz: input.dictatedByDuz,
    dictatedByName: input.dictatedByName,
    dictatedAt: now,
    prelimSignedByDuz: null,
    prelimSignedByName: null,
    prelimSignedAt: null,
    verifiedByDuz: null,
    verifiedByName: null,
    verifiedAt: null,
    vistaTiuNoteIen: null,
    criticalFinding: input.criticalFinding ?? false,
    createdAt: now,
    updatedAt: now,
  };
  radReportStore.set(report.id, report);
  enforceMax(radReportStore);
  return report;
}

export function getRadReport(id: string): RadReport | undefined {
  return radReportStore.get(id);
}

export function listRadReports(tenantId: string, filters?: {
  radOrderId?: string;
  patientDfn?: string;
  status?: ReportStatus;
}): RadReport[] {
  const results: RadReport[] = [];
  for (const r of radReportStore.values()) {
    if (r.tenantId !== tenantId) continue;
    if (filters?.radOrderId && r.radOrderId !== filters.radOrderId) continue;
    if (filters?.patientDfn && r.patientDfn !== filters.patientDfn) continue;
    if (filters?.status && r.status !== filters.status) continue;
    results.push(r);
  }
  return results;
}

export function transitionRadReport(
  id: string,
  newStatus: ReportStatus,
  actor?: { duz: string; name: string },
): { ok: boolean; report?: RadReport; error?: string } {
  const report = radReportStore.get(id);
  if (!report) return { ok: false, error: "Rad report not found" };
  const allowed = validReportTransitions[report.status];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition report from ${report.status} to ${newStatus}` };
  }
  const now = new Date().toISOString();
  report.status = newStatus;
  report.updatedAt = now;

  if (newStatus === "preliminary" && actor) {
    report.prelimSignedByDuz = actor.duz;
    report.prelimSignedByName = actor.name;
    report.prelimSignedAt = now;
  }
  if (newStatus === "final" && actor) {
    report.verifiedByDuz = actor.duz;
    report.verifiedByName = actor.name;
    report.verifiedAt = now;
  }
  return { ok: true, report };
}

// ============================================================
// DOSE REGISTRY OPERATIONS
// ============================================================

export function recordDose(input: {
  tenantId: string;
  patientDfn: string;
  radOrderId: string;
  studyInstanceUid: string;
  accessionNumber: string;
  modality: RadModality;
  procedureName: string;
  ctdiVol?: number;
  dlp?: number;
  dap?: number;
  fluoroTimeSec?: number;
  exposureCount?: number;
  effectiveDoseMSv?: number;
  mppsRecordId?: string;
}): DoseRegistryEntry {
  // Evaluate DRL
  let exceedsDrl = false;
  let drlThreshold: number | null = null;
  let drlMetric: string | null = null;

  const matchedDrl = DRL_THRESHOLDS.find(
    (d) =>
      input.procedureName.toLowerCase().includes(d.procedure.toLowerCase()) &&
      d.modality === input.modality,
  );
  if (matchedDrl) {
    drlMetric = matchedDrl.metric;
    drlThreshold = matchedDrl.value;
    if (matchedDrl.metric.startsWith("CTDIvol") && input.ctdiVol && input.ctdiVol > matchedDrl.value) {
      exceedsDrl = true;
    }
    if (matchedDrl.metric.startsWith("DLP") && input.dlp && input.dlp > matchedDrl.value) {
      exceedsDrl = true;
    }
    if (matchedDrl.metric.startsWith("DAP") && input.dap && input.dap > matchedDrl.value) {
      exceedsDrl = true;
    }
    if (matchedDrl.metric.startsWith("fluoroTime") && input.fluoroTimeSec && input.fluoroTimeSec > matchedDrl.value) {
      exceedsDrl = true;
    }
  }

  const now = new Date().toISOString();
  const entry: DoseRegistryEntry = {
    id: randomUUID(),
    tenantId: input.tenantId,
    patientDfn: input.patientDfn,
    radOrderId: input.radOrderId,
    studyInstanceUid: input.studyInstanceUid,
    accessionNumber: input.accessionNumber,
    modality: input.modality,
    procedureName: input.procedureName,
    ctdiVol: input.ctdiVol ?? null,
    dlp: input.dlp ?? null,
    dap: input.dap ?? null,
    fluoroTimeSec: input.fluoroTimeSec ?? null,
    exposureCount: input.exposureCount ?? null,
    effectiveDoseMSv: input.effectiveDoseMSv ?? null,
    exceedsDrl,
    drlThreshold,
    drlMetric,
    mppsRecordId: input.mppsRecordId ?? null,
    performedAt: now,
    createdAt: now,
  };
  doseRegistryStore.set(entry.id, entry);
  enforceMax(doseRegistryStore);
  return entry;
}

export function listDoseRegistry(tenantId: string, filters?: {
  patientDfn?: string;
  modality?: RadModality;
  exceedsDrl?: boolean;
}): DoseRegistryEntry[] {
  const results: DoseRegistryEntry[] = [];
  for (const e of doseRegistryStore.values()) {
    if (e.tenantId !== tenantId) continue;
    if (filters?.patientDfn && e.patientDfn !== filters.patientDfn) continue;
    if (filters?.modality && e.modality !== filters.modality) continue;
    if (filters?.exceedsDrl !== undefined && e.exceedsDrl !== filters.exceedsDrl) continue;
    results.push(e);
  }
  return results;
}

export function getPatientCumulativeDose(tenantId: string, patientDfn: string): {
  totalEffectiveDoseMSv: number;
  entryCount: number;
  drlExceedances: number;
} {
  let total = 0;
  let count = 0;
  let exceedances = 0;
  for (const e of doseRegistryStore.values()) {
    if (e.tenantId !== tenantId || e.patientDfn !== patientDfn) continue;
    if (e.effectiveDoseMSv) total += e.effectiveDoseMSv;
    if (e.exceedsDrl) exceedances++;
    count++;
  }
  return { totalEffectiveDoseMSv: Math.round(total * 100) / 100, entryCount: count, drlExceedances: exceedances };
}

// ============================================================
// CRITICAL FINDING ALERT OPERATIONS
// ============================================================

export function createRadCriticalAlert(input: {
  tenantId: string;
  radReportId: string;
  radOrderId: string;
  patientDfn: string;
  finding: string;
  category: "unexpected" | "urgent" | "emergent";
  notifyProviderDuz: string;
  notifyProviderName: string;
}): RadCriticalAlert {
  const deadlineMap = { unexpected: 60, urgent: 30, emergent: 15 };
  const now = new Date().toISOString();
  const alert: RadCriticalAlert = {
    id: randomUUID(),
    tenantId: input.tenantId,
    radReportId: input.radReportId,
    radOrderId: input.radOrderId,
    patientDfn: input.patientDfn,
    finding: input.finding,
    category: input.category,
    status: "active",
    notifyProviderDuz: input.notifyProviderDuz,
    notifyProviderName: input.notifyProviderName,
    communicatedToDuz: null,
    communicatedToName: null,
    communicatedAt: null,
    communicationMethod: null,
    acknowledgedByDuz: null,
    acknowledgedByName: null,
    acknowledgedAt: null,
    communicationDeadlineMinutes: deadlineMap[input.category],
    createdAt: now,
    updatedAt: now,
  };
  radCriticalAlertStore.set(alert.id, alert);
  enforceMax(radCriticalAlertStore);
  return alert;
}

export function listRadCriticalAlerts(tenantId: string, filters?: {
  patientDfn?: string;
  status?: RadCriticalAlertStatus;
}): RadCriticalAlert[] {
  const results: RadCriticalAlert[] = [];
  for (const a of radCriticalAlertStore.values()) {
    if (a.tenantId !== tenantId) continue;
    if (filters?.patientDfn && a.patientDfn !== filters.patientDfn) continue;
    if (filters?.status && a.status !== filters.status) continue;
    results.push(a);
  }
  return results;
}

export function communicateRadCriticalAlert(
  id: string,
  actor: { duz: string; name: string },
  method: "direct_verbal" | "phone" | "secure_message" | "in_person",
): { ok: boolean; alert?: RadCriticalAlert; error?: string } {
  const alert = radCriticalAlertStore.get(id);
  if (!alert) return { ok: false, error: "Critical alert not found" };
  if (alert.status !== "active") {
    return { ok: false, error: `Cannot communicate alert in ${alert.status} status` };
  }
  const now = new Date().toISOString();
  alert.status = "communicated";
  alert.communicatedToDuz = actor.duz;
  alert.communicatedToName = actor.name;
  alert.communicatedAt = now;
  alert.communicationMethod = method;
  alert.updatedAt = now;
  return { ok: true, alert };
}

export function acknowledgeRadCriticalAlert(
  id: string,
  actor: { duz: string; name: string },
): { ok: boolean; alert?: RadCriticalAlert; error?: string } {
  const alert = radCriticalAlertStore.get(id);
  if (!alert) return { ok: false, error: "Critical alert not found" };
  if (alert.status !== "communicated" && alert.status !== "active") {
    return { ok: false, error: `Cannot acknowledge alert in ${alert.status} status` };
  }
  const now = new Date().toISOString();
  alert.status = "acknowledged";
  alert.acknowledgedByDuz = actor.duz;
  alert.acknowledgedByName = actor.name;
  alert.acknowledgedAt = now;
  alert.updatedAt = now;
  return { ok: true, alert };
}

export function resolveRadCriticalAlert(id: string): {
  ok: boolean;
  alert?: RadCriticalAlert;
  error?: string;
} {
  const alert = radCriticalAlertStore.get(id);
  if (!alert) return { ok: false, error: "Critical alert not found" };
  if (alert.status !== "acknowledged") {
    return { ok: false, error: "Alert must be acknowledged before resolving" };
  }
  alert.status = "resolved";
  alert.updatedAt = new Date().toISOString();
  return { ok: true, alert };
}

// ============================================================
// PEER REVIEW OPERATIONS
// ============================================================

export function createPeerReview(input: {
  tenantId: string;
  radReportId: string;
  radOrderId: string;
  patientDfn: string;
  reviewerDuz: string;
  reviewerName: string;
  originalDictatorDuz: string;
  originalDictatorName: string;
  score: PeerReviewScore;
  comments: string;
  discrepancyCategory?: string;
}): PeerReview {
  const review: PeerReview = {
    id: randomUUID(),
    tenantId: input.tenantId,
    radReportId: input.radReportId,
    radOrderId: input.radOrderId,
    patientDfn: input.patientDfn,
    reviewerDuz: input.reviewerDuz,
    reviewerName: input.reviewerName,
    originalDictatorDuz: input.originalDictatorDuz,
    originalDictatorName: input.originalDictatorName,
    score: input.score,
    comments: input.comments,
    discrepancyCategory: input.score > 1 ? (input.discrepancyCategory ?? "unspecified") : null,
    createdAt: new Date().toISOString(),
  };
  peerReviewStore.set(review.id, review);
  enforceMax(peerReviewStore);
  return review;
}

export function listPeerReviews(tenantId: string, filters?: {
  radReportId?: string;
  reviewerDuz?: string;
  originalDictatorDuz?: string;
}): PeerReview[] {
  const results: PeerReview[] = [];
  for (const r of peerReviewStore.values()) {
    if (r.tenantId !== tenantId) continue;
    if (filters?.radReportId && r.radReportId !== filters.radReportId) continue;
    if (filters?.reviewerDuz && r.reviewerDuz !== filters.reviewerDuz) continue;
    if (filters?.originalDictatorDuz && r.originalDictatorDuz !== filters.originalDictatorDuz) continue;
    results.push(r);
  }
  return results;
}

// ============================================================
// DASHBOARD & POSTURE
// ============================================================

export function getRadDashboardStats(tenantId: string): RadDashboardStats {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  let pendingOrders = 0;
  let unreadStudies = 0;
  let preliminaryReports = 0;
  let criticalAlertsActive = 0;
  let completedToday = 0;
  let doseAlertsToday = 0;
  let peerReviewsThisMonth = 0;
  let totalTurnaroundMs = 0;
  let turnaroundCount = 0;

  for (const o of radOrderStore.values()) {
    if (o.tenantId !== tenantId) continue;
    if (o.status === "ordered" || o.status === "protocoled" || o.status === "scheduled") pendingOrders++;
    if (o.status === "verified" && o.completedAt && new Date(o.completedAt).getTime() >= dayAgo) {
      completedToday++;
    }
  }

  for (const item of readingWorklistStore.values()) {
    if (item.tenantId !== tenantId) continue;
    if (item.status === "unread") unreadStudies++;
    if (item.reportStartedAt && item.reportFinalizedAt) {
      const t = new Date(item.reportFinalizedAt).getTime() - new Date(item.reportStartedAt).getTime();
      totalTurnaroundMs += t;
      turnaroundCount++;
    }
  }

  for (const r of radReportStore.values()) {
    if (r.tenantId !== tenantId) continue;
    if (r.status === "preliminary") preliminaryReports++;
  }

  for (const a of radCriticalAlertStore.values()) {
    if (a.tenantId !== tenantId) continue;
    if (a.status === "active" || a.status === "communicated") criticalAlertsActive++;
  }

  for (const d of doseRegistryStore.values()) {
    if (d.tenantId !== tenantId) continue;
    if (d.exceedsDrl && new Date(d.createdAt).getTime() >= dayAgo) doseAlertsToday++;
  }

  for (const p of peerReviewStore.values()) {
    if (p.tenantId !== tenantId) continue;
    if (new Date(p.createdAt).getTime() >= monthAgo) peerReviewsThisMonth++;
  }

  return {
    pendingOrders,
    unreadStudies,
    preliminaryReports,
    criticalAlertsActive,
    completedToday,
    averageTurnaroundMinutes:
      turnaroundCount > 0 ? Math.round(totalTurnaroundMs / turnaroundCount / 60000) : null,
    doseAlertsToday,
    peerReviewsThisMonth,
  };
}

export function getRadWritebackPosture(): RadWritebackPosture {
  return {
    orderPlace: {
      rpc: "ORWDX SAVE",
      status: "available",
      note: "Via writeback executor Phase 304 PLACE_IMAGING_ORDER intent",
    },
    reportCreate: {
      rpc: "TIU CREATE RECORD",
      status: "available",
      note: "Registered in rpcRegistry; needs RAD document class config",
    },
    reportVerify: {
      rpc: "TIU SIGN RECORD",
      status: "available",
      note: "Registered in rpcRegistry; e-signature required",
    },
    accessionAssign: {
      rpc: "RA ASSIGN ACC#",
      status: "integration_pending",
      note: "VistA Radiology accession -- not available in sandbox",
    },
    vistaRadProc: {
      rpc: "RAD/NUC MED PROC LIST",
      status: "integration_pending",
      note: "VistA File 71 RA PROCEDURE catalog -- not in sandbox RPCs",
    },
  };
}

// ============================================================
// TEST RESET
// ============================================================

export function _resetRadiologyStores(): void {
  radOrderStore.clear();
  readingWorklistStore.clear();
  radReportStore.clear();
  doseRegistryStore.clear();
  radCriticalAlertStore.clear();
  peerReviewStore.clear();
  dailyAccessionCounter = 0;
  lastAccessionDate = "";
}
