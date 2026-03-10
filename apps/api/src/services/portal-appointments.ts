/**
 * Portal Appointments -- Phase 27
 *
 * Upcoming/past appointments, details, cancel/reschedule request flow.
 * In-memory store for dev mode. VistA scheduling RPCs not available in sandbox.
 *
 * VistA integration mapping (target):
 * - SD APPOINTMENT LIST: List patient appointments
 * - SD SCHEDULE APPOINTMENT: Create appointment (provider-side)
 * - SDEC CANCEL APPT: Cancel appointment
 * - File #44 (Hospital Location) for clinic lookup
 *
 * Since VistA scheduling RPCs are not available in the WorldVistA sandbox,
 * we implement request flows stored as portal requests with clear
 * "clinic will confirm" messaging.
 */

import { randomBytes } from "node:crypto";
import { portalAudit } from "./portal-audit.js";
import { log } from "../lib/logger.js";

/** Log DB persistence failures at warn level instead of silently swallowing. */
function dbWarn(op: string, err: unknown): void {
  log.warn(`portal-appointments DB ${op} failed`, { error: String(err) });
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type AppointmentStatus =
  | "confirmed"
  | "pending_confirmation"
  | "cancelled"
  | "completed"
  | "no_show"
  | "reschedule_requested"
  | "cancel_requested";

export type AppointmentType = "in_person" | "telehealth" | "phone";
export type AppointmentSource = "ehr" | "pending" | "local";

export interface Appointment {
  id: string;
  tenantId: string;
  patientDfn: string;
  patientName: string;
  clinicId: string;
  clinicName: string;
  providerName: string;
  appointmentType: AppointmentType;
  scheduledAt: string; // ISO datetime
  duration: number;    // minutes
  status: AppointmentStatus;
  reason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** VistA integration */
  vistaSync: "not_synced" | "pending" | "synced";
  vistaRef: string | null; // VistA SDEC IEN when synced
  source: AppointmentSource;
  /** Cancellation/reschedule info */
  cancelReason?: string;
  reschedulePreference?: string;
}

function getAppointmentSource(
  vistaSync: Appointment["vistaSync"],
  status: AppointmentStatus,
  vistaRef: string | null
): AppointmentSource {
  if (vistaSync === "synced" || !!vistaRef) return "ehr";
  if (
    vistaSync === "pending" ||
    ["pending_confirmation", "cancel_requested", "reschedule_requested"].includes(status)
  ) {
    return "pending";
  }
  return "local";
}

/* ------------------------------------------------------------------ */
/* DB repo -- lazy-wired (PG-backed, Phase 174)                          */
/* ------------------------------------------------------------------ */

interface ApptRepo {
  insertAppointment(data: any): any;
  findAppointmentById(id: string): any;
  findUpcoming(tenantId: string, dfn: string): any[];
  findPast(tenantId: string, dfn: string): any[];
  findByDfn(tenantId: string, dfn: string): any[];
  updateAppointment(id: string, updates: any): any;
  countAppointments(): number;
}
let _repo: ApptRepo | null = null;

/** Wire the portal appointment repo. Called from index.ts. */
export function initAppointmentRepo(repo: ApptRepo): void {
  _repo = repo;
  try { apptSeq = repo.countAppointments(); } catch (e) { dbWarn("persist", e); }
}

/* ------------------------------------------------------------------ */
/* In-memory cache (Ephemeral -- falls back to DB on miss)              */
/* ------------------------------------------------------------------ */

const appointmentCache = new Map<string, Appointment>();
let apptSeq = 0;

function cacheAppt(a: Appointment): void { appointmentCache.set(a.id, a); }

function rowToAppt(row: any): Appointment {
  const vistaSync =
    row.vistaSync === "synced" ? "synced" : row.vistaSync === "pending" ? "pending" : "not_synced";
  const vistaRef = row.vistaRef ?? null;
  return {
    id: row.id,
    tenantId: row.tenantId ?? "default",
    patientDfn: row.patientDfn,
    patientName: row.patientName,
    clinicId: row.clinicId,
    clinicName: row.clinicName,
    providerName: row.providerName ?? "To be assigned",
    appointmentType: row.appointmentType,
    scheduledAt: row.scheduledAt,
    duration: row.duration,
    status: row.status,
    reason: row.reason ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    vistaSync,
    vistaRef,
    source: getAppointmentSource(vistaSync, row.status, vistaRef),
    cancelReason: row.cancelReason,
    reschedulePreference: row.reschedulePreference,
  };
}

/** Seed demo appointments for dev patients */
async function seedDemoAppointments() {
  const now = new Date();

  // Future appointments
  const future1 = new Date(now.getTime() + 7 * 86400000);
  const future2 = new Date(now.getTime() + 21 * 86400000);
  const future3 = new Date(now.getTime() + 45 * 86400000);

  // Past appointments
  const past1 = new Date(now.getTime() - 14 * 86400000);
  const past2 = new Date(now.getTime() - 60 * 86400000);

  const demos: Partial<Appointment>[] = [
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      clinicName: "Primary Care", providerName: "Dr. Smith",
      appointmentType: "in_person", scheduledAt: future1.toISOString(),
      duration: 30, status: "confirmed", reason: "Annual physical",
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      clinicName: "Cardiology", providerName: "Dr. Johnson",
      appointmentType: "telehealth", scheduledAt: future2.toISOString(),
      duration: 20, status: "confirmed", reason: "Follow-up",
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      clinicName: "Lab", providerName: "Lab Tech",
      appointmentType: "in_person", scheduledAt: future3.toISOString(),
      duration: 15, status: "pending_confirmation", reason: "Blood work",
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      clinicName: "Primary Care", providerName: "Dr. Smith",
      appointmentType: "in_person", scheduledAt: past1.toISOString(),
      duration: 30, status: "completed", reason: "Sick visit",
    },
    {
      patientDfn: "100022", patientName: "CARTER,DAVID",
      clinicName: "Ophthalmology", providerName: "Dr. Lee",
      appointmentType: "in_person", scheduledAt: past2.toISOString(),
      duration: 45, status: "completed", reason: "Eye exam",
    },
  ];

  for (const d of demos) {
    const id = `appt-${++apptSeq}-${randomBytes(4).toString("hex")}`;
    const appt: Appointment = {
      id,
      tenantId: "default",
      patientDfn: d.patientDfn!,
      patientName: d.patientName!,
      clinicId: `clinic-${d.clinicName?.toLowerCase().replace(/\s/g, "-")}`,
      clinicName: d.clinicName!,
      providerName: d.providerName!,
      appointmentType: d.appointmentType!,
      scheduledAt: d.scheduledAt!,
      duration: d.duration!,
      status: d.status!,
      reason: d.reason!,
      notes: "",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      vistaSync: "not_synced",
      vistaRef: null,
      source: "local",
    };
    cacheAppt(appt);
    if (_repo) {
      try { await _repo.insertAppointment({
        id: appt.id, tenantId: appt.tenantId,
        patientDfn: appt.patientDfn, patientName: appt.patientName,
        clinicId: appt.clinicId, clinicName: appt.clinicName,
        providerName: appt.providerName, appointmentType: appt.appointmentType,
        scheduledAt: appt.scheduledAt, duration: appt.duration,
        status: appt.status, reason: appt.reason, notes: appt.notes,
      }); } catch (e) { dbWarn("persist", e); }
    }
  }
}

if (process.env.NODE_ENV !== "production") seedDemoAppointments();

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

export async function getUpcomingAppointments(tenantId: string, patientDfn: string): Promise<Appointment[]> {
  if (_repo) {
    try { return (await _repo.findUpcoming(tenantId, patientDfn)).map(rowToAppt); } catch (e) { dbWarn("persist", e); }
  }
  const now = new Date().toISOString();
  return [...appointmentCache.values()]
    .filter((a) => a.tenantId === tenantId)
    .filter((a) => a.patientDfn === patientDfn && a.scheduledAt >= now && !["cancelled", "cancel_requested"].includes(a.status))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function getPastAppointments(tenantId: string, patientDfn: string): Promise<Appointment[]> {
  if (_repo) {
    try { return (await _repo.findPast(tenantId, patientDfn)).map(rowToAppt); } catch (e) { dbWarn("persist", e); }
  }
  const now = new Date().toISOString();
  return [...appointmentCache.values()]
    .filter((a) => a.tenantId === tenantId)
    .filter((a) => a.patientDfn === patientDfn && (a.scheduledAt < now || a.status === "completed"))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export async function getAppointment(appointmentId: string, tenantId: string, patientDfn: string): Promise<Appointment | null> {
  const cached = appointmentCache.get(appointmentId);
  if (cached && cached.tenantId === tenantId && cached.patientDfn === patientDfn) return cached;
  if (_repo) {
    try {
      const row = await _repo.findAppointmentById(appointmentId);
      if (row && row.tenantId === tenantId && row.patientDfn === patientDfn) { const a = rowToAppt(row); cacheAppt(a); return a; }
    } catch (e) { dbWarn("persist", e); }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Request flows                                                        */
/* ------------------------------------------------------------------ */

export async function requestAppointment(opts: {
  tenantId: string;
  patientDfn: string;
  patientName: string;
  clinicName: string;
  appointmentType: AppointmentType;
  preferredDate: string;
  reason: string;
}): Promise<Appointment> {
  const id = `appt-${++apptSeq}-${randomBytes(4).toString("hex")}`;
  const appt: Appointment = {
    id,
    tenantId: opts.tenantId,
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    clinicId: `clinic-${opts.clinicName.toLowerCase().replace(/\s/g, "-")}`,
    clinicName: opts.clinicName,
    providerName: "To be assigned",
    appointmentType: opts.appointmentType,
    scheduledAt: opts.preferredDate,
    duration: 30,
    status: "pending_confirmation",
    reason: opts.reason.slice(0, 500),
    notes: "Requested via patient portal -- clinic will confirm.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    vistaSync: "not_synced",
    vistaRef: null,
    source: "pending",
  };

  if (_repo) {
    try { await _repo.insertAppointment({
      id: appt.id, tenantId: appt.tenantId,
      patientDfn: appt.patientDfn, patientName: appt.patientName,
      clinicId: appt.clinicId, clinicName: appt.clinicName,
      providerName: appt.providerName, appointmentType: appt.appointmentType,
      scheduledAt: appt.scheduledAt, duration: appt.duration,
      status: appt.status, reason: appt.reason, notes: appt.notes,
    }); } catch (e) { dbWarn("persist", e); }
  }
  cacheAppt(appt);

  portalAudit("portal.appointment.request", "success", opts.patientDfn, {
    tenantId: opts.tenantId,
    detail: { appointmentId: id, clinicName: opts.clinicName },
  });

  return appt;
}

export async function requestCancellation(
  appointmentId: string,
  tenantId: string,
  patientDfn: string,
  reason: string
): Promise<Appointment | null> {
  const appt = await getAppointment(appointmentId, tenantId, patientDfn);
  if (!appt) return null;
  if (["cancelled", "completed", "no_show"].includes(appt.status)) return null;

  appt.status = "cancel_requested";
  appt.cancelReason = reason.slice(0, 500);
  appt.updatedAt = new Date().toISOString();
  appt.source = "pending";
  appt.notes += "\nCancellation requested via portal -- awaiting clinic confirmation.";

  cacheAppt(appt);
  if (_repo) {
    try { await _repo.updateAppointment(appointmentId, { status: "cancel_requested", cancelReason: appt.cancelReason }); } catch (e) { dbWarn("persist", e); }
  }

  portalAudit("portal.appointment.cancel", "success", patientDfn, {
    tenantId,
    detail: { appointmentId, reason: reason.slice(0, 100) },
  });

  return appt;
}

export async function requestReschedule(
  appointmentId: string,
  tenantId: string,
  patientDfn: string,
  preference: string
): Promise<Appointment | null> {
  const appt = await getAppointment(appointmentId, tenantId, patientDfn);
  if (!appt) return null;
  if (["cancelled", "completed", "no_show"].includes(appt.status)) return null;

  appt.status = "reschedule_requested";
  appt.reschedulePreference = preference.slice(0, 500);
  appt.updatedAt = new Date().toISOString();
  appt.source = "pending";
  appt.notes += "\nReschedule requested via portal -- clinic will contact you.";

  cacheAppt(appt);
  if (_repo) {
    try { await _repo.updateAppointment(appointmentId, { status: "reschedule_requested", reschedulePreference: appt.reschedulePreference }); } catch (e) { dbWarn("persist", e); }
  }

  portalAudit("portal.appointment.reschedule", "success", patientDfn, {
    tenantId,
    detail: { appointmentId, type: "reschedule" },
  });

  return appt;
}
