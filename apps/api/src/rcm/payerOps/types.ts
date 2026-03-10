/**
 * PayerOps Domain Types -- Phase 87+89: Philippines RCM Foundation + LOA Engine v1
 *
 * Core entities for payer operations workflow:
 *   - FacilityPayerEnrollment -- payer x facility status tracking
 *   - LOACase -- Letter of Authorization request lifecycle
 *   - LOAPack -- generated submission pack history
 *   - CredentialVaultEntry -- secure document storage for accreditation artifacts
 *   - PayerOpsAdapterResult -- canonical result type for adapter operations
 *
 * Design:
 *   - VistA-first: clinical data from VistA RPCs, never duplicated
 *   - Manual-first: all adapters start in MANUAL mode
 *   - No fake green: unsupported operations return status "manual_required"
 *   - Registry-sourced: payer list from Insurance Commission / regulator data
 *   - SLA-tracked: every LOA case has deadlines and risk levels (Phase 89)
 */

/* -- Facility-Payer Enrollment -------------------------------- */

export type EnrollmentStatus =
  | 'not_enrolled'
  | 'application_submitted'
  | 'pending_accreditation'
  | 'active'
  | 'renewal_required'
  | 'suspended'
  | 'terminated';

export interface FacilityPayerEnrollment {
  id: string;
  tenantId: string;
  facilityId: string;
  facilityName: string;
  payerId: string;
  payerName: string;
  status: EnrollmentStatus;
  /** Encrypted reference IDs to credential vault entries */
  credentialVaultRefs: string[];
  accreditationDate?: string;
  expiryDate?: string;
  renewalDueDate?: string;
  /** Integration mode for this enrollment (manual/portal/api) */
  integrationMode: 'manual' | 'portal' | 'api';
  portalUrl?: string;
  portalInstructions?: string;
  enrollmentNotes?: string;
  timeline: EnrollmentTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentTimelineEvent {
  timestamp: string;
  action: string;
  actor: string;
  detail?: string;
}

/* -- LOA Case (Letter of Authorization) ----------------------- */

export type LOAStatus =
  | 'draft'
  | 'pending_submission'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'partially_approved'
  | 'denied'
  | 'expired'
  | 'cancelled';

export type LOARequestType =
  | 'initial_loa'
  | 'extension'
  | 'upgrade'
  | 'second_opinion'
  | 'pre_auth'
  | 'guarantee_letter';

/* -- LOA SLA / Queue fields (Phase 89) ------------------------ */

export type LOASLARiskLevel = 'on_track' | 'at_risk' | 'overdue' | 'critical';

export type LOAPriority = 'routine' | 'urgent' | 'stat';

export interface LOACase {
  id: string;
  tenantId: string;
  facilityId: string;
  /** Patient DFN -- clinical data fetched from VistA at render time */
  patientDfn: string;
  /** Optional encounter IEN from VistA */
  encounterIen?: string;
  payerId: string;
  payerName: string;
  /** Member/subscriber ID with the payer */
  memberId?: string;
  planName?: string;
  requestType: LOARequestType;
  /** Requested services (procedure codes, descriptions) */
  requestedServices: LOARequestedService[];
  /** Diagnosis codes supporting the request */
  diagnosisCodes: LOADiagnosisCode[];
  /** Attachment references (credential vault entry IDs) */
  attachmentRefs: string[];
  status: LOAStatus;
  /** Payer reference number (after submission) */
  payerRefNumber?: string;
  /** Approved amount (if applicable) */
  approvedAmount?: number;
  /** Approved services (may differ from requested) */
  approvedServices?: string[];
  /** Denial reason (if denied) */
  denialReason?: string;
  /** Timeline of status changes */
  timeline: LOATimelineEvent[];
  /** Submission method used */
  submissionMode: 'manual' | 'portal' | 'api';
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  /* -- Phase 89: SLA + Queue fields ---------------------------- */

  /** Priority level (routine / urgent / stat) */
  priority: LOAPriority;
  /** Staff user assigned to this LOA case */
  assignedTo?: string;
  /** ISO date-time: SLA deadline for payer response */
  slaDeadline?: string;
  /** Computed SLA risk level (recomputed on read) */
  slaRiskLevel: LOASLARiskLevel;
  /** Clinical urgency notes (e.g., scheduled surgery date) */
  urgencyNotes?: string;
  /** Associated enrollment ID -- links LOA to payer enrollment */
  enrollmentId?: string;
  /** History of generated submission packs */
  packHistory: LOAPack[];
  /** Last reminder sent ISO timestamp */
  lastReminderAt?: string;
  /** Number of follow-up reminders sent */
  reminderCount: number;
}

/* -- LOA Pack (Phase 89) -------------------------------------- */

export interface LOAPack {
  id: string;
  loaId: string;
  generatedAt: string;
  generatedBy: string;
  /** Pack format: structured JSON manifest with sections */
  format: 'manifest';
  /** Sections included in the pack */
  sections: LOAPackSection[];
  /** Checklist items for manual submission */
  checklist: string[];
  /** Email template for fax/email submission */
  emailTemplate: { subject: string; body: string };
  /** Payer-specific instructions (from portal adapter if available) */
  payerInstructions?: string;
  /** Credential vault entry IDs included in the pack */
  includedCredentials: string[];
}

export interface LOAPackSection {
  heading: string;
  content: string;
}

export interface LOARequestedService {
  code: string;
  description: string;
  quantity?: number;
  estimatedCost?: number;
}

export interface LOADiagnosisCode {
  code: string;
  description: string;
  type: 'primary' | 'secondary';
}

export interface LOATimelineEvent {
  timestamp: string;
  fromStatus?: LOAStatus;
  toStatus: LOAStatus;
  actor: string;
  reason?: string;
  detail?: string;
}

/* Valid LOA status transitions */
export const LOA_TRANSITIONS: Record<LOAStatus, LOAStatus[]> = {
  draft: ['pending_submission', 'cancelled'],
  pending_submission: ['submitted', 'cancelled'],
  submitted: ['under_review', 'approved', 'partially_approved', 'denied', 'cancelled'],
  under_review: ['approved', 'partially_approved', 'denied'],
  approved: ['expired'],
  partially_approved: ['expired'],
  denied: [],
  expired: [],
  cancelled: [],
};

/* -- Credential Vault ----------------------------------------- */

export type CredentialDocType =
  | 'prc_license'
  | 'facility_license'
  | 'bir_registration'
  | 'philhealth_accreditation'
  | 'doh_license'
  | 'professional_license'
  | 'malpractice_insurance'
  | 'hmo_accreditation'
  | 'other';

export interface CredentialVaultEntry {
  id: string;
  tenantId: string;
  facilityId: string;
  docType: CredentialDocType;
  title: string;
  /** Original filename */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** Storage path (local dev: disk; prod: S3-compatible) */
  storagePath: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA-256 hash of the file content for integrity verification */
  contentHash: string;
  /** Issuing authority */
  issuedBy?: string;
  /** Issue date */
  issueDate?: string;
  /** Expiry date -- renewal reminders triggered from this */
  expiryDate?: string;
  /** Days before expiry to trigger reminder */
  renewalReminderDays: number;
  /** Associated payer IDs (for payer-specific accreditation docs) */
  associatedPayerIds: string[];
  /** Notes */
  notes?: string;
  /** Encrypted envelope key for at-rest encryption */
  encryptionKeyRef?: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
}

/* -- Adapter Result Types ------------------------------------- */

export type PayerOpsResultStatus = 'success' | 'manual_required' | 'not_supported' | 'error';

export interface PayerOpsEvidence {
  requestId?: string;
  rawReference?: string;
  timestamp: string;
  modeUsed: 'manual' | 'portal' | 'api';
}

export interface PayerOpsAudit {
  redactionsApplied: boolean;
  correlationId: string;
}

export interface PayerOpsResult<T = unknown> {
  status: PayerOpsResultStatus;
  data?: T;
  evidence: PayerOpsEvidence;
  audit: PayerOpsAudit;
  message?: string;
}

/* -- Adapter Interface ---------------------------------------- */

export interface PayerOpsAdapter {
  readonly id: string;
  readonly name: string;
  readonly mode: 'manual' | 'portal' | 'api';

  capabilities(): {
    eligibility: boolean;
    loa: boolean;
    claims: boolean;
    claimStatus: boolean;
    remittance: boolean;
  };

  submitLOA(loaCase: LOACase): Promise<PayerOpsResult<{ submissionRef?: string }>>;

  checkEligibility(params: {
    patientDfn: string;
    payerId: string;
    memberId?: string;
  }): Promise<PayerOpsResult<{ eligible?: boolean; details?: string }>>;

  submitClaim(params: {
    claimId: string;
    payerId: string;
  }): Promise<PayerOpsResult<{ trackingId?: string }>>;

  pollClaimStatus(params: {
    claimId: string;
    payerId: string;
  }): Promise<PayerOpsResult<{ status?: string; details?: string }>>;

  ingestRemittance(params: {
    payerId: string;
    rawData: string;
  }): Promise<PayerOpsResult<{ remittanceId?: string }>>;
}
