/**
 * Phase 393 (W22-P5): Lab Deep Workflows — In-Memory Store
 *
 * Four stores:
 *  1. labOrderStore     — lab orders with FSM validation
 *  2. specimenStore     — specimen tracking with chain-of-custody
 *  3. labResultStore    — results inc. Wave 21 device bridge
 *  4. criticalAlertStore — critical value alerting pipeline
 *
 * All in-memory with FIFO eviction at MAX_ITEMS.
 * VistA is source of truth when integrations are live.
 */

import { randomUUID } from "node:crypto";
import type {
  LabOrder,
  LabOrderStatus,
  LabOrderPriority,
  SpecimenSample,
  SpecimenStatus,
  LabResult,
  ResultStatus,
  AbnormalFlag,
  CriticalAlert,
  CriticalAlertStatus,
  LabDashboardStats,
  LabWritebackPosture,
} from "./types.js";

const MAX_ITEMS = 10000;

// ─── Stores ─────────────────────────────────────────────────

const labOrderStore = new Map<string, LabOrder>();
const specimenStore = new Map<string, SpecimenSample>();
const labResultStore = new Map<string, LabResult>();
const criticalAlertStore = new Map<string, CriticalAlert>();

// ─── FSM: Lab Order Transitions ─────────────────────────────

const validOrderTransitions: Record<LabOrderStatus, LabOrderStatus[]> = {
  pending: ["collected", "cancelled", "on_hold"],
  collected: ["in_process", "cancelled"],
  in_process: ["resulted", "cancelled"],
  resulted: ["reviewed", "final", "cancelled"],
  reviewed: ["verified", "final"],
  verified: ["final"],
  final: [], // terminal
  cancelled: [], // terminal
  on_hold: ["pending", "cancelled"],
};

// ─── FSM: Specimen Transitions ──────────────────────────────

const validSpecimenTransitions: Record<SpecimenStatus, SpecimenStatus[]> = {
  ordered: ["collected", "rejected"],
  collected: ["in_transit", "rejected"],
  in_transit: ["received", "lost"],
  received: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
  lost: [],
};

// ─── Critical Value Thresholds (configurable) ───────────────

interface CritThreshold {
  analyte: string;
  low: number | null;
  high: number | null;
  units: string;
}

const CRITICAL_THRESHOLDS: CritThreshold[] = [
  { analyte: "Glucose", low: 40, high: 500, units: "mg/dL" },
  { analyte: "Potassium", low: 2.5, high: 6.5, units: "mEq/L" },
  { analyte: "Sodium", low: 120, high: 160, units: "mEq/L" },
  { analyte: "Calcium", low: 6.0, high: 13.0, units: "mg/dL" },
  { analyte: "Hemoglobin", low: 5.0, high: 20.0, units: "g/dL" },
  { analyte: "Platelets", low: 20, high: 1000, units: "K/uL" },
  { analyte: "WBC", low: 1.0, high: 30.0, units: "K/uL" },
  { analyte: "INR", low: null, high: 5.0, units: "ratio" },
  { analyte: "Troponin", low: null, high: 0.04, units: "ng/mL" },
  { analyte: "pH", low: 7.2, high: 7.6, units: "pH" },
];

// ─── FIFO Eviction Helper ───────────────────────────────────

function enforceMax<T>(store: Map<string, T>): void {
  if (store.size >= MAX_ITEMS) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

// ─── Lab Order Operations ───────────────────────────────────

export function createLabOrder(input: {
  tenantId: string;
  patientDfn: string;
  testName: string;
  testCode?: string;
  loincCode?: string;
  priority?: LabOrderPriority;
  specimenType: string;
  collectionInstructions?: string;
  orderingProviderDuz: string;
  orderingProviderName: string;
}): LabOrder {
  const now = new Date().toISOString();
  const order: LabOrder = {
    id: randomUUID(),
    tenantId: input.tenantId,
    patientDfn: input.patientDfn,
    vistaOrderIen: null,
    status: "pending",
    testName: input.testName,
    testCode: input.testCode ?? null,
    loincCode: input.loincCode ?? null,
    priority: input.priority ?? "routine",
    specimenType: input.specimenType,
    collectionInstructions: input.collectionInstructions ?? "",
    orderingProviderDuz: input.orderingProviderDuz,
    orderingProviderName: input.orderingProviderName,
    collectedAt: null,
    collectedByDuz: null,
    resultedAt: null,
    reviewedByDuz: null,
    reviewedByName: null,
    reviewedAt: null,
    verifiedByDuz: null,
    verifiedByName: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  labOrderStore.set(order.id, order);
  enforceMax(labOrderStore);
  return order;
}

export function getLabOrder(id: string): LabOrder | undefined {
  return labOrderStore.get(id);
}

export function listLabOrders(tenantId: string, filters?: {
  patientDfn?: string;
  status?: LabOrderStatus;
}): LabOrder[] {
  const results: LabOrder[] = [];
  for (const order of labOrderStore.values()) {
    if (order.tenantId !== tenantId) continue;
    if (filters?.patientDfn && order.patientDfn !== filters.patientDfn) continue;
    if (filters?.status && order.status !== filters.status) continue;
    results.push(order);
  }
  return results;
}

export function transitionLabOrder(
  id: string,
  newStatus: LabOrderStatus,
  actor?: { duz: string; name: string },
): { ok: boolean; order?: LabOrder; error?: string } {
  const order = labOrderStore.get(id);
  if (!order) return { ok: false, error: "Lab order not found" };

  const allowed = validOrderTransitions[order.status];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  const now = new Date().toISOString();
  order.status = newStatus;
  order.updatedAt = now;

  if (newStatus === "collected" && actor) {
    order.collectedAt = now;
    order.collectedByDuz = actor.duz;
  }
  if (newStatus === "resulted") {
    order.resultedAt = now;
  }
  if (newStatus === "reviewed" && actor) {
    order.reviewedByDuz = actor.duz;
    order.reviewedByName = actor.name;
    order.reviewedAt = now;
  }
  if (newStatus === "verified" && actor) {
    order.verifiedByDuz = actor.duz;
    order.verifiedByName = actor.name;
    order.verifiedAt = now;
  }

  return { ok: true, order };
}

// ─── Specimen Operations ────────────────────────────────────

export function createSpecimen(input: {
  tenantId: string;
  labOrderId: string;
  patientDfn: string;
  accessionNumber: string;
  specimenType: string;
  collectionSite?: string;
  volumeMl?: number;
  containerType?: string;
}): { ok: boolean; specimen?: SpecimenSample; error?: string } {
  const order = labOrderStore.get(input.labOrderId);
  if (!order) return { ok: false, error: "Lab order not found" };

  const now = new Date().toISOString();
  const sample: SpecimenSample = {
    id: randomUUID(),
    tenantId: input.tenantId,
    labOrderId: input.labOrderId,
    patientDfn: input.patientDfn,
    accessionNumber: input.accessionNumber,
    specimenType: input.specimenType,
    status: "ordered",
    collectionSite: input.collectionSite ?? null,
    volumeMl: input.volumeMl ?? null,
    containerType: input.containerType ?? null,
    collectedByDuz: null,
    collectedByName: null,
    collectedAt: null,
    receivedAt: null,
    rejectReason: null,
    deviceObservationIds: [],
    createdAt: now,
    updatedAt: now,
  };
  specimenStore.set(sample.id, sample);
  enforceMax(specimenStore);
  return { ok: true, specimen: sample };
}

export function getSpecimen(id: string): SpecimenSample | undefined {
  return specimenStore.get(id);
}

export function listSpecimens(tenantId: string, filters?: {
  labOrderId?: string;
  patientDfn?: string;
  status?: SpecimenStatus;
}): SpecimenSample[] {
  const results: SpecimenSample[] = [];
  for (const s of specimenStore.values()) {
    if (s.tenantId !== tenantId) continue;
    if (filters?.labOrderId && s.labOrderId !== filters.labOrderId) continue;
    if (filters?.patientDfn && s.patientDfn !== filters.patientDfn) continue;
    if (filters?.status && s.status !== filters.status) continue;
    results.push(s);
  }
  return results;
}

export function transitionSpecimen(
  id: string,
  newStatus: SpecimenStatus,
  actor?: { duz: string; name: string },
  extra?: { rejectReason?: string },
): { ok: boolean; specimen?: SpecimenSample; error?: string } {
  const sample = specimenStore.get(id);
  if (!sample) return { ok: false, error: "Specimen not found" };

  const allowed = validSpecimenTransitions[sample.status];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition specimen from ${sample.status} to ${newStatus}` };
  }

  const now = new Date().toISOString();
  sample.status = newStatus;
  sample.updatedAt = now;

  if (newStatus === "collected" && actor) {
    sample.collectedByDuz = actor.duz;
    sample.collectedByName = actor.name;
    sample.collectedAt = now;
  }
  if (newStatus === "received") {
    sample.receivedAt = now;
  }
  if (newStatus === "rejected" && extra?.rejectReason) {
    sample.rejectReason = extra.rejectReason;
  }

  return { ok: true, specimen: sample };
}

/** Link a Wave 21 device observation to this specimen */
export function linkDeviceObservation(specimenId: string, deviceObservationId: string): {
  ok: boolean;
  error?: string;
} {
  const sample = specimenStore.get(specimenId);
  if (!sample) return { ok: false, error: "Specimen not found" };
  if (!sample.deviceObservationIds.includes(deviceObservationId)) {
    sample.deviceObservationIds.push(deviceObservationId);
    sample.updatedAt = new Date().toISOString();
  }
  return { ok: true };
}

// ─── Lab Result Operations ──────────────────────────────────

export function createLabResult(input: {
  tenantId: string;
  labOrderId: string;
  patientDfn: string;
  analyteName: string;
  loincCode?: string;
  value: string;
  units?: string;
  referenceRange?: string;
  flag?: AbnormalFlag;
  status?: ResultStatus;
  comment?: string;
  method?: string;
  performingDevice?: string;
  source?: "manual" | "device" | "imported" | "vista";
  deviceObservationId?: string;
  vistaLabIen?: string;
}): { result: LabResult; criticalAlert: CriticalAlert | null } {
  const now = new Date().toISOString();
  const result: LabResult = {
    id: randomUUID(),
    tenantId: input.tenantId,
    labOrderId: input.labOrderId,
    patientDfn: input.patientDfn,
    analyteName: input.analyteName,
    loincCode: input.loincCode ?? null,
    value: input.value,
    units: input.units ?? null,
    referenceRange: input.referenceRange ?? null,
    flag: input.flag ?? "normal",
    status: input.status ?? "preliminary",
    comment: input.comment ?? null,
    method: input.method ?? null,
    performingDevice: input.performingDevice ?? null,
    source: input.source ?? "manual",
    deviceObservationId: input.deviceObservationId ?? null,
    vistaLabIen: input.vistaLabIen ?? null,
    resultedAt: now,
    createdAt: now,
  };
  labResultStore.set(result.id, result);
  enforceMax(labResultStore);

  // Check for critical values and auto-create alert
  const criticalAlert = evaluateCriticalValue(result);

  return { result, criticalAlert };
}

export function getLabResult(id: string): LabResult | undefined {
  return labResultStore.get(id);
}

export function listLabResults(tenantId: string, filters?: {
  labOrderId?: string;
  patientDfn?: string;
  flag?: AbnormalFlag;
  status?: ResultStatus;
}): LabResult[] {
  const results: LabResult[] = [];
  for (const r of labResultStore.values()) {
    if (r.tenantId !== tenantId) continue;
    if (filters?.labOrderId && r.labOrderId !== filters.labOrderId) continue;
    if (filters?.patientDfn && r.patientDfn !== filters.patientDfn) continue;
    if (filters?.flag && r.flag !== filters.flag) continue;
    if (filters?.status && r.status !== filters.status) continue;
    results.push(r);
  }
  return results;
}

export function updateResultStatus(
  id: string,
  newStatus: ResultStatus,
): { ok: boolean; result?: LabResult; error?: string } {
  const r = labResultStore.get(id);
  if (!r) return { ok: false, error: "Lab result not found" };
  r.status = newStatus;
  return { ok: true, result: r };
}

// ─── Critical Value Evaluation ──────────────────────────────

function evaluateCriticalValue(result: LabResult): CriticalAlert | null {
  const numVal = parseFloat(result.value);
  if (isNaN(numVal)) return null;

  const threshold = CRITICAL_THRESHOLDS.find(
    (t) => t.analyte.toLowerCase() === result.analyteName.toLowerCase(),
  );
  if (!threshold) return null;

  let isCritical = false;
  let thresholdDesc = "";
  let flag: AbnormalFlag = result.flag;

  if (threshold.low !== null && numVal < threshold.low) {
    isCritical = true;
    thresholdDesc = `< ${threshold.low} ${threshold.units}`;
    flag = "critical_low";
  }
  if (threshold.high !== null && numVal > threshold.high) {
    isCritical = true;
    thresholdDesc = `> ${threshold.high} ${threshold.units}`;
    flag = "critical_high";
  }

  if (!isCritical) return null;

  // Update the result's flag
  result.flag = flag;

  // Look up the ordering provider for notification
  const order = labOrderStore.get(result.labOrderId);
  const notifyDuz = order?.orderingProviderDuz ?? "UNKNOWN";
  const notifyName = order?.orderingProviderName ?? "UNKNOWN";

  const now = new Date().toISOString();
  const alert: CriticalAlert = {
    id: randomUUID(),
    tenantId: result.tenantId,
    labResultId: result.id,
    labOrderId: result.labOrderId,
    patientDfn: result.patientDfn,
    analyteName: result.analyteName,
    value: result.value,
    units: result.units,
    flag,
    threshold: thresholdDesc,
    status: "active",
    notifyProviderDuz: notifyDuz,
    notifyProviderName: notifyName,
    acknowledgedByDuz: null,
    acknowledgedByName: null,
    acknowledgedAt: null,
    readBackVerified: false,
    escalationMinutes: 30, // default 30-min escalation
    createdAt: now,
    updatedAt: now,
  };
  criticalAlertStore.set(alert.id, alert);
  enforceMax(criticalAlertStore);
  return alert;
}

// ─── Critical Alert Operations ──────────────────────────────

export function getCriticalAlert(id: string): CriticalAlert | undefined {
  return criticalAlertStore.get(id);
}

export function listCriticalAlerts(tenantId: string, filters?: {
  patientDfn?: string;
  status?: CriticalAlertStatus;
}): CriticalAlert[] {
  const results: CriticalAlert[] = [];
  for (const a of criticalAlertStore.values()) {
    if (a.tenantId !== tenantId) continue;
    if (filters?.patientDfn && a.patientDfn !== filters.patientDfn) continue;
    if (filters?.status && a.status !== filters.status) continue;
    results.push(a);
  }
  return results;
}

export function acknowledgeCriticalAlert(
  id: string,
  actor: { duz: string; name: string },
  readBackVerified: boolean,
): { ok: boolean; alert?: CriticalAlert; error?: string } {
  const alert = criticalAlertStore.get(id);
  if (!alert) return { ok: false, error: "Critical alert not found" };
  if (alert.status !== "active" && alert.status !== "escalated") {
    return { ok: false, error: `Cannot acknowledge alert in ${alert.status} status` };
  }
  alert.status = "acknowledged";
  alert.acknowledgedByDuz = actor.duz;
  alert.acknowledgedByName = actor.name;
  alert.acknowledgedAt = new Date().toISOString();
  alert.readBackVerified = readBackVerified;
  alert.updatedAt = alert.acknowledgedAt;
  return { ok: true, alert };
}

export function resolveCriticalAlert(id: string): {
  ok: boolean;
  alert?: CriticalAlert;
  error?: string;
} {
  const alert = criticalAlertStore.get(id);
  if (!alert) return { ok: false, error: "Critical alert not found" };
  if (alert.status !== "acknowledged") {
    return { ok: false, error: "Alert must be acknowledged before resolving" };
  }
  alert.status = "resolved";
  alert.updatedAt = new Date().toISOString();
  return { ok: true, alert };
}

// ─── Dashboard Stats ────────────────────────────────────────

export function getLabDashboardStats(tenantId: string): LabDashboardStats {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  let pendingOrders = 0;
  let specimensInTransit = 0;
  let resultsAwaitingReview = 0;
  let activeCriticalAlerts = 0;
  let completedToday = 0;
  let totalTurnaroundMs = 0;
  let turnaroundCount = 0;

  for (const o of labOrderStore.values()) {
    if (o.tenantId !== tenantId) continue;
    if (o.status === "pending" || o.status === "on_hold") pendingOrders++;
    if (o.status === "final" && new Date(o.updatedAt).getTime() >= dayAgo) {
      completedToday++;
      if (o.resultedAt) {
        const turnaround = new Date(o.resultedAt).getTime() - new Date(o.createdAt).getTime();
        totalTurnaroundMs += turnaround;
        turnaroundCount++;
      }
    }
  }

  for (const s of specimenStore.values()) {
    if (s.tenantId !== tenantId) continue;
    if (s.status === "in_transit") specimensInTransit++;
  }

  for (const r of labResultStore.values()) {
    if (r.tenantId !== tenantId) continue;
    if (r.status === "preliminary") resultsAwaitingReview++;
  }

  for (const a of criticalAlertStore.values()) {
    if (a.tenantId !== tenantId) continue;
    if (a.status === "active" || a.status === "escalated") activeCriticalAlerts++;
  }

  return {
    pendingOrders,
    specimensInTransit,
    resultsAwaitingReview,
    activeCriticalAlerts,
    completedToday,
    averageTurnaroundMinutes:
      turnaroundCount > 0 ? Math.round(totalTurnaroundMs / turnaroundCount / 60000) : null,
  };
}

// ─── Writeback Posture ──────────────────────────────────────

export function getLabWritebackPosture(): LabWritebackPosture {
  return {
    orderPlace: {
      rpc: "ORWDX SAVE",
      status: "available",
      note: "Via writeback executor Phase 304 PLACE_LAB_ORDER intent",
    },
    resultAck: {
      rpc: "ORWLRR ACK",
      status: "available",
      note: "Registered in rpcRegistry, used by CPRS Wave2 routes",
    },
    resultVerify: {
      rpc: "LR VERIFY",
      status: "integration_pending",
      note: "VistA Lab verify — not yet integrated, target: LR VERIFY DISPLAY",
    },
    specimenCollect: {
      rpc: "LR PHLEBOTOMY",
      status: "integration_pending",
      note: "Specimen collection tracking — target: Lab file 68 entries",
    },
    labReport: {
      rpc: "ORWLRR CHART",
      status: "available",
      note: "Registered in rpcRegistry, used by CPRS Wave1 labs/chart",
    },
  };
}

// ─── Test Reset ─────────────────────────────────────────────

export function _resetLabStores(): void {
  labOrderStore.clear();
  specimenStore.clear();
  labResultStore.clear();
  criticalAlertStore.clear();
}
