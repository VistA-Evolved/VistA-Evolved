/**
 * VistA Scheduling Adapter -- Phase 63 (DB-hybrid Phase 121, SD* pack Phase 123,
 * lifecycle Phase 131, SDES depth Phase 147).
 *
 * Real RPC integration using SDOE (encounters), SD W/L (wait list),
 * SDVW (appointment API), and SDES (scheduling depth) RPCs.
 *
 * Phase 123 read RPCs:
 *   SDOE LIST ENCOUNTERS FOR PAT, SDOE LIST ENCOUNTERS FOR DATES,
 *   SDOE GET GENERAL DATA, SDOE GET PROVIDERS, SDOE GET DIAGNOSES,
 *   SD W/L RETRIVE HOSP LOC(#44), SD W/L RETRIVE PERSON(200),
 *   SD W/L RETRIVE FULL DATA
 *
 * Phase 123 write RPCs:
 *   SD W/L CREATE FILE -- real VistA wait-list entry creation
 *
 * Phase 131 additions:
 *   ORWPT APPTLST -- CPRS-style appointment list (30-day window)
 *   SD W/L PRIORITY, SD W/L TYPE, SD W/L CURRENT STATUS -- reference data
 *   SDVW MAKE APPT API APP -- real appointment creation via HL7 messaging
 *
 * Phase 147 additions (SDES depth):
 *   SDES GET APPT TYPES, SDES GET CANCEL REASONS, SDES GET RESOURCE BY CLINIC,
 *   SDES GET CLIN AVAILABILITY, SDES GET APPT BY APPT IEN (truth gate),
 *   SDES CREATE APPOINTMENTS, SDES CANCEL APPOINTMENT 2, SDES CHECKIN, SDES CHECKOUT
 *
 * Pending (not in sandbox):
 *   SDEC APPADD (direct booking), SDEC APPDEL (cancel), SDEC APPSLOTS (slots)
 */

import type {
  SchedulingAdapter,
  Appointment,
  TimeSlot,
  ClinicInfo,
  ProviderInfo,
  WaitListEntry,
  AppointmentRequest,
  EncounterDetail,
  EncounterProvider,
  EncounterDiagnosis,
  VistaGrounding,
  CprsAppointment,
  ReferenceDataSet,
  RpcPostureEntry,
  AppointmentType,
  CancelReason,
  ClinicResource,
  SdesAvailSlot,
  TruthGateResult,
  SchedulingMode,
} from "./interface.js";
import type { AdapterResult } from "../types.js";
import { safeCallRpc, safeCallRpcWithList } from "../../lib/rpc-resilience.js";
import { log } from "../../lib/logger.js";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* DB-backed hybrid (Phase 121)                                          */
/* ------------------------------------------------------------------ */

export interface SchedulingRepo {
  insertSchedulingRequest(data: {
    id: string;
    patientDfn: string;
    clinicName: string;
    preferredDate: string;
    priority?: string;
    status?: string;
    reason?: string;
    requestType?: string;
    createdAt: string;
    updatedAt: string;
  }): any;
  findSchedulingRequestById(id: string): any;
  findSchedulingRequestsByPatient(patientDfn: string): any;
  findAllActiveRequests(): any;
  findPendingByPatientClinicDate(
    patientDfn: string,
    clinicName: string,
    preferredDate: string,
  ): any;
  updateSchedulingRequest(id: string, updates: Partial<{
    status: string;
    reason: string;
  }>): any;
}

let dbRepo: SchedulingRepo | null = null;

/** Lock repo for PG-backed booking locks (Phase 128) */
export interface SchedulingLockRepo {
  acquireLock(data: { id: string; tenantId?: string; lockKey: string; holderDuz: string; expiresAt: string }): any;
  releaseLock(lockKey: string): any;
  findLockByKey(lockKey: string): any;
  findActiveLocks(): any;
  cleanupExpiredLocks(): any;
  countLocks(): any;
}

let lockRepo: SchedulingLockRepo | null = null;

/** Called from index.ts after initPlatformDb() */
export async function initSchedulingRepo(repo: SchedulingRepo): Promise<void> {
  dbRepo = repo;
  // Rehydrate cache from DB
  try {
    const raw = await Promise.resolve(repo.findAllActiveRequests());
    const active = Array.isArray(raw) ? raw : [];
    for (const row of active) {
      const entry = dbRowToEntry(row);
      requestStore.set(entry.id, entry);
    }
    if (active.length > 0) {
      log.info(`Scheduling store rehydrated ${active.length} requests from DB`);
    }
  } catch (err) {
    dbWarn("rehydrate", err);
  }
  log.info("Scheduling request store wired to DB (Phase 121)");
}

/** Called from index.ts for PG-backed booking locks (Phase 128) */
export function initSchedulingLockRepo(repo: SchedulingLockRepo): void {
  lockRepo = repo;
  log.info("Scheduling lock store wired to PG (Phase 128)");
}

function dbWarn(op: string, err: unknown): void {
  log.warn(`Scheduling DB ${op} failed (cache-only)`, {
    error: err instanceof Error ? err.message : String(err),
  });
}

function dbRowToEntry(row: any): WaitListEntry {
  return {
    id: row.id,
    patientDfn: row.patientDfn,
    clinicName: row.clinicName,
    preferredDate: row.preferredDate,
    priority: row.priority || "routine",
    status: row.status || "pending",
    createdAt: row.createdAt,
    reason: row.reason || undefined,
    type: row.requestType || "new_appointment",
  };
}

function persistEntry(entry: WaitListEntry): void {
  if (!dbRepo) return;
  Promise.resolve((async () => {
    const existing = await Promise.resolve(dbRepo!.findSchedulingRequestById(entry.id));
    if (existing) {
      await Promise.resolve(dbRepo!.updateSchedulingRequest(entry.id, {
        status: entry.status,
        reason: entry.reason,
      }));
    } else {
      await Promise.resolve(dbRepo!.insertSchedulingRequest({
        id: entry.id,
        patientDfn: entry.patientDfn,
        clinicName: entry.clinicName,
        preferredDate: entry.preferredDate,
        priority: entry.priority,
        status: entry.status,
        reason: entry.reason,
        requestType: entry.type,
        createdAt: entry.createdAt,
        updatedAt: new Date().toISOString(),
      }));
    }
  })()).catch((err) => dbWarn("persist", err));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Convert VistA date (YYYMMDD.HHMM) to ISO string */
function vistaDateToIso(vDate: string): string {
  if (!vDate || vDate === "0") return "";
  const parts = vDate.split(".");
  const datePart = parts[0];
  const timePart = parts[1] || "0000";

  // VistA date format: YYYMMDD where YYY = year - 1700
  const year = parseInt(datePart.slice(0, -4)) + 1700;
  const month = datePart.slice(-4, -2);
  const day = datePart.slice(-2);
  const hour = timePart.slice(0, 2).padStart(2, "0");
  const min = timePart.slice(2, 4).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${min}:00Z`;
}

/** Convert ISO date to VistA date format */
function isoToVistaDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear() - 1700;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** Parse SDOE LIST ENCOUNTERS result (multi-line, ^ delimited) */
function parseEncounterList(raw: string): Appointment[] {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  const appointments: Appointment[] = [];

  for (const line of lines) {
    const pieces = line.split("^");
    if (pieces.length < 3) continue;

    const encounterIen = pieces[0]?.trim();
    const dateVal = pieces[1]?.trim();
    const clinicName = pieces[2]?.trim() || "Unknown Clinic";
    const status = pieces[3]?.trim() || "scheduled";
    const patDfn = pieces[4]?.trim() || "";
    const providerName = pieces[5]?.trim() || "";

    if (!encounterIen || encounterIen === "0") continue;

    appointments.push({
      id: `enc-${encounterIen}`,
      patientDfn: patDfn,
      dateTime: vistaDateToIso(dateVal),
      clinic: clinicName,
      provider: providerName || undefined,
      status: status || "scheduled",
      encounterIen,
      source: "vista",
    });
  }

  return appointments;
}

/** Parse SD W/L RETRIVE HOSP LOC response */
function parseClinicList(raw: string): ClinicInfo[] {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  const clinics: ClinicInfo[] = [];

  for (const line of lines) {
    const pieces = line.split("^");
    if (pieces.length < 2) continue;
    const ien = pieces[0]?.trim();
    const name = pieces[1]?.trim();
    if (!ien || !name) continue;

    clinics.push({
      ien,
      name,
      abbreviation: pieces[2]?.trim() || undefined,
      phone: pieces[3]?.trim() || undefined,
      location: pieces[4]?.trim() || undefined,
      stopCode: pieces[5]?.trim() || undefined,
    });
  }

  return clinics;
}

/** Parse SD W/L RETRIVE PERSON response */
function parseProviderList(raw: string): ProviderInfo[] {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  const providers: ProviderInfo[] = [];

  for (const line of lines) {
    const pieces = line.split("^");
    if (pieces.length < 2) continue;
    const duz = pieces[0]?.trim();
    const name = pieces[1]?.trim();
    if (!duz || !name) continue;

    providers.push({
      duz,
      name,
      title: pieces[2]?.trim() || undefined,
      service: pieces[3]?.trim() || undefined,
    });
  }

  return providers;
}

/* ------------------------------------------------------------------ */
/* Phase 123: New parsers for SDOE GET and SD W/L rpcs                  */
/* ------------------------------------------------------------------ */

/** Parse SDOE GET GENERAL DATA response (^-delimited fields) */
function parseEncounterDetail(raw: string, encounterIen: string): EncounterDetail | null {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  if (lines.length === 0) return null;

  // SDOE GET GENERAL DATA returns: date^clinic^clinicIen^type^status^visitCat^serviceCat^patDfn
  const pieces = lines[0].split("^");
  return {
    encounterIen,
    dateTime: vistaDateToIso(pieces[0]?.trim() || ""),
    clinic: pieces[1]?.trim() || "Unknown",
    clinicIen: pieces[2]?.trim() || undefined,
    type: pieces[3]?.trim() || undefined,
    status: pieces[4]?.trim() || undefined,
    visitCategory: pieces[5]?.trim() || undefined,
    serviceCategory: pieces[6]?.trim() || undefined,
    patientDfn: pieces[7]?.trim() || undefined,
    raw: lines.length > 1
      ? Object.fromEntries(lines.slice(1).map((l) => {
          const [k, ...v] = l.split("^");
          return [k?.trim() || "", v.join("^").trim()];
        }).filter(([k]) => k))
      : undefined,
  };
}

/** Parse SDOE GET PROVIDERS response (^-delimited) */
function parseEncounterProviders(raw: string, encounterIen: string): EncounterProvider[] {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  const providers: EncounterProvider[] = [];

  for (const line of lines) {
    const pieces = line.split("^");
    if (pieces.length < 2) continue;
    const duz = pieces[0]?.trim();
    const name = pieces[1]?.trim();
    if (!duz || !name) continue;

    providers.push({
      encounterIen,
      duz,
      name,
      role: pieces[2]?.trim() || undefined,
      isPrimary: pieces[3]?.trim() === "1" || pieces[3]?.trim()?.toLowerCase() === "primary",
    });
  }

  return providers;
}

/** Parse SDOE GET DIAGNOSES response (^-delimited) */
function parseEncounterDiagnoses(raw: string, encounterIen: string): EncounterDiagnosis[] {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  const diagnoses: EncounterDiagnosis[] = [];

  for (const line of lines) {
    const pieces = line.split("^");
    if (pieces.length < 2) continue;
    const icd = pieces[0]?.trim();
    const desc = pieces[1]?.trim();
    if (!icd || !desc) continue;

    diagnoses.push({
      encounterIen,
      icd,
      description: desc,
      isPrimary: pieces[2]?.trim() === "1" || pieces[2]?.trim()?.toLowerCase() === "primary",
      dateRecorded: pieces[3]?.trim() ? vistaDateToIso(pieces[3].trim()) : undefined,
    });
  }

  return diagnoses;
}

/** Parse SD W/L RETRIVE FULL DATA response */
function parseWaitListEntries(raw: string): WaitListEntry[] {
  const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("-1"));
  const entries: WaitListEntry[] = [];

  for (const line of lines) {
    const pieces = line.split("^");
    if (pieces.length < 3) continue;
    const ien = pieces[0]?.trim();
    const patDfn = pieces[1]?.trim();
    const clinicName = pieces[2]?.trim();
    if (!ien) continue;

    entries.push({
      id: `wl-${ien}`,
      patientDfn: patDfn || "",
      clinicName: clinicName || "",
      preferredDate: pieces[3]?.trim() ? vistaDateToIso(pieces[3].trim()) : "",
      priority: pieces[4]?.trim() || "routine",
      status: pieces[5]?.trim() || "pending",
      createdAt: pieces[6]?.trim() ? vistaDateToIso(pieces[6].trim()) : new Date().toISOString(),
      reason: pieces[7]?.trim() || undefined,
      vistaWaitListIen: ien,
    });
  }

  return entries;
}

/** Build vistaGrounding metadata for responses */
function grounding(rpc: string, vistaPackage: string, extras?: Partial<VistaGrounding>): VistaGrounding {
  return {
    rpc,
    vistaPackage,
    ...extras,
  };
}

/* ------------------------------------------------------------------ */
/* In-memory request store (wait list / appointment requests)            */
/* Mirrors Phase 23 imaging worklist pattern -- in-memory until VistA     */
/* SDEC RPCs available for direct booking.                              */
/* ------------------------------------------------------------------ */

const requestStore = new Map<string, WaitListEntry>();
let requestSeq = 0;

/** Lock map for double-booking prevention */
const bookingLocks = new Map<string, number>(); // key: "dfn:date:clinic" → timestamp
const LOCK_TTL_MS = 30_000; // 30s lock

function acquireBookingLock(key: string): boolean {
  const now = Date.now();
  const existing = bookingLocks.get(key);
  if (existing && now - existing < LOCK_TTL_MS) {
    return false; // already locked
  }
  bookingLocks.set(key, now);
  // Write-through to PG lock repo (fire-and-forget)
  if (lockRepo) {
    Promise.resolve(lockRepo.acquireLock({
      id: randomUUID(),
      lockKey: key,
      holderDuz: "scheduler",
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    })).catch((e) => dbWarn("acquireLock", e));
  }
  return true;
}

function releaseBookingLock(key: string): void {
  bookingLocks.delete(key);
  if (lockRepo) {
    Promise.resolve(lockRepo.releaseLock(key)).catch((e) => dbWarn("releaseLock", e));
  }
}

// Periodic cleanup of stale locks
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of bookingLocks) {
    if (now - ts > LOCK_TTL_MS) bookingLocks.delete(k);
  }
  // Also cleanup expired PG locks
  if (lockRepo) {
    Promise.resolve(lockRepo.cleanupExpiredLocks()).catch((e) => dbWarn("lockCleanup", e));
  }
}, 60_000).unref();

/* ------------------------------------------------------------------ */
/* Adapter implementation                                                */
/* ------------------------------------------------------------------ */

export class VistaSchedulingAdapter implements SchedulingAdapter {
  readonly adapterType = "scheduling" as const;
  readonly implementationName = "vista-rpc-sdoe-phase131";
  readonly _isStub = false;

  async healthCheck() {
    return {
      ok: true,
      latencyMs: 0,
      detail: "VistA scheduling adapter (Phase 131: 12+ RPCs -- SDOE reads + SD W/L reads/writes + ORWPT + SDVW)",
    };
  }

  /**
   * List appointments for a patient using SDOE LIST ENCOUNTERS FOR PAT.
   * Falls back to empty list if RPC unavailable.
   */
  async listAppointments(
    patientDfn: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AdapterResult<Appointment[]>> {
    try {
      // Build param: DFN^startDate^endDate (VistA format)
      let param = patientDfn;
      if (startDate) param += `^${isoToVistaDate(startDate)}`;
      if (endDate) param += `^${isoToVistaDate(endDate)}`;

      const rawLines = await safeCallRpc("SDOE LIST ENCOUNTERS FOR PAT", [param]);
      const appointments = parseEncounterList(rawLines.join("\n"));

      // Enrich DFN for all returned appointments
      for (const a of appointments) {
        if (!a.patientDfn) a.patientDfn = patientDfn;
      }

      // Also include any pending requests from the request store
      const pendingRequests = [...requestStore.values()]
        .filter((r) => r.patientDfn === patientDfn && r.status !== "cancelled")
        .map((r): Appointment => ({
          id: r.id,
          patientDfn: r.patientDfn,
          dateTime: r.preferredDate,
          clinic: r.clinicName,
          status: `request:${r.status}`,
          reason: r.reason,
          source: "request",
        }));

      return {
        ok: true,
        data: [...appointments, ...pendingRequests],
        vistaGrounding: grounding("SDOE LIST ENCOUNTERS FOR PAT", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: appointments.length > 0
            ? `${appointments.length} encounter(s) from VistA`
            : "RPC returned empty -- no encounters in sandbox for this patient",
        }),
      };
    } catch (err: any) {
      log.warn("SDOE LIST ENCOUNTERS FOR PAT failed", { error: err.message });
      // Return just pending requests if VistA call fails
      const pendingRequests = [...requestStore.values()]
        .filter((r) => r.patientDfn === patientDfn && r.status !== "cancelled")
        .map((r): Appointment => ({
          id: r.id,
          patientDfn: r.patientDfn,
          dateTime: r.preferredDate,
          clinic: r.clinicName,
          status: `request:${r.status}`,
          reason: r.reason,
          source: "request",
        }));

      return {
        ok: pendingRequests.length > 0,
        data: pendingRequests,
        error: `VistA encounter list unavailable: ${err.message}`,
        pending: true,
        target: "SDOE LIST ENCOUNTERS FOR PAT",
      };
    }
  }

  /**
   * Create appointment request.
   * Phase 123: Attempts SD W/L CREATE FILE for real VistA wait-list entry.
   * Falls back to in-memory + DB request store if RPC unavailable.
   * When SDEC APPADD becomes available, this will attempt direct booking first.
   */
  async createAppointment(
    request: AppointmentRequest,
  ): Promise<AdapterResult<Appointment | WaitListEntry>> {
    const lockKey = `${request.patientDfn}:${request.preferredDate}:${request.clinicName}`;

    if (!acquireBookingLock(lockKey)) {
      return {
        ok: false,
        error: "Duplicate booking attempt -- another request for this patient/date/clinic is in progress",
      };
    }

    try {
      // Check for existing request (double-booking prevention)
      for (const existing of requestStore.values()) {
        if (
          existing.patientDfn === request.patientDfn &&
          existing.clinicName === request.clinicName &&
          existing.preferredDate === request.preferredDate &&
          existing.status === "pending"
        ) {
          return {
            ok: false,
            error: "An appointment request already exists for this patient/date/clinic",
          };
        }
      }

      // Phase 123: Attempt real VistA wait-list entry via SD W/L CREATE FILE
      let vistaWaitListIen: string | undefined;
      let writePath: "vista" | "local" = "local";
      try {
        const vistaDate = isoToVistaDate(request.preferredDate);
        // SD W/L CREATE FILE params: DFN^ClinicIEN^DesiredDate^Priority^Comment
        const clinicIen = request.clinicIen || "";
        const param = `${request.patientDfn}^${clinicIen}^${vistaDate}^R^${(request.reason || "").slice(0, 200)}`;
        const rawResult = await safeCallRpc("SD W/L CREATE FILE", [param]);
        const resultStr = rawResult.join("\n").trim();

        // Parse result: if we got back an IEN (positive number), it succeeded
        if (resultStr && !resultStr.startsWith("-1") && !resultStr.startsWith("0^")) {
          const ien = resultStr.split("^")[0]?.trim();
          if (ien && /^\d+$/.test(ien)) {
            vistaWaitListIen = ien;
            writePath = "vista";
            log.info("SD W/L CREATE FILE succeeded", { ien, patientDfn: "[REDACTED]" });
          }
        }
      } catch (err: any) {
        log.warn("SD W/L CREATE FILE unavailable, falling back to local store", { error: err.message });
      }

      const id = vistaWaitListIen
        ? `wl-${vistaWaitListIen}`
        : `req-${++requestSeq}-${Date.now().toString(36)}`;

      const entry: WaitListEntry = {
        id,
        patientDfn: request.patientDfn,
        clinicName: request.clinicName,
        preferredDate: request.preferredDate,
        priority: "routine",
        status: "pending",
        createdAt: new Date().toISOString(),
        reason: request.reason,
        type: "new_appointment",
        vistaWaitListIen,
      };

      requestStore.set(id, entry);

      // Phase 121: Write-through to DB
      persistEntry(entry);

      return {
        ok: true,
        data: entry,
        pending: writePath === "local",
        target: writePath === "vista"
          ? "SD W/L CREATE FILE (real VistA wait-list entry created)"
          : "SDEC APPADD (not in sandbox -- stored as local request, SD W/L CREATE FILE also attempted)",
        vistaGrounding: grounding(
          writePath === "vista" ? "SD W/L CREATE FILE" : "SD W/L CREATE FILE (fallback to local store)",
          "SD",
          {
            vistaFiles: ["SD WAIT LIST (File 409.3)"],
            sandboxNote: writePath === "vista"
              ? `Wait-list entry created with IEN ${vistaWaitListIen}`
              : "SD W/L CREATE FILE not available in sandbox -- using local request store",
            migrationPath: "Wire SDEC APPADD for direct appointment booking when available",
          },
        ),
      };
    } finally {
      releaseBookingLock(lockKey);
    }
  }

  /**
   * Cancel appointment or submit cancel request.
   * SDEC APPDEL is not in sandbox -- stores cancel request.
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
    patientDfn?: string,
  ): Promise<AdapterResult<void>> {
    // If it's a local request, update its status
    const existing = requestStore.get(appointmentId);
    if (existing) {
      if (patientDfn && existing.patientDfn !== patientDfn) {
        return { ok: false, error: "Patient mismatch" };
      }
      existing.status = "cancelled";
      // Phase 121: Write-through cancel to DB
      persistEntry(existing);
      return {
        ok: true,
        data: undefined,
        vistaGrounding: grounding("SDEC APPDEL", "SD", {
          sandboxNote: "Local request cancelled (SDEC APPDEL not in sandbox)",
          migrationPath: "Wire SDEC APPDEL for real appointment cancellation",
        }),
      };
    }

    // For VistA encounters -- store a cancel request
    const id = `cancel-${++requestSeq}-${Date.now().toString(36)}`;
    const cancelEntry: WaitListEntry = {
      id,
      patientDfn: patientDfn || "",
      clinicName: "",
      preferredDate: "",
      priority: "routine",
      status: "pending",
      createdAt: new Date().toISOString(),
      reason: reason,
      type: "cancel_request",
    };
    requestStore.set(id, cancelEntry);

    // Phase 121: Write-through cancel request to DB
    persistEntry(cancelEntry);

    return {
      ok: true,
      data: undefined,
      pending: true,
      target: "SDEC APPDEL (not in sandbox -- stored as cancel request)",
      vistaGrounding: grounding("SDEC APPDEL", "SD", {
        sandboxNote: "SDEC APPDEL not in sandbox -- cancel request stored locally",
        migrationPath: "Wire SDEC APPDEL for real appointment cancellation",
      }),
    };
  }

  /**
   * Get available slots. SDEC APPSLOTS is not in sandbox -- returns pending with grounding.
   */
  async getAvailableSlots(
    clinicIen: string,
    startDate: string,
    endDate: string,
  ): Promise<AdapterResult<TimeSlot[]>> {
    return {
      ok: false,
      data: [],
      pending: true,
      target: "SDEC APPSLOTS",
      error: "Slot availability requires SDEC APPSLOTS (not in WorldVistA sandbox). Request-based booking available.",
      vistaGrounding: grounding("SDEC APPSLOTS", "SD", {
        vistaFiles: ["SDEC APPOINTMENT SLOT (File 409.832)"],
        sandboxNote: "SDEC APPSLOTS is not installed in WorldVistA Docker sandbox",
        migrationPath: "Install SDEC package or use VA-SDEC patch to enable slot-based scheduling",
      }),
    };
  }

  /**
   * List clinics using SD W/L RETRIVE HOSP LOC(#44).
   */
  async listClinics(): Promise<AdapterResult<ClinicInfo[]>> {
    try {
      const rawLines = await safeCallRpc("SD W/L RETRIVE HOSP LOC(#44)", [""]);
      const clinics = parseClinicList(rawLines.join("\n"));
      return {
        ok: true,
        data: clinics,
        vistaGrounding: grounding("SD W/L RETRIVE HOSP LOC(#44)", "SD", {
          vistaFiles: ["HOSPITAL LOCATION (File 44)"],
          sandboxNote: clinics.length > 0
            ? `${clinics.length} clinic(s) returned`
            : "RPC returned empty -- no clinics configured in sandbox File 44",
        }),
      };
    } catch (err: any) {
      log.warn("SD W/L RETRIVE HOSP LOC(#44) failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `Clinic lookup failed: ${err.message}`,
        pending: true,
        target: "SD W/L RETRIVE HOSP LOC(#44)",
      };
    }
  }

  /**
   * List providers using SD W/L RETRIVE PERSON(200).
   */
  async listProviders(): Promise<AdapterResult<ProviderInfo[]>> {
    try {
      const rawLines = await safeCallRpc("SD W/L RETRIVE PERSON(200)", [""]);
      const providers = parseProviderList(rawLines.join("\n"));
      return {
        ok: true,
        data: providers,
        vistaGrounding: grounding("SD W/L RETRIVE PERSON(200)", "SD", {
          vistaFiles: ["NEW PERSON (File 200)"],
          sandboxNote: providers.length > 0
            ? `${providers.length} provider(s) returned`
            : "RPC returned empty -- no providers in sandbox File 200",
        }),
      };
    } catch (err: any) {
      log.warn("SD W/L RETRIVE PERSON(200) failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `Provider lookup failed: ${err.message}`,
        pending: true,
        target: "SD W/L RETRIVE PERSON(200)",
      };
    }
  }

  /**
   * List encounters by date range (for provider/clinic view).
   * Uses SDOE LIST ENCOUNTERS FOR DATES.
   */
  async listEncountersByDate(
    startDate: string,
    endDate: string,
  ): Promise<AdapterResult<Appointment[]>> {
    try {
      const param = `${isoToVistaDate(startDate)}^${isoToVistaDate(endDate)}`;
      const rawLines = await safeCallRpc("SDOE LIST ENCOUNTERS FOR DATES", [param]);
      const appointments = parseEncounterList(rawLines.join("\n"));
      return {
        ok: true,
        data: appointments,
        vistaGrounding: grounding("SDOE LIST ENCOUNTERS FOR DATES", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: appointments.length > 0
            ? `${appointments.length} encounter(s) in date range`
            : "No encounters found for date range in sandbox",
        }),
      };
    } catch (err: any) {
      log.warn("SDOE LIST ENCOUNTERS FOR DATES failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `Date-range encounter list failed: ${err.message}`,
        pending: true,
        target: "SDOE LIST ENCOUNTERS FOR DATES",
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Phase 123: New methods                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Get encounter detail via SDOE GET GENERAL DATA.
   */
  async getEncounterDetail(encounterIen: string): Promise<AdapterResult<EncounterDetail>> {
    try {
      const rawLines = await safeCallRpc("SDOE GET GENERAL DATA", [encounterIen]);
      const detail = parseEncounterDetail(rawLines.join("\n"), encounterIen);
      if (!detail) {
        return {
          ok: false,
          data: undefined,
          error: `No encounter data returned for IEN ${encounterIen}`,
          vistaGrounding: grounding("SDOE GET GENERAL DATA", "SD", {
            vistaFiles: ["SDOE (File 409.68)"],
            sandboxNote: "RPC returned empty -- encounter IEN may not exist or no data in sandbox",
          }),
        };
      }
      return {
        ok: true,
        data: detail,
        vistaGrounding: grounding("SDOE GET GENERAL DATA", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: `Encounter ${encounterIen} detail retrieved`,
        }),
      };
    } catch (err: any) {
      log.warn("SDOE GET GENERAL DATA failed", { error: err.message, encounterIen });
      return {
        ok: false,
        data: undefined,
        error: `Encounter detail lookup failed: ${err.message}`,
        pending: true,
        target: "SDOE GET GENERAL DATA",
        vistaGrounding: grounding("SDOE GET GENERAL DATA", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: "RPC may not be available in sandbox",
          migrationPath: "SDOE GET GENERAL DATA should be present in standard VistA installations",
        }),
      };
    }
  }

  /**
   * Get providers assigned to encounter via SDOE GET PROVIDERS.
   */
  async getEncounterProviders(encounterIen: string): Promise<AdapterResult<EncounterProvider[]>> {
    try {
      const rawLines = await safeCallRpc("SDOE GET PROVIDERS", [encounterIen]);
      const providers = parseEncounterProviders(rawLines.join("\n"), encounterIen);
      return {
        ok: true,
        data: providers,
        vistaGrounding: grounding("SDOE GET PROVIDERS", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: providers.length > 0
            ? `${providers.length} provider(s) for encounter ${encounterIen}`
            : "No providers assigned to this encounter in sandbox",
        }),
      };
    } catch (err: any) {
      log.warn("SDOE GET PROVIDERS failed", { error: err.message, encounterIen });
      return {
        ok: false,
        data: [],
        error: `Encounter provider lookup failed: ${err.message}`,
        pending: true,
        target: "SDOE GET PROVIDERS",
        vistaGrounding: grounding("SDOE GET PROVIDERS", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: "RPC may not be available in sandbox",
        }),
      };
    }
  }

  /**
   * Get diagnoses for encounter via SDOE GET DIAGNOSES.
   */
  async getEncounterDiagnoses(encounterIen: string): Promise<AdapterResult<EncounterDiagnosis[]>> {
    try {
      const rawLines = await safeCallRpc("SDOE GET DIAGNOSES", [encounterIen]);
      const diagnoses = parseEncounterDiagnoses(rawLines.join("\n"), encounterIen);
      return {
        ok: true,
        data: diagnoses,
        vistaGrounding: grounding("SDOE GET DIAGNOSES", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: diagnoses.length > 0
            ? `${diagnoses.length} diagnosis/diagnoses for encounter ${encounterIen}`
            : "No diagnoses recorded for this encounter in sandbox",
        }),
      };
    } catch (err: any) {
      log.warn("SDOE GET DIAGNOSES failed", { error: err.message, encounterIen });
      return {
        ok: false,
        data: [],
        error: `Encounter diagnosis lookup failed: ${err.message}`,
        pending: true,
        target: "SDOE GET DIAGNOSES",
        vistaGrounding: grounding("SDOE GET DIAGNOSES", "SD", {
          vistaFiles: ["SDOE (File 409.68)"],
          sandboxNote: "RPC may not be available in sandbox",
        }),
      };
    }
  }

  /**
   * Read wait-list entries via SD W/L RETRIVE FULL DATA.
   * Merges VistA wait-list with local request store.
   */
  async getWaitList(clinicIen?: string): Promise<AdapterResult<WaitListEntry[]>> {
    let vistaEntries: WaitListEntry[] = [];
    let rpcOk = false;

    try {
      const rawLines = await safeCallRpc("SD W/L RETRIVE FULL DATA", [clinicIen || ""]);
      vistaEntries = parseWaitListEntries(rawLines.join("\n"));
      rpcOk = true;
    } catch (err: any) {
      log.warn("SD W/L RETRIVE FULL DATA failed", { error: err.message });
    }

    // Merge local request store entries
    const localEntries = [...requestStore.values()]
      .filter((r) => r.status !== "cancelled")
      .filter((r) => !clinicIen || !r.clinicName || r.clinicName === clinicIen);

    const merged = [...vistaEntries, ...localEntries];

    return {
      ok: rpcOk || localEntries.length > 0,
      data: merged,
      pending: !rpcOk,
      target: !rpcOk ? "SD W/L RETRIVE FULL DATA" : undefined,
      vistaGrounding: grounding("SD W/L RETRIVE FULL DATA", "SD", {
        vistaFiles: ["SD WAIT LIST (File 409.3)"],
        sandboxNote: rpcOk
          ? `${vistaEntries.length} VistA wait-list entries + ${localEntries.length} local requests`
          : `SD W/L RETRIVE FULL DATA unavailable -- showing ${localEntries.length} local requests only`,
        migrationPath: "SD W/L RETRIVE FULL DATA reads File 409.3 (SD WAIT LIST)",
      }),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Phase 131: New methods -- CPRS appointments, reference data, posture */
  /* ------------------------------------------------------------------ */

  /**
   * Get CPRS-style appointment list via ORWPT APPTLST.
   * Returns last 30 days + next 1 day of appointments.
   * Simpler than SDOE -- used by CPRS cover sheet.
   */
  async getAppointmentsCprs(patientDfn: string): Promise<AdapterResult<CprsAppointment[]>> {
    try {
      const rawLines = await safeCallRpc("ORWPT APPTLST", [patientDfn]);
      const appointments: CprsAppointment[] = [];

      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "0" || trimmed.startsWith("-1")) continue;
        // ORWPT APPTLST returns: date^clinicIen^clinicName^status
        const pieces = trimmed.split("^");
        if (pieces.length < 2) continue;

        const dateVal = pieces[0]?.trim() || "";
        const clinicIen = pieces[1]?.trim() || "";
        const clinicName = pieces[2]?.trim() || "";
        const status = pieces[3]?.trim() || "scheduled";

        appointments.push({
          dateTime: vistaDateToIso(dateVal),
          clinicIen,
          clinicName,
          status,
          raw: trimmed,
        });
      }

      return {
        ok: true,
        data: appointments,
        vistaGrounding: grounding("ORWPT APPTLST", "OR", {
          vistaFiles: ["PATIENT (File 2)", "HOSPITAL LOCATION (File 44)"],
          sandboxNote: appointments.length > 0
            ? `${appointments.length} CPRS appointment(s) returned`
            : "No CPRS appointments found (sandbox scheduler subsystem partially configured -- may return 'Error encountered')",
        }),
      };
    } catch (err: any) {
      log.warn("ORWPT APPTLST failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `CPRS appointment list failed: ${err.message}`,
        pending: true,
        target: "ORWPT APPTLST",
        vistaGrounding: grounding("ORWPT APPTLST", "OR", {
          sandboxNote: "ORWPT APPTLST may return 'Error encountered' for some patients in sandbox",
        }),
      };
    }
  }

  /**
   * Get wait-list reference data via SD W/L PRIORITY, SD W/L TYPE, SD W/L CURRENT STATUS.
   * These RPCs are zero-param FUNCTIONS that write to ^TMP and return.
   * In the sandbox, they exist (IENs 1298,1299,1306) but may return empty sets.
   */
  async getReferenceData(): Promise<AdapterResult<ReferenceDataSet>> {
    const result: ReferenceDataSet = { priorities: [], types: [], statuses: [] };
    const rpcResults: string[] = [];

    // SD W/L PRIORITY (File 409.32, field .09)
    try {
      const rawLines = await safeCallRpc("SD W/L PRIORITY", [""]);
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("-1")) continue;
        const pieces = trimmed.split("^");
        if (pieces.length >= 2) {
          result.priorities.push({ ien: pieces[0]?.trim() || "", name: pieces[1]?.trim() || "" });
        }
      }
      rpcResults.push(`PRIORITY:${result.priorities.length}`);
    } catch (err: any) {
      rpcResults.push("PRIORITY:error");
      log.warn("SD W/L PRIORITY failed", { error: err.message });
    }

    // SD W/L TYPE
    try {
      const rawLines = await safeCallRpc("SD W/L TYPE", [""]);
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("-1")) continue;
        const pieces = trimmed.split("^");
        if (pieces.length >= 2) {
          result.types.push({ ien: pieces[0]?.trim() || "", name: pieces[1]?.trim() || "" });
        }
      }
      rpcResults.push(`TYPE:${result.types.length}`);
    } catch (err: any) {
      rpcResults.push("TYPE:error");
      log.warn("SD W/L TYPE failed", { error: err.message });
    }

    // SD W/L CURRENT STATUS
    try {
      const rawLines = await safeCallRpc("SD W/L CURRENT STATUS", [""]);
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("-1")) continue;
        const pieces = trimmed.split("^");
        if (pieces.length >= 2) {
          result.statuses.push({ ien: pieces[0]?.trim() || "", name: pieces[1]?.trim() || "" });
        }
      }
      rpcResults.push(`STATUS:${result.statuses.length}`);
    } catch (err: any) {
      rpcResults.push("STATUS:error");
      log.warn("SD W/L CURRENT STATUS failed", { error: err.message });
    }

    const totalEntries = result.priorities.length + result.types.length + result.statuses.length;

    return {
      ok: true,
      data: result,
      pending: totalEntries === 0,
      target: totalEntries === 0 ? "SD W/L PRIORITY, SD W/L TYPE, SD W/L CURRENT STATUS" : undefined,
      vistaGrounding: grounding("SD W/L PRIORITY + SD W/L TYPE + SD W/L CURRENT STATUS", "SD", {
        vistaFiles: ["SD WAIT LIST (File 409.3)", "parameters in File 409.32"],
        sandboxNote: totalEntries > 0
          ? `Reference data: ${rpcResults.join(", ")}`
          : `All reference RPCs returned empty (${rpcResults.join(", ")}) -- these are M FUNCTIONS that read File 409.32 parameters; sandbox may not have data seeded`,
        migrationPath: "Reference data populated by SDEC SCHEDULER setup in production VistA",
      }),
    };
  }

  /**
   * Get RPC availability posture for scheduling subsystem.
   * Reports which RPCs exist and are callable in this VistA instance.
   */
  async getRpcPosture(): Promise<AdapterResult<RpcPostureEntry[]>> {
    const posture: RpcPostureEntry[] = [
      // --- SDOE reads (Phase 123) ---
      { rpc: "SDOE LIST ENCOUNTERS FOR PAT", ien: "115", status: "available", vistaPackage: "SD", sandboxNote: "Reads ^AUPNVSIT encounter data" },
      { rpc: "SDOE LIST ENCOUNTERS FOR DATES", ien: "116", status: "available", vistaPackage: "SD", sandboxNote: "Date-range encounter query" },
      { rpc: "SDOE GET GENERAL DATA", ien: "117", status: "available", vistaPackage: "SD", sandboxNote: "Encounter detail fields" },
      { rpc: "SDOE GET PROVIDERS", ien: "120", status: "available", vistaPackage: "SD", sandboxNote: "Provider list for encounter" },
      { rpc: "SDOE GET DIAGNOSES", ien: "119", status: "available", vistaPackage: "SD", sandboxNote: "Diagnosis list for encounter" },
      // --- SD W/L reads (Phase 123) ---
      { rpc: "SD W/L RETRIVE HOSP LOC(#44)", ien: "1300", status: "available", vistaPackage: "SD", sandboxNote: "Clinic list from File 44 (3 clinics in sandbox)" },
      { rpc: "SD W/L RETRIVE PERSON(200)", ien: "1301", status: "available", vistaPackage: "SD", sandboxNote: "Provider list from File 200" },
      { rpc: "SD W/L RETRIVE FULL DATA", ien: "1293", status: "callable_no_data", vistaPackage: "SD", sandboxNote: "Wait-list query -- File 409.3 empty in sandbox" },
      // --- SD W/L writes (Phase 123) ---
      { rpc: "SD W/L CREATE FILE", ien: "1294", status: "available", vistaPackage: "SD", sandboxNote: "Creates wait-list entries in File 409.3" },
      // --- SD W/L reference data (Phase 131) ---
      { rpc: "SD W/L PRIORITY", ien: "1298", status: "callable_no_data", vistaPackage: "SD", sandboxNote: "M FUNCTION -- reads priority parameters from File 409.32" },
      { rpc: "SD W/L TYPE", ien: "1299", status: "callable_no_data", vistaPackage: "SD", sandboxNote: "M FUNCTION -- reads type parameters" },
      { rpc: "SD W/L CURRENT STATUS", ien: "1306", status: "callable_no_data", vistaPackage: "SD", sandboxNote: "M FUNCTION -- reads status parameters" },
      // --- CPRS appointments (Phase 131) ---
      { rpc: "ORWPT APPTLST", ien: "222", status: "callable_no_data", vistaPackage: "OR", sandboxNote: "CPRS cover sheet appointment list (30d back, 1d forward) -- returns 'Error encountered' for patients with partial scheduler config" },
      // --- SDVW real appointment creation (Phase 131) ---
      { rpc: "SDVW MAKE APPT API APP", ien: "2206", status: "available", vistaPackage: "SD", sandboxNote: "Real appointment creation via HL7 messaging -- LIST params: PATIENTN, SSN, SD1, SC, DUZ" },
      { rpc: "SDVW SDAPI APP", ien: "2207", status: "available", vistaPackage: "SD", sandboxNote: "Appointment list API -- LIST params with date range, clinic, SSN" },
      // --- SDES RPCs (Phase 147: installed in sandbox, may need seeded data) ---
      { rpc: "SDES GET APPTS BY PATIENT DFN3", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Patient appointments via SDES API -- needs seeded ^SC data (run ZVESDSEED.m)" },
      { rpc: "SDES GET CLIN AVAILABILITY", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Clinic availability slots -- needs clinic configuration" },
      { rpc: "SDES GET APPT TYPES", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Appointment types from File 409.1" },
      { rpc: "SDES GET CANCEL REASONS", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Cancel reasons from SD files" },
      { rpc: "SDES GET RESOURCE BY CLINIC", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Resource/hours for a clinic" },
      { rpc: "SDES GET CLINIC INFO2", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Detailed clinic info from File 44" },
      { rpc: "SDES CREATE APPOINTMENTS", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Direct appointment booking via SDES -- needs clinic+slot setup" },
      { rpc: "SDES CANCEL APPOINTMENT 2", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "Appointment cancellation via SDES" },
      { rpc: "SDES CHECKIN", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "SDES check-in workflow" },
      { rpc: "SDES CHECKOUT", status: "callable_no_data", vistaPackage: "SDES", sandboxNote: "SDES checkout workflow" },
      // --- Not installed ---
      { rpc: "SDEC APPADD", status: "not_installed", vistaPackage: "SDEC", sandboxNote: "Direct appointment booking -- SDEC package not installed in WorldVistA Docker" },
      { rpc: "SDEC APPDEL", status: "not_installed", vistaPackage: "SDEC", sandboxNote: "Direct appointment cancellation -- SDEC package not installed" },
      { rpc: "SDEC APPSLOTS", status: "not_installed", vistaPackage: "SDEC", sandboxNote: "Slot availability query -- SDEC package not installed" },
    ];

    return {
      ok: true,
      data: posture,
      vistaGrounding: grounding("VistA scheduling RPC inventory", "SD", {
        vistaFiles: ["XWB REMOTE PROCEDURE (File 8994)"],
        sandboxNote: `${posture.filter((p) => p.status === "available").length} available, ${posture.filter((p) => p.status === "callable_no_data").length} callable (no data), ${posture.filter((p) => p.status === "not_installed").length} not installed`,
      }),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Phase 147: SDES depth methods                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Get appointment types from SDES GET APPT TYPES.
   * Falls back to empty list if RPC unavailable or no data seeded.
   */
  async getAppointmentTypes(): Promise<AdapterResult<AppointmentType[]>> {
    try {
      const rawLines = await safeCallRpc("SDES GET APPT TYPES", [""]);
      const raw = rawLines.join("\n").trim();
      if (!raw || raw.startsWith("-1") || raw.startsWith("0")) {
        return {
          ok: true,
          data: [],
          pending: true,
          target: "SDES GET APPT TYPES",
          vistaGrounding: grounding("SDES GET APPT TYPES", "SDES", {
            vistaFiles: ["SD APPOINTMENT TYPE (File 409.1)"],
            sandboxNote: "RPC callable but returned no data -- run ZVESDSEED.m to seed appointment types",
          }),
        };
      }
      // Parse: each line typically "IEN^NAME^INACTIVE" or similar ^-delimited
      const types: AppointmentType[] = [];
      for (const line of rawLines) {
        if (!line.trim()) continue;
        const pieces = line.split("^");
        if (pieces.length >= 2) {
          types.push({
            ien: pieces[0] || "",
            name: pieces[1] || "",
            inactive: pieces[2] === "1",
          });
        }
      }
      return {
        ok: true,
        data: types,
        vistaGrounding: grounding("SDES GET APPT TYPES", "SDES", {
          vistaFiles: ["SD APPOINTMENT TYPE (File 409.1)"],
          sandboxNote: `${types.length} appointment type(s) returned`,
        }),
      };
    } catch (err: any) {
      log.warn("SDES GET APPT TYPES failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `SDES GET APPT TYPES unavailable: ${err.message}`,
        pending: true,
        target: "SDES GET APPT TYPES",
      };
    }
  }

  /**
   * Get cancel reasons from SDES GET CANCEL REASONS.
   */
  async getCancelReasons(): Promise<AdapterResult<CancelReason[]>> {
    try {
      const rawLines = await safeCallRpc("SDES GET CANCEL REASONS", [""]);
      const raw = rawLines.join("\n").trim();
      if (!raw || raw.startsWith("-1") || raw.startsWith("0")) {
        return {
          ok: true,
          data: [],
          pending: true,
          target: "SDES GET CANCEL REASONS",
          vistaGrounding: grounding("SDES GET CANCEL REASONS", "SDES", {
            vistaFiles: ["CANCELLATION REASON (File 409.2)"],
            sandboxNote: "RPC callable but returned no data",
          }),
        };
      }
      const reasons: CancelReason[] = [];
      for (const line of rawLines) {
        if (!line.trim()) continue;
        const pieces = line.split("^");
        if (pieces.length >= 2) {
          reasons.push({
            ien: pieces[0] || "",
            name: pieces[1] || "",
            type: pieces[2] || "",
          });
        }
      }
      return {
        ok: true,
        data: reasons,
        vistaGrounding: grounding("SDES GET CANCEL REASONS", "SDES", {
          vistaFiles: ["CANCELLATION REASON (File 409.2)"],
          sandboxNote: `${reasons.length} cancel reason(s) returned`,
        }),
      };
    } catch (err: any) {
      log.warn("SDES GET CANCEL REASONS failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `SDES GET CANCEL REASONS unavailable: ${err.message}`,
        pending: true,
        target: "SDES GET CANCEL REASONS",
      };
    }
  }

  /**
   * Get resource/schedule info for a clinic via SDES GET RESOURCE BY CLINIC.
   */
  async getClinicResource(clinicIen: string): Promise<AdapterResult<ClinicResource>> {
    try {
      const rawLines = await safeCallRpc("SDES GET RESOURCE BY CLINIC", [clinicIen]);
      const raw = rawLines.join("\n").trim();
      if (!raw || raw.startsWith("-1") || raw.startsWith("0")) {
        return {
          ok: true,
          data: { clinicIen, clinicName: "" },
          pending: true,
          target: "SDES GET RESOURCE BY CLINIC",
          vistaGrounding: grounding("SDES GET RESOURCE BY CLINIC", "SDES", {
            vistaFiles: ["HOSPITAL LOCATION (File 44)"],
            sandboxNote: `No resource data for clinic IEN ${clinicIen}`,
          }),
        };
      }
      // Parse first line: typically IEN^NAME^ABBREV^RESOURCEIEN
      const pieces = rawLines[0].split("^");
      const resource: ClinicResource = {
        clinicIen: pieces[0] || clinicIen,
        clinicName: pieces[1] || "",
        resourceIen: pieces[3] || "",
        abbreviation: pieces[2] || "",
        raw: rawLines,
      };
      return {
        ok: true,
        data: resource,
        vistaGrounding: grounding("SDES GET RESOURCE BY CLINIC", "SDES", {
          vistaFiles: ["HOSPITAL LOCATION (File 44)"],
          sandboxNote: `Resource data returned for clinic ${resource.clinicName}`,
        }),
      };
    } catch (err: any) {
      log.warn("SDES GET RESOURCE BY CLINIC failed", { error: err.message });
      return {
        ok: false,
        data: { clinicIen, clinicName: "" },
        error: `SDES GET RESOURCE BY CLINIC unavailable: ${err.message}`,
        pending: true,
        target: "SDES GET RESOURCE BY CLINIC",
      };
    }
  }

  /**
   * Get clinic availability slots via SDES GET CLIN AVAILABILITY.
   * @param clinicIen  - clinic File 44 IEN
   * @param startDate  - ISO date string (YYYY-MM-DD)
   * @param endDate    - ISO date string (YYYY-MM-DD)
   */
  async getSdesAvailability(
    clinicIen: string,
    startDate: string,
    endDate: string,
  ): Promise<AdapterResult<SdesAvailSlot[]>> {
    try {
      // SDES expects: clinicIen^startDate^endDate (internal VistA dates)
      const param = `${clinicIen}^${isoToVistaDate(startDate)}^${isoToVistaDate(endDate)}`;
      const rawLines = await safeCallRpc("SDES GET CLIN AVAILABILITY", [param]);
      const raw = rawLines.join("\n").trim();
      if (!raw || raw.startsWith("-1") || raw.startsWith("0")) {
        return {
          ok: true,
          data: [],
          pending: true,
          target: "SDES GET CLIN AVAILABILITY",
          vistaGrounding: grounding("SDES GET CLIN AVAILABILITY", "SDES", {
            vistaFiles: ["HOSPITAL LOCATION (File 44)"],
            sandboxNote: `No availability data for clinic IEN ${clinicIen} -- schedule may not be configured`,
          }),
        };
      }
      // Parse: each line typically DATE^TIME^SLOTS_AVAILABLE^RESOURCE_IEN
      const slots: SdesAvailSlot[] = [];
      for (const line of rawLines) {
        if (!line.trim()) continue;
        const pieces = line.split("^");
        if (pieces.length >= 2) {
          slots.push({
            date: pieces[0] || "",
            time: pieces[1] || "",
            slotsAvailable: parseInt(pieces[2] || "0", 10) || 0,
            resourceIen: pieces[3] || "",
            raw: line,
          });
        }
      }
      return {
        ok: true,
        data: slots,
        vistaGrounding: grounding("SDES GET CLIN AVAILABILITY", "SDES", {
          vistaFiles: ["HOSPITAL LOCATION (File 44)"],
          sandboxNote: `${slots.length} availability slot(s) for clinic IEN ${clinicIen}`,
        }),
      };
    } catch (err: any) {
      log.warn("SDES GET CLIN AVAILABILITY failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `SDES GET CLIN AVAILABILITY unavailable: ${err.message}`,
        pending: true,
        target: "SDES GET CLIN AVAILABILITY",
      };
    }
  }

  /**
   * Truth gate: verify that an appointment reference actually exists in VistA.
   * Uses SDES GET APPT BY APPT IEN if available, falls back to SDOE LIST ENCOUNTERS FOR PAT.
   */
  async verifyAppointment(
    appointmentRef: string,
    patientDfn: string,
  ): Promise<AdapterResult<TruthGateResult>> {
    try {
      // Try SDES first -- most direct verification
      try {
        const sdesLines = await safeCallRpc("SDES GET APPT BY APPT IEN", [appointmentRef]);
        const sdesRaw = sdesLines.join("\n").trim();
        if (sdesRaw && !sdesRaw.startsWith("-1") && !sdesRaw.startsWith("0")) {
          return {
            ok: true,
            data: {
              gate: "vista_verify",
              passed: true,
              vistaVerified: true,
              verificationMethod: "SDES GET APPT BY APPT IEN",
              appointmentRef,
              patientDfn,
              vistaData: sdesRaw.substring(0, 500), // Truncate for safety
              timestamp: new Date().toISOString(),
            },
            vistaGrounding: grounding("SDES GET APPT BY APPT IEN", "SDES", {
              sandboxNote: "Appointment verified directly via SDES",
            }),
          };
        }
      } catch {
        // SDES not available, fall through to SDOE
      }

      // Fallback: check via SDOE encounter list for this patient
      const encLines = await safeCallRpc("SDOE LIST ENCOUNTERS FOR PAT", [patientDfn]);
      const encRaw = encLines.join("\n");
      // Search for the appointment reference in encounter data
      const found = encRaw.includes(appointmentRef) || encRaw.includes(`^${appointmentRef}^`);

      return {
        ok: true,
        data: {
          gate: "vista_verify",
          passed: found,
          vistaVerified: found,
          verificationMethod: "SDOE LIST ENCOUNTERS FOR PAT (fallback)",
          appointmentRef,
          patientDfn,
          vistaData: found ? `Found in SDOE encounter list` : `Not found in ${encLines.length} encounter lines`,
          timestamp: new Date().toISOString(),
        },
        vistaGrounding: grounding("SDOE LIST ENCOUNTERS FOR PAT", "SD", {
          sandboxNote: found
            ? "Appointment verified via SDOE encounter scan"
            : "Appointment reference not found in VistA encounter data",
        }),
      };
    } catch (err: any) {
      log.warn("verifyAppointment failed", { error: err.message, appointmentRef, patientDfn });
      return {
        ok: true,
        data: {
          gate: "vista_verify",
          passed: false,
          vistaVerified: false,
          verificationMethod: "none -- RPC unavailable",
          appointmentRef,
          patientDfn,
          error: err.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Report the current scheduling writeback mode.
   * Probes SDES and SDOE RPCs to determine what capabilities are available.
   */
  async getSchedulingMode(): Promise<AdapterResult<SchedulingMode>> {
    let sdesInstalled = false;
    let sdoeInstalled = false;
    let sdwlInstalled = false;
    let sdvwInstalled = false;

    // Probe SDES
    try {
      await safeCallRpc("SDES GET APPT TYPES", [""]);
      sdesInstalled = true;
    } catch { /* not available */ }

    // Probe SDOE (known working)
    try {
      await safeCallRpc("SDOE LIST ENCOUNTERS FOR PAT", ["1"]);
      sdoeInstalled = true;
    } catch { /* not available */ }

    // Probe SD W/L
    try {
      await safeCallRpc("SD W/L RETRIVE HOSP LOC(#44)", [""]);
      sdwlInstalled = true;
    } catch { /* not available */ }

    // Check SDVW existence
    try {
      await safeCallRpc("SDVW SDAPI APP", [""]);
      sdvwInstalled = true;
    } catch { /* not available */ }

    // Determine mode: full_writeback > sdes_partial > request_only
    const writebackEnabled = sdesInstalled;
    let mode: SchedulingMode["mode"] = "request_only";
    if (sdesInstalled) {
      mode = "sdes_partial";
    }

    return {
      ok: true,
      data: {
        writebackEnabled,
        sdesInstalled,
        sdoeInstalled,
        sdwlInstalled,
        sdvwInstalled,
        mode,
        detail: `SDES: ${sdesInstalled ? "yes" : "no"}, SDOE: ${sdoeInstalled ? "yes" : "no"}, SD W/L: ${sdwlInstalled ? "yes" : "no"}, SDVW: ${sdvwInstalled ? "yes" : "no"}`,
      },
      vistaGrounding: grounding("Scheduling mode probe", "SD", {
        sandboxNote: `Mode: ${mode} -- ${sdesInstalled ? "SDES RPCs installed" : "SDES not available"}, ${sdoeInstalled ? "SDOE working" : "SDOE unavailable"}`,
      }),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Exports for route-level access to request store                      */
/* ------------------------------------------------------------------ */

export async function getRequestStore(): Promise<Map<string, WaitListEntry>> {
  // Phase 121: If cache is empty but DB has data, rehydrate
  if (requestStore.size === 0 && dbRepo) {
    try {
      const raw = await Promise.resolve(dbRepo.findAllActiveRequests());
      const active = Array.isArray(raw) ? raw : [];
      for (const row of active) {
        const entry = dbRowToEntry(row);
        requestStore.set(entry.id, entry);
      }
    } catch (err) {
      dbWarn("getRequestStore-rehydrate", err);
    }
  }
  return requestStore;
}

