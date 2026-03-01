/**
 * Phase 391 (W22-P3): Inpatient Core — Bedboard + Flowsheet + Vitals Store
 *
 * In-memory stores for:
 *   - Bed assignments (bedboard)
 *   - ADT events (movement log)
 *   - Nursing flowsheet rows
 *   - Vitals entries
 *   - Writeback posture cache
 *
 * All stores are tenant-scoped. Reset on API restart (standard pattern).
 * Migration target: PG tables (future phase).
 */

import { randomUUID } from "node:crypto";
import type {
  BedAssignment,
  BedStatus,
  AdtEvent,
  AdtEventType,
  FlowsheetRow,
  VitalsEntry,
  VitalSign,
  WritebackPosture,
} from "./types.js";

// ─── Constants ──────────────────────────────────────────────

const MAX_ITEMS = 10_000;

// ─── Stores ─────────────────────────────────────────────────

const bedAssignmentStore = new Map<string, BedAssignment>();
const adtEventStore: AdtEvent[] = [];
const flowsheetRowStore = new Map<string, FlowsheetRow>();
const vitalsEntryStore = new Map<string, VitalsEntry>();

// ─── Bed Assignments (Bedboard) ─────────────────────────────

export function createBedAssignment(
  tenantId: string,
  input: Omit<BedAssignment, "id" | "tenantId" | "updatedAt">,
): BedAssignment {
  if (bedAssignmentStore.size >= MAX_ITEMS) {
    // evict oldest (FIFO)
    const first = bedAssignmentStore.keys().next().value;
    if (first) bedAssignmentStore.delete(first);
  }
  const bed: BedAssignment = {
    id: randomUUID(),
    tenantId,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  bedAssignmentStore.set(bed.id, bed);
  return bed;
}

export function getBedAssignment(id: string): BedAssignment | undefined {
  return bedAssignmentStore.get(id);
}

export function listBedAssignments(tenantId: string, locationId?: string): BedAssignment[] {
  return Array.from(bedAssignmentStore.values()).filter((b) => {
    if (b.tenantId !== tenantId) return false;
    if (locationId && b.locationId !== locationId) return false;
    return true;
  });
}

export function updateBedAssignment(
  id: string,
  patch: Partial<Pick<BedAssignment, "status" | "patientDfn" | "patientName" | "admittingProviderDuz" | "admitDateTime" | "dischargeDateTime" | "precautions" | "acuity" | "wardName" | "roomNumber">>,
): BedAssignment | undefined {
  const existing = bedAssignmentStore.get(id);
  if (!existing) return undefined;
  const updated: BedAssignment = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  bedAssignmentStore.set(id, updated);
  return updated;
}

/** Assign patient to bed */
export function assignPatientToBed(
  bedId: string,
  patientDfn: string,
  patientName: string,
  providerDuz: string,
): BedAssignment | undefined {
  return updateBedAssignment(bedId, {
    patientDfn,
    patientName,
    admittingProviderDuz: providerDuz,
    admitDateTime: new Date().toISOString(),
    status: "occupied" as const,
  });
}

/** Discharge patient from bed */
export function dischargePatientFromBed(bedId: string): BedAssignment | undefined {
  return updateBedAssignment(bedId, {
    patientDfn: null,
    patientName: null,
    admittingProviderDuz: null,
    dischargeDateTime: new Date().toISOString(),
    status: "cleaning" as const,
  });
}

// ─── ADT Events ─────────────────────────────────────────────

export function recordAdtEvent(
  tenantId: string,
  input: Omit<AdtEvent, "id" | "tenantId" | "createdAt">,
): AdtEvent {
  if (adtEventStore.length >= MAX_ITEMS) {
    adtEventStore.shift();
  }
  const event: AdtEvent = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: new Date().toISOString(),
  };
  adtEventStore.push(event);
  return event;
}

export function listAdtEvents(tenantId: string, patientDfn?: string): AdtEvent[] {
  return adtEventStore.filter((e) => {
    if (e.tenantId !== tenantId) return false;
    if (patientDfn && e.patientDfn !== patientDfn) return false;
    return true;
  });
}

// ─── Nursing Flowsheet Rows ─────────────────────────────────

export function createFlowsheetRow(
  tenantId: string,
  input: Omit<FlowsheetRow, "id" | "tenantId">,
): FlowsheetRow {
  if (flowsheetRowStore.size >= MAX_ITEMS) {
    const first = flowsheetRowStore.keys().next().value;
    if (first) flowsheetRowStore.delete(first);
  }
  const row: FlowsheetRow = {
    id: randomUUID(),
    tenantId,
    ...input,
  };
  flowsheetRowStore.set(row.id, row);
  return row;
}

export function listFlowsheetRows(
  tenantId: string,
  patientDfn: string,
  flowsheetId?: string,
): FlowsheetRow[] {
  return Array.from(flowsheetRowStore.values()).filter((r) => {
    if (r.tenantId !== tenantId) return false;
    if (r.patientDfn !== patientDfn) return false;
    if (flowsheetId && r.flowsheetId !== flowsheetId) return false;
    return true;
  });
}

// ─── Vitals Entries ─────────────────────────────────────────

export function createVitalsEntry(
  tenantId: string,
  input: Omit<VitalsEntry, "id" | "tenantId">,
): VitalsEntry {
  if (vitalsEntryStore.size >= MAX_ITEMS) {
    const first = vitalsEntryStore.keys().next().value;
    if (first) vitalsEntryStore.delete(first);
  }
  const entry: VitalsEntry = {
    id: randomUUID(),
    tenantId,
    ...input,
  };
  vitalsEntryStore.set(entry.id, entry);
  return entry;
}

export function getVitalsEntry(id: string): VitalsEntry | undefined {
  return vitalsEntryStore.get(id);
}

export function listVitalsEntries(
  tenantId: string,
  patientDfn: string,
): VitalsEntry[] {
  return Array.from(vitalsEntryStore.values())
    .filter((v) => v.tenantId === tenantId && v.patientDfn === patientDfn)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function updateVitalsWriteback(
  id: string,
  writebackStatus: VitalsEntry["writebackStatus"],
  vistaVitalsIen: string | null,
  writebackError: string | null,
): VitalsEntry | undefined {
  const existing = vitalsEntryStore.get(id);
  if (!existing) return undefined;
  const updated: VitalsEntry = {
    ...existing,
    writebackStatus,
    vistaVitalsIen,
    writebackError,
  };
  vitalsEntryStore.set(id, updated);
  return updated;
}

// ─── Writeback Posture ──────────────────────────────────────

export function getWritebackPosture(): WritebackPosture {
  return {
    vitals: {
      rpc: "GMV ADD VM",
      status: "integration_pending",
      sandboxNote: "GMV ADD VM is registered and callable in WorldVistA Docker. Wire-up requires exact MUMPS date/time format and vital-type IENs from GMRD(120.51).",
    },
    nursingNote: {
      rpc: "TIU CREATE RECORD",
      status: "integration_pending",
      sandboxNote: "TIU CREATE RECORD available. Requires valid TIU document class IEN, visit IEN, and text body. Notes remain unsigned until TIU SIGN RECORD is called.",
    },
    adtMovement: {
      rpc: "DGPM ADT MOVEMENTS",
      status: "integration_pending",
      sandboxNote: "DGPM movement RPCs exist in sandbox but require valid ward IENs, bed IENs, and treating specialty. Admission, transfer, discharge all use DGPM subsystem.",
    },
  };
}

// ─── Bedboard Summary Stats ─────────────────────────────────

export interface BedboardSummary {
  totalBeds: number;
  occupied: number;
  available: number;
  cleaning: number;
  blocked: number;
  reserved: number;
  occupancyRate: number;
}

export function getBedboardSummary(tenantId: string): BedboardSummary {
  const beds = listBedAssignments(tenantId);
  const total = beds.length;
  const statusCount = (s: BedStatus) => beds.filter((b) => b.status === s).length;
  const occupied = statusCount("occupied");
  return {
    totalBeds: total,
    occupied,
    available: statusCount("available"),
    cleaning: statusCount("cleaning"),
    blocked: statusCount("blocked"),
    reserved: statusCount("reserved"),
    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) / 100 : 0,
  };
}

// ─── Reset (testing) ────────────────────────────────────────

export function _resetInpatientStores(): void {
  bedAssignmentStore.clear();
  adtEventStore.length = 0;
  flowsheetRowStore.clear();
  vitalsEntryStore.clear();
}
