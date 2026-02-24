/**
 * Portal Appointments — Phase 27
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

export interface Appointment {
  id: string;
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
  /** Cancellation/reschedule info */
  cancelReason?: string;
  reschedulePreference?: string;
}

/* ------------------------------------------------------------------ */
/* DB repo -- lazy-wired after initPlatformDb() (Phase 115)              */
/* ------------------------------------------------------------------ */

type ApptRepo = typeof import("../platform/db/repo/portal-appointment-repo.js");
let _repo: ApptRepo | null = null;

/** Wire the portal appointment repo. Called from index.ts. */
export function initAppointmentRepo(repo: ApptRepo): void {
  _repo = repo;
  try { apptSeq = repo.countAppointments(); } catch { /* non-fatal */ }
}

/* ------------------------------------------------------------------ */
/* In-memory cache (Ephemeral -- falls back to DB on miss)              */
/* ------------------------------------------------------------------ */

const appointmentCache = new Map<string, Appointment>();
let apptSeq = 0;

function cacheAppt(a: Appointment): void { appointmentCache.set(a.id, a); }

function rowToAppt(row: any): Appointment {
  return {
    id: row.id,
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
    vistaSync: row.vistaSync ? "synced" : "not_synced",
    vistaRef: row.vistaRef ?? null,
    cancelReason: row.cancelReason,
    reschedulePreference: row.reschedulePreference,
  };
}

/** Seed demo appointments for dev patients */
function seedDemoAppointments() {
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
    };
    cacheAppt(appt);
    if (_repo) {
      try { _repo.insertAppointment({
        patientDfn: appt.patientDfn, patientName: appt.patientName,
        clinicId: appt.clinicId, clinicName: appt.clinicName,
        providerName: appt.providerName, appointmentType: appt.appointmentType,
        scheduledAt: appt.scheduledAt, duration: appt.duration,
        status: appt.status, reason: appt.reason, notes: appt.notes,
      }); } catch { /* non-fatal -- may already exist from previous run */ }
    }
  }
}

seedDemoAppointments();

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

export function getUpcomingAppointments(patientDfn: string): Appointment[] {
  if (_repo) {
    try { return _repo.findUpcoming(patientDfn).map(rowToAppt); } catch { /* fallback */ }
  }
  const now = new Date().toISOString();
  return [...appointmentCache.values()]
    .filter((a) => a.patientDfn === patientDfn && a.scheduledAt >= now && !["cancelled", "cancel_requested"].includes(a.status))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function getPastAppointments(patientDfn: string): Appointment[] {
  if (_repo) {
    try { return _repo.findPast(patientDfn).map(rowToAppt); } catch { /* fallback */ }
  }
  const now = new Date().toISOString();
  return [...appointmentCache.values()]
    .filter((a) => a.patientDfn === patientDfn && (a.scheduledAt < now || a.status === "completed"))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function getAppointment(appointmentId: string, patientDfn: string): Appointment | null {
  const cached = appointmentCache.get(appointmentId);
  if (cached && cached.patientDfn === patientDfn) return cached;
  if (_repo) {
    try {
      const row = _repo.findAppointmentById(appointmentId);
      if (row && row.patientDfn === patientDfn) { const a = rowToAppt(row); cacheAppt(a); return a; }
    } catch { /* non-fatal */ }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Request flows                                                        */
/* ------------------------------------------------------------------ */

export function requestAppointment(opts: {
  patientDfn: string;
  patientName: string;
  clinicName: string;
  appointmentType: AppointmentType;
  preferredDate: string;
  reason: string;
}): Appointment {
  const id = `appt-${++apptSeq}-${randomBytes(4).toString("hex")}`;
  const appt: Appointment = {
    id,
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
    notes: "Requested via patient portal — clinic will confirm.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    vistaSync: "not_synced",
    vistaRef: null,
  };

  if (_repo) {
    try { _repo.insertAppointment({
      patientDfn: appt.patientDfn, patientName: appt.patientName,
      clinicId: appt.clinicId, clinicName: appt.clinicName,
      providerName: appt.providerName, appointmentType: appt.appointmentType,
      scheduledAt: appt.scheduledAt, duration: appt.duration,
      status: appt.status, reason: appt.reason, notes: appt.notes,
    }); } catch { /* non-fatal */ }
  }
  cacheAppt(appt);

  portalAudit("portal.appointment.request", "success", opts.patientDfn, {
    detail: { appointmentId: id, clinicName: opts.clinicName },
  });

  return appt;
}

export function requestCancellation(
  appointmentId: string,
  patientDfn: string,
  reason: string
): Appointment | null {
  const appt = getAppointment(appointmentId, patientDfn);
  if (!appt) return null;
  if (["cancelled", "completed", "no_show"].includes(appt.status)) return null;

  appt.status = "cancel_requested";
  appt.cancelReason = reason.slice(0, 500);
  appt.updatedAt = new Date().toISOString();
  appt.notes += "\nCancellation requested via portal -- awaiting clinic confirmation.";

  cacheAppt(appt);
  if (_repo) {
    try { _repo.updateAppointment(appointmentId, { status: "cancel_requested", cancelReason: appt.cancelReason }); } catch { /* */ }
  }

  portalAudit("portal.appointment.cancel", "success", patientDfn, {
    detail: { appointmentId, reason: reason.slice(0, 100) },
  });

  return appt;
}

export function requestReschedule(
  appointmentId: string,
  patientDfn: string,
  preference: string
): Appointment | null {
  const appt = getAppointment(appointmentId, patientDfn);
  if (!appt) return null;
  if (["cancelled", "completed", "no_show"].includes(appt.status)) return null;

  appt.status = "reschedule_requested";
  appt.reschedulePreference = preference.slice(0, 500);
  appt.updatedAt = new Date().toISOString();
  appt.notes += "\nReschedule requested via portal -- clinic will contact you.";

  cacheAppt(appt);
  if (_repo) {
    try { _repo.updateAppointment(appointmentId, { status: "reschedule_requested", reschedulePreference: appt.reschedulePreference }); } catch { /* */ }
  }

  portalAudit("portal.appointment.request", "success", patientDfn, {
    detail: { appointmentId, type: "reschedule" },
  });

  return appt;
}
