/**
 * External Stub Clinical Engine Adapter — Phase 37C.
 *
 * Safe placeholder that returns "pending" for every method.
 * Used when the clinical-engine module is enabled but no real adapter is configured.
 */

import type { ClinicalEngineAdapter } from "./interface.js";
import type { AdapterResult, PatientRecord, AllergyRecord, VitalRecord, NoteRecord, MedicationRecord, ProblemRecord, LabResult } from "../types.js";

const STUB_RESULT = { ok: false as const, pending: true, error: "Clinical engine adapter not configured" };

export class StubClinicalAdapter implements ClinicalEngineAdapter {
  readonly adapterType = "clinical-engine" as const;
  readonly implementationName = "external-stub";
  readonly _isStub = true;

  async healthCheck() {
    return { ok: false, latencyMs: 0, detail: "Stub adapter — no backend configured" };
  }

  async searchPatients(): Promise<AdapterResult<PatientRecord[]>> { return STUB_RESULT; }
  async getPatient(): Promise<AdapterResult<PatientRecord>> { return STUB_RESULT; }
  async getAllergies(): Promise<AdapterResult<AllergyRecord[]>> { return STUB_RESULT; }
  async getVitals(): Promise<AdapterResult<VitalRecord[]>> { return STUB_RESULT; }
  async getNotes(): Promise<AdapterResult<NoteRecord[]>> { return STUB_RESULT; }
  async getMedications(): Promise<AdapterResult<MedicationRecord[]>> { return STUB_RESULT; }
  async getProblems(): Promise<AdapterResult<ProblemRecord[]>> { return STUB_RESULT; }
  async getLabs(): Promise<AdapterResult<LabResult[]>> { return STUB_RESULT; }
  async getReportList(): Promise<AdapterResult<Array<{ id: string; name: string }>>> { return STUB_RESULT; }
  async getReportText(): Promise<AdapterResult<string>> { return STUB_RESULT; }
}
