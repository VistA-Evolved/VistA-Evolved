/**
 * Phase 402 (W23-P4): Provider Directory -- Types
 */

export type PractitionerStatus = 'active' | 'inactive' | 'suspended' | 'retired';
export type OrganizationType =
  | 'hospital'
  | 'clinic'
  | 'laboratory'
  | 'pharmacy'
  | 'imaging_center'
  | 'payer'
  | 'hie'
  | 'other';
export type LocationStatus = 'active' | 'inactive' | 'suspended';

export interface PractitionerQualification {
  code: string;
  display: string;
  system: string;
  issuer?: string;
  period?: { start: string; end?: string };
}

export interface PractitionerIdentifier {
  system: string; // e.g. "NPI", "DEA", "state-license"
  value: string;
}

export interface DirectoryPractitioner {
  id: string;
  tenantId: string;
  npi?: string;
  identifiers: PractitionerIdentifier[];
  familyName: string;
  givenName: string;
  prefix?: string;
  suffix?: string;
  specialty?: string;
  status: PractitionerStatus;
  qualifications: PractitionerQualification[];
  organizationIds: string[];
  locationIds: string[];
  telecom: Array<{ system: string; value: string; use?: string }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryOrganization {
  id: string;
  tenantId: string;
  npi?: string;
  name: string;
  type: OrganizationType;
  active: boolean;
  alias?: string[];
  telecom: Array<{ system: string; value: string; use?: string }>;
  address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  parentOrganizationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryLocation {
  id: string;
  tenantId: string;
  name: string;
  status: LocationStatus;
  organizationId?: string;
  type?: string;
  telecom: Array<{ system: string; value: string; use?: string }>;
  address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  position?: { latitude: number; longitude: number };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDirectoryDashboardStats {
  totalPractitioners: number;
  activePractitioners: number;
  totalOrganizations: number;
  activeOrganizations: number;
  totalLocations: number;
  activeLocations: number;
}
