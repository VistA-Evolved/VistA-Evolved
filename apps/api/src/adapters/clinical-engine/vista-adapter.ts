/**
 * VistA Clinical Engine Adapter — Phase 37C, extended Phase 431.
 *
 * Default implementation that calls VistA RPCs via the RPC Broker client.
 * This is the production adapter for VA and WorldVistA environments.
 */

import type { ClinicalEngineAdapter } from "./interface.js";
import { log } from "../../lib/logger.js";
import type {
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
} from "../types.js";

export class VistaClinicalAdapter implements ClinicalEngineAdapter {
  readonly adapterType = "clinical-engine" as const;
  readonly implementationName = "vista-rpc";
  readonly _isStub = false;

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
    const start = Date.now();
    try {
      const { probeConnect } = await import("../../vista/rpcBroker.js");
      await probeConnect();
      return { ok: true, latencyMs: Date.now() - start, detail: "VistA RPC Broker reachable" };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, detail: err.message };
    }
  }

  async searchPatients(query: string, maxResults = 44): Promise<AdapterResult<PatientRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWPT LIST ALL", [query, "1", String(maxResults)]);
      const patients: PatientRecord[] = rawLines.filter(Boolean).map((line: string) => {
        const [dfn, name] = line.split("^");
        return { dfn, name: name || "" };
      });
      return { ok: true, data: patients };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getPatient(dfn: string): Promise<AdapterResult<PatientRecord>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWPT SELECT", [dfn]);
      const raw = rawLines.join("\r\n");
      const parts = (raw || "").split("^");
      return {
        ok: true,
        data: {
          dfn,
          name: parts[0] || "",
          ssn: parts[1] || undefined,
          dob: parts[2] || undefined,
          sex: parts[3] || undefined,
        },
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getAllergies(dfn: string): Promise<AdapterResult<AllergyRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORQQAL LIST", [dfn]);
      const allergies: AllergyRecord[] = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return { id: parts[0] || "", allergen: parts[1] || "" };
      });
      return { ok: true, data: allergies };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getVitals(dfn: string): Promise<AdapterResult<VitalRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORQQVI VITALS", [dfn]);
      const vitals: VitalRecord[] = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return { id: parts[0] || "", type: parts[1] || "", value: parts[2] || "", dateTime: parts[3] || "" };
      });
      return { ok: true, data: vitals };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getNotes(dfn: string): Promise<AdapterResult<NoteRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("TIU DOCUMENTS BY CONTEXT", [dfn, "1", "0", "0", "0", "0"]);
      const notes: NoteRecord[] = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return { id: parts[0] || "", title: parts[1] || "", dateTime: parts[2] || "" };
      });
      return { ok: true, data: notes };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getMedications(dfn: string): Promise<AdapterResult<MedicationRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);
      const meds: MedicationRecord[] = [];
      for (const line of rawLines) {
        if (line.startsWith("~")) {
          const parts = line.substring(1).split("^");
          meds.push({ id: parts[0] || "", name: parts[1] || "" });
        }
      }
      return { ok: true, data: meds };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getProblems(dfn: string): Promise<AdapterResult<ProblemRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORQQPL PROBLEM LIST", [dfn]);
      const problems: ProblemRecord[] = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return { id: parts[0] || "", description: parts[1] || "" };
      });
      return { ok: true, data: problems };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getLabs(dfn: string): Promise<AdapterResult<LabResult[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWLRR INTERIM", [dfn, "0", "0"]);
      const labs: LabResult[] = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return { id: parts[0] || "", testName: parts[1] || "", result: parts[2] || "", dateTime: parts[3] || "" };
      });
      return { ok: true, data: labs };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getEncounters(dfn: string): Promise<AdapterResult<EncounterRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      // Use ORWCV VST to get visits/encounters for a patient
      const rawLines = await safeCallRpc("ORWCV VST", [dfn]);
      const encounters: EncounterRecord[] = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return {
          id: parts[0] || "",
          patientDfn: dfn,
          dateTime: parts[1] || "",
          status: parts[2] || "finished",
          class: parts[3] || "AMB",
          clinic: parts[4] || "",
          clinicIen: parts[5] || undefined,
          provider: parts[6] || undefined,
        };
      });
      return { ok: true, data: encounters };
    } catch (primaryErr) {
      // Log primary RPC error before attempting fallback
      log.debug("VistA encounters RPC failed, trying scheduling fallback", {
        error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
      });
      // Fallback: try scheduling adapter's SDOE LIST ENCOUNTERS FOR PAT
      try {
        const { getAdapter } = await import("../adapter-loader.js");
        const schedAdapter = getAdapter("scheduling") as any;
        if (schedAdapter && !schedAdapter._isStub) {
          const result = await schedAdapter.listAppointments(dfn);
          if (result.ok && result.data) {
            const mapped: EncounterRecord[] = result.data.map((a: any) => ({
              id: a.encounterIen || a.id,
              patientDfn: dfn,
              dateTime: a.dateTime,
              status: a.status === "CHECKED OUT" ? "finished" : "planned",
              class: "AMB",
              type: a.type,
              clinic: a.clinic,
              clinicIen: a.clinicIen,
              provider: a.provider,
              providerDuz: a.providerDuz,
              reason: a.reason,
              duration: a.duration,
            }));
            return { ok: true, data: mapped };
          }
        }
      } catch { /* ignore scheduling fallback errors */ }
      return {
        ok: false,
        pending: true,
        target: "ORWCV VST / SDOE LIST ENCOUNTERS FOR PAT",
        error: "Encounter data not available in sandbox",
      };
    }
  }

  async getReportList(): Promise<AdapterResult<Array<{ id: string; name: string }>>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWRP REPORT LISTS", []);
      const reports = rawLines.filter(Boolean).map((line: string) => {
        const parts = line.split("^");
        return { id: parts[0] || "", name: parts[1] || "" };
      });
      return { ok: true, data: reports };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getReportText(dfn: string, reportId: string): Promise<AdapterResult<string>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWRP REPORT TEXT", [dfn, reportId, "", "", "", "", "", "", ""]);
      return { ok: true, data: rawLines.join("\n") };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /* ---------------------------------------------------------------- */
  /* Write methods (Phase 431)                                         */
  /* ---------------------------------------------------------------- */

  async addAllergy(dfn: string, _allergen: string, _params: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "ORWDAL32 SAVE ALLERGY",
      error: "Write via adapter not yet wired — use route-direct safeCallRpcWithList",
      vistaGrounding: { rpc: "ORWDAL32 SAVE ALLERGY", vistaPackage: "OR", vistaFiles: ["120.8"], sandboxNote: "Available and tested via route-direct path" },
    };
  }

  async addVital(dfn: string, _type: string, _value: string, _params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "GMV ADD VM",
      error: "Write via adapter not yet wired — use route-direct safeCallRpc",
      vistaGrounding: { rpc: "GMV ADD VM", vistaPackage: "GMV", vistaFiles: ["120.5"], sandboxNote: "Available and tested via route-direct path" },
    };
  }

  async createNote(dfn: string, _titleIen: string, _text: string, _params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "TIU CREATE RECORD",
      error: "Write via adapter not yet wired — use route-direct safeCallRpc",
      vistaGrounding: { rpc: "TIU CREATE RECORD", vistaPackage: "TIU", vistaFiles: ["8925"], sandboxNote: "Available and tested via route-direct path" },
    };
  }

  async addProblem(dfn: string, _icdCode: string, _description: string, _params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "ORQQPL ADD SAVE",
      error: "Write via adapter not yet wired — use route-direct safeCallRpc",
      vistaGrounding: { rpc: "ORQQPL ADD SAVE", vistaPackage: "OR", vistaFiles: ["9000011"], sandboxNote: "Available and tested via route-direct path" },
    };
  }

  /* ---------------------------------------------------------------- */
  /* ADT methods (Phase 431)                                           */
  /* ---------------------------------------------------------------- */

  async getWards(): Promise<AdapterResult<WardRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORQPT WARDS", []);
      const wards: WardRecord[] = rawLines
        .filter((l: string) => l.trim())
        .map((l: string) => {
          const [ien, ...rest] = l.split("^");
          return { ien: ien.trim(), name: rest.join("^").trim() || ien.trim() };
        });
      return { ok: true, data: wards };
    } catch (err: any) {
      log.warn("getWards failed", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  async getMovements(dfn: string): Promise<AdapterResult<MovementRecord[]>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWPT16 ADMITLST", [dfn]);
      const movements: MovementRecord[] = rawLines
        .filter((l: string) => l.trim())
        .map((l: string) => {
          const parts = l.split("^");
          return {
            id: parts[0] || "",
            patientDfn: dfn,
            movementType: "admission" as const,
            dateTime: parts[1] || "",
            ward: parts[2] || "",
          };
        });
      return { ok: true, data: movements };
    } catch (err: any) {
      log.warn("getMovements failed", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  async admitPatient(_request: AdmitRequest): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "DGPM NEW ADMISSION",
      error: "ADT admission write not available in sandbox — DGPM RPCs not exposed in OR CPRS GUI CHART context",
      vistaGrounding: {
        rpc: "DGPM NEW ADMISSION", vistaPackage: "DG",
        vistaFiles: ["405", "2"], sandboxNote: "Not available in WorldVistA Docker",
        migrationPath: "Wire via ZVEADT.m custom wrapper or DG ADT context",
      },
    };
  }

  async transferPatient(_request: TransferRequest): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "DGPM NEW TRANSFER",
      error: "ADT transfer write not available in sandbox — DGPM RPCs not exposed",
      vistaGrounding: {
        rpc: "DGPM NEW TRANSFER", vistaPackage: "DG",
        vistaFiles: ["405"], sandboxNote: "Not available in WorldVistA Docker",
        migrationPath: "Wire via ZVEADT.m custom wrapper or DG ADT context",
      },
    };
  }

  async dischargePatient(_request: DischargeRequest): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "DGPM NEW DISCHARGE",
      error: "ADT discharge write not available in sandbox — DGPM RPCs not exposed",
      vistaGrounding: {
        rpc: "DGPM NEW DISCHARGE", vistaPackage: "DG",
        vistaFiles: ["405"], sandboxNote: "Not available in WorldVistA Docker",
        migrationPath: "Wire via ZVEADT.m custom wrapper or DG ADT context",
      },
    };
  }
}
