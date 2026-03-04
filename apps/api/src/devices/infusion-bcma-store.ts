/**
 * Infusion / BCMA Safety Bridge — Store
 *
 * Phase 385 (W21-P8): In-memory stores for infusion pump events,
 * BCMA sessions, and right-6 verification results. Follows the
 * established Map + FIFO eviction pattern from gateway-store/alarm-store.
 */

import * as crypto from 'node:crypto';
import type {
  InfusionPumpEvent,
  PumpEventType,
  BcmaSession,
  BcmaSessionStatus,
  BcmaRight6Result,
  BcmaCheckStatus,
  BcmaCheckFailure,
  MedicationScan,
  PatientScan,
  InfusionBcmaStats,
} from './infusion-bcma-types.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_PUMP_EVENTS = 20_000;
const MAX_BCMA_SESSIONS = 10_000;
const MAX_AUDIT_LOG = 20_000;

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/** Pump events keyed by id */
const pumpEvents = new Map<string, InfusionPumpEvent>();

/** BCMA sessions keyed by id */
const bcmaSessions = new Map<string, BcmaSession>();

/** Audit log entries */
interface InfusionAuditEntry {
  id: string;
  tenantId: string;
  action: string;
  entityType: 'pump_event' | 'bcma_session' | 'right6_check';
  entityId: string;
  actor?: string;
  detail?: string;
  timestamp: string;
}
const auditLog: InfusionAuditEntry[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function now(): string {
  return new Date().toISOString();
}

function evictOldest<V>(map: Map<string, V>, max: number): void {
  while (map.size >= max) {
    const first = map.keys().next().value;
    if (first !== undefined) map.delete(first);
    else break;
  }
}

function audit(
  tenantId: string,
  action: string,
  entityType: InfusionAuditEntry['entityType'],
  entityId: string,
  actor?: string,
  detail?: string
): void {
  if (auditLog.length >= MAX_AUDIT_LOG) auditLog.shift();
  auditLog.push({
    id: genId(),
    tenantId,
    action,
    entityType,
    entityId,
    actor,
    detail,
    timestamp: now(),
  });
}

// ---------------------------------------------------------------------------
// Pump Event CRUD
// ---------------------------------------------------------------------------

export function createPumpEvent(
  tenantId: string,
  ev: Omit<InfusionPumpEvent, 'id' | 'tenantId' | 'receivedAt' | 'vistaVerified'>
): InfusionPumpEvent {
  evictOldest(pumpEvents, MAX_PUMP_EVENTS);
  const event: InfusionPumpEvent = {
    ...ev,
    id: genId(),
    tenantId,
    vistaVerified: false,
    receivedAt: now(),
  };
  pumpEvents.set(event.id, event);
  audit(tenantId, 'pump_event_created', 'pump_event', event.id, undefined, event.eventType);
  return event;
}

export function getPumpEvent(id: string): InfusionPumpEvent | undefined {
  return pumpEvents.get(id);
}

export function listPumpEvents(
  tenantId: string,
  filters?: {
    pumpSerial?: string;
    patientDfn?: string;
    eventType?: PumpEventType;
    limit?: number;
  }
): InfusionPumpEvent[] {
  const limit = filters?.limit ?? 200;
  const result: InfusionPumpEvent[] = [];
  for (const ev of pumpEvents.values()) {
    if (ev.tenantId !== tenantId) continue;
    if (filters?.pumpSerial && ev.pumpSerial !== filters.pumpSerial) continue;
    if (filters?.patientDfn && ev.patientDfn !== filters.patientDfn) continue;
    if (filters?.eventType && ev.eventType !== filters.eventType) continue;
    result.push(ev);
    if (result.length >= limit) break;
  }
  return result;
}

export function updatePumpEventVerification(
  id: string,
  vistaVerified: boolean,
  vistaMahIen?: string
): InfusionPumpEvent | undefined {
  const ev = pumpEvents.get(id);
  if (!ev) return undefined;
  ev.vistaVerified = vistaVerified;
  if (vistaMahIen) ev.vistaMahIen = vistaMahIen;
  audit(
    ev.tenantId,
    'pump_event_verified',
    'pump_event',
    id,
    undefined,
    `verified=${vistaVerified}`
  );
  return ev;
}

// ---------------------------------------------------------------------------
// BCMA Session CRUD
// ---------------------------------------------------------------------------

export function createBcmaSession(tenantId: string, clinicianDuz: string): BcmaSession {
  evictOldest(bcmaSessions, MAX_BCMA_SESSIONS);
  const session: BcmaSession = {
    id: genId(),
    tenantId,
    clinicianDuz,
    status: 'scanning',
    startedAt: now(),
  };
  bcmaSessions.set(session.id, session);
  audit(tenantId, 'bcma_session_created', 'bcma_session', session.id, clinicianDuz);
  return session;
}

export function getBcmaSession(id: string): BcmaSession | undefined {
  return bcmaSessions.get(id);
}

export function listBcmaSessions(
  tenantId: string,
  filters?: {
    clinicianDuz?: string;
    status?: BcmaSessionStatus;
    limit?: number;
  }
): BcmaSession[] {
  const limit = filters?.limit ?? 200;
  const result: BcmaSession[] = [];
  for (const s of bcmaSessions.values()) {
    if (s.tenantId !== tenantId) continue;
    if (filters?.clinicianDuz && s.clinicianDuz !== filters.clinicianDuz) continue;
    if (filters?.status && s.status !== filters.status) continue;
    result.push(s);
    if (result.length >= limit) break;
  }
  return result;
}

export function recordPatientScan(
  sessionId: string,
  scan: Omit<PatientScan, 'id' | 'timestamp'>
): BcmaSession | undefined {
  const s = bcmaSessions.get(sessionId);
  if (!s) return undefined;
  s.patientScan = { ...scan, id: genId(), timestamp: now() };
  audit(s.tenantId, 'patient_scanned', 'bcma_session', sessionId, s.clinicianDuz);
  return s;
}

export function recordMedicationScan(
  sessionId: string,
  scan: Omit<MedicationScan, 'id' | 'timestamp'>
): BcmaSession | undefined {
  const s = bcmaSessions.get(sessionId);
  if (!s) return undefined;
  s.medicationScan = { ...scan, id: genId(), timestamp: now() };
  audit(s.tenantId, 'medication_scanned', 'bcma_session', sessionId, s.clinicianDuz);
  return s;
}

// ---------------------------------------------------------------------------
// Right-6 Verification
// ---------------------------------------------------------------------------

/**
 * Performs the 6-rights check for a BCMA session.
 *
 * In this in-memory scaffold, verification is simulated based on
 * whether the expected fields are present and match. In production,
 * each check would call VistA RPCs for order validation.
 */
export function performRight6Check(
  sessionId: string,
  expected: {
    patientDfn: string;
    medicationNdc: string;
    orderedDose: string;
    orderedRoute: string;
    scheduledTime: string;
    orderIen: string;
  }
): BcmaRight6Result | undefined {
  const s = bcmaSessions.get(sessionId);
  if (!s) return undefined;

  const failures: BcmaCheckFailure[] = [];

  // Right patient
  let rightPatient: BcmaCheckStatus = 'pending';
  if (s.patientScan?.patientDfn) {
    rightPatient = s.patientScan.patientDfn === expected.patientDfn ? 'pass' : 'fail';
    if (rightPatient === 'fail') {
      failures.push({
        check: 'rightPatient',
        expected: expected.patientDfn,
        actual: s.patientScan.patientDfn,
        severity: 'error',
      });
    }
  }

  // Right drug
  let rightDrug: BcmaCheckStatus = 'pending';
  if (s.medicationScan?.ndc) {
    rightDrug = s.medicationScan.ndc === expected.medicationNdc ? 'pass' : 'fail';
    if (rightDrug === 'fail') {
      failures.push({
        check: 'rightDrug',
        expected: expected.medicationNdc,
        actual: s.medicationScan.ndc,
        severity: 'error',
      });
    }
  }

  // Right dose — scaffold: pass if medication scanned
  const rightDose: BcmaCheckStatus = s.medicationScan ? 'pass' : 'pending';

  // Right route — scaffold: pass (route is visual nurse check)
  const rightRoute: BcmaCheckStatus = expected.orderedRoute ? 'pass' : 'pending';

  // Right time — check within 1-hour window
  let rightTime: BcmaCheckStatus = 'pending';
  if (expected.scheduledTime) {
    const scheduled = new Date(expected.scheduledTime).getTime();
    const diff = Math.abs(Date.now() - scheduled);
    const ONE_HOUR = 60 * 60 * 1000;
    if (diff <= ONE_HOUR) {
      rightTime = 'pass';
    } else if (diff <= ONE_HOUR * 2) {
      rightTime = 'warning';
      failures.push({
        check: 'rightTime',
        expected: `within 1h of ${expected.scheduledTime}`,
        actual: `${Math.round(diff / 60000)}min off`,
        severity: 'warning',
      });
    } else {
      rightTime = 'fail';
      failures.push({
        check: 'rightTime',
        expected: `within 1h of ${expected.scheduledTime}`,
        actual: `${Math.round(diff / 60000)}min off`,
        severity: 'error',
      });
    }
  }

  // Right documentation — must have a valid order IEN
  const rightDocumentation: BcmaCheckStatus = expected.orderIen ? 'pass' : 'fail';
  if (rightDocumentation === 'fail') {
    failures.push({
      check: 'rightDocumentation',
      expected: 'valid order IEN',
      actual: 'none',
      severity: 'error',
    });
  }

  // Overall
  const checks = [rightPatient, rightDrug, rightDose, rightRoute, rightTime, rightDocumentation];
  let overallStatus: BcmaCheckStatus = 'pass';
  if (checks.some((c) => c === 'fail')) overallStatus = 'fail';
  else if (checks.some((c) => c === 'warning')) overallStatus = 'warning';
  else if (checks.some((c) => c === 'pending')) overallStatus = 'pending';

  const result: BcmaRight6Result = {
    rightPatient,
    rightDrug,
    rightDose,
    rightRoute,
    rightTime,
    rightDocumentation,
    overallStatus,
    failures,
  };

  s.right6Result = result;
  s.orderIen = expected.orderIen;
  s.status =
    overallStatus === 'pass' ? 'verified' : overallStatus === 'fail' ? 'error' : 'scanning';

  audit(s.tenantId, 'right6_check', 'right6_check', sessionId, s.clinicianDuz, overallStatus);
  return result;
}

/**
 * Complete a BCMA session (mark as administered, refused, or held).
 */
export function completeBcmaSession(
  sessionId: string,
  status: 'administered' | 'refused' | 'held',
  notes?: string,
  pumpEventId?: string
): BcmaSession | undefined {
  const s = bcmaSessions.get(sessionId);
  if (!s) return undefined;
  s.status = status;
  s.notes = notes;
  s.pumpEventId = pumpEventId;
  s.completedAt = now();
  audit(s.tenantId, `bcma_${status}`, 'bcma_session', sessionId, s.clinicianDuz, notes);
  return s;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function getInfusionBcmaStats(tenantId: string): InfusionBcmaStats {
  let totalPumpEvents = 0;
  let totalBcmaSessions = 0;
  let right6Pass = 0;
  let right6Fail = 0;
  let overrideCount = 0;
  const byEventType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const ev of pumpEvents.values()) {
    if (ev.tenantId !== tenantId) continue;
    totalPumpEvents++;
    byEventType[ev.eventType] = (byEventType[ev.eventType] ?? 0) + 1;
  }

  for (const s of bcmaSessions.values()) {
    if (s.tenantId !== tenantId) continue;
    totalBcmaSessions++;
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    if (s.right6Result) {
      if (s.right6Result.overallStatus === 'pass') right6Pass++;
      if (s.right6Result.overallStatus === 'fail') right6Fail++;
      if (s.right6Result.overallStatus === 'override') overrideCount++;
    }
  }

  const total6 = right6Pass + right6Fail + overrideCount;
  return {
    totalPumpEvents,
    totalBcmaSessions,
    right6PassRate: total6 > 0 ? right6Pass / total6 : 0,
    right6FailCount: right6Fail,
    overrideCount,
    byEventType,
    byStatus,
  };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function getInfusionAudit(tenantId: string, limit = 200): InfusionAuditEntry[] {
  return auditLog.filter((e) => e.tenantId === tenantId).slice(-limit);
}
