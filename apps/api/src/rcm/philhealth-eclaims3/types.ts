/**
 * PhilHealth eClaims 3.0 Adapter — Domain Types
 *
 * Phase 96: Adapter skeleton for eClaims 3.0 transition.
 *
 * Architecture:
 *   - ClaimPacket is the normalized internal object assembled from VistA-facing data
 *   - ExportBundle wraps multiple output formats (JSON, PDF text, XML placeholder)
 *   - SubmissionRecord tracks honest status: never pretends to submit without real API
 *   - XmlGeneratorInterface defines the strict contract for future XML generation
 *
 * VistA-first: All clinical/billing data sourced from PhilHealthClaimDraft
 * (which itself is grounded in VistA encounter/PCE data).
 *
 * eClaims 3.0 deadline: April 1, 2026 (older versions disabled March 31, 2026).
 */

/* ── Submission Status (honest — never fake success) ────────── */

/**
 * Honest lifecycle statuses:
 *   draft          — Packet assembled but not reviewed
 *   reviewed       — Staff reviewed, ready to export
 *   exported       — Export bundle generated (JSON/PDF/XML)
 *   submitted_manual — Staff manually uploaded to PhilHealth portal
 *   accepted       — PhilHealth confirmed acceptance (staff enters TCN)
 *   denied         — PhilHealth denied claim (staff enters reason)
 *   appealed       — Denial appealed
 *
 * CRITICAL: 'accepted' and 'denied' require manual staff confirmation.
 * The system CANNOT advance to these statuses automatically without
 * real PhilHealth API integration (which requires spec + certification).
 */
export type EClaimsSubmissionStatus =
  | 'draft'
  | 'reviewed'
  | 'exported'
  | 'submitted_manual'
  | 'accepted'
  | 'denied'
  | 'appealed';

export const ECLAIMS_STATUS_TRANSITIONS: Record<
  EClaimsSubmissionStatus,
  EClaimsSubmissionStatus[]
> = {
  draft: ['reviewed'],
  reviewed: ['exported', 'draft'],
  exported: ['submitted_manual', 'reviewed'],
  submitted_manual: ['accepted', 'denied', 'exported'], // can re-export if portal rejects
  accepted: [], // terminal
  denied: ['appealed', 'draft'], // can re-draft or appeal
  appealed: ['accepted', 'denied'], // appeal resolves to accept or deny again
};

/**
 * Whether the transition requires manual staff action.
 * These statuses can NEVER be set by automation alone.
 */
export function isManualOnlyTransition(to: EClaimsSubmissionStatus): boolean {
  return ['submitted_manual', 'accepted', 'denied'].includes(to);
}

/* ── Claim Packet (normalized internal object) ──────────────── */

export interface ClaimPacketPatient {
  dfn: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  dob?: string; // YYYY-MM-DD
  sex?: 'M' | 'F';
  philhealthPin: string;
  memberPin?: string;
  memberRelationship: 'S' | 'D' | 'P';
}

export interface ClaimPacketFacility {
  facilityCode: string;
  facilityName: string;
  accreditationNumber?: string;
  tinNumber?: string;
}

export interface ClaimPacketDiagnosis {
  icdCode: string;
  description?: string;
  type: 'primary' | 'secondary';
}

export interface ClaimPacketProcedure {
  code: string; // RVS or CPT
  description?: string;
  laterality?: 'L' | 'R' | 'B';
}

export interface ClaimPacketCharge {
  category:
    | 'room_board'
    | 'drugs_meds'
    | 'labs'
    | 'imaging'
    | 'supplies'
    | 'professional_fee'
    | 'other';
  description: string;
  code?: string;
  quantity: number;
  unitCharge: number;
  discount: number;
  netAmount: number;
  phicCoverage: number;
  patientShare: number;
}

export interface ClaimPacketProfessionalFee {
  physicianName: string;
  physicianLicense: string;
  accreditationNumber?: string;
  feeAmount: number;
  serviceDate: string;
  procedureCode?: string;
}

export interface ClaimPacket {
  /** Unique packet ID */
  packetId: string;
  /** eClaims version targeted */
  eclaimsVersion: '3.0';
  /** Source claim draft ID (from Phase 90 PhilHealth store) */
  sourceClaimDraftId: string;
  /** VistA encounter IEN (grounding) */
  encounterIen?: string;
  /** Patient demographics */
  patient: ClaimPacketPatient;
  /** Facility information */
  facility: ClaimPacketFacility;
  /** Encounter type */
  patientType: 'O' | 'I';
  /** Admission/encounter date */
  admissionDate: string;
  /** Discharge date (inpatient) */
  dischargeDate?: string;
  /** Case rate info */
  caseRateCode?: string;
  caseRateDescription?: string;
  /** Clinical data (from VistA) */
  diagnoses: ClaimPacketDiagnosis[];
  procedures: ClaimPacketProcedure[];
  charges: ClaimPacketCharge[];
  professionalFees: ClaimPacketProfessionalFee[];
  /** Totals (computed) */
  totals: {
    totalCharges: number;
    totalDiscount: number;
    totalNetAmount: number;
    totalPhicCoverage: number;
    totalPatientShare: number;
    totalProfessionalFees: number;
  };
  /** Packet assembly metadata */
  assembledAt: string;
  assembledBy: string;
  /** Hash of the packet contents (for integrity) */
  contentHash: string;
}

/* ── Export Bundle ───────────────────────────────────────────── */

export type ExportFormat = 'json' | 'pdf_text' | 'xml_placeholder';

export interface ExportArtifact {
  format: ExportFormat;
  filename: string;
  content: string;
  contentType: string;
  sizeBytes: number;
  generatedAt: string;
}

export interface ExportBundle {
  bundleId: string;
  packetId: string;
  sourceClaimDraftId: string;
  artifacts: ExportArtifact[];
  generatedAt: string;
  generatedBy: string;
  /** Whether the XML artifact is a real schema-compliant document or a placeholder */
  xmlSpecAvailable: false;
  /** Summary for the bundle manifest */
  summary: {
    patientName: string;
    patientType: 'O' | 'I';
    admissionDate: string;
    totalCharges: number;
    diagnosisCount: number;
    procedureCount: number;
    formatCount: number;
  };
}

/* ── Submission Record (honest tracking) ────────────────────── */

export interface DenialReason {
  code?: string;
  text: string;
  category?: 'documentation' | 'eligibility' | 'coding' | 'timely_filing' | 'other';
  recordedAt: string;
  recordedBy: string;
}

export interface SubmissionRecord {
  id: string;
  tenantId: string;
  packetId: string;
  sourceClaimDraftId: string;
  status: EClaimsSubmissionStatus;
  /**
   * Transmittal Control Number — only set when staff confirms
   * acceptance from PhilHealth. NEVER auto-generated.
   */
  transmittalControlNumber?: string;
  /** PhilHealth reference number (if provided on acceptance) */
  payerRefNumber?: string;
  /** Export bundle IDs associated with this submission */
  exportBundleIds: string[];
  /** Denial reasons (manual entry by staff) */
  denialReasons: DenialReason[];
  /** Appeal reference (if appealed) */
  appealReference?: string;
  /** Manual notes from billing staff */
  staffNotes: string[];
  /** Timeline of status changes */
  timeline: Array<{
    timestamp: string;
    fromStatus: EClaimsSubmissionStatus;
    toStatus: EClaimsSubmissionStatus;
    actor: string;
    detail?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/* ── XML Generator Interface (strict contract) ──────────────── */

/**
 * Strict interface for eClaims 3.0 XML generation.
 * The placeholder implementation returns clearly-marked
 * "SPEC PENDING" content. When the official schema is available,
 * a real implementation replaces the placeholder.
 */
export interface XmlGeneratorInterface {
  /** Whether the official eClaims 3.0 XML schema is loaded */
  readonly specAvailable: boolean;
  /** Schema version string (e.g., "3.0-draft" or "3.0-official") */
  readonly schemaVersion: string;
  /**
   * Generate XML from a ClaimPacket.
   * Returns { ok: true, xml } on success,
   * { ok: false, reason } when spec is unavailable.
   */
  generate(packet: ClaimPacket): XmlGeneratorResult;
  /**
   * Validate a generated XML string against the schema.
   * Returns validation errors if any.
   */
  validate(xml: string): XmlValidationResult;
}

export type XmlGeneratorResult =
  | { ok: true; xml: string; specBased: boolean }
  | { ok: false; reason: string; placeholderXml: string };

export interface XmlValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  specBased: boolean;
}

/* ── Spec Status Gate ───────────────────────────────────────── */

export interface SpecAcquisitionGate {
  id: string;
  label: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  completedAt?: string;
  blockerNote?: string;
}

export const SPEC_ACQUISITION_GATES: SpecAcquisitionGate[] = [
  {
    id: 'obtain-schema',
    label: 'Obtain eClaims 3.0 Schema/Spec',
    description: 'Download or receive the official eClaims 3.0 XML/JSON schema from PhilHealth.',
    status: 'not_started',
  },
  {
    id: 'validate-identifiers',
    label: 'Validate Required Identifiers',
    description:
      'Confirm TIN, facility codes, accreditation numbers, PhilHealth PIN format requirements.',
    status: 'not_started',
  },
  {
    id: 'sandbox-registration',
    label: 'eClaims 3.0 Sandbox Registration',
    description: 'Register facility for eClaims 3.0 sandbox/test environment access.',
    status: 'not_started',
  },
  {
    id: 'sandbox-testing',
    label: 'Sandbox Test Submission',
    description: 'Submit test claim to PhilHealth sandbox, receive valid TCN.',
    status: 'not_started',
  },
  {
    id: 'certification',
    label: 'PhilHealth eClaims 3.0 Certification',
    description: 'Complete PhilHealth certification process for production submission.',
    status: 'not_started',
  },
];
