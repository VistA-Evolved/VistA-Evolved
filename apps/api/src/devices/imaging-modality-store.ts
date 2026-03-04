/**
 * Imaging Modality Connectivity — Store
 *
 * Phase 386 (W21-P9): In-memory stores for MWL items, MPPS records,
 * and modality AE configurations. Bridges to Orthanc for DICOM operations.
 */

import * as crypto from 'node:crypto';
import type {
  WorklistItem,
  WorklistItemStatus,
  MppsRecord,
  MppsStatus,
  ModalityAeConfig,
  ImagingModalityStats,
} from './imaging-modality-types.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_WORKLIST = 10_000;
const MAX_MPPS = 20_000;
const MAX_MODALITIES = 500;
const MAX_AUDIT = 20_000;

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

const worklistItems = new Map<string, WorklistItem>();
const mppsRecords = new Map<string, MppsRecord>();
const modalityConfigs = new Map<string, ModalityAeConfig>();

/** Audit */
interface ModalityAuditEntry {
  id: string;
  tenantId: string;
  action: string;
  entityType: 'worklist' | 'mpps' | 'modality';
  entityId: string;
  detail?: string;
  timestamp: string;
}
const auditLog: ModalityAuditEntry[] = [];

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
  entityType: ModalityAuditEntry['entityType'],
  entityId: string,
  detail?: string
): void {
  if (auditLog.length >= MAX_AUDIT) auditLog.shift();
  auditLog.push({ id: genId(), tenantId, action, entityType, entityId, detail, timestamp: now() });
}

/** Generate a DICOM UID (1.2.826.0.1.3680043.8.498.<random>) */
function generateDicomUid(): string {
  const suffix = crypto.randomBytes(8).readBigUInt64BE().toString();
  return `1.2.826.0.1.3680043.8.498.${suffix}`;
}

// ---------------------------------------------------------------------------
// Worklist CRUD
// ---------------------------------------------------------------------------

export function createWorklistItem(
  tenantId: string,
  item: Omit<
    WorklistItem,
    | 'id'
    | 'tenantId'
    | 'studyInstanceUid'
    | 'scheduledStepId'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  > & { studyInstanceUid?: string; scheduledStepId?: string }
): WorklistItem {
  evictOldest(worklistItems, MAX_WORKLIST);
  const wl: WorklistItem = {
    ...item,
    id: genId(),
    tenantId,
    studyInstanceUid: item.studyInstanceUid || generateDicomUid(),
    scheduledStepId: item.scheduledStepId || `SPS-${genId().slice(0, 8)}`,
    status: 'scheduled',
    createdAt: now(),
    updatedAt: now(),
  };
  worklistItems.set(wl.id, wl);
  audit(tenantId, 'worklist_created', 'worklist', wl.id, wl.accessionNumber);
  return wl;
}

export function getWorklistItem(id: string): WorklistItem | undefined {
  return worklistItems.get(id);
}

export function findWorklistByAccession(
  tenantId: string,
  accessionNumber: string
): WorklistItem | undefined {
  for (const w of worklistItems.values()) {
    if (w.tenantId === tenantId && w.accessionNumber === accessionNumber) return w;
  }
  return undefined;
}

export function listWorklistItems(
  tenantId: string,
  filters?: {
    modality?: string;
    status?: WorklistItemStatus;
    patientDfn?: string;
    scheduledAeTitle?: string;
    limit?: number;
  }
): WorklistItem[] {
  const limit = filters?.limit ?? 200;
  const result: WorklistItem[] = [];
  for (const w of worklistItems.values()) {
    if (w.tenantId !== tenantId) continue;
    if (filters?.modality && w.modality !== filters.modality) continue;
    if (filters?.status && w.status !== filters.status) continue;
    if (filters?.patientDfn && w.patientDfn !== filters.patientDfn) continue;
    if (filters?.scheduledAeTitle && w.scheduledAeTitle !== filters.scheduledAeTitle) continue;
    result.push(w);
    if (result.length >= limit) break;
  }
  return result;
}

export function updateWorklistStatus(
  id: string,
  status: WorklistItemStatus
): WorklistItem | undefined {
  const w = worklistItems.get(id);
  if (!w) return undefined;
  w.status = status;
  w.updatedAt = now();
  audit(w.tenantId, `worklist_${status}`, 'worklist', id, w.accessionNumber);
  return w;
}

// ---------------------------------------------------------------------------
// MPPS CRUD
// ---------------------------------------------------------------------------

export function createMppsRecord(
  tenantId: string,
  rec: Omit<MppsRecord, 'id' | 'tenantId' | 'receivedAt' | 'updatedAt'> & {
    mppsInstanceUid?: string;
  }
): MppsRecord {
  evictOldest(mppsRecords, MAX_MPPS);
  const mpps: MppsRecord = {
    ...rec,
    id: genId(),
    tenantId,
    mppsInstanceUid: rec.mppsInstanceUid || generateDicomUid(),
    receivedAt: now(),
    updatedAt: now(),
  };
  mppsRecords.set(mpps.id, mpps);

  // Auto-link to worklist by accession or study UID
  if (mpps.accessionNumber) {
    const wl = findWorklistByAccession(tenantId, mpps.accessionNumber);
    if (wl) {
      mpps.worklistItemId = wl.id;
      wl.status =
        mpps.status === 'IN PROGRESS'
          ? 'in_progress'
          : mpps.status === 'COMPLETED'
            ? 'completed'
            : 'discontinued';
      wl.updatedAt = now();
    }
  }

  audit(tenantId, 'mpps_created', 'mpps', mpps.id, `status=${mpps.status}`);
  return mpps;
}

export function getMppsRecord(id: string): MppsRecord | undefined {
  return mppsRecords.get(id);
}

export function listMppsRecords(
  tenantId: string,
  filters?: {
    status?: MppsStatus;
    modality?: string;
    performingAeTitle?: string;
    limit?: number;
  }
): MppsRecord[] {
  const limit = filters?.limit ?? 200;
  const result: MppsRecord[] = [];
  for (const m of mppsRecords.values()) {
    if (m.tenantId !== tenantId) continue;
    if (filters?.status && m.status !== filters.status) continue;
    if (filters?.modality && m.modality !== filters.modality) continue;
    if (filters?.performingAeTitle && m.performingAeTitle !== filters.performingAeTitle) continue;
    result.push(m);
    if (result.length >= limit) break;
  }
  return result;
}

export function updateMppsStatus(
  id: string,
  status: MppsStatus,
  update?: { endDateTime?: string; seriesCount?: number; instanceCount?: number }
): MppsRecord | undefined {
  const m = mppsRecords.get(id);
  if (!m) return undefined;
  m.status = status;
  if (update?.endDateTime) m.endDateTime = update.endDateTime;
  if (update?.seriesCount !== undefined) m.seriesCount = update.seriesCount;
  if (update?.instanceCount !== undefined) m.instanceCount = update.instanceCount;
  m.updatedAt = now();

  // Sync linked worklist item
  if (m.worklistItemId) {
    const wl = worklistItems.get(m.worklistItemId);
    if (wl) {
      wl.status =
        status === 'COMPLETED'
          ? 'completed'
          : status === 'DISCONTINUED'
            ? 'discontinued'
            : 'in_progress';
      wl.updatedAt = now();
    }
  }

  audit(m.tenantId, `mpps_${status.toLowerCase().replace(' ', '_')}`, 'mpps', id);
  return m;
}

// ---------------------------------------------------------------------------
// Modality AE CRUD
// ---------------------------------------------------------------------------

export function registerModality(
  tenantId: string,
  cfg: Omit<ModalityAeConfig, 'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt'>
): ModalityAeConfig | { error: string } {
  // Validate AE Title
  if (!cfg.aeTitle || !/^[A-Z0-9_ ]{1,16}$/.test(cfg.aeTitle)) {
    return { error: 'AE Title must be 1-16 chars, uppercase A-Z0-9 and underscore' };
  }
  // Check duplicate AE Title
  for (const m of modalityConfigs.values()) {
    if (m.tenantId === tenantId && m.aeTitle === cfg.aeTitle && m.status !== 'decommissioned') {
      return { error: `AE Title ${cfg.aeTitle} already registered` };
    }
  }
  evictOldest(modalityConfigs, MAX_MODALITIES);
  const modality: ModalityAeConfig = {
    ...cfg,
    id: genId(),
    tenantId,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  };
  modalityConfigs.set(modality.id, modality);
  audit(tenantId, 'modality_registered', 'modality', modality.id, cfg.aeTitle);
  return modality;
}

export function getModality(id: string): ModalityAeConfig | undefined {
  return modalityConfigs.get(id);
}

export function listModalities(
  tenantId: string,
  filters?: { modality?: string; status?: string; limit?: number }
): ModalityAeConfig[] {
  const limit = filters?.limit ?? 200;
  const result: ModalityAeConfig[] = [];
  for (const m of modalityConfigs.values()) {
    if (m.tenantId !== tenantId) continue;
    if (filters?.modality && m.modality !== filters.modality) continue;
    if (filters?.status && m.status !== filters.status) continue;
    result.push(m);
    if (result.length >= limit) break;
  }
  return result;
}

export function updateModalityStatus(
  id: string,
  status: ModalityAeConfig['status']
): ModalityAeConfig | undefined {
  const m = modalityConfigs.get(id);
  if (!m) return undefined;
  m.status = status;
  m.updatedAt = now();
  audit(m.tenantId, `modality_${status}`, 'modality', id, m.aeTitle);
  return m;
}

export function updateModalityEcho(id: string): ModalityAeConfig | undefined {
  const m = modalityConfigs.get(id);
  if (!m) return undefined;
  m.lastEcho = now();
  m.updatedAt = now();
  return m;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function getImagingModalityStats(tenantId: string): ImagingModalityStats {
  let totalWl = 0;
  let totalMpps = 0;
  let totalMod = 0;
  let mppsCompleted = 0;
  let mppsTotal = 0;
  const byModality: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const w of worklistItems.values()) {
    if (w.tenantId !== tenantId) continue;
    totalWl++;
    byModality[w.modality] = (byModality[w.modality] ?? 0) + 1;
    byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;
  }
  for (const m of mppsRecords.values()) {
    if (m.tenantId !== tenantId) continue;
    totalMpps++;
    mppsTotal++;
    if (m.status === 'COMPLETED') mppsCompleted++;
  }
  for (const m of modalityConfigs.values()) {
    if (m.tenantId !== tenantId) continue;
    totalMod++;
  }

  return {
    totalWorklistItems: totalWl,
    totalMppsRecords: totalMpps,
    totalModalities: totalMod,
    byModality,
    byStatus,
    mppsCompletionRate: mppsTotal > 0 ? mppsCompleted / mppsTotal : 0,
  };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function getModalityAudit(tenantId: string, limit = 200): ModalityAuditEntry[] {
  return auditLog.filter((e) => e.tenantId === tenantId).slice(-limit);
}
