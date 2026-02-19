/**
 * Adapter Type Definitions — Phase 37C.
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
  /** Health check — returns true if the adapter's backend is reachable */
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
