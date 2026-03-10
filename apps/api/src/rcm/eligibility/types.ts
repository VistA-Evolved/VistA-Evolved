/**
 * Phase 100 -- Eligibility + Claim Status Polling Framework
 *
 * Domain types for durable eligibility checks and claim status checks.
 * Provenance tracking ensures every result records its source adapter.
 */

/* -- Provenance ----------------------------------------------- */

export type EligibilityProvenance =
  | 'MANUAL'
  | 'SANDBOX'
  | 'EDI_270_271'
  | 'CLEARINGHOUSE'
  | 'PORTAL';

export type ClaimStatusProvenance =
  | 'MANUAL'
  | 'SANDBOX'
  | 'EDI_276_277'
  | 'CLEARINGHOUSE'
  | 'PORTAL';

/* -- Eligibility Check ---------------------------------------- */

export interface EligibilityCheckRequest {
  patientDfn: string;
  payerId: string;
  subscriberId?: string;
  memberId?: string;
  dateOfService?: string;
  provenance: EligibilityProvenance;
  /** For MANUAL provenance: user-supplied result */
  manualResult?: {
    eligible: boolean;
    coverageType?: string;
    notes?: string;
  };
  tenantId?: string;
}

export interface EligibilityCheckRecord {
  id: string;
  patientDfn: string;
  payerId: string;
  subscriberId: string | null;
  memberId: string | null;
  dateOfService: string | null;
  provenance: EligibilityProvenance;
  eligible: boolean | null;
  status: 'completed' | 'failed' | 'pending' | 'integration_pending';
  responseJson: string | null; // Full adapter response (JSON stringified)
  errorMessage: string | null;
  responseMs: number | null;
  checkedBy: string | null; // DUZ or system
  tenantId: string;
  createdAt: string; // ISO 8601
}

/* -- Claim Status Check --------------------------------------- */

export interface ClaimStatusCheckRequest {
  claimRef: string;
  payerId: string;
  payerClaimId?: string;
  provenance: ClaimStatusProvenance;
  /** For MANUAL provenance: user-supplied status */
  manualResult?: {
    claimStatus: string;
    adjudicationDate?: string;
    paidAmountCents?: number;
    notes?: string;
  };
  tenantId?: string;
}

export interface ClaimStatusCheckRecord {
  id: string;
  claimRef: string;
  payerId: string;
  payerClaimId: string | null;
  provenance: ClaimStatusProvenance;
  claimStatus: string | null;
  adjudicationDate: string | null;
  paidAmountCents: number | null;
  status: 'completed' | 'failed' | 'pending' | 'integration_pending';
  responseJson: string | null;
  errorMessage: string | null;
  responseMs: number | null;
  checkedBy: string | null;
  tenantId: string;
  createdAt: string;
}

/* -- Schedule Request ----------------------------------------- */

export interface ClaimStatusScheduleRequest {
  claimRef: string;
  payerId: string;
  payerClaimId?: string;
  intervalMinutes?: number; // default 10
  maxPolls?: number; // default 10
}

/* -- Stats ---------------------------------------------------- */

export interface EligibilityStats {
  totalChecks: number;
  completedChecks: number;
  failedChecks: number;
  eligibleCount: number;
  ineligibleCount: number;
  unknownCount: number;
  byProvenance: Record<string, number>;
  avgResponseMs: number | null;
}

export interface ClaimStatusStats {
  totalChecks: number;
  completedChecks: number;
  failedChecks: number;
  byProvenance: Record<string, number>;
  byClaimStatus: Record<string, number>;
  avgResponseMs: number | null;
}
