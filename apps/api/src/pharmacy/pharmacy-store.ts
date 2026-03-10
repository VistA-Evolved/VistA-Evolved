/**
 * Phase 392 (W22-P4): Pharmacy Deep Workflows -- Store
 *
 * In-memory stores for pharmacy order lifecycle, dispensing events,
 * and administration records. Bridges existing writeback executor
 * (ORWDX SAVE/DC) with full lifecycle tracking.
 *
 * Reset on API restart (standard in-memory pattern).
 */

import { randomUUID } from 'node:crypto';
import type {
  PharmOrder,
  PharmOrderStatus,
  ClinicalCheckResult,
  ClinicalCheckType,
  DispenseEvent,
  DispenseStatus,
  AdminRecord,
  PharmacyDashboardStats,
  PharmWritebackPosture,
} from './types.js';

// --- Constants ----------------------------------------------

const MAX_ITEMS = 10_000;

// ISMP high-alert medications (subset for heuristic flagging)
const HIGH_ALERT_CLASSES = new Set([
  'anticoagulant',
  'insulin',
  'opioid',
  'neuromuscular_blocker',
  'chemotherapy',
  'concentrated_electrolyte',
  'thrombolytic',
  'vasopressor',
  'sedative',
  'paralytic',
]);

// --- Stores -------------------------------------------------

const pharmOrderStore = new Map<string, PharmOrder>();
const dispenseEventStore = new Map<string, DispenseEvent>();
const adminRecordStore = new Map<string, AdminRecord>();

// --- Pharmacy Orders ----------------------------------------

export function createPharmOrder(
  tenantId: string,
  input: Omit<
    PharmOrder,
    | 'id'
    | 'tenantId'
    | 'createdAt'
    | 'updatedAt'
    | 'clinicalChecks'
    | 'requiresStepUp'
    | 'stepUpCompleted'
    | 'verifyingPharmacistDuz'
    | 'verifyingPharmacistName'
    | 'verifiedAt'
  >
): PharmOrder {
  if (pharmOrderStore.size >= MAX_ITEMS) {
    const first = pharmOrderStore.keys().next().value;
    if (first) pharmOrderStore.delete(first);
  }

  const now = new Date().toISOString();
  const clinicalChecks = runClinicalChecks(input.drugName, input.drugClass, input.dose);
  const requiresStepUp = isHighAlert(input.drugClass);

  const order: PharmOrder = {
    id: randomUUID(),
    tenantId,
    ...input,
    clinicalChecks,
    requiresStepUp,
    stepUpCompleted: false,
    verifyingPharmacistDuz: null,
    verifyingPharmacistName: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  pharmOrderStore.set(order.id, order);
  return order;
}

export function getPharmOrder(id: string): PharmOrder | undefined {
  return pharmOrderStore.get(id);
}

export function listPharmOrders(tenantId: string, patientDfn?: string): PharmOrder[] {
  return Array.from(pharmOrderStore.values()).filter((o) => {
    if (o.tenantId !== tenantId) return false;
    if (patientDfn && o.patientDfn !== patientDfn) return false;
    return true;
  });
}

/** Transition order status with validation */
export function transitionPharmOrder(
  id: string,
  newStatus: PharmOrderStatus,
  actor?: { duz: string; name: string }
): PharmOrder | { error: string } {
  const order = pharmOrderStore.get(id);
  if (!order) return { error: 'Order not found' };

  // Validate transition
  const validTransitions: Record<PharmOrderStatus, PharmOrderStatus[]> = {
    pending: ['pharmacist_review', 'cancelled'],
    pharmacist_review: ['verified', 'on_hold', 'cancelled'],
    verified: ['dispensing', 'discontinued', 'on_hold'],
    dispensing: ['dispensed', 'on_hold'],
    dispensed: ['ready_for_admin', 'returned'],
    ready_for_admin: ['administered', 'on_hold', 'discontinued'],
    administered: ['discontinued'],
    returned: ['dispensing'],
    discontinued: [],
    cancelled: [],
    on_hold: ['pharmacist_review', 'verified', 'dispensing', 'cancelled'],
    expired: [],
  };

  const allowed = validTransitions[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  const updated: PharmOrder = {
    ...order,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  // Pharmacist verification
  if (newStatus === 'verified' && actor) {
    updated.verifyingPharmacistDuz = actor.duz;
    updated.verifyingPharmacistName = actor.name;
    updated.verifiedAt = new Date().toISOString();
  }

  pharmOrderStore.set(id, updated);
  return updated;
}

/** Override a clinical check with reason */
export function overrideClinicalCheck(
  orderId: string,
  checkType: ClinicalCheckType,
  reason: string,
  overriddenBy: string
): PharmOrder | { error: string } {
  const order = pharmOrderStore.get(orderId);
  if (!order) return { error: 'Order not found' };

  const checks = order.clinicalChecks.map((c) => {
    if (c.type === checkType && !c.overrideReason) {
      return {
        ...c,
        overrideReason: reason,
        overriddenBy,
        overriddenAt: new Date().toISOString(),
      };
    }
    return c;
  });

  const updated: PharmOrder = {
    ...order,
    clinicalChecks: checks,
    updatedAt: new Date().toISOString(),
  };
  pharmOrderStore.set(orderId, updated);
  return updated;
}

// --- Dispensing Events --------------------------------------

export function createDispenseEvent(
  tenantId: string,
  input: Omit<DispenseEvent, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): DispenseEvent {
  if (dispenseEventStore.size >= MAX_ITEMS) {
    const first = dispenseEventStore.keys().next().value;
    if (first) dispenseEventStore.delete(first);
  }
  const now = new Date().toISOString();
  const event: DispenseEvent = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  dispenseEventStore.set(event.id, event);
  return event;
}

export function listDispenseEvents(tenantId: string, pharmOrderId?: string): DispenseEvent[] {
  return Array.from(dispenseEventStore.values()).filter((e) => {
    if (e.tenantId !== tenantId) return false;
    if (pharmOrderId && e.pharmOrderId !== pharmOrderId) return false;
    return true;
  });
}

export function updateDispenseStatus(
  id: string,
  status: DispenseStatus,
  patch?: Partial<
    Pick<
      DispenseEvent,
      'dispensedByDuz' | 'dispensedByName' | 'checkedByDuz' | 'checkedByName' | 'deliveryLocation'
    >
  >
): DispenseEvent | undefined {
  const existing = dispenseEventStore.get(id);
  if (!existing) return undefined;
  const updated: DispenseEvent = {
    ...existing,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
  dispenseEventStore.set(id, updated);
  return updated;
}

// --- Administration Records ---------------------------------

export function createAdminRecord(
  tenantId: string,
  input: Omit<AdminRecord, 'id' | 'tenantId' | 'createdAt'>
): AdminRecord {
  if (adminRecordStore.size >= MAX_ITEMS) {
    const first = adminRecordStore.keys().next().value;
    if (first) adminRecordStore.delete(first);
  }
  const record: AdminRecord = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: new Date().toISOString(),
  };
  adminRecordStore.set(record.id, record);
  return record;
}

export function listAdminRecords(
  tenantId: string,
  patientDfn?: string,
  pharmOrderId?: string
): AdminRecord[] {
  return Array.from(adminRecordStore.values()).filter((r) => {
    if (r.tenantId !== tenantId) return false;
    if (patientDfn && r.patientDfn !== patientDfn) return false;
    if (pharmOrderId && r.pharmOrderId !== pharmOrderId) return false;
    return true;
  });
}

// --- Clinical Checks (Heuristic) ----------------------------

function isHighAlert(drugClass: string | null): boolean {
  if (!drugClass) return false;
  return HIGH_ALERT_CLASSES.has(drugClass.toLowerCase());
}

function runClinicalChecks(
  drugName: string,
  drugClass: string | null,
  dose: string
): ClinicalCheckResult[] {
  const checks: ClinicalCheckResult[] = [];

  // High-alert flag
  if (isHighAlert(drugClass)) {
    checks.push({
      type: 'high_alert',
      severity: 'critical',
      message: `${drugName} is on the ISMP high-alert medication list. Independent double-check required.`,
      overrideReason: null,
      overriddenBy: null,
      overriddenAt: null,
    });
  }

  // Dose range heuristic (placeholder -- real implementation needs drug-specific ranges)
  const numericDose = parseFloat(dose);
  if (!isNaN(numericDose) && numericDose > 1000) {
    checks.push({
      type: 'dose_range',
      severity: 'warning',
      message: `Dose ${dose} exceeds typical range. Verify dose and units.`,
      overrideReason: null,
      overriddenBy: null,
      overriddenAt: null,
    });
  }

  return checks;
}

// --- Dashboard Stats ----------------------------------------

export function getPharmacyDashboardStats(tenantId: string): PharmacyDashboardStats {
  const orders = listPharmOrders(tenantId);
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;

  return {
    pendingVerification: orders.filter((o) => o.status === 'pharmacist_review').length,
    pendingDispensing: orders.filter((o) => o.status === 'dispensing').length,
    readyForAdmin: orders.filter((o) => o.status === 'ready_for_admin').length,
    administered24h: orders.filter(
      (o) => o.status === 'administered' && now - new Date(o.updatedAt).getTime() < h24
    ).length,
    discontinued24h: orders.filter(
      (o) => o.status === 'discontinued' && now - new Date(o.updatedAt).getTime() < h24
    ).length,
    highAlertOrders: orders.filter((o) => o.requiresStepUp).length,
    clinicalChecksOverridden: orders.reduce(
      (acc, o) => acc + o.clinicalChecks.filter((c) => c.overrideReason).length,
      0
    ),
  };
}

// --- Writeback Posture --------------------------------------

export function getPharmWritebackPosture(): PharmWritebackPosture {
  return {
    orderPlace: {
      rpc: 'ORWDX SAVE',
      status: 'available',
      note: 'Order placement via writeback executor (Phase 303). Requires ORWDX LOCK/UNLOCK bracket.',
    },
    orderDc: {
      rpc: 'ORWDXA DC',
      status: 'available',
      note: 'Order discontinue via writeback executor (Phase 303). Requires ORWDX LOCK/UNLOCK bracket.',
    },
    medAdmin: {
      rpc: 'PSB MED LOG',
      status: 'integration_pending',
      note: 'PSB package not in WorldVistA Docker sandbox. Administration recording requires PSB BCMA infrastructure.',
    },
    dispense: {
      rpc: 'PSO FILL',
      status: 'integration_pending',
      note: 'Outpatient dispensing via PSO package. Unit dose dispensing via File 53.461. Neither available in sandbox.',
    },
    barcodeVerify: {
      rpc: 'PSJBCMA',
      status: 'integration_pending',
      note: 'Barcode-to-medication lookup requires PSJ/PSB packages. Use Wave 21 BCMA scaffold for staging.',
    },
  };
}

// --- Reset (testing) ----------------------------------------

export function _resetPharmacyStores(): void {
  pharmOrderStore.clear();
  dispenseEventStore.clear();
  adminRecordStore.clear();
}
