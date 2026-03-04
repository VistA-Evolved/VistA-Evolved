/**
 * Denial & Appeals Domain Model — Phase 98
 *
 * VistA-first: VistA IB/AR/PCE remains authoritative billing ledger.
 * This module provides denial workflow overlay with durable persistence.
 *
 * All financial amounts are stored in cents (integer) to avoid
 * floating-point rounding issues.
 */

import { z } from 'zod';

/* ── Denial Status FSM ──────────────────────────────────────── */

export const DENIAL_STATUSES = [
  'NEW',
  'TRIAGED',
  'APPEALING',
  'RESUBMITTED',
  'PAID',
  'PARTIAL',
  'WRITEOFF',
  'CLOSED',
] as const;

export type DenialStatus = (typeof DENIAL_STATUSES)[number];

/** Valid transitions — key is current state, value is allowed next states */
export const DENIAL_TRANSITIONS: Record<DenialStatus, readonly DenialStatus[]> = {
  NEW: ['TRIAGED', 'APPEALING', 'WRITEOFF', 'CLOSED'],
  TRIAGED: ['APPEALING', 'RESUBMITTED', 'WRITEOFF', 'CLOSED'],
  APPEALING: ['RESUBMITTED', 'PAID', 'PARTIAL', 'WRITEOFF', 'CLOSED'],
  RESUBMITTED: ['PAID', 'PARTIAL', 'APPEALING', 'WRITEOFF', 'CLOSED'],
  PAID: ['CLOSED'],
  PARTIAL: ['APPEALING', 'WRITEOFF', 'CLOSED'],
  WRITEOFF: ['CLOSED'],
  CLOSED: [], // terminal
};

export function isValidDenialTransition(from: DenialStatus, to: DenialStatus): boolean {
  return DENIAL_TRANSITIONS[from].includes(to);
}

/* ── Denial Source ──────────────────────────────────────────── */

export const DENIAL_SOURCES = ['MANUAL', 'EDI_835', 'PORTAL_STATUS', 'OTHER'] as const;
export type DenialSource = (typeof DENIAL_SOURCES)[number];

/* ── Denial Code ────────────────────────────────────────────── */

export const DENIAL_CODE_TYPES = ['CARC', 'RARC', 'OTHER'] as const;
export type DenialCodeType = (typeof DENIAL_CODE_TYPES)[number];

export const DenialCodeSchema = z.object({
  type: z.enum(DENIAL_CODE_TYPES),
  code: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
  evidenceRef: z.string().max(200).optional(),
});

export type DenialCode = z.infer<typeof DenialCodeSchema>;

/* ── Financial Fields ───────────────────────────────────────── */

export const DenialFinancialsSchema = z.object({
  billedAmountCents: z.number().int().min(0),
  allowedAmountCents: z.number().int().min(0).optional(),
  paidAmountCents: z.number().int().min(0).optional(),
  patientRespCents: z.number().int().min(0).optional(),
  adjustmentAmountCents: z.number().int().min(0).optional(),
});

export type DenialFinancials = z.infer<typeof DenialFinancialsSchema>;

/* ── Evidence Reference ─────────────────────────────────────── */

export const EvidenceRefSchema = z.object({
  refType: z.enum(['document', 'screenshot', 'remittance_hash', 'clinical_note_ref', 'other']),
  label: z.string().min(1).max(200),
  storedPath: z.string().max(500).optional(), // reference only — no raw PHI
  sha256: z.string().max(64).optional(),
  addedAt: z.string(), // ISO 8601
  addedBy: z.string().max(100).optional(),
});

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

/* ── DenialCase ─────────────────────────────────────────────── */

export interface DenialCase {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Claim linkage
  claimRef: string; // internal claim ID or VistA claim ref
  vistaClaimIen: string | null; // VistA IB(350) IEN if available

  // Patient — minimal reference, never logged
  patientDfn: string | null; // VistA DFN; not stored in audit

  // Payer
  payerId: string; // links to payer registry

  // Status
  denialStatus: DenialStatus;
  denialSource: DenialSource;

  // Codes
  denialCodes: DenialCode[]; // JSON-serialized in DB

  // Narrative
  denialNarrative: string | null;

  // Dates
  receivedDate: string; // ISO 8601
  deadlineDate: string | null; // SLA deadline

  // Assignment
  assignedTo: string | null; // user ID or name
  assignedTeam: string | null;

  // Financials
  financials: DenialFinancials;

  // Evidence
  evidenceRefs: EvidenceRef[]; // JSON-serialized in DB

  // Import provenance
  importFileHash: string | null;
  importTimestamp: string | null;
  importParserVersion: string | null;
}

/* ── Create Denial Input ────────────────────────────────────── */

export const CreateDenialSchema = z.object({
  claimRef: z.string().min(1).max(100),
  vistaClaimIen: z.string().max(50).optional(),
  patientDfn: z.string().max(50).optional(),
  payerId: z.string().min(1).max(100),
  denialSource: z.enum(DENIAL_SOURCES).default('MANUAL'),
  denialCodes: z.array(DenialCodeSchema).min(0).max(50),
  denialNarrative: z.string().max(2000).optional(),
  receivedDate: z.string().optional(), // defaults to now
  deadlineDate: z.string().optional(),
  assignedTo: z.string().max(100).optional(),
  assignedTeam: z.string().max(100).optional(),
  billedAmount: z.number().min(0), // in dollars (converted to cents internally)
  allowedAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  patientResp: z.number().min(0).optional(),
  adjustmentAmount: z.number().min(0).optional(),
});

export type CreateDenialInput = z.infer<typeof CreateDenialSchema>;

/* ── Update Denial Input ────────────────────────────────────── */

export const UpdateDenialSchema = z.object({
  denialStatus: z.enum(DENIAL_STATUSES).optional(),
  denialNarrative: z.string().max(2000).optional(),
  deadlineDate: z.string().optional(),
  assignedTo: z.string().max(100).optional(),
  assignedTeam: z.string().max(100).optional(),
  denialCodes: z.array(DenialCodeSchema).max(50).optional(),
  reason: z.string().min(1).max(500), // required for audit
});

export type UpdateDenialInput = z.infer<typeof UpdateDenialSchema>;

/* ── Denial Action ──────────────────────────────────────────── */

export const DENIAL_ACTION_TYPES = [
  'NOTE',
  'ASSIGN',
  'REQUEST_INFO',
  'GENERATE_APPEAL_PACKET',
  'SUBMIT_APPEAL',
  'SUBMIT_CORRECTION',
  'MARK_RESOLVED',
  'MARK_WRITE_OFF',
  'STATUS_CHANGE',
  'IMPORT',
] as const;

export type DenialActionType = (typeof DENIAL_ACTION_TYPES)[number];

export interface DenialAction {
  id: string;
  denialId: string;
  actor: string;
  timestamp: string;
  actionType: DenialActionType;
  payload: Record<string, unknown>; // validated, no PHI
  previousStatus: DenialStatus | null;
  newStatus: DenialStatus | null;
}

export const CreateDenialActionSchema = z.object({
  actionType: z.enum(DENIAL_ACTION_TYPES),
  payload: z.record(z.string(), z.unknown()).default({}),
  note: z.string().max(2000).optional(),
});

export type CreateDenialActionInput = z.infer<typeof CreateDenialActionSchema>;

/* ── Resubmission Attempt ───────────────────────────────────── */

export const RESUBMISSION_METHODS = ['MAIL', 'PORTAL', 'EDI', 'FAX', 'OTHER'] as const;
export type ResubmissionMethod = (typeof RESUBMISSION_METHODS)[number];

export interface ResubmissionAttempt {
  id: string;
  denialId: string;
  createdAt: string;
  method: ResubmissionMethod;
  referenceNumber: string | null;
  followUpDate: string | null;
  notes: string | null;
  actor: string;
}

export const CreateResubmissionSchema = z.object({
  method: z.enum(RESUBMISSION_METHODS),
  referenceNumber: z.string().max(100).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateResubmissionInput = z.infer<typeof CreateResubmissionSchema>;

/* ── Attachment Reference ───────────────────────────────────── */

export interface DenialAttachment {
  id: string;
  denialId: string;
  label: string;
  refType: string;
  storedPath: string | null;
  sha256: string | null;
  addedAt: string;
  addedBy: string | null;
}

/* ── Appeal Packet ──────────────────────────────────────────── */

export interface AppealPacketMeta {
  denialId: string;
  generatedAt: string;
  coverLetterHtml: string;
  claimSummary: Record<string, unknown>;
  denialSummary: {
    codes: DenialCode[];
    narrative: string | null;
    receivedDate: string;
    deadlineDate: string | null;
  };
  attachmentChecklist: { label: string; present: boolean }[];
  timeline: DenialAction[];
  note: string; // "Credentials not stored; portal submission manual unless automation installed"
}

/* ── SLA Config ─────────────────────────────────────────────── */

export const DEFAULT_SLA_DAYS = 30;

export interface SlaConfig {
  defaultDays: number;
  payerOverrides: Record<string, number>; // payerId → days
}

/* ── Pagination ─────────────────────────────────────────────── */

export const DenialListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(DENIAL_STATUSES).optional(),
  payerId: z.string().optional(),
  assignedTo: z.string().optional(),
  slaDueWithinDays: z.coerce.number().int().min(0).optional(),
  codeType: z.enum(DENIAL_CODE_TYPES).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  sort: z.enum(['createdAt', 'deadlineDate', 'billedAmount', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type DenialListQuery = z.infer<typeof DenialListQuerySchema>;

/* ── 835 Import ─────────────────────────────────────────────── */

export const ImportRemittanceDenialSchema = z.object({
  claimRef: z.string().min(1),
  payerId: z.string().min(1),
  patientDfn: z.string().optional(),
  denialCodes: z.array(DenialCodeSchema).min(1),
  billedAmount: z.number().min(0),
  paidAmount: z.number().min(0).optional(),
  allowedAmount: z.number().min(0).optional(),
  adjustmentAmount: z.number().min(0).optional(),
  receivedDate: z.string().optional(),
  remittanceRef: z.string().optional(),
});

export const Import835BatchSchema = z.object({
  entries: z.array(ImportRemittanceDenialSchema).min(1).max(500),
  importFileHash: z.string().max(64).optional(),
  parserVersion: z.string().max(20).default('1.0.0'),
});

export type Import835BatchInput = z.infer<typeof Import835BatchSchema>;
