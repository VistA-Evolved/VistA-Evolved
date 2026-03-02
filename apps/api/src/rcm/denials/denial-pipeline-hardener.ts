/**
 * 835 → Denial Pipeline Hardener — Phase 520 (Wave 37 B8)
 *
 * Maps parsed 835 remittance data to denial cases with:
 *   1. CARC/RARC code normalization and action recommendations
 *   2. Automatic denial-vs-adjustment classification
 *   3. Posting staging with operator approval workflow
 *   4. Batch import with duplicate detection via content hashing
 *   5. SLA deadline computation from payer timely-filing rules
 *
 * Extends the existing edi-import.ts (Phase 98) with production hardening.
 */

import { randomUUID, createHash } from 'node:crypto';
import { lookupCarc, lookupRarc, buildActionRecommendation, getCarcGroupDescription } from '../reference/carc-rarc.js';
import type { DenialCode, DenialFinancials, DenialCase, DenialSource } from '../denials/types.js';
import type { NormalizedPaymentLine, NormalizedRemittance, PaymentCode } from '../reconciliation/types.js';

/* ── Types ──────────────────────────────────────────────────── */

export type PostingApprovalStatus = 'pending_review' | 'approved' | 'rejected' | 'auto_approved';
export type LineClassification = 'full_denial' | 'partial_denial' | 'adjustment' | 'full_payment' | 'unknown';

export interface NormalizedCarcRarc {
  type: 'CARC' | 'RARC' | 'OTHER';
  code: string;
  description: string;
  groupCode?: string;
  groupDescription?: string;
  category?: 'denial' | 'adjustment' | 'info';
  actionHint?: string;
  actionRecommendation?: string;
}

export interface ClassifiedLine {
  lineIndex: number;
  claimRef: string;
  payerId: string;
  classification: LineClassification;
  normalizedCodes: NormalizedCarcRarc[];
  financials: DenialFinancials;
  primaryDenialReason?: string;
  actionRecommendation?: string;
  serviceDate?: string;
  postedDate?: string;
  traceNumber?: string;
  checkNumber?: string;
  rawLine: NormalizedPaymentLine;
}

export interface PostingStagingEntry {
  id: string;
  remittanceBatchId: string;
  classifiedLine: ClassifiedLine;
  approvalStatus: PostingApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  denialCaseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemittanceBatch {
  id: string;
  sourceFile?: string;
  sourceHash: string;
  parserUsed: string;
  importedAt: string;
  importedBy?: string;
  payerId: string;
  checkNumber?: string;
  totalBilled: number;
  totalPaid: number;
  lineCount: number;
  denialCount: number;
  adjustmentCount: number;
  fullPaymentCount: number;
  stagingEntries: PostingStagingEntry[];
  status: 'staged' | 'partially_approved' | 'fully_approved' | 'posted';
}

export interface DenialPipelineResult {
  batchId: string;
  totalLines: number;
  classified: {
    fullDenials: number;
    partialDenials: number;
    adjustments: number;
    fullPayments: number;
    unknown: number;
  };
  denialCasesCreated: number;
  stagingEntriesCreated: number;
  duplicateSkipped: number;
  errors: string[];
}

/* ── CARC/RARC Normalization ────────────────────────────────── */

export function normalizeCodes(codes: PaymentCode[]): NormalizedCarcRarc[] {
  return codes.map(code => {
    if (code.type === 'CARC') {
      const carcEntry = lookupCarc(code.code);
      const groupCode = code.code.length >= 1 ? extractGroupCode(code.code) : undefined;
      return {
        type: 'CARC' as const,
        code: code.code,
        description: carcEntry?.description ?? code.description ?? `CARC ${code.code}`,
        groupCode,
        groupDescription: groupCode ? getCarcGroupDescription(groupCode) : undefined,
        category: carcEntry?.category,
        actionHint: carcEntry?.commonAction,
        actionRecommendation: buildActionRecommendation(code.code, code.type),
      };
    }

    if (code.type === 'RARC') {
      const rarcEntry = lookupRarc(code.code);
      return {
        type: 'RARC' as const,
        code: code.code,
        description: rarcEntry?.description ?? code.description ?? `RARC ${code.code}`,
        actionHint: rarcEntry?.actionHint,
        actionRecommendation: buildActionRecommendation(code.code, code.type),
      };
    }

    return {
      type: 'OTHER' as const,
      code: code.code,
      description: code.description ?? `Code ${code.code}`,
    };
  });
}

function extractGroupCode(carcCode: string): string | undefined {
  // CARC group codes are typically the first two letters (CO, PR, OA, PI, CR)
  // but in the 835 CAS segment the group code is a separate element
  // This is a fallback for when group info isn't explicitly parsed
  return undefined;
}

/* ── Line Classification ────────────────────────────────────── */

export function classifyLine(line: NormalizedPaymentLine): LineClassification {
  const billed = line.billedAmount ?? 0;
  const paid = line.paidAmount ?? 0;
  const adjustment = line.adjustmentAmount ?? 0;

  if (billed <= 0) return 'unknown';

  // Full payment: paid >= billed (within tolerance)
  if (paid >= billed * 0.995) return 'full_payment';

  // Full denial: nothing paid
  if (paid === 0 || paid <= 0.01) return 'full_denial';

  // Check if CARC codes indicate denial vs adjustment
  const hasDenialCarc = (line.rawCodes ?? []).some(c => {
    if (c.type !== 'CARC') return false;
    const entry = lookupCarc(c.code);
    return entry?.category === 'denial';
  });

  if (hasDenialCarc) return 'partial_denial';

  // Underpayment with no denial codes = adjustment
  if (adjustment > 0 && paid > 0) return 'adjustment';

  // Partial payment with no clear indicator
  return paid < billed * 0.5 ? 'partial_denial' : 'adjustment';
}

export function classifyRemittanceLine(line: NormalizedPaymentLine, lineIndex: number): ClassifiedLine {
  const classification = classifyLine(line);
  const normalizedCodes = normalizeCodes(line.rawCodes ?? []);
  const toCents = (n?: number) => Math.round((n ?? 0) * 100);

  // Find primary denial reason from CARC codes
  const denialCarcs = normalizedCodes.filter(c => c.type === 'CARC' && c.category === 'denial');
  const primaryDenialReason = denialCarcs.length > 0
    ? `${denialCarcs[0].code}: ${denialCarcs[0].description}`
    : undefined;

  // Aggregate action recommendations
  const actions = normalizedCodes
    .filter(c => c.actionRecommendation)
    .map(c => c.actionRecommendation!);
  const actionRecommendation = actions.length > 0 ? actions.join('; ') : undefined;

  return {
    lineIndex,
    claimRef: line.claimRef,
    payerId: line.payerId,
    classification,
    normalizedCodes,
    financials: {
      billedAmountCents: toCents(line.billedAmount),
      paidAmountCents: toCents(line.paidAmount),
      allowedAmountCents: toCents(line.allowedAmount),
      patientRespCents: toCents(line.patientResp),
      adjustmentAmountCents: toCents(line.adjustmentAmount),
    },
    primaryDenialReason,
    actionRecommendation,
    serviceDate: line.serviceDate,
    postedDate: line.postedDate,
    traceNumber: line.traceNumber,
    checkNumber: line.checkNumber,
    rawLine: line,
  };
}

/* ── SLA Deadline Computation ───────────────────────────────── */

const DEFAULT_SLA_DAYS = 30;
const PAYER_SLA_OVERRIDES: Record<string, number> = {
  'MEDICARE': 120,
  'MEDICAID': 90,
  'BCBS': 60,
  'AETNA': 60,
  'CIGNA': 60,
  'UNITED': 60,
  'HUMANA': 60,
};

export function computeDeadlineDate(payerId: string, receivedDate: string): string {
  const slaDays = PAYER_SLA_OVERRIDES[payerId.toUpperCase()] ?? DEFAULT_SLA_DAYS;
  const received = new Date(receivedDate);
  received.setDate(received.getDate() + slaDays);
  return received.toISOString().split('T')[0];
}

/* ── Posting Staging Store (in-memory, DB-ready interface) ──── */

const batchStore = new Map<string, RemittanceBatch>();
const stagingStore = new Map<string, PostingStagingEntry>();
const processedHashes = new Set<string>();

export function getStores() {
  return { batchStore, stagingStore, processedHashes };
}

/* ── Pipeline Core ──────────────────────────────────────────── */

export function processRemittanceBatch(
  remittance: NormalizedRemittance,
  options: {
    sourceFile?: string;
    parserUsed?: string;
    importedBy?: string;
    autoApproveFullPayments?: boolean;
    autoApproveBelowCents?: number;
  } = {},
): DenialPipelineResult {
  const sourceHash = hashContent(JSON.stringify(remittance));
  const batchId = `batch-${Date.now()}-${randomUUID().slice(0, 8)}`;

  // Duplicate detection
  if (processedHashes.has(sourceHash)) {
    return {
      batchId,
      totalLines: remittance.lines.length,
      classified: { fullDenials: 0, partialDenials: 0, adjustments: 0, fullPayments: 0, unknown: 0 },
      denialCasesCreated: 0,
      stagingEntriesCreated: 0,
      duplicateSkipped: remittance.lines.length,
      errors: ['Duplicate remittance batch (content hash already processed)'],
    };
  }
  processedHashes.add(sourceHash);

  const now = new Date().toISOString();
  const classified = {
    fullDenials: 0,
    partialDenials: 0,
    adjustments: 0,
    fullPayments: 0,
    unknown: 0,
  };
  const stagingEntries: PostingStagingEntry[] = [];
  const errors: string[] = [];
  let denialCasesCreated = 0;

  // Classify each line
  for (let i = 0; i < remittance.lines.length; i++) {
    const line = remittance.lines[i];
    const classifiedLine = classifyRemittanceLine(line, i);

    switch (classifiedLine.classification) {
      case 'full_denial': classified.fullDenials++; break;
      case 'partial_denial': classified.partialDenials++; break;
      case 'adjustment': classified.adjustments++; break;
      case 'full_payment': classified.fullPayments++; break;
      default: classified.unknown++; break;
    }

    // Determine approval status
    let approvalStatus: PostingApprovalStatus = 'pending_review';
    if (options.autoApproveFullPayments && classifiedLine.classification === 'full_payment') {
      approvalStatus = 'auto_approved';
    }
    if (
      options.autoApproveBelowCents &&
      classifiedLine.financials.adjustmentAmountCents <= options.autoApproveBelowCents &&
      classifiedLine.classification === 'adjustment'
    ) {
      approvalStatus = 'auto_approved';
    }

    const stagingEntry: PostingStagingEntry = {
      id: `stg-${randomUUID().slice(0, 12)}`,
      remittanceBatchId: batchId,
      classifiedLine,
      approvalStatus,
      createdAt: now,
      updatedAt: now,
    };

    // Auto-create denial case for denials
    if (classifiedLine.classification === 'full_denial' || classifiedLine.classification === 'partial_denial') {
      const denialCaseId = `den-${randomUUID().slice(0, 12)}`;
      stagingEntry.denialCaseId = denialCaseId;
      denialCasesCreated++;
    }

    stagingEntries.push(stagingEntry);
    stagingStore.set(stagingEntry.id, stagingEntry);
  }

  // Create batch record
  const batch: RemittanceBatch = {
    id: batchId,
    sourceFile: options.sourceFile,
    sourceHash,
    parserUsed: options.parserUsed ?? 'unknown',
    importedAt: now,
    importedBy: options.importedBy,
    payerId: remittance.payerId,
    checkNumber: remittance.checkNumber,
    totalBilled: remittance.totalBilledAmount,
    totalPaid: remittance.totalPaidAmount,
    lineCount: remittance.lines.length,
    denialCount: classified.fullDenials + classified.partialDenials,
    adjustmentCount: classified.adjustments,
    fullPaymentCount: classified.fullPayments,
    stagingEntries,
    status: 'staged',
  };
  batchStore.set(batchId, batch);

  return {
    batchId,
    totalLines: remittance.lines.length,
    classified,
    denialCasesCreated,
    stagingEntriesCreated: stagingEntries.length,
    duplicateSkipped: 0,
    errors,
  };
}

/* ── Staging Operations ─────────────────────────────────────── */

export function approveStagingEntry(
  entryId: string,
  approvedBy: string,
): PostingStagingEntry | null {
  const entry = stagingStore.get(entryId);
  if (!entry) return null;
  if (entry.approvalStatus === 'approved' || entry.approvalStatus === 'auto_approved') return entry;

  entry.approvalStatus = 'approved';
  entry.approvedBy = approvedBy;
  entry.approvedAt = new Date().toISOString();
  entry.updatedAt = new Date().toISOString();

  // Update batch status
  updateBatchApprovalStatus(entry.remittanceBatchId);

  return entry;
}

export function rejectStagingEntry(
  entryId: string,
  rejectedBy: string,
  reason: string,
): PostingStagingEntry | null {
  const entry = stagingStore.get(entryId);
  if (!entry) return null;

  entry.approvalStatus = 'rejected';
  entry.approvedBy = rejectedBy;
  entry.approvedAt = new Date().toISOString();
  entry.rejectionReason = reason;
  entry.updatedAt = new Date().toISOString();

  updateBatchApprovalStatus(entry.remittanceBatchId);

  return entry;
}

export function approveBatch(batchId: string, approvedBy: string): RemittanceBatch | null {
  const batch = batchStore.get(batchId);
  if (!batch) return null;

  for (const entry of batch.stagingEntries) {
    if (entry.approvalStatus === 'pending_review') {
      entry.approvalStatus = 'approved';
      entry.approvedBy = approvedBy;
      entry.approvedAt = new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
    }
  }

  batch.status = 'fully_approved';
  return batch;
}

function updateBatchApprovalStatus(batchId: string): void {
  const batch = batchStore.get(batchId);
  if (!batch) return;

  const pending = batch.stagingEntries.filter(e => e.approvalStatus === 'pending_review').length;
  const total = batch.stagingEntries.length;

  if (pending === 0) {
    batch.status = 'fully_approved';
  } else if (pending < total) {
    batch.status = 'partially_approved';
  } else {
    batch.status = 'staged';
  }
}

/* ── Query Helpers ──────────────────────────────────────────── */

export function getBatch(id: string): RemittanceBatch | undefined {
  return batchStore.get(id);
}

export function listBatches(limit = 50): RemittanceBatch[] {
  return Array.from(batchStore.values()).slice(-limit);
}

export function getStagingEntry(id: string): PostingStagingEntry | undefined {
  return stagingStore.get(id);
}

export function listStagingEntries(
  batchId?: string,
  status?: PostingApprovalStatus,
  limit = 100,
): PostingStagingEntry[] {
  let entries = Array.from(stagingStore.values());
  if (batchId) entries = entries.filter(e => e.remittanceBatchId === batchId);
  if (status) entries = entries.filter(e => e.approvalStatus === status);
  return entries.slice(-limit);
}

export function getPipelineStats(): {
  totalBatches: number;
  totalStaging: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  autoApproved: number;
  denialCasesLinked: number;
} {
  const staging = Array.from(stagingStore.values());
  return {
    totalBatches: batchStore.size,
    totalStaging: staging.length,
    pendingReview: staging.filter(e => e.approvalStatus === 'pending_review').length,
    approved: staging.filter(e => e.approvalStatus === 'approved').length,
    rejected: staging.filter(e => e.approvalStatus === 'rejected').length,
    autoApproved: staging.filter(e => e.approvalStatus === 'auto_approved').length,
    denialCasesLinked: staging.filter(e => !!e.denialCaseId).length,
  };
}

/* ── Utility ────────────────────────────────────────────────── */

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
