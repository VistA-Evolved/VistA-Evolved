/**
 * Reconciliation Domain Model -- Phase 99
 *
 * Durable SQLite-backed payment reconciliation types.
 * Complements Phase 92 in-memory payment-types with persistent storage.
 *
 * VistA-first: VistA IB/AR remains authoritative ledger.
 * This module provides reconciliation overlay with full provenance.
 *
 * All financial amounts stored in cents (integer).
 */

import { z } from 'zod';

/* -- Remittance Import ---------------------------------------- */

export const REMITTANCE_SOURCE_TYPES = ['EDI_835', 'MANUAL', 'OTHER'] as const;
export type RemittanceSourceType = (typeof REMITTANCE_SOURCE_TYPES)[number];

export interface RemittanceImport {
  id: string;
  tenantId: string;
  createdAt: string;
  sourceType: RemittanceSourceType;
  receivedAt: string;
  fileHash: string | null;
  originalFilename: string | null;
  parserName: string | null;
  parserVersion: string | null;
  mappingVersion: string | null;
  lineCount: number;
  totalPaidCents: number;
  totalBilledCents: number;
  importedBy: string;
}

export const CreateRemittanceImportSchema = z.object({
  sourceType: z.enum(REMITTANCE_SOURCE_TYPES).default('MANUAL'),
  originalFilename: z.string().max(255).optional(),
  parserName: z.string().max(100).optional(),
  parserVersion: z.string().max(20).optional(),
  mappingVersion: z.string().max(20).optional(),
});

/* -- Payment Record ------------------------------------------- */

export const PAYMENT_STATUSES = [
  'IMPORTED',
  'MATCHED',
  'PARTIALLY_MATCHED',
  'UNMATCHED',
  'POSTED',
  'DISPUTED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PaymentCodeSchema = z.object({
  type: z.enum(['CARC', 'RARC', 'OTHER']),
  code: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
});
export type PaymentCode = z.infer<typeof PaymentCodeSchema>;

export interface PaymentRecord {
  id: string;
  tenantId: string;
  remittanceImportId: string;
  createdAt: string;
  claimRef: string;
  payerId: string;
  status: PaymentStatus;

  // Financials (cents)
  billedAmountCents: number;
  paidAmountCents: number;
  allowedAmountCents: number | null;
  patientRespCents: number | null;
  adjustmentAmountCents: number | null;

  // Reference
  traceNumber: string | null;
  checkNumber: string | null;
  postedDate: string | null;
  serviceDate: string | null;

  // Codes
  rawCodes: PaymentCode[];

  // Patient ref (stored, never logged)
  patientDfn: string | null;

  // Line index from import
  lineIndex: number;
}

export const CreatePaymentRecordSchema = z.object({
  claimRef: z.string().min(1).max(100),
  payerId: z.string().min(1).max(100),
  billedAmount: z.number().min(0),
  paidAmount: z.number().min(0),
  allowedAmount: z.number().min(0).optional(),
  patientResp: z.number().min(0).optional(),
  adjustmentAmount: z.number().min(0).optional(),
  traceNumber: z.string().max(100).optional(),
  checkNumber: z.string().max(100).optional(),
  postedDate: z.string().optional(),
  serviceDate: z.string().optional(),
  rawCodes: z.array(PaymentCodeSchema).max(50).default([]),
  patientDfn: z.string().max(50).optional(),
});
export type CreatePaymentRecordInput = z.infer<typeof CreatePaymentRecordSchema>;

/* -- Manual Payment Entry (single payment, not from import) -- */

export const ManualPaymentEntrySchema = z.object({
  claimRef: z.string().min(1).max(100),
  payerId: z.string().min(1).max(100),
  billedAmount: z.number().min(0),
  paidAmount: z.number().min(0),
  allowedAmount: z.number().min(0).optional(),
  patientResp: z.number().min(0).optional(),
  adjustmentAmount: z.number().min(0).optional(),
  traceNumber: z.string().max(100).optional(),
  checkNumber: z.string().max(100).optional(),
  postedDate: z.string().optional(),
  serviceDate: z.string().optional(),
  rawCodes: z.array(PaymentCodeSchema).max(50).default([]),
  patientDfn: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});
export type ManualPaymentEntryInput = z.infer<typeof ManualPaymentEntrySchema>;

/* -- Reconciliation Match ------------------------------------- */

export const MATCH_METHODS = [
  'EXACT_CLAIM_REF',
  'TRACE_NUMBER',
  'PATIENT_DOS_AMOUNT',
  'MANUAL',
] as const;
export type MatchMethod = (typeof MATCH_METHODS)[number];

export const MATCH_STATUSES = ['AUTO_MATCHED', 'REVIEW_REQUIRED', 'CONFIRMED', 'REJECTED'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export interface ReconciliationMatch {
  id: string;
  tenantId: string;
  createdAt: string;
  paymentId: string;
  claimRef: string;
  matchConfidence: number; // 0-100
  matchMethod: MatchMethod;
  matchStatus: MatchStatus;
  matchNotes: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export const ConfirmMatchSchema = z.object({
  matchStatus: z.enum(['CONFIRMED', 'REJECTED']),
  notes: z.string().max(2000).optional(),
});

/* -- Underpayment Case ---------------------------------------- */

export const EXPECTED_AMOUNT_MODELS = [
  'BILLED_AMOUNT',
  'CONTRACT_MODEL',
  'MANUAL_EXPECTED',
] as const;
export type ExpectedAmountModel = (typeof EXPECTED_AMOUNT_MODELS)[number];

export const UNDERPAYMENT_STATUSES = [
  'NEW',
  'INVESTIGATING',
  'APPEALING',
  'RESOLVED',
  'WRITTEN_OFF',
] as const;
export type UnderpaymentStatus = (typeof UNDERPAYMENT_STATUSES)[number];

export const UNDERPAYMENT_TRANSITIONS: Record<UnderpaymentStatus, readonly UnderpaymentStatus[]> = {
  NEW: ['INVESTIGATING', 'APPEALING', 'RESOLVED', 'WRITTEN_OFF'],
  INVESTIGATING: ['APPEALING', 'RESOLVED', 'WRITTEN_OFF'],
  APPEALING: ['RESOLVED', 'WRITTEN_OFF'],
  RESOLVED: [], // terminal
  WRITTEN_OFF: [], // terminal
};

export function isValidUnderpaymentTransition(
  from: UnderpaymentStatus,
  to: UnderpaymentStatus
): boolean {
  return UNDERPAYMENT_TRANSITIONS[from].includes(to);
}

export interface UnderpaymentCase {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  claimRef: string;
  paymentId: string;
  payerId: string;

  expectedAmountModel: ExpectedAmountModel;
  expectedAmountCents: number;
  paidAmountCents: number;
  deltaCents: number; // expected - paid

  status: UnderpaymentStatus;
  denialCaseId: string | null; // link to Phase 98 denial case

  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

export const CreateUnderpaymentSchema = z.object({
  claimRef: z.string().min(1).max(100),
  paymentId: z.string().min(1),
  payerId: z.string().min(1).max(100),
  expectedAmountModel: z.enum(EXPECTED_AMOUNT_MODELS).default('BILLED_AMOUNT'),
  expectedAmount: z.number().min(0),
  paidAmount: z.number().min(0),
});

export const UpdateUnderpaymentSchema = z.object({
  status: z.enum(UNDERPAYMENT_STATUSES).optional(),
  resolutionNote: z.string().max(2000).optional(),
  reason: z.string().min(1).max(500),
});

/* -- EDI 835 Parser Adapter ----------------------------------- */

export interface NormalizedPaymentLine {
  claimRef: string;
  payerId: string;
  billedAmount: number; // dollars
  paidAmount: number; // dollars
  allowedAmount?: number;
  patientResp?: number;
  adjustmentAmount?: number;
  traceNumber?: string;
  checkNumber?: string;
  postedDate?: string;
  serviceDate?: string;
  patientDfn?: string;
  rawCodes: PaymentCode[];
}

export interface NormalizedRemittance {
  lines: NormalizedPaymentLine[];
  payerId: string;
  checkNumber?: string;
  totalPaidAmount: number; // dollars
  totalBilledAmount: number; // dollars
  parseErrors: string[];
}

/** Adapter interface for EDI 835 parsing -- swap parser without refactor */
export interface Edi835Parser {
  readonly name: string;
  readonly version: string;
  parse(content: string): NormalizedRemittance;
}

/* -- Batch 835 Import Schema ---------------------------------- */

export const Import835PaymentSchema = z.object({
  claimRef: z.string().min(1),
  payerId: z.string().min(1),
  billedAmount: z.number().min(0),
  paidAmount: z.number().min(0),
  allowedAmount: z.number().min(0).optional(),
  patientResp: z.number().min(0).optional(),
  adjustmentAmount: z.number().min(0).optional(),
  traceNumber: z.string().max(100).optional(),
  checkNumber: z.string().max(100).optional(),
  postedDate: z.string().optional(),
  serviceDate: z.string().optional(),
  patientDfn: z.string().optional(),
  rawCodes: z.array(PaymentCodeSchema).max(50).default([]),
});

export const ImportRemittanceBatchSchema = z.object({
  entries: z.array(Import835PaymentSchema).min(1).max(1000),
  sourceType: z.enum(REMITTANCE_SOURCE_TYPES).default('EDI_835'),
  originalFilename: z.string().max(255).optional(),
  parserVersion: z.string().max(20).default('1.0.0'),
});
export type ImportRemittanceBatchInput = z.infer<typeof ImportRemittanceBatchSchema>;

/* -- List Queries --------------------------------------------- */

export const PaymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PAYMENT_STATUSES).optional(),
  payerId: z.string().optional(),
  remittanceImportId: z.string().optional(),
  sort: z.enum(['createdAt', 'paidAmountCents', 'claimRef']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type PaymentListQuery = z.infer<typeof PaymentListQuerySchema>;

export const UnderpaymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(UNDERPAYMENT_STATUSES).optional(),
  payerId: z.string().optional(),
  sort: z.enum(['createdAt', 'deltaCents', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type UnderpaymentListQuery = z.infer<typeof UnderpaymentListQuerySchema>;

/* -- Reconciliation Stats ------------------------------------- */

export interface ReconciliationStats {
  totalImports: number;
  totalPayments: number;
  matchedPayments: number;
  unmatchedPayments: number;
  totalPaidCents: number;
  totalUnderpayments: number;
  openUnderpayments: number;
  totalDeltaCents: number;
}
