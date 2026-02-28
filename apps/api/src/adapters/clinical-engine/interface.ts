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
} from "../types.js";

export interface ClinicalEngineAdapter extends BaseAdapter {
  readonly adapterType: "clinical-engine";

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
}
