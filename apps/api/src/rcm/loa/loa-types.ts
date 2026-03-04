/**
 * LOA Types — Phase 94: PH HMO Workflow Automation
 *
 * Letter of Authorization (LOA) domain types for PH HMO workflow.
 *
 * LOA is an orchestration object — it tracks the billing staff's
 * interaction with payers to obtain pre-authorization. It is NOT
 * clinical truth. VistA encounters/orders are the source of truth
 * for clinical data referenced by the LOA.
 *
 * Lifecycle: draft -> submitted -> pending -> approved / denied / expired / cancelled
 */

/* ── LOA Status ─────────────────────────────────────────────── */

export type LoaStatus =
  | 'draft' // being prepared by billing staff
  | 'submitted' // sent to payer (portal/email/fax)
  | 'pending' // awaiting payer response
  | 'approved' // payer approved the authorization
  | 'denied' // payer denied the authorization
  | 'expired' // authorization expired (time-limited)
  | 'cancelled'; // cancelled by billing staff

export const LOA_STATUS_ORDER: LoaStatus[] = [
  'draft',
  'submitted',
  'pending',
  'approved',
  'denied',
  'expired',
  'cancelled',
];

export const LOA_TRANSITIONS: Record<LoaStatus, LoaStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['pending', 'approved', 'denied', 'cancelled'],
  pending: ['approved', 'denied', 'expired', 'cancelled'],
  approved: ['expired'],
  denied: ['draft'], // can retry
  expired: ['draft'], // can re-request
  cancelled: [],
};

export function isValidLoaTransition(from: LoaStatus, to: LoaStatus): boolean {
  return LOA_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ── Submission Mode ────────────────────────────────────────── */

export type LoaSubmissionMode = 'manual' | 'portal' | 'email';

/* ── LOA Attachment ─────────────────────────────────────────── */

export interface LoaAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Stored as opaque reference — no PHI in metadata */
  storageRef: string;
  uploadedAt: string;
  uploadedBy: string;
  /** Category for billing staff workflow */
  category: 'clinical_note' | 'order' | 'lab_result' | 'imaging_report' | 'other';
}

/* ── VistA Source Annotation ────────────────────────────────── */

export interface VistaFieldSource {
  field: string;
  vistaSource: string | null; // RPC or file ref if available
  status: 'available' | 'integration_pending';
  targetRpc?: string; // target RPC if integration pending
  targetRoutine?: string; // target M routine
  notes?: string;
}

/* ── LOA Checklist Item ─────────────────────────────────────── */

export interface LoaChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

/* ── LOA Audit Entry ────────────────────────────────────────── */

export interface LoaAuditEntry {
  timestamp: string;
  action: string;
  actor: string; // DUZ or system
  fromStatus?: LoaStatus;
  toStatus?: LoaStatus;
  detail?: string;
}

/* ── LOA Request ────────────────────────────────────────────── */

export interface LoaRequest {
  id: string;
  tenantId: string;
  status: LoaStatus;
  submissionMode: LoaSubmissionMode;

  // Patient (orchestration reference only — VistA is source of truth)
  patientDfn: string;
  patientName?: string; // display only, redacted in logs

  // Encounter context
  encounterDate: string; // ISO date
  encounterIen?: string; // VistA visit IEN if available

  // Requested services
  diagnosisCodes: Array<{
    code: string;
    codeSystem: 'ICD10';
    description?: string;
  }>;
  procedureCodes: Array<{
    code: string;
    codeSystem: 'CPT' | 'HCPCS';
    description?: string;
  }>;

  // Provider / Facility
  providerName?: string;
  providerDuz?: string;
  facilityName?: string;

  // Payer
  payerId: string;
  payerName?: string;
  memberId?: string; // patient's HMO card number

  // Payer response
  loaReferenceNumber?: string; // assigned by payer
  approvedDate?: string;
  expirationDate?: string;
  denialReason?: string;

  // Attachments (secure references, no inline PHI)
  attachments: LoaAttachment[];

  // Operational checklist
  checklist: LoaChecklistItem[];

  // Portal deep link (from Phase 93 registry)
  portalUrl?: string;

  // Audit
  auditTrail: LoaAuditEntry[];
  assignedTo?: string; // DUZ of assigned billing staff
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
