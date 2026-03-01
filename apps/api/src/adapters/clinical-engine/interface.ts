/**
 * Clinical Engine Adapter Interface — Phase 37C.
 *
 * Defines the contract for clinical data access. The default implementation
 * uses VistA RPCs via the RPC Broker. Alternative implementations can use
 * FHIR, HL7v2, or direct database access.
 */

import type {
  BaseAdapter,
  AdapterResult,
  PatientRecord,
  AllergyRecord,
  VitalRecord,
  NoteRecord,
  MedicationRecord,
  ProblemRecord,
  LabResult,
  EncounterRecord,
  WardRecord,
  MovementRecord,
  AdmitRequest,
  TransferRequest,
  DischargeRequest,
  WriteResult,
  InpatientMedOrder,
  MAREntry,
  MedAdminRequest,
  BarcodeScanResult,
  PharmacyVerifyRequest,
  PharmacyVerifyResult,
} from "../types.js";

export interface ClinicalEngineAdapter extends BaseAdapter {
  readonly adapterType: "clinical-engine";

  /* ---------------------------------------------------------------- */
  /* Read methods (Phase 37C)                                          */
  /* ---------------------------------------------------------------- */

  /** Search patients by name fragment. */
  searchPatients(query: string, maxResults?: number): Promise<AdapterResult<PatientRecord[]>>;

  /** Get patient demographics by DFN. */
  getPatient(dfn: string): Promise<AdapterResult<PatientRecord>>;

  /** Get patient allergies. */
  getAllergies(dfn: string): Promise<AdapterResult<AllergyRecord[]>>;

  /** Get patient vitals. */
  getVitals(dfn: string): Promise<AdapterResult<VitalRecord[]>>;

  /** Get patient clinical notes. */
  getNotes(dfn: string): Promise<AdapterResult<NoteRecord[]>>;

  /** Get patient medications (active). */
  getMedications(dfn: string): Promise<AdapterResult<MedicationRecord[]>>;

  /** Get patient problem list. */
  getProblems(dfn: string): Promise<AdapterResult<ProblemRecord[]>>;

  /** Get patient lab results. */
  getLabs(dfn: string): Promise<AdapterResult<LabResult[]>>;

  /** Get patient encounters/visits (Phase 179). */
  getEncounters(dfn: string): Promise<AdapterResult<EncounterRecord[]>>;

  /** Get report list. */
  getReportList(): Promise<AdapterResult<Array<{ id: string; name: string }>>>;  

  /** Get report text. */
  getReportText(dfn: string, reportId: string): Promise<AdapterResult<string>>;

  /* ---------------------------------------------------------------- */
  /* Write methods (Phase 431)                                         */
  /* ---------------------------------------------------------------- */

  /** Add an allergy for a patient. */
  addAllergy(dfn: string, allergen: string, params: Record<string, unknown>): Promise<AdapterResult<WriteResult>>;

  /** Add a vital sign reading. */
  addVital(dfn: string, vitalType: string, value: string, params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>>;

  /** Create a clinical note (TIU). */
  createNote(dfn: string, titleIen: string, text: string, params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>>;

  /** Add a problem to the patient's problem list. */
  addProblem(dfn: string, icdCode: string, description: string, params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>>;

  /* ---------------------------------------------------------------- */
  /* ADT methods (Phase 431)                                           */
  /* ---------------------------------------------------------------- */

  /** List all wards. */
  getWards(): Promise<AdapterResult<WardRecord[]>>;

  /** Get patient movement history. */
  getMovements(dfn: string): Promise<AdapterResult<MovementRecord[]>>;

  /** Admit a patient to a ward. */
  admitPatient(request: AdmitRequest): Promise<AdapterResult<WriteResult>>;

  /** Transfer a patient between wards. */
  transferPatient(request: TransferRequest): Promise<AdapterResult<WriteResult>>;

  /** Discharge a patient from a ward. */
  dischargePatient(request: DischargeRequest): Promise<AdapterResult<WriteResult>>;

  /* ---------------------------------------------------------------- */
  /* Pharmacy / MAR / BCMA methods (Phase 432)                         */
  /* ---------------------------------------------------------------- */

  /** Get inpatient medication orders (unit dose + IV). */
  getInpatientMeds(dfn: string): Promise<AdapterResult<InpatientMedOrder[]>>;

  /** Get MAR (Medication Administration Record) entries for a patient. */
  getMAR(dfn: string, dateRange?: { from?: string; to?: string }): Promise<AdapterResult<MAREntry[]>>;

  /** Record a medication administration (given/refused/held/not-given). */
  recordAdministration(request: MedAdminRequest): Promise<AdapterResult<WriteResult>>;

  /** Scan a barcode to resolve medication identity (BCMA). */
  scanBarcode(barcode: string, patientDfn?: string): Promise<AdapterResult<BarcodeScanResult>>;

  /** Get medication administration history for a patient. */
  getAdminHistory(dfn: string, orderIen?: string): Promise<AdapterResult<MAREntry[]>>;

  /** Pharmacist verification of an inpatient order. */
  verifyOrder(request: PharmacyVerifyRequest): Promise<AdapterResult<PharmacyVerifyResult>>;
}
