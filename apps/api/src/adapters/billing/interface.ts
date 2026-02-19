/**
 * Billing Adapter Interface — Phase 37C.
 */

import type { BaseAdapter, AdapterResult } from "../types.js";

export interface Claim {
  id: string;
  patientDfn: string;
  dateOfService: string;
  totalCharge: number;
  status: string;
  payer?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
}

export interface EOB {
  id: string;
  claimId: string;
  paidAmount: number;
  patientResponsibility: number;
  adjudicationDate: string;
}

export interface EligibilityResult {
  patientDfn: string;
  eligible: boolean;
  coverage: string;
  payer: string;
  effectiveDate: string;
  terminationDate?: string;
}

export interface BillingAdapter extends BaseAdapter {
  readonly adapterType: "billing";
  getClaims(patientDfn: string): Promise<AdapterResult<Claim[]>>;
  submitClaim(claim: Partial<Claim>): Promise<AdapterResult<Claim>>;
  getEOB(claimId: string): Promise<AdapterResult<EOB>>;
  getEligibility(patientDfn: string, payerId?: string): Promise<AdapterResult<EligibilityResult>>;
}
