/**
 * Scheduling Adapter Interface -- Phase 37C, enhanced Phase 63, Phase 123.
 *
 * Phase 63 additions: WaitListEntry, ClinicInfo, encounter-based types,
 * request/cancel/reschedule flows, clinic lookup, provider lookup.
 * Phase 123 additions: EncounterDetail, EncounterProvider, EncounterDiagnosis,
 * encounter detail/providers/diagnoses methods, wait-list read, VistA posture.
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

/** Phase 123: Encounter detail from SDOE GET GENERAL DATA */
export interface EncounterDetail {
  encounterIen: string;
  dateTime: string;
  clinic: string;
  clinicIen?: string;
  type?: string;
  status?: string;
  visitCategory?: string;
  serviceCategory?: string;
  patientDfn?: string;
  raw?: Record<string, string>;
}

/** Phase 123: Provider assigned to an encounter (SDOE GET PROVIDERS) */
export interface EncounterProvider {
  encounterIen: string;
  duz: string;
  name: string;
  role?: string;
  isPrimary?: boolean;
}

/** Phase 123: Diagnosis from encounter (SDOE GET DIAGNOSES) */
export interface EncounterDiagnosis {
  encounterIen: string;
  icd: string;
  description: string;
  isPrimary?: boolean;
  dateRecorded?: string;
}

/** Phase 123: VistA posture metadata — shows exactly which RPC/file was used */
export interface VistaGrounding {
  rpc: string;
  vistaPackage: string;
  vistaFiles?: string[];
  sandboxNote?: string;
  migrationPath?: string;
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
  /** Phase 123: VistA wait-list IEN if created via SD W/L CREATE FILE */
  vistaWaitListIen?: string;
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
  /** Create/book an appointment (SD W/L CREATE FILE -> SDEC when available, else request store) */
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
  /** Phase 123: Get encounter detail fields (SDOE GET GENERAL DATA) */
  getEncounterDetail(encounterIen: string): Promise<AdapterResult<EncounterDetail>>;
  /** Phase 123: Get providers assigned to encounter (SDOE GET PROVIDERS) */
  getEncounterProviders(encounterIen: string): Promise<AdapterResult<EncounterProvider[]>>;
  /** Phase 123: Get diagnoses for encounter (SDOE GET DIAGNOSES) */
  getEncounterDiagnoses(encounterIen: string): Promise<AdapterResult<EncounterDiagnosis[]>>;
  /** Phase 123: Read wait-list entries (SD W/L RETRIVE FULL DATA) */
  getWaitList(clinicIen?: string): Promise<AdapterResult<WaitListEntry[]>>;
}
