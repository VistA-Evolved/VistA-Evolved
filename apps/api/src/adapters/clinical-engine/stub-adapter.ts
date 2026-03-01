/**
 * External Stub Clinical Engine Adapter — Phase 37C, extended Phase 432.
 *
 * Safe placeholder that returns "pending" for every method.
 * Used when the clinical-engine module is enabled but no real adapter is configured.
 */

import type { ClinicalEngineAdapter } from "./interface.js";
import type {
  AdapterResult, PatientRecord, AllergyRecord, VitalRecord, NoteRecord,
  MedicationRecord, ProblemRecord, LabResult, EncounterRecord,
  WardRecord, MovementRecord, WriteResult,
  InpatientMedOrder, MAREntry, BarcodeScanResult, PharmacyVerifyResult,
} from "../types.js";

const STUB_RESULT = Object.freeze({ ok: false as const, pending: true, error: "Clinical engine adapter not configured" });

export class StubClinicalAdapter implements ClinicalEngineAdapter {
  readonly adapterType = "clinical-engine" as const;
  readonly implementationName = "external-stub";
  readonly _isStub = true;

  async healthCheck() {
    return { ok: false, latencyMs: 0, detail: "Stub adapter — no backend configured" };
  }

  /* Read methods (Phase 37C) */
  async searchPatients(): Promise<AdapterResult<PatientRecord[]>> { return STUB_RESULT; }
  async getPatient(): Promise<AdapterResult<PatientRecord>> { return STUB_RESULT; }
  async getAllergies(): Promise<AdapterResult<AllergyRecord[]>> { return STUB_RESULT; }
  async getVitals(): Promise<AdapterResult<VitalRecord[]>> { return STUB_RESULT; }
  async getNotes(): Promise<AdapterResult<NoteRecord[]>> { return STUB_RESULT; }
  async getMedications(): Promise<AdapterResult<MedicationRecord[]>> { return STUB_RESULT; }
  async getProblems(): Promise<AdapterResult<ProblemRecord[]>> { return STUB_RESULT; }
  async getLabs(): Promise<AdapterResult<LabResult[]>> { return STUB_RESULT; }
  async getEncounters(): Promise<AdapterResult<EncounterRecord[]>> { return STUB_RESULT; }
  async getReportList(): Promise<AdapterResult<Array<{ id: string; name: string }>>> { return STUB_RESULT; }
  async getReportText(): Promise<AdapterResult<string>> { return STUB_RESULT; }

  /* Write methods (Phase 431) */
  async addAllergy(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }
  async addVital(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }
  async createNote(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }
  async addProblem(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }

  /* ADT methods (Phase 431) */
  async getWards(): Promise<AdapterResult<WardRecord[]>> { return STUB_RESULT; }
  async getMovements(): Promise<AdapterResult<MovementRecord[]>> { return STUB_RESULT; }
  async admitPatient(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }
  async transferPatient(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }
  async dischargePatient(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }

  /* Pharmacy / MAR / BCMA methods (Phase 432) */
  async getInpatientMeds(): Promise<AdapterResult<InpatientMedOrder[]>> { return STUB_RESULT; }
  async getMAR(): Promise<AdapterResult<MAREntry[]>> { return STUB_RESULT; }
  async recordAdministration(): Promise<AdapterResult<WriteResult>> { return STUB_RESULT; }
  async scanBarcode(): Promise<AdapterResult<BarcodeScanResult>> { return STUB_RESULT; }
  async getAdminHistory(): Promise<AdapterResult<MAREntry[]>> { return STUB_RESULT; }
  async verifyOrder(): Promise<AdapterResult<PharmacyVerifyResult>> { return STUB_RESULT; }
}
