/**
 * Phase 401 (W23-P3): MPI / Client Registry -- Types
 */

export type IdentifierSystem =
  | 'mrn'
  | 'national_id'
  | 'ssn4'
  | 'payer_id'
  | 'passport'
  | 'drivers_license'
  | 'facility_id'
  | 'opencr'
  | 'other';

export interface PatientIdentifier {
  system: IdentifierSystem;
  value: string;
  issuingAuthority: string | null;
  expiresAt: string | null;
}

export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low';
export type MatchMethod = 'deterministic' | 'probabilistic' | 'manual';

export interface MpiPatientIdentity {
  id: string;
  tenantId: string;
  goldenRecordId: string | null;
  identifiers: PatientIdentifier[];
  familyName: string;
  givenName: string;
  dateOfBirth: string;
  gender: string;
  addressCity: string | null;
  addressCountry: string | null;
  phoneNumber: string | null;
  provenanceSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  candidateId: string;
  confidence: MatchConfidence;
  method: MatchMethod;
  score: number;
  matchedFields: string[];
}

export type MergeAction = 'merge' | 'link' | 'unlink' | 'split';

export interface MergeEvent {
  id: string;
  tenantId: string;
  action: MergeAction;
  survivorId: string;
  retiredId: string;
  reason: string;
  actorDuz: string;
  createdAt: string;
}

export interface MpiDashboardStats {
  totalIdentities: number;
  goldenRecords: number;
  pendingSuggestions: number;
  totalMerges: number;
}
