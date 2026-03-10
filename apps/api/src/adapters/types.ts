/**
 * Adapter Type Definitions -- Phase 37C.
 *
 * Shared types used across all adapter interfaces.
 */

/** Base interface all adapters must implement. */
export interface BaseAdapter {
  /** Adapter type identifier (e.g. "clinical-engine", "imaging") */
  readonly adapterType: string;
  /** Implementation name (e.g. "vista", "external-stub", "epic-fhir") */
  readonly implementationName: string;
  /** True if this is a stub/placeholder implementation */
  readonly _isStub: boolean;
  /** Health check -- returns true if the adapter's backend is reachable */
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; detail?: string }>;
}

/** Standard result for adapter methods that may not be implemented. */
export interface AdapterResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  /** True if this capability is not yet implemented */
  pending?: boolean;
  /** Target RPC or endpoint that would provide this data */
  target?: string;
  /** VistA posture metadata -- which RPC/file was used (Phase 123) */
  vistaGrounding?: {
    rpc: string;
    vistaPackage: string;
    vistaFiles?: string[];
    sandboxNote?: string;
    migrationPath?: string;
  };
}

/** Patient demographics shape (cross-adapter). */
export interface PatientRecord {
  dfn: string;
  name: string;
  ssn?: string;
  dob?: string;
  sex?: string;
  veteran?: boolean;
  roomBed?: string;
  location?: string;
}

/** Allergy record shape. */
export interface AllergyRecord {
  id: string;
  allergen: string;
  reactions?: string[];
  severity?: string;
  type?: string;
  verified?: boolean;
  enteredDate?: string;
}

/** Vital sign record shape. */
export interface VitalRecord {
  id: string;
  type: string;
  value: string;
  unit?: string;
  dateTime: string;
  facility?: string;
}

/** Clinical note record shape. */
export interface NoteRecord {
  id: string;
  title: string;
  author?: string;
  dateTime: string;
  status?: string;
  text?: string;
}

/** Medication record shape. */
export interface MedicationRecord {
  id: string;
  name: string;
  dose?: string;
  route?: string;
  schedule?: string;
  status?: string;
  prescriber?: string;
  startDate?: string;
}

/** Problem list record shape. */
export interface ProblemRecord {
  id: string;
  description: string;
  icdCode?: string;
  onset?: string;
  status?: string;
  provider?: string;
}

/** Lab result record shape. */
export interface LabResult {
  id: string;
  testName: string;
  result: string;
  units?: string;
  refRange?: string;
  dateTime: string;
  status?: string;
  abnormalFlag?: string;
}

/** Encounter/visit record shape (Phase 179). */
export interface EncounterRecord {
  id: string;
  patientDfn: string;
  dateTime: string;
  status: string;
  class: string;
  type?: string;
  clinic?: string;
  clinicIen?: string;
  provider?: string;
  providerDuz?: string;
  reason?: string;
  duration?: number;
}

/* ================================================================== */
/* ADT (Admission/Discharge/Transfer) types -- Phase 431               */
/* ================================================================== */

/** Ward record shape. */
export interface WardRecord {
  ien: string;
  name: string;
  abbreviation?: string;
  service?: string;
  bedsAuthorized?: number;
  bedsOccupied?: number;
  bedsAvailable?: number;
}

/** Patient movement record (admission, transfer, discharge). */
export interface MovementRecord {
  id: string;
  patientDfn: string;
  movementType: 'admission' | 'transfer' | 'discharge';
  dateTime: string;
  ward?: string;
  wardIen?: string;
  roomBed?: string;
  attendingProvider?: string;
  attendingDuz?: string;
  treatingSpecialty?: string;
  disposition?: string;
}

/** ADT admission request. */
export interface AdmitRequest {
  dfn: string;
  wardIen: string;
  roomBed?: string;
  attendingDuz: string;
  admitDateTime?: string;
  treatingSpecialty?: string;
  admissionType?: string;
}

/** ADT transfer request. */
export interface TransferRequest {
  dfn: string;
  fromWardIen: string;
  toWardIen: string;
  roomBed?: string;
  attendingDuz?: string;
  transferDateTime?: string;
  reason?: string;
}

/** ADT discharge request. */
export interface DischargeRequest {
  dfn: string;
  wardIen: string;
  dischargeDateTime?: string;
  disposition?: string;
  attendingDuz?: string;
}

/** Write operation result with optional IEN. */
export interface WriteResult {
  success: boolean;
  ien?: string;
  message?: string;
}

/* ================================================================== */
/* Pharmacy / MAR / BCMA types -- Phase 432                             */
/* ================================================================== */

/** Inpatient medication order (unit dose / IV). */
export interface InpatientMedOrder {
  orderIen: string;
  drugName: string;
  dose: string;
  route: string;
  schedule: string;
  type: 'unit-dose' | 'iv' | 'other';
  status: 'active' | 'pending' | 'discontinued' | 'expired' | 'hold';
  startDate?: string;
  stopDate?: string;
  prescriber?: string;
  pharmacistVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

/** Single MAR entry (one scheduled administration time slot). */
export interface MAREntry {
  id: string;
  orderIen: string;
  drugName: string;
  dose: string;
  route: string;
  scheduledTime: string; // ISO datetime
  status: 'due' | 'given' | 'refused' | 'held' | 'missed' | 'not-given';
  administeredTime?: string; // ISO datetime when actually given
  administeredBy?: string; // nurse/provider name
  administeredByDuz?: string;
  witnessedBy?: string;
  reason?: string; // if refused/held/not-given
  site?: string; // injection site
  comments?: string;
}

/** Medication administration record request (recording a given/refused/held). */
export interface MedAdminRequest {
  dfn: string;
  orderIen: string;
  action: 'given' | 'refused' | 'held' | 'not-given';
  administeredTime?: string;
  dose?: string;
  route?: string;
  site?: string;
  reason?: string;
  comments?: string;
  witnessDuz?: string;
}

/** Barcode scan result -- resolved medication from BCMA barcode. */
export interface BarcodeScanResult {
  found: boolean;
  orderIen?: string;
  drugName?: string;
  dose?: string;
  route?: string;
  ndc?: string;
  lotNumber?: string;
  expirationDate?: string;
  matchedPatientDfn?: string;
  warnings?: string[];
}

/** Pharmacy verification request shape. */
export interface PharmacyVerifyRequest {
  orderIen: string;
  action: 'verify' | 'reject' | 'modify';
  pharmacistDuz: string;
  comments?: string;
}

/** Pharmacy verification result. */
export interface PharmacyVerifyResult {
  success: boolean;
  orderIen: string;
  verificationStatus: 'verified' | 'rejected' | 'modified' | 'pending';
  verifiedBy?: string;
  verifiedAt?: string;
  message?: string;
}
