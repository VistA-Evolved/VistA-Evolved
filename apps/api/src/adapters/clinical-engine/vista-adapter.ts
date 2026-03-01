/**
 * VistA Clinical Engine Adapter — Phase 37C, extended Phase 436.
 *
 * Default implementation that calls VistA RPCs via the RPC Broker client.
 * This is the production adapter for VA and WorldVistA environments.
 */

import type { ClinicalEngineAdapter } from "./interface.js";
import { log } from "../../lib/logger.js";
import { auditAdapterWrite } from "../adapter-audit.js";
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
  InpatientMedOrder,
  MAREntry,
  MedAdminRequest,
  BarcodeScanResult,
  PharmacyVerifyRequest,
  PharmacyVerifyResult,
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
  /* Write methods — wired to RPCs (Phase 435)                         */
  /* ---------------------------------------------------------------- */

  async addAllergy(dfn: string, allergen: string, params: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    try {
      const { safeCallRpcWithList } = await import("../../lib/rpc-resilience.js");
      const { getDuz } = await import("../../vista/rpcBrokerClient.js");
      const duz = getDuz();

      // ORWDAL32 SAVE ALLERGY requires OREDITED LIST params
      const listParams: Record<string, string> = {
        '"GMRAGNT"': String(allergen),                    // NAME^IEN;file_root
        '"GMRATYPE"': String(params.type || "D"),         // D=Drug, F=Food, O=Other
        '"GMRANATR"': String(params.nature || "A^Allergy"),
        '"GMRAORIG"': String(duz),
        '"GMRACHT"': new Date().toISOString(),
        '"GMRAOBHX"': String(params.observedHistorical || "h^HISTORICAL"),
      };
      if (params.severity) listParams['"GMRASEVR"'] = String(params.severity);
      if (params.comments) listParams['"GMRACMTS"'] = String(params.comments);
      if (Array.isArray(params.reactions)) {
        (params.reactions as string[]).forEach((r, i) => {
          listParams[`"GMRASYMP",${i}`] = String(r);
        });
      }

      const resp = await safeCallRpcWithList("ORWDAL32 SAVE ALLERGY", [
        { type: "literal", value: dfn },
        { type: "list", value: listParams },
      ]);
      const result = resp.join("\n").trim();
      const ien = result.split("^")[0];
      const failed = ien.startsWith("-1") || ien === "0";

      auditAdapterWrite({
        action: "write.allergy", success: !failed, duz, dfn,
        rpc: "ORWDAL32 SAVE ALLERGY", ien: failed ? undefined : ien,
        errorMessage: failed ? result : undefined,
      });

      return {
        ok: !failed,
        data: { success: !failed, ien: failed ? undefined : ien, message: failed ? result : "Allergy saved" },
        vistaGrounding: { rpc: "ORWDAL32 SAVE ALLERGY", vistaPackage: "OR", vistaFiles: ["120.8"] },
      };
    } catch (err: any) {
      log.warn("addAllergy via adapter failed", { error: err.message });
      auditAdapterWrite({ action: "write.allergy", success: false, dfn, rpc: "ORWDAL32 SAVE ALLERGY", errorMessage: err.message });
      return { ok: false, error: err.message, vistaGrounding: { rpc: "ORWDAL32 SAVE ALLERGY", vistaPackage: "OR", vistaFiles: ["120.8"] } };
    }
  }

  async addVital(dfn: string, vitalType: string, value: string, params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const { getDuz } = await import("../../vista/rpcBrokerClient.js");
      const duz = getDuz();

      // GMV ADD VM param format: DFN^datetime^vitalTypeIEN^value^units^qualifier^DUZ^location
      const now = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const units = String(params?.units || "");
      const qualifier = String(params?.qualifier || "");
      const location = String(params?.location || "1");
      const paramStr = `${dfn}^${now}^${vitalType}^${value}^${units}^${qualifier}^${duz}^${location}`;

      const resp = await safeCallRpc("GMV ADD VM", [paramStr]);
      const result = resp.join("\n").trim();
      const failed = result.toUpperCase().includes("ERROR");

      auditAdapterWrite({
        action: "write.vitals", success: !failed, duz, dfn,
        rpc: "GMV ADD VM",
        errorMessage: failed ? result : undefined,
      });

      return {
        ok: !failed,
        data: { success: !failed, message: failed ? result : "Vital added" },
        vistaGrounding: { rpc: "GMV ADD VM", vistaPackage: "GMV", vistaFiles: ["120.5"] },
      };
    } catch (err: any) {
      log.warn("addVital via adapter failed", { error: err.message });
      auditAdapterWrite({ action: "write.vitals", success: false, dfn, rpc: "GMV ADD VM", errorMessage: err.message });
      return { ok: false, error: err.message, vistaGrounding: { rpc: "GMV ADD VM", vistaPackage: "GMV", vistaFiles: ["120.5"] } };
    }
  }

  async createNote(dfn: string, titleIen: string, text: string, params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const { getDuz } = await import("../../vista/rpcBrokerClient.js");
      const duz = getDuz();

      const visitLocation = String(params?.visitLocation || "");
      const visitDate = String(params?.visitDate || "");

      // Step 1: TIU CREATE RECORD
      const createResp = await safeCallRpc("TIU CREATE RECORD", [
        dfn, titleIen, duz, visitLocation, visitDate,
      ]);
      const docIen = createResp[0]?.split("^")[0]?.trim();
      if (!docIen || docIen.startsWith("-1") || docIen === "0") {
        auditAdapterWrite({ action: "write.note", success: false, duz, dfn, rpc: "TIU CREATE RECORD", errorMessage: createResp.join("\n") });
        return {
          ok: false,
          data: { success: false, message: createResp.join("\n") },
          vistaGrounding: { rpc: "TIU CREATE RECORD", vistaPackage: "TIU", vistaFiles: ["8925"] },
        };
      }

      // Step 2: TIU SET DOCUMENT TEXT
      const noteLines = text.split("\n");
      const textParam = noteLines.join("\r\n");
      await safeCallRpc("TIU SET DOCUMENT TEXT", [docIen, textParam, "1"]);

      auditAdapterWrite({
        action: "write.note", success: true, duz, dfn,
        rpc: "TIU CREATE RECORD + TIU SET DOCUMENT TEXT", ien: docIen,
      });

      return {
        ok: true,
        data: { success: true, ien: docIen, message: "Note created" },
        vistaGrounding: { rpc: "TIU CREATE RECORD", vistaPackage: "TIU", vistaFiles: ["8925"] },
      };
    } catch (err: any) {
      log.warn("createNote via adapter failed", { error: err.message });
      auditAdapterWrite({ action: "write.note", success: false, dfn, rpc: "TIU CREATE RECORD", errorMessage: err.message });
      return { ok: false, error: err.message, vistaGrounding: { rpc: "TIU CREATE RECORD", vistaPackage: "TIU", vistaFiles: ["8925"] } };
    }
  }

  async addProblem(dfn: string, icdCode: string, description: string, params?: Record<string, unknown>): Promise<AdapterResult<WriteResult>> {
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const { getDuz } = await import("../../vista/rpcBrokerClient.js");
      const duz = getDuz();

      const onset = String(params?.onset || "");
      const status = String(params?.status || "A");  // A=Active

      const resp = await safeCallRpc("ORQQPL ADD SAVE", [
        dfn, duz, description, icdCode, onset, status,
      ]);
      const result = resp.join("\n").trim();
      const ien = result.split("^")[0];
      const failed = ien.startsWith("-1") || ien === "0";

      auditAdapterWrite({
        action: "write.problem", success: !failed, duz, dfn,
        rpc: "ORQQPL ADD SAVE", ien: failed ? undefined : ien,
        errorMessage: failed ? result : undefined,
      });

      return {
        ok: !failed,
        data: { success: !failed, ien: failed ? undefined : ien, message: failed ? result : "Problem added" },
        vistaGrounding: { rpc: "ORQQPL ADD SAVE", vistaPackage: "OR", vistaFiles: ["9000011"] },
      };
    } catch (err: any) {
      log.warn("addProblem via adapter failed", { error: err.message });
      auditAdapterWrite({ action: "write.problem", success: false, dfn, rpc: "ORQQPL ADD SAVE", errorMessage: err.message });
      return { ok: false, error: err.message, vistaGrounding: { rpc: "ORQQPL ADD SAVE", vistaPackage: "OR", vistaFiles: ["9000011"] } };
    }
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

  /* ---------------------------------------------------------------- */
  /* Pharmacy / MAR / BCMA methods (Phase 432)                         */
  /* ---------------------------------------------------------------- */

  async getInpatientMeds(dfn: string): Promise<AdapterResult<InpatientMedOrder[]>> {
    // ORWPS ACTIVE returns all active meds — filter for inpatient types (UD, IV)
    try {
      const { safeCallRpc } = await import("../../lib/rpc-resilience.js");
      const rawLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);
      const meds: InpatientMedOrder[] = [];
      for (const line of rawLines) {
        if (line.startsWith("~")) {
          const typeEnd = line.indexOf("^");
          const medType = line.substring(1, typeEnd);
          // UD = Unit Dose, IV = IV meds — these are inpatient
          if (medType === "UD" || medType === "IV") {
            const parts = line.substring(typeEnd + 1).split("^");
            meds.push({
              orderIen: parts[7]?.trim() || parts[0]?.split(";")[0] || "",
              drugName: parts[1]?.trim() || "",
              dose: parts[2]?.trim() || "",
              route: "",
              schedule: "",
              type: medType === "IV" ? "iv" : "unit-dose",
              status: "active",
              startDate: parts[4]?.trim() || undefined,
              prescriber: parts[5]?.trim() || undefined,
              pharmacistVerified: undefined,
            });
          }
        }
      }
      return { ok: true, data: meds };
    } catch (err: any) {
      log.warn("getInpatientMeds failed", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  async getMAR(_dfn: string, _dateRange?: { from?: string; to?: string }): Promise<AdapterResult<MAREntry[]>> {
    return {
      ok: false, pending: true,
      target: "PSB MED LOG",
      error: "MAR data requires BCMA/PSB package — not available in WorldVistA sandbox",
      vistaGrounding: {
        rpc: "PSB MED LOG", vistaPackage: "PSB",
        vistaFiles: ["53.79", "53.795"],
        sandboxNote: "PSB package not installed in WorldVistA Docker. eMAR schedule endpoint uses heuristic due-time derivation from ORWPS ACTIVE sig text as interim.",
        migrationPath: "Install PSB (BCMA) package -> wire PSB MED LOG for real MAR data with actual admin times, nurse attestation, and witness tracking",
      },
    };
  }

  async recordAdministration(_request: MedAdminRequest): Promise<AdapterResult<WriteResult>> {
    return {
      ok: false, pending: true,
      target: "PSB MED LOG",
      error: "Recording medication administration requires BCMA/PSB package — not available in WorldVistA sandbox",
      vistaGrounding: {
        rpc: "PSB MED LOG", vistaPackage: "PSB",
        vistaFiles: ["53.79"],
        sandboxNote: "PSB MED LOG is a bidirectional RPC: reads admin history and writes new admin events. Write mode requires action code + order IEN + datetime + administered-by DUZ.",
        migrationPath: "Install PSB package -> wire PSB MED LOG write mode -> add witness validation -> integrate 5-rights barcode verification",
      },
    };
  }

  async scanBarcode(_barcode: string, _patientDfn?: string): Promise<AdapterResult<BarcodeScanResult>> {
    return {
      ok: false, pending: true,
      target: "PSJBCMA",
      error: "Barcode medication lookup requires PSJ/PSB BCMA package — not available in WorldVistA sandbox",
      vistaGrounding: {
        rpc: "PSJBCMA", vistaPackage: "PSJ",
        vistaFiles: ["53.45", "50"],
        sandboxNote: "PSJBCMA resolves NDC/UPC barcodes to drug IEN + order IEN. Also validates medication-patient match. Required for BCMA 5-rights verification.",
        migrationPath: "Install PSJ + PSB packages -> wire PSJBCMA -> integrate with formulary (File 50) -> add NDC cross-reference (File 50.67)",
      },
    };
  }

  async getAdminHistory(_dfn: string, _orderIen?: string): Promise<AdapterResult<MAREntry[]>> {
    return {
      ok: false, pending: true,
      target: "PSB MED LOG",
      error: "Administration history requires BCMA/PSB package — not available in WorldVistA sandbox",
      vistaGrounding: {
        rpc: "PSB MED LOG", vistaPackage: "PSB",
        vistaFiles: ["53.79"],
        sandboxNote: "PSB MED LOG read mode returns chronological admin events: who gave what, when, witnessed by whom, refused/held reasons.",
        migrationPath: "Install PSB package -> wire PSB MED LOG read mode -> parse multi-line grouped records (similar to ORWPS ACTIVE ~prefix pattern)",
      },
    };
  }

  async verifyOrder(_request: PharmacyVerifyRequest): Promise<AdapterResult<PharmacyVerifyResult>> {
    return {
      ok: false, pending: true,
      target: "PSJ VERIFY",
      error: "Pharmacist order verification requires PSJ package — not available in WorldVistA sandbox",
      vistaGrounding: {
        rpc: "PSJ VERIFY", vistaPackage: "PSJ",
        vistaFiles: ["53.1", "55"],
        sandboxNote: "PSJ VERIFY marks an inpatient pharmacy order as pharmacist-verified. Until verified, unit dose orders cannot be dispensed. IV orders require separate IV room verification.",
        migrationPath: "Install PSJ package -> wire PSJ VERIFY -> add pharmacy action profile (File 53.1) -> integrate with dispensing workflow",
      },
    };
  }
}
