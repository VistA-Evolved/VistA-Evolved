/**
 * Phase 405 (W23-P7): Consent + Purpose of Use -- Types
 */

export type ConsentStatus = 'active' | 'inactive' | 'draft' | 'revoked' | 'entered-in-error';
export type ConsentScope =
  | 'patient-privacy'
  | 'treatment'
  | 'research'
  | 'advance-directive'
  | 'adr';
export type ConsentDecision = 'permit' | 'deny';

export type PurposeOfUse =
  | 'TREAT' // Treatment
  | 'HPAYMT' // Healthcare payment
  | 'HOPERAT' // Healthcare operations
  | 'PUBHLTH' // Public health
  | 'RESEARCH' // Research
  | 'ETREAT' // Emergency treatment
  | 'PATRQT' // Patient requested
  | 'SYSADMIN' // System administration
  | 'HMARKT'; // Healthcare marketing

export interface ConsentProvision {
  type: ConsentDecision;
  period?: { start: string; end?: string };
  actors?: Array<{ role: string; reference: string }>;
  actions?: string[];
  securityLabels?: string[];
  purposes?: PurposeOfUse[];
  dataClasses?: string[];
}

export interface ConsentDirective {
  id: string;
  tenantId: string;
  status: ConsentStatus;
  scope: ConsentScope;
  patientDfn: string;
  patientDisplay?: string;
  dateTime: string;
  grantor: { name: string; role: string };
  grantee?: { name: string; role: string; organizationId?: string };
  policyUri?: string;
  provisions: ConsentProvision[];
  verificationDate?: string;
  verifiedBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DisclosureLog {
  id: string;
  tenantId: string;
  consentId?: string;
  patientDfn: string;
  purposeOfUse: PurposeOfUse;
  actorDuz: string;
  actorDisplay?: string;
  recipientOrg?: string;
  resourceType?: string;
  resourceId?: string;
  decision: ConsentDecision;
  reason?: string;
  createdAt: string;
}

export interface ConsentDashboardStats {
  totalDirectives: number;
  activeDirectives: number;
  revokedDirectives: number;
  totalDisclosureLogs: number;
  disclosuresByPurpose: Record<string, number>;
}
