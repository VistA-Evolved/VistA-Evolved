/**
 * RCM Domain -- Remittance / EOB Types
 *
 * Phase 38: Models for 835 remittance advice, EOB, and adjustment reason codes.
 */

export type RemitStatus = 'received' | 'matched' | 'posted' | 'disputed' | 'voided';

export interface RemitAdjustment {
  groupCode: 'CO' | 'PR' | 'OA' | 'PI' | 'CR'; // CARC group codes
  reasonCode: string; // e.g. "45" (charges exceed fee schedule)
  amount: number; // in cents
  quantity?: number;
  description?: string;
}

export interface RemitServiceLine {
  lineNumber: number;
  procedureCode: string;
  chargedAmount: number; // in cents
  paidAmount: number; // in cents
  adjustments: RemitAdjustment[];
  patientResponsibility: number; // in cents
  remarkCodes?: string[]; // RARC codes
}

export interface Remittance {
  id: string;
  tenantId: string;
  status: RemitStatus;

  // Source
  ediTransactionId?: string; // 835 control number
  checkNumber?: string;
  checkDate?: string;
  eftTraceNumber?: string;

  // Payer
  payerId: string;
  payerName?: string;

  // Claim linkage
  claimId?: string; // linked VE claim ID
  payerClaimId?: string; // payer's claim reference
  patientDfn?: string;

  // Amounts (all in cents)
  totalCharged: number;
  totalPaid: number;
  totalAdjusted: number;
  totalPatientResponsibility: number;

  // Lines
  serviceLines: RemitServiceLine[];

  // Metadata
  isMock: boolean;
  importedAt: string;
  matchedAt?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}
