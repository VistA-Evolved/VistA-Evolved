/**
 * Phase 391 (W22-P3): Inpatient Core -- Bedboard + Flowsheet + Vitals Store
 *
 * In-memory stores with PG write-through for:
 *   - Bed assignments (bedboard)
 *   - ADT events (movement log)
 *   - Nursing flowsheet rows
 *   - Vitals entries
 *   - Writeback posture cache
 *
 * All stores are tenant-scoped. In-memory Maps serve as hot cache;
 * PG is the durable backing store (Phase 577 write-through).
 */

import { randomUUID } from 'node:crypto';
import type {
  BedAssignment,
  BedStatus,
  AdtEvent,
  FlowsheetRow,
  VitalsEntry,
  WritebackPosture,
} from './types.js';
import { log } from '../lib/logger.js';

// --- Constants ----------------------------------------------

const MAX_ITEMS = 10_000;

// --- PG write-through repos (Phase 577) ---------------------

interface InpatientRepos {
  bedAssignment: { insert(data: any): Promise<any>; update(id: string, updates: any): Promise<any>; findByTenant(tenantId: string, opts?: any): Promise<any[]> };
  adtEvent: { insert(data: any): Promise<any>; findByTenant(tenantId: string, opts?: any): Promise<any[]> };
  flowsheetRow: { insert(data: any): Promise<any>; findByTenant(tenantId: string, opts?: any): Promise<any[]> };
  vitalsEntry: { insert(data: any): Promise<any>; update(id: string, updates: any): Promise<any>; findByTenant(tenantId: string, opts?: any): Promise<any[]> };
}

let _repos: InpatientRepos | null = null;

function dbWarn(op: string, err: unknown): void {
  log.warn(`inpatient-store DB ${op} failed`, { error: String(err) });
}

function pgWrite(op: string, fn: () => Promise<any>): void {
  fn().catch((e) => dbWarn(op, e));
}

/** Wire PG repos for write-through. Called from index.ts after initPlatformDb(). */
export function initInpatientRepos(repos: InpatientRepos): void {
  _repos = repos;
}

/** Rehydrate all in-memory stores from PG on startup. */
export async function rehydrateInpatientStores(tenantId: string): Promise<void> {
  if (!_repos) return;
  try {
    const beds = await _repos.bedAssignment.findByTenant(tenantId, { limit: MAX_ITEMS });
    for (const row of beds) {
      bedAssignmentStore.set(row.id, pgRowToBed(row));
    }
    const events = await _repos.adtEvent.findByTenant(tenantId, { limit: MAX_ITEMS });
    for (const row of events) {
      adtEventStore.push(pgRowToAdtEvent(row));
    }
    const fRows = await _repos.flowsheetRow.findByTenant(tenantId, { limit: MAX_ITEMS });
    for (const row of fRows) {
      flowsheetRowStore.set(row.id, pgRowToFlowsheet(row));
    }
    const vitals = await _repos.vitalsEntry.findByTenant(tenantId, { limit: MAX_ITEMS });
    for (const row of vitals) {
      vitalsEntryStore.set(row.id, pgRowToVitals(row));
    }
    const total = beds.length + events.length + fRows.length + vitals.length;
    if (total > 0) {
      log.info(`Inpatient stores rehydrated ${total} items from PG`, { tenantId });
    }
  } catch (err) {
    dbWarn('rehydrate', err);
  }
}

function pgRowToBed(row: any): BedAssignment {
  return {
    id: row.id,
    tenantId: row.tenantId,
    locationId: row.locationId,
    bedLabel: row.bedLabel,
    status: row.status as BedStatus,
    patientDfn: row.patientDfn ?? null,
    patientName: row.patientName ?? null,
    admittingProviderDuz: row.admittingProviderDuz ?? null,
    wardName: row.wardName ?? '',
    roomNumber: row.roomNumber ?? '',
    admitDateTime: row.admitDateTime ?? null,
    dischargeDateTime: row.dischargeDateTime ?? null,
    precautions: typeof row.precautions === 'string' ? JSON.parse(row.precautions) : (row.precautions ?? []),
    acuity: row.acuity ?? null,
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

function pgRowToAdtEvent(row: any): AdtEvent {
  return {
    id: row.id,
    tenantId: row.tenantId,
    patientDfn: row.patientDfn,
    eventType: row.eventType,
    fromLocationId: row.fromLocationId ?? null,
    toLocationId: row.toLocationId ?? null,
    fromBedLabel: row.fromBedLabel ?? null,
    toBedLabel: row.toBedLabel ?? null,
    providerDuz: row.providerDuz,
    reason: row.reason ?? '',
    vistaMovementIen: row.vistaMovementIen ?? null,
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function pgRowToFlowsheet(row: any): FlowsheetRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    patientDfn: row.patientDfn,
    flowsheetId: row.flowsheetId,
    values: typeof row.valuesJson === 'string' ? JSON.parse(row.valuesJson) : (row.valuesJson ?? {}),
    flags: typeof row.flagsJson === 'string' ? JSON.parse(row.flagsJson) : (row.flagsJson ?? {}),
    recordedBy: row.recordedBy,
    recordedAt: row.recordedAt,
    source: row.source ?? 'manual',
    deviceObservationId: row.deviceObservationId ?? null,
  };
}

function pgRowToVitals(row: any): VitalsEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    patientDfn: row.patientDfn,
    vitals: typeof row.vitalsJson === 'string' ? JSON.parse(row.vitalsJson) : (row.vitalsJson ?? {}),
    units: typeof row.unitsJson === 'string' ? JSON.parse(row.unitsJson) : (row.unitsJson ?? {}),
    recordedBy: row.recordedBy,
    recordedAt: row.recordedAt,
    source: row.source ?? 'manual',
    writebackStatus: row.writebackStatus ?? 'not_attempted',
    vistaVitalsIen: row.vistaVitalsIen ?? null,
    writebackError: row.writebackError ?? null,
  };
}

// --- Stores -------------------------------------------------

const bedAssignmentStore = new Map<string, BedAssignment>();
const adtEventStore: AdtEvent[] = [];
const flowsheetRowStore = new Map<string, FlowsheetRow>();
const vitalsEntryStore = new Map<string, VitalsEntry>();

// --- Bed Assignments (Bedboard) -----------------------------

export function createBedAssignment(
  tenantId: string,
  input: Omit<BedAssignment, 'id' | 'tenantId' | 'updatedAt'>
): BedAssignment {
  if (bedAssignmentStore.size >= MAX_ITEMS) {
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
  if (_repos) {
    pgWrite('bed.insert', () => _repos!.bedAssignment.insert({
      id: bed.id,
      tenantId: bed.tenantId,
      locationId: bed.locationId,
      bedLabel: bed.bedLabel,
      status: bed.status,
      patientDfn: bed.patientDfn,
      patientName: bed.patientName,
      admittingProviderDuz: bed.admittingProviderDuz,
      wardName: bed.wardName,
      roomNumber: bed.roomNumber,
      admitDateTime: bed.admitDateTime,
      dischargeDateTime: bed.dischargeDateTime,
      precautions: JSON.stringify(bed.precautions),
      acuity: bed.acuity,
      updatedAt: bed.updatedAt,
    }));
  }
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
  patch: Partial<
    Pick<
      BedAssignment,
      | 'status'
      | 'patientDfn'
      | 'patientName'
      | 'admittingProviderDuz'
      | 'admitDateTime'
      | 'dischargeDateTime'
      | 'precautions'
      | 'acuity'
      | 'wardName'
      | 'roomNumber'
    >
  >
): BedAssignment | undefined {
  const existing = bedAssignmentStore.get(id);
  if (!existing) return undefined;
  const updated: BedAssignment = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  bedAssignmentStore.set(id, updated);
  if (_repos) {
    const pgPatch: Record<string, unknown> = { updatedAt: updated.updatedAt };
    if (patch.status !== undefined) pgPatch.status = patch.status;
    if (patch.patientDfn !== undefined) pgPatch.patientDfn = patch.patientDfn;
    if (patch.patientName !== undefined) pgPatch.patientName = patch.patientName;
    if (patch.admittingProviderDuz !== undefined) pgPatch.admittingProviderDuz = patch.admittingProviderDuz;
    if (patch.admitDateTime !== undefined) pgPatch.admitDateTime = patch.admitDateTime;
    if (patch.dischargeDateTime !== undefined) pgPatch.dischargeDateTime = patch.dischargeDateTime;
    if (patch.precautions !== undefined) pgPatch.precautions = JSON.stringify(patch.precautions);
    if (patch.acuity !== undefined) pgPatch.acuity = patch.acuity;
    if (patch.wardName !== undefined) pgPatch.wardName = patch.wardName;
    if (patch.roomNumber !== undefined) pgPatch.roomNumber = patch.roomNumber;
    pgWrite('bed.update', () => _repos!.bedAssignment.update(id, pgPatch));
  }
  return updated;
}

/** Assign patient to bed */
export function assignPatientToBed(
  bedId: string,
  patientDfn: string,
  patientName: string,
  providerDuz: string
): BedAssignment | undefined {
  return updateBedAssignment(bedId, {
    patientDfn,
    patientName,
    admittingProviderDuz: providerDuz,
    admitDateTime: new Date().toISOString(),
    status: 'occupied' as const,
  });
}

/** Discharge patient from bed */
export function dischargePatientFromBed(bedId: string): BedAssignment | undefined {
  return updateBedAssignment(bedId, {
    patientDfn: null,
    patientName: null,
    admittingProviderDuz: null,
    dischargeDateTime: new Date().toISOString(),
    status: 'cleaning' as const,
  });
}

// --- ADT Events ---------------------------------------------

export function recordAdtEvent(
  tenantId: string,
  input: Omit<AdtEvent, 'id' | 'tenantId' | 'createdAt'>
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
  if (_repos) {
    pgWrite('adt.insert', () => _repos!.adtEvent.insert({
      id: event.id,
      tenantId: event.tenantId,
      patientDfn: event.patientDfn,
      eventType: event.eventType,
      fromLocationId: event.fromLocationId,
      toLocationId: event.toLocationId,
      fromBedLabel: event.fromBedLabel,
      toBedLabel: event.toBedLabel,
      providerDuz: event.providerDuz,
      reason: event.reason,
      vistaMovementIen: event.vistaMovementIen,
    }));
  }
  return event;
}

export function listAdtEvents(tenantId: string, patientDfn?: string): AdtEvent[] {
  return adtEventStore.filter((e) => {
    if (e.tenantId !== tenantId) return false;
    if (patientDfn && e.patientDfn !== patientDfn) return false;
    return true;
  });
}

// --- Nursing Flowsheet Rows ---------------------------------

export function createFlowsheetRow(
  tenantId: string,
  input: Omit<FlowsheetRow, 'id' | 'tenantId'>
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
  if (_repos) {
    pgWrite('flowsheet.insert', () => _repos!.flowsheetRow.insert({
      id: row.id,
      tenantId: row.tenantId,
      patientDfn: row.patientDfn,
      flowsheetId: row.flowsheetId,
      valuesJson: JSON.stringify(row.values),
      flagsJson: JSON.stringify(row.flags),
      recordedBy: row.recordedBy,
      recordedAt: row.recordedAt,
      source: row.source,
      deviceObservationId: row.deviceObservationId,
    }));
  }
  return row;
}

export function listFlowsheetRows(
  tenantId: string,
  patientDfn: string,
  flowsheetId?: string
): FlowsheetRow[] {
  return Array.from(flowsheetRowStore.values()).filter((r) => {
    if (r.tenantId !== tenantId) return false;
    if (r.patientDfn !== patientDfn) return false;
    if (flowsheetId && r.flowsheetId !== flowsheetId) return false;
    return true;
  });
}

// --- Vitals Entries -----------------------------------------

export function createVitalsEntry(
  tenantId: string,
  input: Omit<VitalsEntry, 'id' | 'tenantId'>
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
  if (_repos) {
    pgWrite('vitals.insert', () => _repos!.vitalsEntry.insert({
      id: entry.id,
      tenantId: entry.tenantId,
      patientDfn: entry.patientDfn,
      vitalsJson: JSON.stringify(entry.vitals),
      unitsJson: JSON.stringify(entry.units),
      recordedBy: entry.recordedBy,
      recordedAt: entry.recordedAt,
      source: entry.source,
      writebackStatus: entry.writebackStatus,
      vistaVitalsIen: entry.vistaVitalsIen,
      writebackError: entry.writebackError,
    }));
  }
  return entry;
}

export function getVitalsEntry(id: string): VitalsEntry | undefined {
  return vitalsEntryStore.get(id);
}

export function listVitalsEntries(tenantId: string, patientDfn: string): VitalsEntry[] {
  return Array.from(vitalsEntryStore.values())
    .filter((v) => v.tenantId === tenantId && v.patientDfn === patientDfn)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function updateVitalsWriteback(
  id: string,
  writebackStatus: VitalsEntry['writebackStatus'],
  vistaVitalsIen: string | null,
  writebackError: string | null
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
  if (_repos) {
    pgWrite('vitals.update', () => _repos!.vitalsEntry.update(id, {
      writebackStatus,
      vistaVitalsIen,
      writebackError,
    }));
  }
  return updated;
}

// --- Writeback Posture --------------------------------------

export function getWritebackPosture(): WritebackPosture {
  return {
    vitals: {
      rpc: 'GMV ADD VM',
      status: 'integration_pending',
      sandboxNote:
        'GMV ADD VM is registered and callable in WorldVistA Docker. Wire-up requires exact MUMPS date/time format and vital-type IENs from GMRD(120.51).',
    },
    nursingNote: {
      rpc: 'TIU CREATE RECORD',
      status: 'integration_pending',
      sandboxNote:
        'TIU CREATE RECORD available. Requires valid TIU document class IEN, visit IEN, and text body. Notes remain unsigned until TIU SIGN RECORD is called.',
    },
    adtMovement: {
      rpc: 'DGPM ADT MOVEMENTS',
      status: 'integration_pending',
      sandboxNote:
        'DGPM movement RPCs exist in sandbox but require valid ward IENs, bed IENs, and treating specialty. Admission, transfer, discharge all use DGPM subsystem.',
    },
  };
}

// --- Bedboard Summary Stats ---------------------------------

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
  const occupied = statusCount('occupied');
  return {
    totalBeds: total,
    occupied,
    available: statusCount('available'),
    cleaning: statusCount('cleaning'),
    blocked: statusCount('blocked'),
    reserved: statusCount('reserved'),
    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) / 100 : 0,
  };
}

// --- Reset (testing) ----------------------------------------

export function _resetInpatientStores(): void {
  bedAssignmentStore.clear();
  adtEventStore.length = 0;
  flowsheetRowStore.clear();
  vitalsEntryStore.clear();
}
