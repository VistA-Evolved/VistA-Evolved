/**
 * PhilHealth eClaims 3.0 Posture — Domain Types
 *
 * Phase 90: Claim draft lifecycle, facility setup, export pipeline.
 *
 * Ground truth:
 *   - eClaims 3.0 required starting April 1, 2026
 *   - Scanned PDF SOA rejected for admissions >= April 2026
 *   - Electronic SOA (structured XML/JSON) mandatory
 *   - TCN (Transmittal Control Number) issued after successful test upload
 *
 * Honest statuses — never claims real submission unless certified:
 *   draft → ready_for_submission → exported → test_uploaded → submitted_pending
 *   → returned_to_hospital | paid | denied
 *
 * If we cannot truly submit, status MUST NOT advance beyond exported/test_uploaded.
 */

/* ── Claim Draft Status ─────────────────────────────────────── */

export type PhilHealthClaimStatus =
  | 'draft'
  | 'ready_for_submission'
  | 'exported'
  | 'test_uploaded'
  | 'submitted_pending'
  | 'returned_to_hospital'
  | 'paid'
  | 'denied';

export const PH_CLAIM_TRANSITIONS: Record<PhilHealthClaimStatus, PhilHealthClaimStatus[]> = {
  draft: ['ready_for_submission'],
  ready_for_submission: ['exported', 'draft'],
  exported: ['test_uploaded', 'ready_for_submission'],
  test_uploaded: ['submitted_pending', 'ready_for_submission'],
  // Terminal / real-submission statuses (only reachable with real integration)
  submitted_pending: ['returned_to_hospital', 'paid', 'denied'],
  returned_to_hospital: ['draft'],
  paid: [],
  denied: ['draft'],
};

/**
 * Whether the given transition requires real PhilHealth integration.
 * If true, the system must verify that real submission is configured
 * before allowing the transition.
 */
export function requiresRealIntegration(to: PhilHealthClaimStatus): boolean {
  return ['submitted_pending', 'returned_to_hospital', 'paid', 'denied'].includes(to);
}

/* ── Charge Line Item ───────────────────────────────────────── */

export interface PhilHealthChargeItem {
  category:
    | 'room_board'
    | 'drugs_meds'
    | 'labs'
    | 'imaging'
    | 'supplies'
    | 'professional_fee'
    | 'other';
  description: string;
  code?: string; // CPT/RVS/HCPCS
  quantity: number;
  unitCharge: number;
  discount: number;
  netAmount: number;
  phicCoverage: number;
  patientShare: number;
}

/* ── Diagnosis Code ─────────────────────────────────────────── */

export interface PhilHealthDiagnosis {
  icdCode: string;
  description?: string;
  type: 'primary' | 'secondary';
}

/* ── Procedure Code ─────────────────────────────────────────── */

export interface PhilHealthProcedure {
  code: string; // RVS or CPT
  description?: string;
  laterality?: 'L' | 'R' | 'B';
}

/* ── Professional Fee Line ──────────────────────────────────── */

export interface PhilHealthProfessionalFee {
  physicianName: string;
  physicianLicense: string; // PRC license number
  accreditationNumber?: string;
  feeAmount: number;
  serviceDate: string;
  procedureCode?: string;
}

/* ── Electronic SOA (Structured) ────────────────────────────── */

export interface PhilHealthElectronicSoa {
  soaId: string;
  version: '3.0';
  lineItems: PhilHealthChargeItem[];
  totals: {
    totalCharges: number;
    totalDiscount: number;
    totalNetAmount: number;
    totalPhicCoverage: number;
    totalPatientShare: number;
  };
  preparedBy: string;
  preparedDate: string;
  generatedAt: string;
  /** HMAC-SHA256 signature (if signing key provided) */
  signature?: string;
  signatureMethod?: 'hmac-sha256';
}

/* ── Claim Draft ────────────────────────────────────────────── */

export interface PhilHealthClaimDraft {
  id: string;
  facilityId: string;
  /** Patient DFN — clinical data from VistA at render time */
  patientDfn: string;
  patientLastName: string;
  patientFirstName: string;
  patientMiddleName?: string;
  patientDob?: string;
  patientSex?: 'M' | 'F';
  /** PhilHealth Identification Number */
  philhealthPin: string;
  memberPin?: string;
  memberRelationship: 'S' | 'D' | 'P';
  /** VistA encounter IEN (if available) */
  encounterIen?: string;
  admissionDate: string;
  dischargeDate?: string;
  patientType: 'O' | 'I';
  /** Case rate code (PhilHealth case rate package) */
  caseRateCode?: string;
  caseRateDescription?: string;
  /** ICD-10 diagnoses */
  diagnoses: PhilHealthDiagnosis[];
  /** RVS/CPT procedures */
  procedures: PhilHealthProcedure[];
  /** Charge line items */
  charges: PhilHealthChargeItem[];
  /** Professional fee lines */
  professionalFees: PhilHealthProfessionalFee[];
  /** Electronic SOA (generated on export) */
  soaElectronic?: PhilHealthElectronicSoa;
  /** Attachment references (credential vault entry IDs) */
  attachmentRefs: string[];
  /** Claim status */
  status: PhilHealthClaimStatus;
  /** Export artifacts */
  lastExportAt?: string;
  lastExportManifest?: PhilHealthExportManifest;
  /** Test upload results */
  testUploadResult?: PhilHealthTestUploadResult;
  /** Real submission tracking (only with integration) */
  transmittalControlNumber?: string;
  payerRefNumber?: string;
  /** Timeline */
  timeline: PhilHealthTimelineEvent[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Export Manifest ────────────────────────────────────────── */

export interface PhilHealthExportManifest {
  exportId: string;
  generatedAt: string;
  generatedBy: string;
  version: '3.0';
  files: Array<{
    name: string;
    type: 'claim_bundle' | 'soa' | 'manifest' | 'attachment';
    format: 'json';
    sizeEstimate?: number;
  }>;
  claimSummary: {
    claimId: string;
    patientType: 'O' | 'I';
    admissionDate: string;
    dischargeDate?: string;
    totalCharges: number;
    diagnosisCount: number;
    procedureCount: number;
    hasSoa: boolean;
    hasProfessionalFees: boolean;
  };
}

/* ── Test Upload Result ─────────────────────────────────────── */

export interface PhilHealthTestUploadResult {
  /** Always true for simulated uploads */
  simulated: boolean;
  /** "SIMULATED-TCN-XXXX" — clearly fake */
  transmittalControlNumber: string;
  uploadedAt: string;
  validationPassed: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  /** Next steps for real certification */
  nextSteps: string[];
}

/* ── Timeline Event ─────────────────────────────────────────── */

export interface PhilHealthTimelineEvent {
  timestamp: string;
  action: string;
  actor: string;
  fromStatus?: PhilHealthClaimStatus;
  toStatus?: PhilHealthClaimStatus;
  detail?: string;
}

/* ── Facility Setup ─────────────────────────────────────────── */

export interface PhilHealthFacilitySetup {
  id: string;
  facilityId: string;
  /** PhilHealth Facility Code (e.g., "H12345678") */
  facilityCode: string;
  facilityName: string;
  /** PhilHealth Accreditation Number */
  accreditationNumber: string;
  accreditationExpiry?: string;
  /** eClaims 3.0 API endpoint (env override) */
  apiEndpoint?: string;
  /** Whether test mode is active (default: true) */
  testMode: boolean;
  /** Provider accreditations for this facility */
  providerAccreditations: PhilHealthProviderAccreditation[];
  /** Readiness checklist items */
  readinessChecklist: PhilHealthReadinessItem[];
  /** Integration metadata */
  integrationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhilHealthProviderAccreditation {
  providerName: string;
  prcLicenseNumber: string;
  philhealthAccreditationNumber?: string;
  specialty?: string;
  expiryDate?: string;
}

export interface PhilHealthReadinessItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

/* ── Validation Error ───────────────────────────────────────── */

export interface PhilHealthValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PhilHealthValidationResult {
  valid: boolean;
  errors: PhilHealthValidationError[];
  warnings: PhilHealthValidationError[];
  /** eClaims 3.0 specific checks */
  eclaims3Compliance: {
    electronicSoaRequired: boolean;
    electronicSoaPresent: boolean;
    scannedPdfDetected: boolean;
    admissionDateRequiresEsoa: boolean;
  };
}

/* ── Default Readiness Checklist ────────────────────────────── */

export const DEFAULT_READINESS_CHECKLIST: Omit<
  PhilHealthReadinessItem,
  'completedAt' | 'completedBy'
>[] = [
  {
    id: 'facility-accreditation',
    label: 'Facility Accreditation',
    description: 'PhilHealth facility accreditation number is current and valid.',
    completed: false,
  },
  {
    id: 'provider-accreditations',
    label: 'Provider Accreditations',
    description: 'At least one provider has a valid PhilHealth accreditation number.',
    completed: false,
  },
  {
    id: 'eclaims3-api-access',
    label: 'eClaims 3.0 API Access',
    description: 'Facility has registered for eClaims 3.0 API access with PhilHealth.',
    completed: false,
  },
  {
    id: 'tls-certificate',
    label: 'TLS Client Certificate',
    description: 'Facility TLS client certificate enrolled with PhilHealth PKI.',
    completed: false,
  },
  {
    id: 'soa-signing-key',
    label: 'SOA Signing Key',
    description: 'HMAC-SHA256 or RSA signing key configured for electronic SOA.',
    completed: false,
  },
  {
    id: 'test-claim-submitted',
    label: 'Test Claim Submitted',
    description: 'At least one test claim has been exported and validated locally.',
    completed: false,
  },
  {
    id: 'test-upload-verified',
    label: 'Test Upload Verified',
    description: 'Test upload to PhilHealth eClaims sandbox returns valid TCN.',
    completed: false,
  },
  {
    id: 'staff-training',
    label: 'Staff Training',
    description: 'Billing staff trained on eClaims 3.0 workflow and electronic SOA.',
    completed: false,
  },
];
