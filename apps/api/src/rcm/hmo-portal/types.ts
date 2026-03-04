/**
 * HMO Portal Adapter — Domain Types
 *
 * Phase 97: Top-5 HMO LOA + Claim Packet + Portal Adapter Interface.
 *
 * Architecture:
 *   - HmoClaimPacket extends the pattern from Phase 96 ClaimPacket with HMO-specific fields
 *   - PortalAdapter is the strict interface for per-HMO portal interactions
 *   - VaultRef pattern: credentials are never stored — only opaque vault references
 *   - All adapters start in "manual_assisted" mode (download + deep link)
 *   - LOA packet types extend Phase 94 LoaRequest
 *
 * VistA-first: Clinical/billing data sourced from VistA via existing domain layer.
 * This module does NOT become its own ledger.
 */

/* ── Top-5 Portal-Capable HMOs ──────────────────────────────── */

export const PORTAL_CAPABLE_HMOS = [
  'PH-MAXICARE',
  'PH-MEDICARD',
  'PH-INTELLICARE',
  'PH-PHILCARE',
  'PH-VALUCARE',
] as const;

export type PortalCapableHmoId = (typeof PORTAL_CAPABLE_HMOS)[number];

export function isPortalCapableHmo(payerId: string): payerId is PortalCapableHmoId {
  return (PORTAL_CAPABLE_HMOS as readonly string[]).includes(payerId);
}

/* ── Vault Reference (no credential storage) ────────────────── */

/**
 * Opaque reference to credentials stored in facility-controlled vault.
 * The adapter NEVER sees actual credentials — only the reference.
 * The vault is external to VistA-Evolved (e.g., HashiCorp Vault, AWS SM).
 */
export interface VaultRef {
  /** Vault provider identifier (e.g., "hashicorp", "aws-sm", "azure-kv") */
  provider: string;
  /** Opaque path or ARN to the secret */
  secretPath: string;
  /** Optional version/rotation hint */
  version?: string;
}

/* ── Portal Adapter Mode ────────────────────────────────────── */

export type PortalAdapterMode =
  | 'manual_assisted' // download packet + deep link to portal (always available)
  | 'vault_automated'; // auto-submit via vault-resolved credentials (future)

/* ── LOA Packet Types ───────────────────────────────────────── */

export type LoaPacketFormat = 'json' | 'pdf_text';

export type DepartmentSpecialty =
  | 'general_medicine'
  | 'surgery'
  | 'obstetrics_gynecology'
  | 'pediatrics'
  | 'orthopedics'
  | 'cardiology'
  | 'neurology'
  | 'oncology'
  | 'emergency'
  | 'rehabilitation'
  | 'psychiatry'
  | 'ophthalmology'
  | 'ent'
  | 'dermatology'
  | 'dental'
  | 'other';

export interface LoaPacketTemplate {
  specialty: DepartmentSpecialty;
  requiredFields: string[];
  recommendedAttachments: string[];
  payerSpecificNotes?: string;
}

/** LOA request packet — structured data for portal upload or print */
export interface LoaPacket {
  packetId: string;
  loaRequestId: string; // back-ref to Phase 94 LoaRequest.id
  payerId: string;
  payerName: string;

  // Patient basics (display only — VistA is source of truth)
  patientName: string;
  patientDfn: string;
  memberId?: string; // HMO card number

  // Clinical data (from VistA encounter)
  encounterDate: string;
  encounterIen?: string;
  specialty: DepartmentSpecialty;
  admissionType: 'outpatient' | 'inpatient' | 'daycare' | 'emergency';

  // Diagnoses + procedures (from VistA)
  diagnoses: Array<{
    code: string;
    codeSystem: 'ICD10';
    description?: string;
    isPrimary: boolean;
  }>;
  procedures: Array<{
    code: string;
    codeSystem: 'CPT' | 'HCPCS' | 'RVS';
    description?: string;
  }>;

  // Requested services
  requestedServices: string[];
  estimatedDays?: number;
  estimatedCharges?: number;

  // Provider / Facility
  attendingPhysician: string;
  attendingPhysicianLicense?: string;
  facilityName: string;
  facilityCode?: string;

  // Attachments metadata (secure refs, no inline PHI in exports)
  attachmentRefs: Array<{
    id: string;
    filename: string;
    category: string;
  }>;

  // Metadata
  generatedAt: string;
  generatedBy: string;
  contentHash: string;
}

export interface LoaPacketExport {
  format: LoaPacketFormat;
  filename: string;
  content: string;
  contentType: string;
  sizeBytes: number;
  generatedAt: string;
}

/* ── HMO Claim Packet ──────────────────────────────────────── */

/**
 * HMO-specific claim packet. Follows the Phase 96 ClaimPacket pattern
 * but tailored for HMO portal submission (no PhilHealth PIN, no case rates).
 * Shares diagnosis/procedure/charge structures.
 */
export interface HmoClaimPacket {
  packetId: string;
  /** Source claim ID from Phase 38 domain */
  sourceClaimId: string;
  /** Which HMO this packet targets */
  payerId: string;
  payerName: string;
  /** LOA reference number (from approved LOA) */
  loaReferenceNumber?: string;

  // Patient
  patient: {
    dfn: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    dob?: string;
    sex?: 'M' | 'F';
    memberId?: string; // HMO card number
    memberType?: 'principal' | 'dependent';
    employerName?: string;
    employerCode?: string;
  };

  // Facility
  facility: {
    name: string;
    code?: string;
    accreditationNumber?: string;
    tinNumber?: string;
  };

  // Encounter
  patientType: 'O' | 'I';
  admissionDate: string;
  dischargeDate?: string;
  specialty: DepartmentSpecialty;

  // Clinical (from VistA)
  diagnoses: Array<{
    code: string;
    description?: string;
    type: 'primary' | 'secondary';
  }>;
  procedures: Array<{
    code: string;
    description?: string;
    laterality?: 'L' | 'R' | 'B';
  }>;

  // Charges (from VistA IB or manual entry)
  charges: Array<{
    category: string;
    description: string;
    code?: string;
    quantity: number;
    unitCharge: number;
    discount: number;
    netAmount: number;
    hmoCoverage: number; // HMO-specific (vs PHIC coverage)
    patientShare: number;
  }>;

  // Professional fees
  professionalFees: Array<{
    physicianName: string;
    physicianLicense: string;
    feeAmount: number;
    serviceDate: string;
    procedureCode?: string;
  }>;

  // Totals
  totals: {
    totalCharges: number;
    totalDiscount: number;
    totalNetAmount: number;
    totalHmoCoverage: number;
    totalPatientShare: number;
    totalProfessionalFees: number;
  };

  // Metadata
  assembledAt: string;
  assembledBy: string;
  contentHash: string;
}

/* ── Portal Adapter Interface ───────────────────────────────── */

export interface PortalSubmitResult {
  ok: boolean;
  /** Manual-assisted: always "manual_download" */
  method: 'manual_download' | 'automated';
  /** Portal URL to navigate to (deep link if possible) */
  portalUrl?: string;
  /** Step-by-step instructions for staff */
  instructions: string[];
  /** Files generated for download */
  exportFiles: Array<{
    filename: string;
    format: string;
    sizeBytes: number;
  }>;
  /** Tracking reference (from portal if automated, system-generated if manual) */
  trackingRef?: string;
  error?: string;
}

export interface PortalStatusResult {
  ok: boolean;
  status: 'unknown' | 'pending' | 'approved' | 'denied' | 'processing';
  /** True only if checked via actual portal API */
  checkedViaApi: boolean;
  /** Last check timestamp */
  checkedAt: string;
  /** Portal reference number if available */
  portalRef?: string;
  message?: string;
  error?: string;
}

export interface PortalRemitResult {
  ok: boolean;
  available: boolean;
  /** Remittance download available only via manual portal access */
  method: 'manual_download' | 'automated';
  portalUrl?: string;
  instructions: string[];
  error?: string;
}

/**
 * Portal Adapter — strict interface for per-HMO portal interactions.
 *
 * CRITICAL: No credential storage. All authenticated operations receive
 * a VaultRef. In manual_assisted mode (Phase 97), the VaultRef is unused
 * — the adapter generates download packages + deep links instead.
 *
 * When vault-automated mode is implemented (future), the adapter will
 * resolve credentials from VaultRef → portal API calls.
 */
export interface PortalAdapter {
  /** HMO payer ID */
  readonly payerId: PortalCapableHmoId;
  /** Human-readable adapter name */
  readonly adapterName: string;
  /** Current operating mode */
  readonly mode: PortalAdapterMode;
  /** Portal base URL */
  readonly portalBaseUrl: string;

  /**
   * Submit an LOA request packet to the HMO portal.
   * In manual_assisted mode: generates exports + deep link.
   * In vault_automated mode: submits via portal API.
   */
  submitLOA(packet: LoaPacket, vaultRef?: VaultRef): Promise<PortalSubmitResult>;

  /**
   * Check claim/LOA status on the HMO portal.
   * In manual_assisted mode: returns deep link to status page.
   * In vault_automated mode: queries portal API.
   */
  checkStatus(claimId: string, vaultRef?: VaultRef): Promise<PortalStatusResult>;

  /**
   * Download remittance/EOB from HMO portal.
   * In manual_assisted mode: returns deep link to remittance page.
   * In vault_automated mode: downloads via portal API.
   */
  downloadRemit(claimId: string, vaultRef?: VaultRef): Promise<PortalRemitResult>;

  /**
   * Submit a claim packet to the HMO portal.
   * In manual_assisted mode: generates exports + deep link.
   * In vault_automated mode: submits via portal API.
   */
  submitClaim(packet: HmoClaimPacket, vaultRef?: VaultRef): Promise<PortalSubmitResult>;

  /** Health/connectivity check (portal reachable?) */
  healthCheck(): Promise<{ healthy: boolean; details: string }>;
}

/* ── Portal Adapter Registry ────────────────────────────────── */

const adapterRegistry = new Map<string, PortalAdapter>();

export function registerPortalAdapter(adapter: PortalAdapter): void {
  adapterRegistry.set(adapter.payerId, adapter);
}

export function getPortalAdapter(payerId: string): PortalAdapter | undefined {
  return adapterRegistry.get(payerId);
}

export function listPortalAdapters(): Array<{
  payerId: string;
  adapterName: string;
  mode: PortalAdapterMode;
  portalBaseUrl: string;
}> {
  return Array.from(adapterRegistry.values()).map((a) => ({
    payerId: a.payerId,
    adapterName: a.adapterName,
    mode: a.mode,
    portalBaseUrl: a.portalBaseUrl,
  }));
}

/* ── HMO Submission Status Tracking ─────────────────────────── */

export type HmoSubmissionStatus =
  | 'draft'
  | 'loa_pending'
  | 'loa_approved'
  | 'loa_denied'
  | 'claim_prepared'
  | 'claim_exported'
  | 'claim_submitted_manual'
  | 'claim_processing'
  | 'claim_approved'
  | 'claim_denied'
  | 'remittance_received'
  | 'posted_to_vista'; // terminal — ledger posting is VistA-first

export const HMO_STATUS_TRANSITIONS: Record<HmoSubmissionStatus, HmoSubmissionStatus[]> = {
  draft: ['loa_pending'],
  loa_pending: ['loa_approved', 'loa_denied'],
  loa_approved: ['claim_prepared'],
  loa_denied: ['draft'], // retry
  claim_prepared: ['claim_exported'],
  claim_exported: ['claim_submitted_manual'],
  claim_submitted_manual: ['claim_processing', 'claim_approved', 'claim_denied'],
  claim_processing: ['claim_approved', 'claim_denied'],
  claim_approved: ['remittance_received'],
  claim_denied: ['claim_prepared'], // rework and resubmit
  remittance_received: ['posted_to_vista'],
  posted_to_vista: [], // terminal
};

export function isValidHmoTransition(from: HmoSubmissionStatus, to: HmoSubmissionStatus): boolean {
  return HMO_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Manual-only transitions that require staff confirmation.
 * The system cannot auto-advance to these without human action.
 */
export function isHmoManualTransition(to: HmoSubmissionStatus): boolean {
  return [
    'claim_submitted_manual',
    'claim_approved',
    'claim_denied',
    'remittance_received',
    'posted_to_vista',
  ].includes(to);
}

/* ── HMO Submission Record ──────────────────────────────────── */

export interface HmoSubmissionRecord {
  id: string;
  payerId: string;
  payerName: string;
  claimId?: string; // Phase 38 claim store ID
  loaRequestId?: string; // Phase 94 LOA store ID
  loaPacketId?: string;
  claimPacketId?: string;
  status: HmoSubmissionStatus;
  portalRef?: string; // HMO-assigned reference
  loaReferenceNumber?: string;
  denialReason?: string;
  denialCode?: string;
  staffNotes: string[];
  exportFiles: string[]; // filenames generated
  timeline: Array<{
    timestamp: string;
    fromStatus: HmoSubmissionStatus;
    toStatus: HmoSubmissionStatus;
    actor: string;
    detail?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
