/**
 * Claims Lifecycle v1 — Hybrid Store (Phase 91 + Phase 121)
 *
 * In-memory ClaimCase store with lifecycle state machine enforcement,
 * event tracking, attachment management, and denial record indexing.
 *
 * Phase 121: Durability Wave 1 — hybrid cache + DB persistence.
 * Write-through: every mutation writes to both cache and DB.
 * Read: cache-first, DB fallback on cache miss.
 * Migration path: VistA IB/PRCA files when available.
 */

import { randomUUID } from 'node:crypto';
import type {
  ClaimCase,
  ClaimLifecycleStatus,
  ClaimScrubResult,
  ClaimAttachment,
  ClaimEvent,
  DenialRecord,
} from './claim-types.js';
import { isValidLifecycleTransition } from './claim-types.js';

/* ── DB repo interface (lazy-wired at startup) ──────────────── */

interface ClaimCaseRepo {
  insertClaimCase(data: any): any;
  findClaimCaseById(id: string): any;
  findClaimCasesByTenant(tenantId: string, opts?: any): any;
  updateClaimCase(id: string, updates: any): any;
  countClaimCasesByTenant(tenantId: string): any;
  countAllClaimCases(): any;
}

let dbRepo: ClaimCaseRepo | null = null;

/** Called from index.ts after initPlatformDb() */
export function initClaimCaseRepo(repo: ClaimCaseRepo): void {
  dbRepo = repo;
}

function dbWarn(op: string, err: any): void {
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn(`[claim-case-store] DB ${op} failed (cache-only fallback):`, err?.message ?? err);
  }
}

/* ── Helper: ClaimCase → DB row conversion ──────────────────── */

function caseToDbRow(cc: ClaimCase): Record<string, unknown> {
  return {
    id: cc.id,
    tenantId: cc.tenantId,
    lifecycleStatus: cc.lifecycleStatus,
    baseClaimId: cc.baseClaimId,
    philhealthDraftId: cc.philhealthDraftId,
    loaCaseId: cc.loaCaseId,
    patientDfn: cc.patientDfn,
    patientName: cc.patientName,
    patientDob: cc.patientDob,
    patientGender: cc.patientGender,
    subscriberId: cc.subscriberId,
    memberPin: cc.memberPin,
    billingProviderNpi: cc.billingProviderNpi,
    renderingProviderNpi: cc.renderingProviderNpi,
    facilityCode: cc.facilityCode,
    facilityName: cc.facilityName,
    payerId: cc.payerId,
    payerName: cc.payerName,
    payerType: cc.payerType,
    claimType: cc.claimType,
    dateOfService: cc.dateOfService,
    dateOfDischarge: cc.dateOfDischarge,
    diagnosesJson: JSON.stringify(cc.diagnoses ?? []),
    proceduresJson: JSON.stringify(cc.procedures ?? []),
    totalCharge: cc.totalCharge,
    scrubHistoryJson: JSON.stringify(cc.scrubHistory ?? []),
    lastScrubResultJson: cc.lastScrubResult ? JSON.stringify(cc.lastScrubResult) : undefined,
    attachmentsJson: JSON.stringify(cc.attachments ?? []),
    eventsJson: JSON.stringify(cc.events ?? []),
    denialsJson: JSON.stringify(cc.denials ?? []),
    isDemo: cc.isDemo,
    isMock: cc.isMock,
    priority: cc.priority,
    vistaEncounterIen: cc.vistaEncounterIen,
    vistaChargeIen: cc.vistaChargeIen,
    vistaArIen: cc.vistaArIen,
    createdBy: cc.createdBy,
    createdAt: cc.createdAt,
    updatedAt: cc.updatedAt,
  };
}

function dbRowToCase(row: any): ClaimCase {
  const {
    diagnosesJson, proceduresJson, scrubHistoryJson, lastScrubResultJson,
    attachmentsJson, eventsJson, denialsJson, ...rest
  } = row;
  return {
    ...rest,
    diagnoses: JSON.parse(diagnosesJson ?? "[]"),
    procedures: JSON.parse(proceduresJson ?? "[]"),
    scrubHistory: JSON.parse(scrubHistoryJson ?? "[]"),
    lastScrubResult: lastScrubResultJson ? JSON.parse(lastScrubResultJson) : undefined,
    attachments: JSON.parse(attachmentsJson ?? "[]"),
    events: JSON.parse(eventsJson ?? "[]"),
    denials: JSON.parse(denialsJson ?? "[]"),
    isDemo: Boolean(rest.isDemo),
    isMock: Boolean(rest.isMock),
    totalCharge: Number(rest.totalCharge ?? 0),
    createdBy: rest.createdBy ?? "unknown",
  } as ClaimCase;
}

/** Persist the current state of a case to DB */
function persistCaseToDb(cc: ClaimCase): void {
  if (!dbRepo) return;
  try {
    dbRepo.updateClaimCase(cc.id, {
      lifecycleStatus: cc.lifecycleStatus,
      totalCharge: cc.totalCharge,
      scrubHistoryJson: JSON.stringify(cc.scrubHistory ?? []),
      lastScrubResultJson: cc.lastScrubResult ? JSON.stringify(cc.lastScrubResult) : undefined,
      attachmentsJson: JSON.stringify(cc.attachments ?? []),
      eventsJson: JSON.stringify(cc.events ?? []),
      denialsJson: JSON.stringify(cc.denials ?? []),
      diagnosesJson: JSON.stringify(cc.diagnoses ?? []),
      proceduresJson: JSON.stringify(cc.procedures ?? []),
      priority: cc.priority,
      // VistA grounding + clinical fields
      vistaEncounterIen: cc.vistaEncounterIen,
      vistaChargeIen: cc.vistaChargeIen,
      vistaArIen: cc.vistaArIen,
      payerName: cc.payerName,
      patientName: cc.patientName,
      baseClaimId: cc.baseClaimId,
    });
  } catch (e) { dbWarn("updateClaimCase", e); }
}

/* ── In-Memory Stores ──────────────────────────────────────── */

const cases = new Map<string, ClaimCase>();
const tenantIndex = new Map<string, Set<string>>();  // tenantId → caseIds
const denialIndex = new Map<string, Set<string>>();   // claimCaseId → denialIds
const allDenials = new Map<string, DenialRecord>();   // denialId → DenialRecord

/* ── Factory ───────────────────────────────────────────────── */

export interface CreateClaimCaseParams {
  tenantId: string;
  patientDfn: string;
  payerId: string;
  payerName?: string;
  payerType?: ClaimCase['payerType'];
  claimType?: ClaimCase['claimType'];
  dateOfService: string;
  dateOfDischarge?: string;
  diagnoses?: ClaimCase['diagnoses'];
  procedures?: ClaimCase['procedures'];
  totalCharge?: number;
  patientName?: string;
  patientDob?: string;
  patientGender?: string;
  subscriberId?: string;
  memberPin?: string;
  billingProviderNpi?: string;
  renderingProviderNpi?: string;
  facilityCode?: string;
  facilityName?: string;
  vistaEncounterIen?: string;
  vistaChargeIen?: string;
  vistaArIen?: string;
  baseClaimId?: string;
  philhealthDraftId?: string;
  loaCaseId?: string;
  isDemo?: boolean;
  isMock?: boolean;
  priority?: ClaimCase['priority'];
  actor: string;
}

export function createClaimCase(params: CreateClaimCaseParams): ClaimCase {
  const now = new Date().toISOString();
  const id = randomUUID();
  const procedures = params.procedures ?? [];
  const totalCharge = params.totalCharge ??
    procedures.reduce((sum, p) => sum + (p.chargeAmount * p.units), 0);

  const initEvent: ClaimEvent = {
    id: randomUUID(),
    claimCaseId: id,
    eventType: 'lifecycle.created',
    toStatus: 'draft',
    actor: params.actor,
    detail: { source: params.philhealthDraftId ? 'philhealth_draft' : params.loaCaseId ? 'loa_approval' : 'manual' },
    timestamp: now,
  };

  const cc: ClaimCase = {
    id,
    tenantId: params.tenantId,
    lifecycleStatus: 'draft',
    baseClaimId: params.baseClaimId,
    philhealthDraftId: params.philhealthDraftId,
    loaCaseId: params.loaCaseId,
    patientDfn: params.patientDfn,
    patientName: params.patientName,
    patientDob: params.patientDob,
    patientGender: params.patientGender,
    subscriberId: params.subscriberId,
    memberPin: params.memberPin,
    billingProviderNpi: params.billingProviderNpi,
    renderingProviderNpi: params.renderingProviderNpi,
    facilityCode: params.facilityCode,
    facilityName: params.facilityName,
    payerId: params.payerId,
    payerName: params.payerName,
    payerType: params.payerType,
    claimType: params.claimType ?? 'professional',
    dateOfService: params.dateOfService,
    dateOfDischarge: params.dateOfDischarge,
    diagnoses: params.diagnoses ?? [],
    procedures,
    totalCharge,
    scrubHistory: [],
    attachments: [],
    events: [initEvent],
    denials: [],
    isDemo: params.isDemo ?? false,
    isMock: params.isMock ?? false,
    priority: params.priority ?? 'medium',
    createdAt: now,
    updatedAt: now,
    createdBy: params.actor,
  };

  cases.set(id, cc);

  // Tenant index
  if (!tenantIndex.has(cc.tenantId)) {
    tenantIndex.set(cc.tenantId, new Set());
  }
  tenantIndex.get(cc.tenantId)!.add(id);

  // Write-through to DB
  if (dbRepo) {
    try { dbRepo.insertClaimCase(caseToDbRow(cc)); } catch (e) { dbWarn("insertClaimCase", e); }
  }

  return cc;
}

/* ── CRUD ──────────────────────────────────────────────────── */

export function getClaimCase(id: string): ClaimCase | undefined {
  // Cache-first
  const cached = cases.get(id);
  if (cached) return cached;

  // DB fallback
  if (dbRepo) {
    try {
      const row = dbRepo.findClaimCaseById(id);
      if (row) {
        const cc = dbRowToCase(row);
        cases.set(cc.id, cc);
        if (!tenantIndex.has(cc.tenantId)) tenantIndex.set(cc.tenantId, new Set());
        tenantIndex.get(cc.tenantId)!.add(cc.id);
        // Rebuild denial index
        for (const d of cc.denials) {
          allDenials.set(d.id, d);
          if (!denialIndex.has(cc.id)) denialIndex.set(cc.id, new Set());
          denialIndex.get(cc.id)!.add(d.id);
        }
        return cc;
      }
    } catch (e) { dbWarn("findClaimCaseById", e); }
  }
  return undefined;
}

export function updateClaimCase(id: string, updates: Partial<ClaimCase>): ClaimCase | undefined {
  const existing = getClaimCase(id);
  if (!existing) return undefined;

  const updated: ClaimCase = {
    ...existing,
    ...updates,
    id: existing.id,               // immutable
    tenantId: existing.tenantId,   // immutable
    createdAt: existing.createdAt, // immutable
    updatedAt: new Date().toISOString(),
  };
  cases.set(id, updated);

  // Write-through to DB
  persistCaseToDb(updated);

  return updated;
}

/* ── Lifecycle Transitions ─────────────────────────────────── */

export interface TransitionResult {
  ok: boolean;
  claimCase?: ClaimCase;
  error?: string;
}

export function transitionClaimCase(
  id: string,
  toStatus: ClaimLifecycleStatus,
  actor: string,
  detail?: Record<string, unknown>,
): TransitionResult {
  const cc = getClaimCase(id);
  if (!cc) return { ok: false, error: 'Claim case not found' };

  if (!isValidLifecycleTransition(cc.lifecycleStatus, toStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${cc.lifecycleStatus} → ${toStatus}`,
    };
  }

  // Gate: cannot advance to submission without passing scrub
  if (toStatus === 'ready_for_submission') {
    const lastScrub = cc.lastScrubResult;
    if (!lastScrub || (lastScrub.outcome !== 'pass' && lastScrub.outcome !== 'warn')) {
      return {
        ok: false,
        error: 'Cannot advance to ready_for_submission: last scrub must be PASS or WARN',
      };
    }
  }

  // Gate: paid/denied/acknowledged require evidence (detail must have evidence)
  const evidenceRequired: ClaimLifecycleStatus[] = ['payer_acknowledged', 'paid_full', 'paid_partial', 'denied'];
  if (evidenceRequired.includes(toStatus)) {
    if (!detail?.evidenceRef && !detail?.payerClaimNumber) {
      return {
        ok: false,
        error: `Transition to ${toStatus} requires evidenceRef or payerClaimNumber in detail`,
      };
    }
  }

  const now = new Date().toISOString();
  const event: ClaimEvent = {
    id: randomUUID(),
    claimCaseId: id,
    eventType: 'lifecycle.transition',
    fromStatus: cc.lifecycleStatus,
    toStatus,
    actor,
    detail: redactDetail(detail ?? {}),
    timestamp: now,
  };

  const updated: ClaimCase = {
    ...cc,
    lifecycleStatus: toStatus,
    updatedAt: now,
    events: [...cc.events, event],
  };

  // Set submission metadata
  if (toStatus.startsWith('submitted_') || toStatus === 'exported') {
    updated.submittedAt = now;
    updated.submissionMethod = toStatus === 'submitted_electronic' ? 'electronic'
      : toStatus === 'submitted_portal' ? 'portal'
      : toStatus === 'submitted_manual' ? 'manual'
      : 'export_only';
  }

  if (toStatus === 'payer_acknowledged' && detail?.payerClaimNumber) {
    updated.payerClaimNumber = detail.payerClaimNumber as string;
    updated.payerAckTimestamp = now;
  }

  if ((toStatus === 'paid_full' || toStatus === 'paid_partial') && detail?.paidAmount) {
    updated.paidAmount = detail.paidAmount as number;
    updated.remitDate = now;
  }

  cases.set(id, updated);

  // Write-through to DB
  persistCaseToDb(updated);

  return { ok: true, claimCase: updated };
}

/* ── Scrub Results ─────────────────────────────────────────── */

export function recordScrubResult(
  claimCaseId: string,
  result: ClaimScrubResult,
): ClaimCase | undefined {
  const cc = getClaimCase(claimCaseId);
  if (!cc) return undefined;

  const event: ClaimEvent = {
    id: randomUUID(),
    claimCaseId,
    eventType: 'scrub.completed',
    actor: result.scrubbedBy,
    detail: {
      outcome: result.outcome,
      findingsCount: result.findings.length,
      rulesEvaluated: result.rulesEvaluated,
      durationMs: result.scrubDurationMs,
    },
    timestamp: result.scrubbedAt,
  };

  const updated: ClaimCase = {
    ...cc,
    lastScrubResult: result,
    scrubHistory: [...cc.scrubHistory, result],
    events: [...cc.events, event],
    updatedAt: new Date().toISOString(),
  };
  cases.set(claimCaseId, updated);
  persistCaseToDb(updated);
  return updated;
}

/* ── Attachments ───────────────────────────────────────────── */

export function addAttachment(
  claimCaseId: string,
  attachment: Omit<ClaimAttachment, 'id' | 'claimCaseId'>,
  actor: string,
): ClaimCase | undefined {
  const cc = getClaimCase(claimCaseId);
  if (!cc) return undefined;

  const att: ClaimAttachment = {
    ...attachment,
    id: randomUUID(),
    claimCaseId,
  };

  const event: ClaimEvent = {
    id: randomUUID(),
    claimCaseId,
    eventType: 'attachment.added',
    actor,
    detail: { category: att.category, filename: att.filename, autoGenerated: att.autoGenerated },
    timestamp: new Date().toISOString(),
  };

  const updated: ClaimCase = {
    ...cc,
    attachments: [...cc.attachments, att],
    events: [...cc.events, event],
    updatedAt: new Date().toISOString(),
  };
  cases.set(claimCaseId, updated);
  persistCaseToDb(updated);
  return updated;
}

/* ── Denials ───────────────────────────────────────────────── */

export function addDenial(
  claimCaseId: string,
  denial: Omit<DenialRecord, 'id' | 'claimCaseId'>,
): DenialRecord | undefined {
  const cc = getClaimCase(claimCaseId);
  if (!cc) return undefined;

  const dr: DenialRecord = {
    ...denial,
    id: randomUUID(),
    claimCaseId,
  };

  allDenials.set(dr.id, dr);
  if (!denialIndex.has(claimCaseId)) {
    denialIndex.set(claimCaseId, new Set());
  }
  denialIndex.get(claimCaseId)!.add(dr.id);

  const event: ClaimEvent = {
    id: randomUUID(),
    claimCaseId,
    eventType: 'denial.recorded',
    actor: 'system',
    detail: { reasonCode: dr.reasonCode, source: dr.source },
    timestamp: new Date().toISOString(),
  };

  const updated: ClaimCase = {
    ...cc,
    denials: [...cc.denials, dr],
    events: [...cc.events, event],
    updatedAt: new Date().toISOString(),
  };
  cases.set(claimCaseId, updated);
  persistCaseToDb(updated);
  return dr;
}

export function resolveDenial(
  denialId: string,
  resolvedBy: string,
  resolutionNote: string,
): DenialRecord | undefined {
  const dr = allDenials.get(denialId);
  if (!dr) return undefined;

  const updated: DenialRecord = {
    ...dr,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
    resolutionNote,
  };
  allDenials.set(denialId, updated);

  // Update in the claim case too
  const cc = getClaimCase(dr.claimCaseId);
  if (cc) {
    const updatedDenials = cc.denials.map(d => d.id === denialId ? updated : d);
    const updatedCase = { ...cc, denials: updatedDenials, updatedAt: new Date().toISOString() };
    cases.set(cc.id, updatedCase);
    persistCaseToDb(updatedCase);
  }

  return updated;
}

/* ── Queries ───────────────────────────────────────────────── */

export interface ListClaimCasesFilters {
  tenantId: string;
  status?: ClaimLifecycleStatus;
  payerId?: string;
  patientDfn?: string;
  priority?: ClaimCase['priority'];
  hasDenials?: boolean;
  limit?: number;
  offset?: number;
}

export function listClaimCases(filters: ListClaimCasesFilters): {
  items: ClaimCase[];
  total: number;
} {
  const tenantSet = tenantIndex.get(filters.tenantId);
  if (!tenantSet || tenantSet.size === 0) {
    // Try DB if cache is empty for this tenant
    if (dbRepo) {
      try {
        const rows = dbRepo.findClaimCasesByTenant(filters.tenantId, {
          status: filters.status,
          patientDfn: filters.patientDfn,
          payerId: filters.payerId,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
        });
        const total = dbRepo.countClaimCasesByTenant(filters.tenantId);
        const items = rows.map(dbRowToCase);
        // Rehydrate cache
        for (const cc of items) {
          cases.set(cc.id, cc);
          if (!tenantIndex.has(cc.tenantId)) tenantIndex.set(cc.tenantId, new Set());
          tenantIndex.get(cc.tenantId)!.add(cc.id);
        }
        return { items, total };
      } catch (e) { dbWarn("findClaimCasesByTenant", e); }
    }
    return { items: [], total: 0 };
  }

  let items = Array.from(tenantSet)
    .map(id => cases.get(id)!)
    .filter(Boolean);

  if (filters.status) items = items.filter(c => c.lifecycleStatus === filters.status);
  if (filters.payerId) items = items.filter(c => c.payerId === filters.payerId);
  if (filters.patientDfn) items = items.filter(c => c.patientDfn === filters.patientDfn);
  if (filters.priority) items = items.filter(c => c.priority === filters.priority);
  if (filters.hasDenials) items = items.filter(c => c.denials.length > 0);

  // Sort newest first
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;

  return {
    items: items.slice(offset, offset + limit),
    total,
  };
}

export function listDenials(filters: {
  tenantId: string;
  resolved?: boolean;
  source?: DenialRecord['source'];
  limit?: number;
  offset?: number;
}): { items: Array<DenialRecord & { claimCase?: ClaimCase }>; total: number } {
  const tenantSet = tenantIndex.get(filters.tenantId);
  if (!tenantSet) return { items: [], total: 0 };

  let items: Array<DenialRecord & { claimCase?: ClaimCase }> = [];

  for (const caseId of tenantSet) {
    const cc = cases.get(caseId);
    if (!cc) continue;
    for (const d of cc.denials) {
      if (filters.resolved === true && !d.resolvedAt) continue;
      if (filters.resolved === false && d.resolvedAt) continue;
      if (filters.source && d.source !== filters.source) continue;
      items.push({ ...d, claimCase: cc });
    }
  }

  // Sort newest first
  items.sort((a, b) => b.deniedAt.localeCompare(a.deniedAt));

  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;

  return { items: items.slice(offset, offset + limit), total };
}

/* ── Stats ─────────────────────────────────────────────────── */

export function getClaimCaseStats(tenantId: string): {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalDenials: number;
  unresolvedDenials: number;
  avgScrubScore: number;
} {
  const tenantSet = tenantIndex.get(tenantId);
  if (!tenantSet) return { total: 0, byStatus: {}, byPriority: {}, totalDenials: 0, unresolvedDenials: 0, avgScrubScore: 0 };

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let totalDenials = 0;
  let unresolvedDenials = 0;
  let scrubPassCount = 0;
  let scrubTotal = 0;

  for (const caseId of tenantSet) {
    const cc = cases.get(caseId);
    if (!cc) continue;

    byStatus[cc.lifecycleStatus] = (byStatus[cc.lifecycleStatus] ?? 0) + 1;
    byPriority[cc.priority] = (byPriority[cc.priority] ?? 0) + 1;
    totalDenials += cc.denials.length;
    unresolvedDenials += cc.denials.filter(d => !d.resolvedAt).length;

    if (cc.lastScrubResult) {
      scrubTotal++;
      if (cc.lastScrubResult.outcome === 'pass') scrubPassCount++;
    }
  }

  return {
    total: tenantSet.size,
    byStatus,
    byPriority,
    totalDenials,
    unresolvedDenials,
    avgScrubScore: scrubTotal > 0 ? Math.round((scrubPassCount / scrubTotal) * 100) : 0,
  };
}

/* ── Store Stats ───────────────────────────────────────────── */

export function getStoreInfo(): {
  totalCases: number;
  totalDenials: number;
  tenants: number;
} {
  return {
    totalCases: cases.size,
    totalDenials: allDenials.size,
    tenants: tenantIndex.size,
  };
}

/** Reset all stores — used in tests */
export function resetClaimCaseStore(): void {
  cases.clear();
  tenantIndex.clear();
  denialIndex.clear();
  allDenials.clear();
}

/* ── Detail Redaction ──────────────────────────────────────── */

function redactDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    const lk = key.toLowerCase();
    if (lk.includes('ssn') || lk.includes('dob') || lk.includes('patient_name') || lk.includes('patientname')) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
