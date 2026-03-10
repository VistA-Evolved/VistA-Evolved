/**
 * apps/api/src/service-lines/icu/icu-store.ts
 *
 * Phase 468 (W31-P5). In-memory ICU admission, flowsheet, and device store.
 *
 * Phase 525 (W38): PG write-through -- fire-and-forget durability.
 */

import { randomBytes } from 'crypto';
import { log } from '../../lib/logger.js';
import type {
  IcuAdmission,
  IcuAdmissionStatus,
  IcuBed,
  FlowsheetEntry,
  FlowsheetCategory,
  VentSettings,
  IoRecord,
  IoType,
  SeverityScore,
  SeverityScoreType,
  IcuMetrics,
} from './types.js';

// -- PG Write-Through (Phase 525 / W38) ----------------------------

interface IcuDbRepo {
  insertIcuAdmission(data: any): Promise<any>;
  updateIcuAdmission(id: string, patch: any): Promise<any>;
  insertIcuFlowsheetEntry(data: any): Promise<any>;
  insertIcuVentRecord(data: any): Promise<any>;
  insertIcuIoRecord(data: any): Promise<any>;
  insertIcuScore(data: any): Promise<any>;
}

let dbRepo: IcuDbRepo | null = null;

export function initIcuStoreRepo(repo: IcuDbRepo): void {
  dbRepo = repo;
}

function dbWarn(op: string, err: any): void {
  if (process.env.NODE_ENV !== 'test') {
    log.warn(`[icu-store] DB ${op} failed (cache-only fallback)`, { err: err?.message ?? err });
  }
}

// -- Stores ---------------------------------------------------------

const admissions = new Map<string, IcuAdmission>();
const beds = new Map<string, IcuBed>();
const flowsheetEntries = new Map<string, FlowsheetEntry>();
const ventRecords = new Map<string, VentSettings>();
const ioRecords = new Map<string, IoRecord>();
const scores = new Map<string, SeverityScore>();

// -- Seed default beds ----------------------------------------------

function seedBeds() {
  const units = [
    { unit: 'MICU', prefix: 'M', count: 8, monitors: ['cardiac', 'hemodynamic'] },
    { unit: 'SICU', prefix: 'S', count: 8, monitors: ['cardiac', 'hemodynamic'] },
    { unit: 'CCU', prefix: 'C', count: 6, monitors: ['cardiac', 'hemodynamic', 'iabp'] },
    { unit: 'NICU', prefix: 'N', count: 6, monitors: ['cardiac', 'neuro'] },
  ];
  for (const u of units) {
    for (let i = 1; i <= u.count; i++) {
      const id = `${u.prefix}${i}`;
      beds.set(id, {
        id,
        unit: u.unit,
        bedNumber: `${u.prefix}-${i}`,
        status: 'available',
        monitors: u.monitors,
      });
    }
  }
}
seedBeds();

// -- Bed ------------------------------------------------------------

export function listBeds(unit?: string): IcuBed[] {
  let list = Array.from(beds.values());
  if (unit) list = list.filter((b) => b.unit === unit);
  return list;
}

// -- Admission CRUD -------------------------------------------------

export function createAdmission(data: {
  patientDfn: string;
  bedId: string;
  admitSource: IcuAdmission['admitSource'];
  attendingProvider: string;
  diagnosis: string;
  codeStatus?: IcuAdmission['codeStatus'];
}): IcuAdmission | null {
  const bed = beds.get(data.bedId);
  if (!bed || bed.status !== 'available') return null;

  const id = `icu-${randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const admission: IcuAdmission = {
    id,
    patientDfn: data.patientDfn,
    bedId: data.bedId,
    unit: bed.unit,
    status: 'active',
    admitTime: now,
    admitSource: data.admitSource,
    attendingProvider: data.attendingProvider,
    diagnosis: data.diagnosis,
    codeStatus: data.codeStatus || 'full',
    createdAt: now,
    updatedAt: now,
  };
  admissions.set(id, admission);
  bed.status = 'occupied';
  bed.currentAdmissionId = id;

  if (dbRepo) {
    dbRepo
      .insertIcuAdmission({
        id,
        tenantId: 'default',
        patientDfn: data.patientDfn,
        bedId: data.bedId,
        unit: bed.unit,
        status: 'active',
        admitTime: now,
        admitSource: data.admitSource,
        attendingProvider: data.attendingProvider,
        diagnosis: data.diagnosis,
        codeStatus: data.codeStatus || 'full',
      })
      .catch((e: unknown) => dbWarn('insertIcuAdmission', e));
  }

  return admission;
}

export function getAdmission(id: string): IcuAdmission | undefined {
  return admissions.get(id);
}

export function listAdmissions(opts?: {
  unit?: string;
  status?: IcuAdmissionStatus;
}): IcuAdmission[] {
  let list = Array.from(admissions.values());
  if (opts?.unit) list = list.filter((a) => a.unit === opts.unit);
  if (opts?.status) list = list.filter((a) => a.status === opts.status);
  return list.sort((a, b) => new Date(b.admitTime).getTime() - new Date(a.admitTime).getTime());
}

export function dischargeAdmission(id: string, disposition: string): boolean {
  const adm = admissions.get(id);
  if (!adm || adm.status !== 'active') return false;
  adm.status = 'discharged';
  adm.dischargeTime = new Date().toISOString();
  adm.dischargeDisposition = disposition;
  adm.updatedAt = adm.dischargeTime;
  const bed = beds.get(adm.bedId);
  if (bed) {
    bed.status = 'cleaning';
    bed.currentAdmissionId = undefined;
  }

  if (dbRepo) {
    dbRepo
      .updateIcuAdmission(id, {
        status: 'discharged',
        dischargeTime: adm.dischargeTime,
        dischargeDisposition: disposition,
      })
      .catch((e: unknown) => dbWarn('updateIcuAdmission/discharge', e));
  }

  return true;
}

// -- Flowsheet ------------------------------------------------------

export function addFlowsheetEntry(data: {
  admissionId: string;
  category: FlowsheetCategory;
  values: Record<string, string | number | boolean>;
  recordedBy: string;
}): FlowsheetEntry | null {
  if (!admissions.has(data.admissionId)) return null;
  const id = `fs-${randomBytes(6).toString('hex')}`;
  const entry: FlowsheetEntry = {
    id,
    admissionId: data.admissionId,
    category: data.category,
    timestamp: new Date().toISOString(),
    recordedBy: data.recordedBy,
    values: data.values,
    validated: false,
  };
  flowsheetEntries.set(id, entry);

  if (dbRepo) {
    dbRepo
      .insertIcuFlowsheetEntry({
        id,
        tenantId: 'default',
        admissionId: data.admissionId,
        category: data.category,
        timestamp: entry.timestamp,
        recordedBy: data.recordedBy,
        valuesJson: data.values,
        validated: false,
      })
      .catch((e: unknown) => dbWarn('insertIcuFlowsheetEntry', e));
  }

  return entry;
}

export function getFlowsheet(admissionId: string, category?: FlowsheetCategory): FlowsheetEntry[] {
  let list = Array.from(flowsheetEntries.values()).filter((e) => e.admissionId === admissionId);
  if (category) list = list.filter((e) => e.category === category);
  return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// -- Ventilator -----------------------------------------------------

export function addVentSettings(data: Omit<VentSettings, 'id'>): VentSettings | null {
  if (!admissions.has(data.admissionId)) return null;
  const id = `vent-${randomBytes(6).toString('hex')}`;
  const vs: VentSettings = { id, ...data };
  ventRecords.set(id, vs);

  if (dbRepo) {
    dbRepo
      .insertIcuVentRecord({
        id,
        tenantId: 'default',
        admissionId: data.admissionId,
        mode: data.mode,
        timestamp: data.timestamp,
        tidalVolume: data.tidalVolume,
        respiratoryRate: data.respiratoryRate,
        fio2: data.fio2,
        peep: data.peep,
        pip: data.pip ?? null,
        plateau: data.plateau ?? null,
        compliance: data.compliance ?? null,
      })
      .catch((e: unknown) => dbWarn('insertIcuVentRecord', e));
  }

  return vs;
}

export function getVentHistory(admissionId: string): VentSettings[] {
  return Array.from(ventRecords.values())
    .filter((v) => v.admissionId === admissionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// -- Intake & Output ------------------------------------------------

export function addIoRecord(data: Omit<IoRecord, 'id'>): IoRecord | null {
  if (!admissions.has(data.admissionId)) return null;
  const id = `io-${randomBytes(6).toString('hex')}`;
  const rec: IoRecord = { id, ...data };
  ioRecords.set(id, rec);

  if (dbRepo) {
    dbRepo
      .insertIcuIoRecord({
        id,
        tenantId: 'default',
        admissionId: data.admissionId,
        type: data.type,
        source: data.source,
        timestamp: data.timestamp,
        volumeMl: data.volumeMl,
        description: data.description ?? null,
        recordedBy: data.recordedBy,
      })
      .catch((e: unknown) => dbWarn('insertIcuIoRecord', e));
  }

  return rec;
}

export function getIoRecords(admissionId: string, type?: IoType): IoRecord[] {
  let list = Array.from(ioRecords.values()).filter((r) => r.admissionId === admissionId);
  if (type) list = list.filter((r) => r.type === type);
  return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getIoBalance(admissionId: string): { intake: number; output: number; net: number } {
  const records = Array.from(ioRecords.values()).filter((r) => r.admissionId === admissionId);
  const intake = records.filter((r) => r.type === 'intake').reduce((s, r) => s + r.volumeMl, 0);
  const output = records.filter((r) => r.type === 'output').reduce((s, r) => s + r.volumeMl, 0);
  return { intake, output, net: intake - output };
}

// -- Severity Scores ------------------------------------------------

export function addScore(data: Omit<SeverityScore, 'id'>): SeverityScore | null {
  if (!admissions.has(data.admissionId)) return null;
  const id = `sc-${randomBytes(6).toString('hex')}`;
  const sc: SeverityScore = { id, ...data };
  scores.set(id, sc);

  if (dbRepo) {
    dbRepo
      .insertIcuScore({
        id,
        tenantId: 'default',
        admissionId: data.admissionId,
        scoreType: data.scoreType,
        score: data.score,
        timestamp: data.timestamp,
        calculatedBy: data.calculatedBy,
        componentsJson: data.components ?? null,
      })
      .catch((e: unknown) => dbWarn('insertIcuScore', e));
  }

  return sc;
}

export function getScores(admissionId: string, scoreType?: SeverityScoreType): SeverityScore[] {
  let list = Array.from(scores.values()).filter((s) => s.admissionId === admissionId);
  if (scoreType) list = list.filter((s) => s.scoreType === scoreType);
  return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// -- ICU Metrics ----------------------------------------------------

export function getIcuMetrics(): IcuMetrics {
  const allBeds = Array.from(beds.values());
  const occupied = allBeds.filter((b) => b.status === 'occupied').length;
  const active = Array.from(admissions.values()).filter((a) => a.status === 'active');

  const ventilated = active.filter((a) => {
    const vents = getVentHistory(a.id);
    return vents.length > 0;
  }).length;

  // Average LOS for discharged patients
  const discharged = Array.from(admissions.values()).filter((a) => a.dischargeTime);
  const avgLos =
    discharged.length > 0
      ? discharged.reduce((s, a) => {
          const admit = new Date(a.admitTime).getTime();
          const dc = new Date(a.dischargeTime!).getTime();
          return s + (dc - admit) / 3600000;
        }, 0) / discharged.length
      : 0;

  const byUnit: Record<string, { total: number; occupied: number }> = {};
  for (const b of allBeds) {
    if (!byUnit[b.unit]) byUnit[b.unit] = { total: 0, occupied: 0 };
    byUnit[b.unit].total++;
    if (b.status === 'occupied') byUnit[b.unit].occupied++;
  }

  const byCodeStatus: Record<string, number> = {};
  for (const a of active) {
    byCodeStatus[a.codeStatus] = (byCodeStatus[a.codeStatus] || 0) + 1;
  }

  return {
    totalBeds: allBeds.length,
    occupiedBeds: occupied,
    occupancyPct: allBeds.length > 0 ? Math.round((occupied / allBeds.length) * 100) : 0,
    activeAdmissions: active.length,
    ventilatedCount: ventilated,
    avgLosHours: Math.round(avgLos * 10) / 10,
    byUnit,
    byCodeStatus,
  };
}
