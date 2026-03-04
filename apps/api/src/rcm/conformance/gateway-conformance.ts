/**
 * Gateway Conformance Harness
 *
 * Phase 46: Per-gateway conformance data — sample payloads, required fields,
 * failure modes, and expected probe behaviors. Used for integration testing
 * and partner onboarding validation.
 */

/* ── Types ───────────────────────────────────────────────────── */

export interface ConformanceField {
  field: string;
  required: boolean;
  format?: string;
  example?: string;
  notes?: string;
}

export interface ConformanceFailureMode {
  code: string;
  description: string;
  expectedBehavior: string;
  retryable: boolean;
}

export interface ConformanceProbeBehavior {
  probe: string;
  description: string;
  expectedResult: string;
}

export interface GatewayConformance {
  gatewayId: string;
  name: string;
  version: string;
  samplePayload: Record<string, unknown>;
  requiredFields: ConformanceField[];
  failureModes: ConformanceFailureMode[];
  probeBehaviors: ConformanceProbeBehavior[];
}

/* ── PH PhilHealth eClaims 3.0 ───────────────────────────────── */

const PH_CONFORMANCE: GatewayConformance = {
  gatewayId: 'ph-philhealth',
  name: 'PhilHealth eClaims 3.0',
  version: '3.0',
  samplePayload: {
    cf1: {
      facilityCode: 'H01028007',
      patientLastName: 'DELA CRUZ',
      patientFirstName: 'JUAN',
      philhealthId: '01-050000000-3',
      admissionDate: '2025-01-15',
      dischargeDate: '2025-01-18',
      claimType: 'ALL_CASE_RATE',
    },
    cf2: {
      diagnosis: [{ icd10: 'J18.9', description: 'Pneumonia, unspecified' }],
      procedures: [{ cpt: '71046', description: 'Chest X-ray 2 views' }],
      professionalFees: 5000,
      hospitalFees: 15000,
    },
    soa: {
      version: '3.0',
      format: 'electronic',
      note: 'Scanned PDF SOAs are rejected under eClaims 3.0',
    },
  },
  requiredFields: [
    { field: 'cf1.facilityCode', required: true, format: 'H########', example: 'H01028007' },
    { field: 'cf1.patientLastName', required: true },
    { field: 'cf1.patientFirstName', required: true },
    {
      field: 'cf1.philhealthId',
      required: true,
      format: '##-#########-#',
      example: '01-050000000-3',
    },
    { field: 'cf1.admissionDate', required: true, format: 'YYYY-MM-DD' },
    { field: 'cf1.claimType', required: true, notes: 'ALL_CASE_RATE | Z_BENEFIT | MATERNITY' },
    { field: 'cf2.diagnosis[].icd10', required: true, format: 'ICD-10-CM' },
    {
      field: 'soa.version',
      required: true,
      format: '3.0',
      notes: 'Must be electronic, not scanned PDF',
    },
  ],
  failureModes: [
    {
      code: 'PH-001',
      description: 'Invalid facility code',
      expectedBehavior: 'Reject with 400, claim not created',
      retryable: false,
    },
    {
      code: 'PH-002',
      description: 'Expired PhilHealth membership',
      expectedBehavior: 'Reject with eligibility denial',
      retryable: false,
    },
    {
      code: 'PH-003',
      description: 'Scanned PDF SOA submitted',
      expectedBehavior: 'Reject with SOA_FORMAT_INVALID',
      retryable: false,
    },
    {
      code: 'PH-004',
      description: 'Duplicate claim submission',
      expectedBehavior: 'Return existing claim reference',
      retryable: false,
    },
    {
      code: 'PH-005',
      description: 'API rate limit exceeded',
      expectedBehavior: 'HTTP 429 with Retry-After',
      retryable: true,
    },
    {
      code: 'PH-006',
      description: 'Certificate expired',
      expectedBehavior: 'TLS handshake failure',
      retryable: false,
    },
  ],
  probeBehaviors: [
    {
      probe: 'facility_code_check',
      description: 'Validate facility accreditation code format',
      expectedResult: 'green if H + 8 digits',
    },
    {
      probe: 'api_token_present',
      description: 'Check API token is configured',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'cert_readable',
      description: 'Validate TLS cert file exists',
      expectedResult: 'green if path exists and readable',
    },
    {
      probe: 'eclaims_version',
      description: 'Confirm eClaims 3.0 endpoint',
      expectedResult: 'green if endpoint contains v3',
    },
  ],
};

/* ── AU ECLIPSE ──────────────────────────────────────────────── */

const AU_CONFORMANCE: GatewayConformance = {
  gatewayId: 'au-eclipse',
  name: 'ECLIPSE (Services Australia)',
  version: '2024.1',
  samplePayload: {
    claimType: 'MBS_CLAIM',
    providerNumber: '1234567A',
    patientMedicareNumber: '2123 45670 1',
    dateOfService: '2025-01-15',
    itemNumbers: [{ mbs: '23', fee: 3920 }],
    referral: { providerNumber: '7654321B', date: '2025-01-01', period: 12 },
  },
  requiredFields: [
    { field: 'providerNumber', required: true, format: '#######L', example: '1234567A' },
    {
      field: 'patientMedicareNumber',
      required: true,
      format: '#### ##### #',
      example: '2123 45670 1',
    },
    { field: 'dateOfService', required: true, format: 'YYYY-MM-DD' },
    { field: 'itemNumbers[].mbs', required: true, notes: 'MBS item number' },
    { field: 'itemNumbers[].fee', required: true, format: 'cents', notes: 'Amount in cents (AUD)' },
    { field: 'referral.providerNumber', required: false, notes: 'Required for specialist claims' },
  ],
  failureModes: [
    {
      code: 'AU-001',
      description: 'Invalid PRODA credentials',
      expectedBehavior: 'OAuth2 token refresh failure',
      retryable: true,
    },
    {
      code: 'AU-002',
      description: 'Device certificate expired',
      expectedBehavior: 'TLS handshake failure on PRODA',
      retryable: false,
    },
    {
      code: 'AU-003',
      description: 'Invalid MBS item number',
      expectedBehavior: 'Claim rejected with item error',
      retryable: false,
    },
    {
      code: 'AU-004',
      description: 'Duplicate claim for same service',
      expectedBehavior: 'Claim rejected with duplicate flag',
      retryable: false,
    },
    {
      code: 'AU-005',
      description: 'Patient Medicare card expired',
      expectedBehavior: 'Eligibility check failure',
      retryable: false,
    },
  ],
  probeBehaviors: [
    {
      probe: 'proda_org_id',
      description: 'Check PRODA org ID configured',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'device_name',
      description: 'Check device name configured',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'cert_path',
      description: 'Check device PKI certificate path',
      expectedResult: 'green if file exists',
    },
    {
      probe: 'provider_number',
      description: 'Check Medicare provider number format',
      expectedResult: 'green if 7 digits + 1 letter',
    },
  ],
};

/* ── SG NPHC ─────────────────────────────────────────────────── */

const SG_CONFORMANCE: GatewayConformance = {
  gatewayId: 'sg-nphc',
  name: 'NPHC Singapore',
  version: '2024.2',
  samplePayload: {
    claimType: 'MEDISAVE',
    facilityLicense: 'HCI-LIC-12345',
    patientNricLast4: '567A',
    dateOfService: '2025-01-15',
    diagnosis: [{ icd10: 'E11.9', description: 'Type 2 diabetes' }],
    charges: [{ description: 'Consultation', amount: 80.0, currency: 'SGD' }],
    mediShieldLifeDeductible: 0,
  },
  requiredFields: [
    {
      field: 'facilityLicense',
      required: true,
      format: 'HCI-LIC-#####',
      notes: 'MOH healthcare institution license',
    },
    {
      field: 'patientNricLast4',
      required: true,
      format: '###L',
      notes: 'Last 4 chars of NRIC (privacy-preserving)',
    },
    { field: 'dateOfService', required: true, format: 'YYYY-MM-DD' },
    { field: 'diagnosis[].icd10', required: true, format: 'ICD-10' },
    { field: 'charges[].amount', required: true, format: 'decimal', notes: 'SGD amount' },
    { field: 'claimType', required: true, notes: 'MEDISAVE | MEDISHIELD_LIFE | CHAS' },
  ],
  failureModes: [
    {
      code: 'SG-001',
      description: 'CorpPass token expired',
      expectedBehavior: 'OAuth2 refresh required',
      retryable: true,
    },
    {
      code: 'SG-002',
      description: 'Facility license not found',
      expectedBehavior: 'Reject with 403',
      retryable: false,
    },
    {
      code: 'SG-003',
      description: 'MediSave balance insufficient',
      expectedBehavior: 'Partial approval or denial',
      retryable: false,
    },
    {
      code: 'SG-004',
      description: 'Unauthorized user NRIC',
      expectedBehavior: 'CorpPass role mismatch error',
      retryable: false,
    },
  ],
  probeBehaviors: [
    {
      probe: 'corppass_client_id',
      description: 'Check CorpPass client ID',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'facility_license',
      description: 'Check MOH facility license',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'corppass_secret',
      description: 'Check CorpPass secret',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'user_nric_hash',
      description: 'Check authorized user binding',
      expectedResult: 'amber if missing (optional)',
    },
  ],
};

/* ── NZ ACC ──────────────────────────────────────────────────── */

const NZ_CONFORMANCE: GatewayConformance = {
  gatewayId: 'nz-acc',
  name: 'ACC New Zealand',
  version: '2.0',
  samplePayload: {
    claimType: 'INJURY_CLAIM',
    providerId: 'NZ-PROV-12345',
    patientNhi: 'ZAA1234',
    injuryDate: '2025-01-10',
    treatmentDate: '2025-01-15',
    diagnosis: [{ readCode: 'S52.5', description: 'Fracture of lower end of radius' }],
    fees: [{ serviceCode: 'ACC001', amount: 150.0, gstInclusive: true }],
    claimStatus: 'parked',
  },
  requiredFields: [
    { field: 'providerId', required: true, notes: 'ACC-assigned provider ID' },
    {
      field: 'patientNhi',
      required: true,
      format: 'ZAA####',
      notes: 'NZ National Health Index number',
    },
    { field: 'injuryDate', required: true, format: 'YYYY-MM-DD' },
    { field: 'treatmentDate', required: true, format: 'YYYY-MM-DD' },
    { field: 'diagnosis[].readCode', required: true, notes: 'Read code or ACC diagnosis code' },
    { field: 'fees[].serviceCode', required: true, notes: 'ACC service/fee schedule code' },
    {
      field: 'fees[].amount',
      required: true,
      format: 'decimal',
      notes: 'NZD amount, GST inclusive',
    },
  ],
  failureModes: [
    {
      code: 'NZ-001',
      description: 'OAuth2 token expired',
      expectedBehavior: 'Refresh via client_credentials flow',
      retryable: true,
    },
    {
      code: 'NZ-002',
      description: 'Invalid NHI number',
      expectedBehavior: 'Reject with validation error',
      retryable: false,
    },
    {
      code: 'NZ-003',
      description: 'Claim already lodged for this injury',
      expectedBehavior: 'Return existing claim45 reference',
      retryable: false,
    },
    {
      code: 'NZ-004',
      description: 'Rate limit exceeded (50 req/min)',
      expectedBehavior: 'HTTP 429 with exponential backoff',
      retryable: true,
    },
    {
      code: 'NZ-005',
      description: 'Provider not registered for this service',
      expectedBehavior: 'Reject with provider error',
      retryable: false,
    },
  ],
  probeBehaviors: [
    {
      probe: 'client_id',
      description: 'Check OAuth2 client ID',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'client_secret',
      description: 'Check OAuth2 client secret',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'provider_id',
      description: 'Check ACC provider ID',
      expectedResult: 'green if non-empty',
    },
    {
      probe: 'sandbox_access',
      description: 'Check sandbox environment reachability',
      expectedResult: 'green if default or configured',
    },
  ],
};

/* ── Registry ────────────────────────────────────────────────── */

const CONFORMANCE_REGISTRY: Record<string, GatewayConformance> = {
  'ph-philhealth': PH_CONFORMANCE,
  'au-eclipse': AU_CONFORMANCE,
  'sg-nphc': SG_CONFORMANCE,
  'nz-acc': NZ_CONFORMANCE,
};

export function getGatewayConformance(gatewayId: string): GatewayConformance | undefined {
  return CONFORMANCE_REGISTRY[gatewayId];
}

export function getAllGatewayConformance(): GatewayConformance[] {
  return Object.values(CONFORMANCE_REGISTRY);
}

export function getConformanceGatewayIds(): string[] {
  return Object.keys(CONFORMANCE_REGISTRY);
}

/**
 * Run basic field presence validation against a sample payload.
 * Returns list of missing required fields.
 */
export function validatePayloadConformance(
  gatewayId: string,
  payload: Record<string, unknown>
): { valid: boolean; missingFields: string[]; gateway?: string } {
  const conformance = CONFORMANCE_REGISTRY[gatewayId];
  if (!conformance) {
    return { valid: false, missingFields: [], gateway: `Unknown gateway: ${gatewayId}` };
  }

  const missingFields: string[] = [];
  for (const field of conformance.requiredFields) {
    if (!field.required) continue;
    // Simple dot-path check (doesn't handle arrays deeply)
    const parts = field.field.replace(/\[\]/g, '').split('.');
    let current: unknown = payload;
    let found = true;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        found = false;
        break;
      }
    }
    if (!found) {
      missingFields.push(field.field);
    }
  }

  return { valid: missingFields.length === 0, missingFields };
}
