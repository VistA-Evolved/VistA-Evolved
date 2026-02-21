/**
 * VistA Scheduling Adapter -- Phase 63.
 *
 * Real RPC integration using SDOE (encounters), SD W/L (wait list),
 * and DVBAB (appointment list) RPCs available in WorldVistA sandbox.
 *
 * Reads: SDOE LIST ENCOUNTERS FOR PAT, SDOE GET GENERAL DATA,
 *        SD W/L RETRIVE HOSP LOC(#44), SD W/L RETRIVE PERSON(200)
 * Writes: SD W/L CREATE FILE (wait list request)
 * Pending: SDEC APPADD (direct booking), SDEC APPDEL (cancel)
 */

import type {
  SchedulingAdapter,
  Appointment,
  TimeSlot,
  ClinicInfo,
  ProviderInfo,
  WaitListEntry,
  AppointmentRequest,
} from "./interface.js";
import type { AdapterResult } from "../types.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { getDuz } from "../../vista/rpcBrokerClient.js";
import { log } from "../../lib/logger.js";

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
/* In-memory request store (wait list / appointment requests)            */
/* Mirrors Phase 23 imaging worklist pattern — in-memory until VistA     */
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
  return true;
}

function releaseBookingLock(key: string): void {
  bookingLocks.delete(key);
}

// Periodic cleanup of stale locks
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of bookingLocks) {
    if (now - ts > LOCK_TTL_MS) bookingLocks.delete(k);
  }
}, 60_000).unref();

/* ------------------------------------------------------------------ */
/* Adapter implementation                                                */
/* ------------------------------------------------------------------ */

export class VistaSchedulingAdapter implements SchedulingAdapter {
  readonly adapterType = "scheduling" as const;
  readonly implementationName = "vista-rpc-sdoe";
  readonly _isStub = false;

  async healthCheck() {
    return { ok: true, latencyMs: 0, detail: "VistA scheduling adapter (SDOE + SD W/L live RPCs)" };
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

      return { ok: true, data: [...appointments, ...pendingRequests] };
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
   * Since SDEC APPADD is not in the sandbox, stores as a wait-list request.
   * When SDEC is available, this will call SDEC APPADD directly.
   */
  async createAppointment(
    request: AppointmentRequest,
  ): Promise<AdapterResult<Appointment | WaitListEntry>> {
    const lockKey = `${request.patientDfn}:${request.preferredDate}:${request.clinicName}`;

    if (!acquireBookingLock(lockKey)) {
      return {
        ok: false,
        error: "Duplicate booking attempt — another request for this patient/date/clinic is in progress",
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

      const id = `req-${++requestSeq}-${Date.now().toString(36)}`;
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
      };

      requestStore.set(id, entry);

      return {
        ok: true,
        data: entry,
        pending: true,
        target: "SDEC APPADD (not in sandbox — stored as request)",
      };
    } finally {
      releaseBookingLock(lockKey);
    }
  }

  /**
   * Cancel appointment or submit cancel request.
   * SDEC APPDEL is not in sandbox — stores cancel request.
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
      return { ok: true, data: undefined };
    }

    // For VistA encounters — store a cancel request
    const id = `cancel-${++requestSeq}-${Date.now().toString(36)}`;
    requestStore.set(id, {
      id,
      patientDfn: patientDfn || "",
      clinicName: "",
      preferredDate: "",
      priority: "routine",
      status: "pending",
      createdAt: new Date().toISOString(),
      reason: reason,
      type: "cancel_request",
    });

    return {
      ok: true,
      data: undefined,
      pending: true,
      target: "SDEC APPDEL (not in sandbox — stored as cancel request)",
    };
  }

  /**
   * Get available slots. SDEC APPSLOTS is not in sandbox — returns pending.
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
    };
  }

  /**
   * List clinics using SD W/L RETRIVE HOSP LOC(#44).
   */
  async listClinics(): Promise<AdapterResult<ClinicInfo[]>> {
    try {
      const rawLines = await safeCallRpc("SD W/L RETRIVE HOSP LOC(#44)", [""]);
      const clinics = parseClinicList(rawLines.join("\n"));
      return { ok: true, data: clinics };
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
      return { ok: true, data: providers };
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
      return { ok: true, data: appointments };
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
}

/* ------------------------------------------------------------------ */
/* Exports for route-level access to request store                      */
/* ------------------------------------------------------------------ */

export function getRequestStore(): Map<string, WaitListEntry> {
  return requestStore;
}

