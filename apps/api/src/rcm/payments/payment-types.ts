/**
 * Payment Tracking + Reconciliation -- Domain Types (Phase 92)
 *
 * Extends the existing Phase 38 Remittance model with:
 * - RemittanceBatch -- grouped file/upload tracking
 * - RemittanceLine -- per-line parsed data with match status
 * - PaymentPostingEvent -- audit-grade posting ledger
 * - UnderpaymentCase -- threshold-based underpayment detection
 * - AgingBucket -- outstanding AR aging
 * - PayerKPI -- payer intelligence metrics
 *
 * Evidence-first: "Paid" requires evidence (file, advice, bank ref).
 * In-memory stores. Resets on API restart (Phase 23 pattern).
 */

import { randomUUID } from 'node:crypto';

/* -- Remittance Batch ---------------------------------------- */

export type BatchSourceMode = 'manual_upload' | 'portal_export' | 'api' | 'rpa_planned';

export type BatchStatus =
  | 'created'
  | 'uploaded'
  | 'imported'
  | 'matched'
  | 'partially_matched'
  | 'needs_review'
  | 'closed';

export interface RemittanceBatch {
  id: string;
  tenantId: string;
  facilityId: string;
  payerId: string;
  payerName?: string;

  sourceMode: BatchSourceMode;
  receivedAt: string;

  /** File reference (opaque URI -- in-memory we just track filename) */
  fileUri?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  fileChecksum?: string;

  /** Redacted parse summary (no PHI in this blob) */
  parsedSummary?: {
    totalLines: number;
    totalPaidAmount: number; // cents
    totalBilledAmount: number; // cents
    totalAdjustments: number; // cents
    parseErrors: number;
    parsedAt: string;
  };

  status: BatchStatus;

  /** Matching stats */
  matchedCount: number;
  unmatchedCount: number;
  needsReviewCount: number;

  /** Metadata */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  isDemo: boolean;
}

/* -- Remittance Line ----------------------------------------- */

export type LineMatchStatus = 'unmatched' | 'matched' | 'needs_review' | 'manually_linked';

export interface RemittanceLine {
  id: string;
  batchId: string;
  tenantId: string;
  lineNumber: number;

  /** If remittance file contained our internal claim ID */
  claimId?: string;
  /** External claim reference (payer's number) */
  externalClaimRef?: string;
  /** Patient reference (redacted in logs) */
  patientRef?: string;

  /** Amounts in cents */
  amountBilled: number;
  amountPaid: number;
  amountAdjusted: number;
  patientResponsibility: number;

  /** Reason/adjustment text */
  adjustmentReasonCodes?: string[];
  reasonText?: string;

  /** Service info for fuzzy matching */
  serviceDate?: string;
  procedureCode?: string;

  /** Match result */
  matchStatus: LineMatchStatus;
  matchedClaimCaseId?: string;
  matchConfidence?: number; // 0-100
  matchMethod?: 'exact_id' | 'external_ref' | 'fuzzy' | 'manual';

  paidAt?: string;
}

/* -- Payment Posting Event ----------------------------------- */

export interface PaymentPostingEvent {
  id: string;
  claimCaseId: string;
  batchId: string;
  lineId: string;
  tenantId: string;

  actorUserId: string;
  postedAt: string;

  /** Status change applied */
  fromStatus: string;
  toStatus: string;

  /** Financial deltas (all cents, redacted of PHI) */
  deltaAmounts: {
    paidAmount: number;
    adjustmentAmount: number;
    patientResponsibility: number;
  };

  /** Evidence reference */
  evidenceRef: string; // batch fileUri or checksum
}

/* -- Underpayment Case --------------------------------------- */

export type UnderpaymentStatus = 'open' | 'appealed' | 'resolved' | 'written_off';

export interface UnderpaymentCase {
  id: string;
  tenantId: string;
  claimCaseId: string;
  batchId: string;
  lineId: string;

  expectedAmount: number; // cents (total charge from claim)
  paidAmount: number; // cents
  shortfallAmount: number; // cents
  shortfallPercent: number; // 0-100

  payerId: string;
  payerName?: string;

  status: UnderpaymentStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

/* -- Aging --------------------------------------------------- */

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null; // null = unbounded
  claimCount: number;
  totalOutstanding: number; // cents
}

export interface AgingReport {
  tenantId: string;
  generatedAt: string;
  buckets: AgingBucket[];
  totalOutstanding: number;
  totalClaims: number;
}

/* -- Payer KPI ----------------------------------------------- */

export interface PayerKPI {
  payerId: string;
  payerName?: string;

  /** Average calendar days from submission to first payment */
  avgDaysToPayment: number | null;
  /** Median days to payment */
  medianDaysToPayment: number | null;

  /** Claims denied / total claims */
  denialRate: number;
  /** Claims returned to provider / total */
  returnRate: number;
  /** Underpayment cases / total paid claims */
  underpaymentRate: number;

  /** Total claims in sample */
  totalClaims: number;
  totalPaid: number;
  totalDenied: number;
  totalUnderpaid: number;

  /** Period */
  periodStart: string;
  periodEnd: string;
}

export interface PayerIntelligenceReport {
  tenantId: string;
  generatedAt: string;
  payers: PayerKPI[];
  periodStart: string;
  periodEnd: string;
}

/* -- Export Bridge ------------------------------------------- */

export type ExportFormat = 'csv' | 'json';

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  content: string;
  mimeType: string;
  recordCount: number;
  generatedAt: string;
}

/** Pluggable export bridge interface */
export interface PaymentExportBridge {
  readonly name: string;
  readonly format: ExportFormat;
  exportBatch(batchId: string, tenantId: string): ExportResult | undefined;
}

/* -- Factory Helpers ----------------------------------------- */

export function newBatchId(): string {
  return randomUUID();
}
export function newLineId(): string {
  return randomUUID();
}
export function newPostingId(): string {
  return randomUUID();
}
export function newUnderpaymentId(): string {
  return randomUUID();
}
