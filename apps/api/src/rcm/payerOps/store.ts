/**
 * PayerOps Store — Phase 87+89: Philippines RCM Foundation + LOA Engine v1
 *
 * In-memory stores for:
 *   - FacilityPayerEnrollment
 *   - LOACase (with SLA tracking, Phase 89)
 *   - CredentialVaultEntry
 *
 * Pattern: matches imaging-worklist.ts / handoff-store.ts (in-memory Map with
 * documented migration plan to VistA-native or DB persistence).
 *
 * Migration plan:
 *   1. In-memory Map (current — resets on API restart)
 *   2. SQLite file-backed (when multi-instance deploy needed)
 *   3. PostgreSQL (when SaaS multi-tenant needed)
 *   4. VistA file-backed (when VistA IB/AR files available in production)
 */

import { randomBytes } from 'node:crypto';
import {
  LOA_TRANSITIONS,
  type FacilityPayerEnrollment,
  type EnrollmentStatus,
  type LOACase,
  type LOAStatus,
  type LOAPriority,
  type LOASLARiskLevel,
  type LOAPack,
  type CredentialVaultEntry,
  type CredentialDocType,
} from './types.js';

/* ── ID generation ──────────────────────────────────────────── */

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
}

/* ── Enrollment Store ───────────────────────────────────────── */

const enrollments = new Map<string, FacilityPayerEnrollment>();

/* Phase 146: DB repo wiring (payer ops) */
let enrollDbRepo: {
  upsert(d: any): Promise<any>;
  update?(id: string, u: any): Promise<any>;
} | null = null;
let loaCaseDbRepo: {
  upsert(d: any): Promise<any>;
  update?(id: string, u: any): Promise<any>;
} | null = null;
let credDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initPayerOpsRepos(repos: {
  enrollments?: typeof enrollDbRepo;
  loaCases?: typeof loaCaseDbRepo;
  credentials?: typeof credDbRepo;
}): void {
  if (repos.enrollments) enrollDbRepo = repos.enrollments;
  if (repos.loaCases) loaCaseDbRepo = repos.loaCases;
  if (repos.credentials) credDbRepo = repos.credentials;
}

export function createEnrollment(data: {
  facilityId: string;
  facilityName: string;
  payerId: string;
  payerName: string;
  integrationMode?: 'manual' | 'portal' | 'api';
  portalUrl?: string;
  portalInstructions?: string;
  notes?: string;
  actor: string;
}): FacilityPayerEnrollment {
  const id = newId('enr');
  const now = new Date().toISOString();
  const enrollment: FacilityPayerEnrollment = {
    id,
    facilityId: data.facilityId,
    facilityName: data.facilityName,
    payerId: data.payerId,
    payerName: data.payerName,
    status: 'not_enrolled',
    credentialVaultRefs: [],
    integrationMode: data.integrationMode || 'manual',
    portalUrl: data.portalUrl,
    portalInstructions: data.portalInstructions,
    enrollmentNotes: data.notes,
    timeline: [
      {
        timestamp: now,
        action: 'created',
        actor: data.actor,
        detail: 'Enrollment record created',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  enrollments.set(id, enrollment);

  // Phase 146: Write-through to PG
  enrollDbRepo
    ?.upsert({
      id,
      tenantId: (enrollment as any).tenantId ?? 'default',
      payerId: enrollment.payerId,
      status: enrollment.status,
      createdAt: enrollment.createdAt,
    })
    .catch(() => {});

  return enrollment;
}

export function getEnrollment(id: string): FacilityPayerEnrollment | undefined {
  return enrollments.get(id);
}

export function listEnrollments(filter?: {
  facilityId?: string;
  payerId?: string;
  status?: EnrollmentStatus;
}): FacilityPayerEnrollment[] {
  let results = Array.from(enrollments.values());
  if (filter?.facilityId) results = results.filter((e) => e.facilityId === filter.facilityId);
  if (filter?.payerId) results = results.filter((e) => e.payerId === filter.payerId);
  if (filter?.status) results = results.filter((e) => e.status === filter.status);
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateEnrollmentStatus(
  id: string,
  newStatus: EnrollmentStatus,
  actor: string,
  detail?: string
): FacilityPayerEnrollment | undefined {
  const enrollment = enrollments.get(id);
  if (!enrollment) return undefined;
  const now = new Date().toISOString();
  enrollment.timeline.push({
    timestamp: now,
    action: `status_change: ${enrollment.status} → ${newStatus}`,
    actor,
    detail,
  });
  enrollment.status = newStatus;
  enrollment.updatedAt = now;
  return enrollment;
}

export function addCredentialRefToEnrollment(enrollmentId: string, credentialId: string): boolean {
  const enrollment = enrollments.get(enrollmentId);
  if (!enrollment) return false;
  if (!enrollment.credentialVaultRefs.includes(credentialId)) {
    enrollment.credentialVaultRefs.push(credentialId);
    enrollment.updatedAt = new Date().toISOString();
  }
  return true;
}

/* ── LOA Case Store ─────────────────────────────────────────── */

const loaCases = new Map<string, LOACase>();

export function createLOACase(data: {
  facilityId: string;
  patientDfn: string;
  encounterIen?: string;
  payerId: string;
  payerName: string;
  memberId?: string;
  planName?: string;
  requestType: LOACase['requestType'];
  requestedServices: LOACase['requestedServices'];
  diagnosisCodes: LOACase['diagnosisCodes'];
  createdBy: string;
  priority?: LOAPriority;
  assignedTo?: string;
  slaDeadline?: string;
  urgencyNotes?: string;
  enrollmentId?: string;
}): LOACase {
  const id = newId('loa');
  const now = new Date().toISOString();
  const loaCase: LOACase = {
    id,
    facilityId: data.facilityId,
    patientDfn: data.patientDfn,
    encounterIen: data.encounterIen,
    payerId: data.payerId,
    payerName: data.payerName,
    memberId: data.memberId,
    planName: data.planName,
    requestType: data.requestType,
    requestedServices: data.requestedServices,
    diagnosisCodes: data.diagnosisCodes,
    attachmentRefs: [],
    status: 'draft',
    timeline: [
      {
        timestamp: now,
        fromStatus: undefined,
        toStatus: 'draft',
        actor: data.createdBy,
        reason: 'LOA case created',
      },
    ],
    submissionMode: 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
    /* Phase 89 SLA fields */
    priority: data.priority || 'routine',
    assignedTo: data.assignedTo,
    slaDeadline: data.slaDeadline || computeDefaultSLADeadline(data.priority || 'routine'),
    slaRiskLevel: 'on_track',
    urgencyNotes: data.urgencyNotes,
    enrollmentId: data.enrollmentId,
    packHistory: [],
    reminderCount: 0,
  };
  // Compute initial SLA risk
  loaCase.slaRiskLevel = computeSLARisk(loaCase);
  loaCases.set(id, loaCase);

  // Phase 146: Write-through to PG
  loaCaseDbRepo
    ?.upsert({
      id,
      tenantId: (loaCase as any).tenantId ?? 'default',
      payerId: loaCase.payerId,
      status: loaCase.status,
      createdAt: loaCase.createdAt,
    })
    .catch(() => {});

  return loaCase;
}

export function getLOACase(id: string): LOACase | undefined {
  return loaCases.get(id);
}

export function listLOACases(filter?: {
  facilityId?: string;
  patientDfn?: string;
  payerId?: string;
  status?: LOAStatus;
}): LOACase[] {
  let results = Array.from(loaCases.values());
  if (filter?.facilityId) results = results.filter((c) => c.facilityId === filter.facilityId);
  if (filter?.patientDfn) results = results.filter((c) => c.patientDfn === filter.patientDfn);
  if (filter?.payerId) results = results.filter((c) => c.payerId === filter.payerId);
  if (filter?.status) results = results.filter((c) => c.status === filter.status);
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function transitionLOAStatus(
  id: string,
  newStatus: LOAStatus,
  actor: string,
  reason?: string
): { ok: boolean; error?: string; loaCase?: LOACase } {
  const loa = loaCases.get(id);
  if (!loa) return { ok: false, error: 'LOA case not found' };

  const allowed = LOA_TRANSITIONS[loa.status];
  if (!allowed?.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from "${loa.status}" to "${newStatus}". Allowed: ${allowed?.join(', ') || 'none'}`,
    };
  }

  const now = new Date().toISOString();
  loa.timeline.push({
    timestamp: now,
    fromStatus: loa.status,
    toStatus: newStatus,
    actor,
    reason,
  });
  loa.status = newStatus;
  loa.updatedAt = now;
  return { ok: true, loaCase: loa };
}

export function addAttachmentToLOA(loaId: string, credentialId: string): boolean {
  const loa = loaCases.get(loaId);
  if (!loa) return false;
  if (!loa.attachmentRefs.includes(credentialId)) {
    loa.attachmentRefs.push(credentialId);
    loa.updatedAt = new Date().toISOString();
  }
  return true;
}

export function updateLOAPayerRef(
  id: string,
  payerRefNumber: string,
  approvedAmount?: number,
  approvedServices?: string[]
): boolean {
  const loa = loaCases.get(id);
  if (!loa) return false;
  loa.payerRefNumber = payerRefNumber;
  if (approvedAmount !== undefined) loa.approvedAmount = approvedAmount;
  if (approvedServices) loa.approvedServices = approvedServices;
  loa.updatedAt = new Date().toISOString();
  return true;
}

/* ── Phase 89: SLA Computation ──────────────────────────────── */

/** Default SLA deadlines by priority (hours from creation) */
const SLA_HOURS: Record<LOAPriority, number> = {
  routine: 72, // 3 days
  urgent: 24, // 1 day
  stat: 4, // 4 hours
};

function computeDefaultSLADeadline(priority: LOAPriority): string {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + SLA_HOURS[priority]);
  return deadline.toISOString();
}

export function computeSLARisk(loa: LOACase): LOASLARiskLevel {
  // Terminal states have no SLA risk
  const terminal: LOAStatus[] = [
    'approved',
    'partially_approved',
    'denied',
    'expired',
    'cancelled',
  ];
  if (terminal.includes(loa.status)) return 'on_track';

  if (!loa.slaDeadline) return 'on_track';
  const now = Date.now();
  const deadline = new Date(loa.slaDeadline).getTime();
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return 'overdue';
  if (hoursLeft < 2) return 'critical';
  if (hoursLeft < 12) return 'at_risk';
  return 'on_track';
}

/** Recompute SLA risk for all active LOA cases (called on reads) */
export function refreshSLARisk(loa: LOACase): LOACase {
  loa.slaRiskLevel = computeSLARisk(loa);
  return loa;
}

/* ── Phase 89: Patch LOA Draft ──────────────────────────────── */

export function patchLOADraft(
  id: string,
  patch: {
    memberId?: string;
    planName?: string;
    requestType?: LOACase['requestType'];
    requestedServices?: LOACase['requestedServices'];
    diagnosisCodes?: LOACase['diagnosisCodes'];
    priority?: LOAPriority;
    assignedTo?: string;
    slaDeadline?: string;
    urgencyNotes?: string;
    enrollmentId?: string;
    denialReason?: string;
  }
): { ok: boolean; error?: string; loaCase?: LOACase } {
  const loa = loaCases.get(id);
  if (!loa) return { ok: false, error: 'LOA case not found' };

  // Only draft and pending_submission can be edited
  if (loa.status !== 'draft' && loa.status !== 'pending_submission') {
    return {
      ok: false,
      error: `Cannot edit LOA in status "${loa.status}". Only draft/pending_submission allowed.`,
    };
  }

  if (patch.memberId !== undefined) loa.memberId = patch.memberId;
  if (patch.planName !== undefined) loa.planName = patch.planName;
  if (patch.requestType !== undefined) loa.requestType = patch.requestType;
  if (patch.requestedServices !== undefined) loa.requestedServices = patch.requestedServices;
  if (patch.diagnosisCodes !== undefined) loa.diagnosisCodes = patch.diagnosisCodes;
  if (patch.priority !== undefined) loa.priority = patch.priority;
  if (patch.assignedTo !== undefined) loa.assignedTo = patch.assignedTo;
  if (patch.slaDeadline !== undefined) loa.slaDeadline = patch.slaDeadline;
  if (patch.urgencyNotes !== undefined) loa.urgencyNotes = patch.urgencyNotes;
  if (patch.enrollmentId !== undefined) loa.enrollmentId = patch.enrollmentId;
  if (patch.denialReason !== undefined) loa.denialReason = patch.denialReason;

  loa.slaRiskLevel = computeSLARisk(loa);
  loa.updatedAt = new Date().toISOString();
  return { ok: true, loaCase: loa };
}

/* ── Phase 89: LOA Queue ────────────────────────────────────── */

export interface LOAQueueFilter {
  status?: LOAStatus | LOAStatus[];
  payerId?: string;
  assignedTo?: string;
  slaRiskLevel?: LOASLARiskLevel;
  patientDfn?: string;
  priority?: LOAPriority;
  /** Only cases older than this many hours */
  olderThanHours?: number;
  /** Sort field */
  sortBy?: 'slaDeadline' | 'createdAt' | 'updatedAt' | 'priority';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

const PRIORITY_WEIGHT: Record<LOAPriority, number> = {
  stat: 3,
  urgent: 2,
  routine: 1,
};

export function listLOAQueue(filter: LOAQueueFilter = {}): {
  items: LOACase[];
  total: number;
  slaBreakdown: Record<LOASLARiskLevel, number>;
} {
  let results = Array.from(loaCases.values()).map(refreshSLARisk);

  // Status filter
  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    results = results.filter((c) => statuses.includes(c.status));
  } else {
    // Default: only active cases (exclude terminal)
    const terminal: LOAStatus[] = [
      'approved',
      'partially_approved',
      'denied',
      'expired',
      'cancelled',
    ];
    results = results.filter((c) => !terminal.includes(c.status));
  }

  if (filter.payerId) results = results.filter((c) => c.payerId === filter.payerId);
  if (filter.assignedTo) results = results.filter((c) => c.assignedTo === filter.assignedTo);
  if (filter.slaRiskLevel) results = results.filter((c) => c.slaRiskLevel === filter.slaRiskLevel);
  if (filter.patientDfn) results = results.filter((c) => c.patientDfn === filter.patientDfn);
  if (filter.priority) results = results.filter((c) => c.priority === filter.priority);
  if (filter.olderThanHours) {
    const cutoff = Date.now() - filter.olderThanHours * 60 * 60 * 1000;
    results = results.filter((c) => new Date(c.createdAt).getTime() < cutoff);
  }

  // SLA breakdown (pre-pagination)
  const slaBreakdown: Record<LOASLARiskLevel, number> = {
    on_track: 0,
    at_risk: 0,
    overdue: 0,
    critical: 0,
  };
  for (const c of results) {
    slaBreakdown[c.slaRiskLevel]++;
  }

  const total = results.length;

  // Sorting
  const sortBy = filter.sortBy || 'slaDeadline';
  const sortDir = filter.sortDir || 'asc';
  results.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'priority') {
      cmp = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    } else if (sortBy === 'slaDeadline') {
      const aVal = a.slaDeadline || '9999';
      const bVal = b.slaDeadline || '9999';
      cmp = aVal.localeCompare(bVal);
    } else {
      const aVal = (a as any)[sortBy] || '';
      const bVal = (b as any)[sortBy] || '';
      cmp = aVal.localeCompare(bVal);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Pagination
  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? 50;
  const items = results.slice(offset, offset + limit);

  return { items, total, slaBreakdown };
}

/* ── Phase 89: LOA Pack Storage ─────────────────────────────── */

export function addPackToLOA(loaId: string, pack: LOAPack): boolean {
  const loa = loaCases.get(loaId);
  if (!loa) return false;
  loa.packHistory.push(pack);
  loa.updatedAt = new Date().toISOString();
  return true;
}

/* ── Phase 89: LOA Assignment ───────────────────────────────── */

export function assignLOA(
  id: string,
  assignedTo: string,
  actor: string
): { ok: boolean; error?: string; loaCase?: LOACase } {
  const loa = loaCases.get(id);
  if (!loa) return { ok: false, error: 'LOA case not found' };
  const now = new Date().toISOString();
  loa.assignedTo = assignedTo;
  loa.timeline.push({
    timestamp: now,
    toStatus: loa.status,
    actor,
    reason: `Assigned to ${assignedTo}`,
  });
  loa.updatedAt = now;
  return { ok: true, loaCase: loa };
}

/* ── Credential Vault Store ─────────────────────────────────── */

const credentials = new Map<string, CredentialVaultEntry>();

export function createCredentialEntry(data: {
  facilityId: string;
  docType: CredentialDocType;
  title: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  contentHash: string;
  issuedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  renewalReminderDays?: number;
  associatedPayerIds?: string[];
  notes?: string;
  uploadedBy: string;
}): CredentialVaultEntry {
  const id = newId('cred');
  const now = new Date().toISOString();
  const entry: CredentialVaultEntry = {
    id,
    facilityId: data.facilityId,
    docType: data.docType,
    title: data.title,
    fileName: data.fileName,
    mimeType: data.mimeType,
    storagePath: data.storagePath,
    sizeBytes: data.sizeBytes,
    contentHash: data.contentHash,
    issuedBy: data.issuedBy,
    issueDate: data.issueDate,
    expiryDate: data.expiryDate,
    renewalReminderDays: data.renewalReminderDays ?? 30,
    associatedPayerIds: data.associatedPayerIds ?? [],
    notes: data.notes,
    uploadedBy: data.uploadedBy,
    uploadedAt: now,
    updatedAt: now,
  };
  credentials.set(id, entry);

  // Phase 146: Write-through to PG
  credDbRepo
    ?.upsert({
      id,
      tenantId: (entry as any).tenantId ?? 'default',
      payerId: (entry as any).payerId ?? '',
      credentialType: (entry as any).type ?? 'generic',
      createdAt: (entry as any).createdAt ?? new Date().toISOString(),
    })
    .catch(() => {});

  return entry;
}

export function getCredentialEntry(id: string): CredentialVaultEntry | undefined {
  return credentials.get(id);
}

export function listCredentialEntries(filter?: {
  facilityId?: string;
  docType?: CredentialDocType;
  payerId?: string;
  expiringWithinDays?: number;
}): CredentialVaultEntry[] {
  let results = Array.from(credentials.values());
  if (filter?.facilityId) results = results.filter((c) => c.facilityId === filter.facilityId);
  if (filter?.docType) results = results.filter((c) => c.docType === filter.docType);
  if (filter?.payerId)
    results = results.filter((c) => c.associatedPayerIds.includes(filter.payerId!));
  if (filter?.expiringWithinDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + filter.expiringWithinDays);
    const cutoffStr = cutoff.toISOString();
    results = results.filter((c) => c.expiryDate && c.expiryDate <= cutoffStr);
  }
  return results.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function deleteCredentialEntry(id: string): boolean {
  return credentials.delete(id);
}

/* ── Renewal Reminder Check ─────────────────────────────────── */

export function getExpiringCredentials(daysAhead: number = 30): CredentialVaultEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return Array.from(credentials.values()).filter((c) => {
    if (!c.expiryDate) return false;
    return c.expiryDate.split('T')[0] <= cutoffStr;
  });
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getPayerOpsStats(): {
  enrollments: { total: number; byStatus: Record<string, number> };
  loaCases: { total: number; byStatus: Record<string, number> };
  credentials: { total: number; expiringSoon: number };
} {
  const enrollmentsByStatus: Record<string, number> = {};
  for (const e of enrollments.values()) {
    enrollmentsByStatus[e.status] = (enrollmentsByStatus[e.status] || 0) + 1;
  }

  const loaByStatus: Record<string, number> = {};
  for (const l of loaCases.values()) {
    loaByStatus[l.status] = (loaByStatus[l.status] || 0) + 1;
  }

  return {
    enrollments: { total: enrollments.size, byStatus: enrollmentsByStatus },
    loaCases: { total: loaCases.size, byStatus: loaByStatus },
    credentials: {
      total: credentials.size,
      expiringSoon: getExpiringCredentials(30).length,
    },
  };
}
