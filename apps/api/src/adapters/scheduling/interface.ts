/**
 * Scheduling Adapter Interface -- Phase 37C, enhanced Phase 63.
 *
 * Phase 63 additions: WaitListEntry, ClinicInfo, encounter-based types,
 * request/cancel/reschedule flows, clinic lookup, provider lookup.
 */

import type { BaseAdapter, AdapterResult } from "../types.js";

export interface Appointment {
  id: string;
  patientDfn: string;
  dateTime: string;
  clinic: string;
  clinicIen?: string;
  provider?: string;
  providerDuz?: string;
  status: string;
  type?: string;
  /** VistA encounter IEN (from SDOE) */
  encounterIen?: string;
  /** Duration in minutes */
  duration?: number;
  /** Reason / chief complaint */
  reason?: string;
  /** Source: "vista" or "request" */
  source?: "vista" | "request";
}

export interface TimeSlot {
  dateTime: string;
  clinic: string;
  clinicIen?: string;
  provider?: string;
  durationMinutes: number;
  available: boolean;
}

export interface ClinicInfo {
  ien: string;
  name: string;
  abbreviation?: string;
  phone?: string;
  location?: string;
  stopCode?: string;
}

export interface ProviderInfo {
  duz: string;
  name: string;
  title?: string;
  service?: string;
}

export interface WaitListEntry {
  id: string;
  patientDfn: string;
  clinicName: string;
  preferredDate: string;
  priority: string;
  status: string;
  createdAt: string;
  reason?: string;
  type?: "new_appointment" | "reschedule" | "cancel_request";
}

export interface AppointmentRequest {
  patientDfn: string;
  clinicIen?: string;
  clinicName: string;
  preferredDate: string;
  reason: string;
  appointmentType?: string;
  providerDuz?: string;
}

export interface SchedulingAdapter extends BaseAdapter {
  readonly adapterType: "scheduling";
  /** List appointments for a patient (SDOE encounter-based) */
  listAppointments(patientDfn: string, startDate?: string, endDate?: string): Promise<AdapterResult<Appointment[]>>;
  /** Create/book an appointment (SDEC when available, else wait list request) */
  createAppointment(request: AppointmentRequest): Promise<AdapterResult<Appointment | WaitListEntry>>;
  /** Cancel an appointment or submit cancel request */
  cancelAppointment(appointmentId: string, reason: string, patientDfn?: string): Promise<AdapterResult<void>>;
  /** Get available time slots for a clinic */
  getAvailableSlots(clinicIen: string, startDate: string, endDate: string): Promise<AdapterResult<TimeSlot[]>>;
  /** List clinics / hospital locations */
  listClinics(): Promise<AdapterResult<ClinicInfo[]>>;
  /** List providers */
  listProviders(): Promise<AdapterResult<ProviderInfo[]>>;
  /** List encounters by date range (provider/clinic view) */
  listEncountersByDate(startDate: string, endDate: string): Promise<AdapterResult<Appointment[]>>;
}
