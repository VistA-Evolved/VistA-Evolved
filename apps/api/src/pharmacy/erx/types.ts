/**
 * Phase 586 (W42-P15): e-Prescribing NCPDP SCRIPT Framework — Types
 *
 * NCPDP SCRIPT Standard v2017071 message types for electronic prescribing.
 * These types model the wire format that Surescripts, WENO, DoseSpot, and
 * other eRx networks accept. The actual transport (HTTPS, SOAP, REST)
 * is handled by the adapter layer.
 *
 * NOTE: This module does NOT include Surescripts certification (requires
 * $50K+ application fee + 6-month process). It provides the complete
 * message framework ready for certification testing.
 */

// ─── NCPDP SCRIPT Message Types ────────────────────────────

export type ScriptMessageType =
  | 'NewRx'
  | 'RxRenewalRequest'
  | 'RxRenewalResponse'
  | 'CancelRx'
  | 'CancelRxResponse'
  | 'RxChangeRequest'
  | 'RxChangeResponse'
  | 'RxFill'
  | 'RxTransferRequest'
  | 'RxTransferResponse'
  | 'Error'
  | 'Status'
  | 'Verify';

export type ControlledSubstanceSchedule = 'II' | 'III' | 'IV' | 'V' | 'non-controlled';

// ─── Prescriber ────────────────────────────────────────────

export interface ErxPrescriber {
  npi: string;
  dea: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  suffix: string | null;
  specialtyCode: string | null;
  phone: string;
  fax: string | null;
  address: ErxAddress;
  /** VistA DUZ for audit trail linkage */
  vistaDuz: string | null;
  /** State license number (required for EPCS) */
  stateLicense: string | null;
}

// ─── Patient ───────────────────────────────────────────────

export interface ErxPatient {
  lastName: string;
  firstName: string;
  middleName: string | null;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'U';
  phone: string | null;
  address: ErxAddress;
  /** Payer/insurance info for formulary checking */
  payerInfo: ErxPayerInfo | null;
  /** VistA DFN for grounding */
  vistaDfn: string | null;
}

export interface ErxAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ErxPayerInfo {
  bin: string;
  pcn: string | null;
  groupId: string | null;
  memberId: string;
  payerName: string;
}

// ─── Pharmacy ──────────────────────────────────────────────

export interface ErxPharmacy {
  ncpdpId: string;
  npi: string;
  name: string;
  phone: string;
  fax: string | null;
  address: ErxAddress;
  pharmacyType: 'retail' | 'mail_order' | 'specialty' | 'long_term_care' | 'compounding';
}

// ─── Medication ────────────────────────────────────────────

export interface ErxMedication {
  /** RxNorm CUI */
  rxnormCode: string | null;
  /** NDC-11 */
  ndc: string | null;
  /** Drug description (human-readable) */
  drugDescription: string;
  /** Drug coded (structured) */
  drugCoded: ErxDrugCoded | null;
  /** Quantity value */
  quantity: number;
  /** Quantity unit (e.g., "EA", "ML", "C48542" for tablets) */
  quantityUnitCode: string;
  /** Days supply */
  daysSupply: number;
  /** Number of refills authorized (0 = no refills) */
  refillsAuthorized: number;
  /** Directions (SIG) */
  directions: string;
  /** Substitution allowed */
  substitutionAllowed: boolean;
  /** DAW code (Dispense As Written) */
  dawCode: DawCode;
  /** Controlled substance schedule */
  schedule: ControlledSubstanceSchedule;
  /** Prior authorization number */
  priorAuthNumber: string | null;
  /** Diagnosis codes for the prescription */
  diagnosisCodes: string[];
}

export interface ErxDrugCoded {
  productCode: string;
  productCodeQualifier: 'ND' | 'RX'; // NDC or RxNorm
  formCode: string | null;
  strengthValue: string | null;
  strengthUnit: string | null;
}

/** Dispense As Written codes per NCPDP */
export type DawCode =
  | '0' // No product selection indicated
  | '1' // Substitution not allowed by prescriber
  | '2' // Substitution allowed — patient requested product dispensed
  | '3' // Substitution allowed — pharmacist selected product dispensed
  | '4' // Substitution allowed — generic drug not in stock
  | '5' // Substitution allowed — brand drug dispensed as generic
  | '7' // Substitution not allowed — brand drug mandated by law
  | '8' // Substitution allowed — generic drug not available
  | '9'; // Other

// ─── NCPDP SCRIPT Messages ────────────────────────────────

export interface ScriptMessageHeader {
  messageId: string;
  sentTime: string;
  senderSoftware: string;
  senderSoftwareVersion: string;
  tertiaryIdentification: string | null;
}

export interface NewRxMessage {
  type: 'NewRx';
  header: ScriptMessageHeader;
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  /** Supervision info for mid-level prescribers */
  supervisor: ErxPrescriber | null;
}

export interface RxRenewalRequestMessage {
  type: 'RxRenewalRequest';
  header: ScriptMessageHeader;
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  /** Original prescription number */
  originalRxNumber: string;
  /** Number of refills requested */
  refillsRequested: number;
  pharmacistNote: string | null;
}

export interface RxRenewalResponseMessage {
  type: 'RxRenewalResponse';
  header: ScriptMessageHeader;
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  responseCode: 'A' | 'D' | 'C'; // Approved, Denied, Approved with Changes
  denialReason: string | null;
  note: string | null;
}

export interface CancelRxMessage {
  type: 'CancelRx';
  header: ScriptMessageHeader;
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  /** Original prescription number to cancel */
  rxNumber: string;
  cancelReason: CancelReasonCode;
  note: string | null;
}

export type CancelReasonCode =
  | 'AA' // Patient allergy
  | 'AB' // Drug recall
  | 'AC' // Drug interaction
  | 'AD' // Duplicate therapy
  | 'AE' // Prescription not needed
  | 'AF' // Therapy changed
  | 'AG' // Patient request
  | 'ZZ'; // Other

export interface CancelRxResponseMessage {
  type: 'CancelRxResponse';
  header: ScriptMessageHeader;
  prescriber: ErxPrescriber;
  patient: ErxPatient;
  pharmacy: ErxPharmacy;
  medication: ErxMedication;
  responseCode: 'A' | 'D'; // Approved, Denied
  denialReason: string | null;
}

export interface RxFillMessage {
  type: 'RxFill';
  header: ScriptMessageHeader;
  pharmacy: ErxPharmacy;
  patient: ErxPatient;
  medication: ErxMedication;
  fillStatus: 'Dispensed' | 'PartialFill' | 'NotDispensed' | 'Transferred';
  fillDate: string;
  quantityDispensed: number;
  daysSupplyDispensed: number;
  note: string | null;
}

export type ScriptMessage =
  | NewRxMessage
  | RxRenewalRequestMessage
  | RxRenewalResponseMessage
  | CancelRxMessage
  | CancelRxResponseMessage
  | RxFillMessage;

// ─── eRx Adapter Interface ────────────────────────────────

export type ErxNetworkProvider = 'surescripts' | 'weno' | 'dosespot' | 'stub';

export interface ErxTransmitResult {
  ok: boolean;
  messageId: string;
  networkMessageId: string | null;
  timestamp: string;
  error: string | null;
}

export interface ErxPharmacySearchResult {
  pharmacies: ErxPharmacy[];
  total: number;
}

export interface ErxFormularyCheckResult {
  covered: boolean;
  tier: number | null;
  copay: number | null;
  priorAuthRequired: boolean;
  alternatives: Array<{ ndc: string; name: string; tier: number; copay: number }>;
}

export interface ErxEligibilityResult {
  eligible: boolean;
  bin: string | null;
  pcn: string | null;
  groupId: string | null;
  memberId: string | null;
  payerName: string | null;
}

/**
 * Adapter interface for eRx network providers.
 * Implement this for Surescripts, WENO, DoseSpot, or any NCPDP-compliant network.
 */
export interface ErxAdapter {
  readonly provider: ErxNetworkProvider;
  readonly supportsEpcs: boolean;

  transmitNewRx(msg: NewRxMessage): Promise<ErxTransmitResult>;
  transmitRenewalResponse(msg: RxRenewalResponseMessage): Promise<ErxTransmitResult>;
  transmitCancelRx(msg: CancelRxMessage): Promise<ErxTransmitResult>;

  searchPharmacies(zip: string, radius: number, name?: string): Promise<ErxPharmacySearchResult>;
  checkFormulary(ndc: string, payerInfo: ErxPayerInfo): Promise<ErxFormularyCheckResult>;
  checkEligibility(patient: ErxPatient): Promise<ErxEligibilityResult>;

  /** Receive and parse inbound messages (renewal requests, fill notifications) */
  parseInboundMessage(raw: string): ScriptMessage;

  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
