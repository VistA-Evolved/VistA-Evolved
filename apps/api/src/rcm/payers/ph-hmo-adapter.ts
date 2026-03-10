/**
 * PH HMO Adapter -- Phase 93: PH HMO Deepening Pack
 *
 * Adapter layer for PH HMO operations. Implements three strategies
 * based on each HMO's integration mode:
 *
 *   1. ManualAdapter   -- always available; generates print-ready packets
 *   2. PortalAdapter   -- deep links to provider portals + checklists
 *   3. EmailAdapter    -- email template generation for LOA/claims
 *
 * VistA-first: All billing data grounded in VistA IB/AR/PCE.
 * No fabricated APIs. No payer credentials stored in code.
 *
 * This adapter does NOT call external payer APIs. It generates
 * request packets that billing staff use to interact with payers
 * through their respective channels (portal, email, fax, phone).
 */

import {
  getPhHmo,
  listPhHmos,
  type PhHmo,
  type HmoCapabilityStatus,
  type HmoIntegrationMode,
} from './ph-hmo-registry.js';

/* -- Types ---------------------------------------------------- */

export interface LoaRequestPacket {
  payerId: string;
  payerName: string;
  integrationMode: HmoIntegrationMode;
  /** If portal-based, the URL to open */
  portalUrl?: string;
  /** Checklist of required fields for LOA request */
  requiredFields: string[];
  /** Human-readable instructions */
  instructions: string[];
  /** Template data (billing staff fills in patient details) */
  template: {
    memberIdPlaceholder: string;
    diagnosisPlaceholder: string;
    procedurePlaceholder: string;
    facilityPlaceholder: string;
    providerPlaceholder: string;
    dateOfServicePlaceholder: string;
  };
  /** Generated at timestamp */
  generatedAt: string;
}

export interface ClaimPacket {
  payerId: string;
  payerName: string;
  integrationMode: HmoIntegrationMode;
  portalUrl?: string;
  requiredFields: string[];
  instructions: string[];
  /** Claim-specific template */
  template: {
    loaNumberPlaceholder: string;
    memberIdPlaceholder: string;
    diagnosisCodes: string;
    procedureCodes: string;
    totalCharges: string;
    dateOfService: string;
    facilityPlaceholder: string;
    providerPlaceholder: string;
  };
  generatedAt: string;
}

export interface AdapterCapabilityReport {
  payerId: string;
  payerName: string;
  integrationMode: HmoIntegrationMode;
  status: string;
  capabilities: {
    loa: { status: HmoCapabilityStatus; actionable: boolean; method: string };
    eligibility: { status: HmoCapabilityStatus; actionable: boolean; method: string };
    claimsSubmission: { status: HmoCapabilityStatus; actionable: boolean; method: string };
    claimStatus: { status: HmoCapabilityStatus; actionable: boolean; method: string };
    remittance: { status: HmoCapabilityStatus; actionable: boolean; method: string };
  };
  contractingTasks: string[];
  evidence: Array<{ kind: string; url: string; title: string }>;
}

/* -- LOA Request Packet Generation ---------------------------- */

const COMMON_LOA_FIELDS = [
  'Member ID / HMO card number',
  'Patient full name',
  'Date of birth',
  'Primary diagnosis (ICD-10)',
  'Requested procedure(s) (CPT/HCPCS)',
  'Attending physician name and PRC license',
  'Admitting facility name and PhilHealth accreditation no.',
  'Date of service / admission date',
  'Clinical justification / medical necessity',
];

function getPortalUrl(hmo: PhHmo): string | undefined {
  const portalEvidence = hmo.evidence.find((e) => e.kind === 'provider_portal');
  return portalEvidence?.url;
}

export function createLoaRequestPacket(payerId: string): LoaRequestPacket | null {
  const hmo = getPhHmo(payerId);
  if (!hmo) return null;

  const portalUrl = getPortalUrl(hmo);
  const instructions: string[] = [];

  if (hmo.integrationMode === 'portal' && portalUrl) {
    instructions.push(`1. Open provider portal: ${portalUrl}`);
    instructions.push('2. Log in with facility credentials (NOT stored in system)');
    instructions.push('3. Navigate to LOA / Letter of Authorization section');
    instructions.push('4. Fill in required fields from this packet');
    instructions.push('5. Submit and note the LOA reference number');
    instructions.push('6. Update VistA encounter with LOA reference');
  } else {
    instructions.push(`1. Contact ${hmo.legalName} through their designated channel`);
    instructions.push('2. Provide all required fields listed below');
    instructions.push('3. Request LOA reference number');
    instructions.push('4. Document response and LOA number in VistA encounter');
    if (hmo.status === 'contracting_needed') {
      instructions.push(
        'NOTE: Provider accreditation with this HMO may not yet be established. Complete contracting first.'
      );
    }
  }

  return {
    payerId: hmo.payerId,
    payerName: hmo.legalName,
    integrationMode: hmo.integrationMode,
    portalUrl,
    requiredFields: [...COMMON_LOA_FIELDS],
    instructions,
    template: {
      memberIdPlaceholder: '[Enter member ID from HMO card]',
      diagnosisPlaceholder: '[Enter ICD-10 code from VistA encounter]',
      procedurePlaceholder: '[Enter CPT/HCPCS from VistA order]',
      facilityPlaceholder: '[Auto-fill from VistA site config]',
      providerPlaceholder: '[Auto-fill from VistA provider file]',
      dateOfServicePlaceholder: '[Auto-fill from VistA encounter date]',
    },
    generatedAt: new Date().toISOString(),
  };
}

/* -- Claim Packet Generation ---------------------------------- */

const COMMON_CLAIM_FIELDS = [
  'LOA number / authorization reference',
  'Member ID / HMO card number',
  'Patient full name',
  'Diagnosis codes (ICD-10) -- all applicable',
  'Procedure codes (CPT/HCPCS) -- all billable',
  'Total charges per line item',
  'Date(s) of service',
  'Admitting/attending physician name and PRC license',
  'Facility name and accreditation number',
  'Supporting documents (labs, imaging reports if required)',
];

export function createClaimPacket(payerId: string): ClaimPacket | null {
  const hmo = getPhHmo(payerId);
  if (!hmo) return null;

  const portalUrl = getPortalUrl(hmo);
  const instructions: string[] = [];

  if (hmo.integrationMode === 'portal' && portalUrl) {
    instructions.push(`1. Open provider portal: ${portalUrl}`);
    instructions.push('2. Navigate to Claims Submission section');
    instructions.push('3. Enter LOA number to pre-populate claim');
    instructions.push('4. Verify all line items match VistA encounter data');
    instructions.push('5. Attach required supporting documents');
    instructions.push('6. Submit and record claim tracking number in VistA');
  } else {
    instructions.push(`1. Prepare claim packet for ${hmo.legalName}`);
    instructions.push('2. Include all required fields and supporting documents');
    instructions.push('3. Submit through designated channel (email/fax/courier)');
    instructions.push('4. Record submission date and tracking info in VistA');
    if (hmo.capabilities.claimStatus === 'unknown_publicly') {
      instructions.push('NOTE: Claim status tracking method unknown -- follow up manually');
    }
  }

  return {
    payerId: hmo.payerId,
    payerName: hmo.legalName,
    integrationMode: hmo.integrationMode,
    portalUrl,
    requiredFields: [...COMMON_CLAIM_FIELDS],
    instructions,
    template: {
      loaNumberPlaceholder: '[Enter LOA number from authorization]',
      memberIdPlaceholder: '[Enter member ID from HMO card]',
      diagnosisCodes: '[Auto-fill from VistA encounter diagnoses]',
      procedureCodes: '[Auto-fill from VistA encounter procedures]',
      totalCharges: '[Auto-fill from VistA charges]',
      dateOfService: '[Auto-fill from VistA encounter date]',
      facilityPlaceholder: '[Auto-fill from VistA site config]',
      providerPlaceholder: '[Auto-fill from VistA provider file]',
    },
    generatedAt: new Date().toISOString(),
  };
}

/* -- Capability Report ---------------------------------------- */

function capabilityMethod(status: HmoCapabilityStatus, mode: HmoIntegrationMode): string {
  if (status === 'portal') return 'Provider portal login';
  if (status === 'available') return mode === 'portal' ? 'Provider portal' : 'Direct contact';
  if (status === 'manual') return 'Manual process (phone/fax/email)';
  if (status === 'unknown_publicly') return 'Unknown -- contracting needed';
  return 'Not available';
}

function isActionable(status: HmoCapabilityStatus): boolean {
  return status === 'available' || status === 'portal' || status === 'manual';
}

export function getAdapterCapabilityReport(payerId: string): AdapterCapabilityReport | null {
  const hmo = getPhHmo(payerId);
  if (!hmo) return null;

  return {
    payerId: hmo.payerId,
    payerName: hmo.legalName,
    integrationMode: hmo.integrationMode,
    status: hmo.status,
    capabilities: {
      loa: {
        status: hmo.capabilities.loa,
        actionable: isActionable(hmo.capabilities.loa),
        method: capabilityMethod(hmo.capabilities.loa, hmo.integrationMode),
      },
      eligibility: {
        status: hmo.capabilities.eligibility,
        actionable: isActionable(hmo.capabilities.eligibility),
        method: capabilityMethod(hmo.capabilities.eligibility, hmo.integrationMode),
      },
      claimsSubmission: {
        status: hmo.capabilities.claimsSubmission,
        actionable: isActionable(hmo.capabilities.claimsSubmission),
        method: capabilityMethod(hmo.capabilities.claimsSubmission, hmo.integrationMode),
      },
      claimStatus: {
        status: hmo.capabilities.claimStatus,
        actionable: isActionable(hmo.capabilities.claimStatus),
        method: capabilityMethod(hmo.capabilities.claimStatus, hmo.integrationMode),
      },
      remittance: {
        status: hmo.capabilities.remittance,
        actionable: isActionable(hmo.capabilities.remittance),
        method: capabilityMethod(hmo.capabilities.remittance, hmo.integrationMode),
      },
    },
    contractingTasks: hmo.contractingTasks ?? [],
    evidence: hmo.evidence.map((e) => ({ kind: e.kind, url: e.url, title: e.title })),
  };
}

/* -- Batch Reports -------------------------------------------- */

export function getAllCapabilityReports(filter?: {
  status?: string;
  integrationMode?: string;
}): AdapterCapabilityReport[] {
  const hmos = listPhHmos({
    status: filter?.status as any,
    integrationMode: filter?.integrationMode as any,
  });

  return hmos
    .map((h) => getAdapterCapabilityReport(h.payerId))
    .filter((r): r is AdapterCapabilityReport => r !== null);
}
