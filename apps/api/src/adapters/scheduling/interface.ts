/**
 * Scheduling Adapter Interface -- Phase 37C, enhanced Phase 63, Phase 123, Phase 131.
 *
 * Phase 63 additions: WaitListEntry, ClinicInfo, encounter-based types,
 * request/cancel/reschedule flows, clinic lookup, provider lookup.
 * Phase 123 additions: EncounterDetail, EncounterProvider, EncounterDiagnosis,
 * encounter detail/providers/diagnoses methods, wait-list read, VistA posture.
 * Phase 131 additions: LifecycleEntry, RpcPosture, ReferenceDataSet,
 * CprsAppointment, getReferenceData, getAppointmentsCprs, getRpcPosture.
 */

import type { BaseAdapter, AdapterResult } from '../types.js';

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
  source?: 'vista' | 'request';
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

/** Phase 123: VistA posture metadata -- shows exactly which RPC/file was used */
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
  type?: 'new_appointment' | 'reschedule' | 'cancel_request';
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

/** Phase 131: CPRS-style appointment (from ORWPT APPTLST) */
export interface CprsAppointment {
  dateTime: string;
  clinicIen: string;
  clinicName: string;
  status: string;
  raw: string;
}

/** Phase 131: Wait-list reference data (SD W/L PRIORITY/TYPE/STATUS) */
export interface ReferenceDataSet {
  priorities: { ien: string; name: string }[];
  types: { ien: string; name: string }[];
  statuses: { ien: string; name: string }[];
}

/** Phase 131: Lifecycle state transition record */
export interface LifecycleEntry {
  id: string;
  appointmentRef: string;
  patientDfn: string;
  clinicIen?: string;
  clinicName: string;
  state: string;
  previousState?: string;
  vistaIen?: string;
  rpcUsed?: string;
  transitionNote?: string;
  createdByDuz?: string;
  createdAt: string;
  updatedAt: string;
}

/** Phase 131: RPC availability posture for scheduling subsystem */
export interface RpcPostureEntry {
  rpc: string;
  ien?: string;
  status: 'available' | 'callable_no_data' | 'not_installed';
  vistaPackage: string;
  sandboxNote: string;
}

/** Phase 147: Appointment type reference data (from SDES GET APPT TYPES) */
export interface AppointmentType {
  ien: string;
  name: string;
  code?: string;
  inactive?: boolean;
}

/** Phase 147: Cancel reason reference data (from SDES GET CANCEL REASONS) */
export interface CancelReason {
  ien: string;
  name: string;
  code?: string;
  type?: string;
}

/** Phase 147: Resource/clinic hours (from SDES GET RESOURCE BY CLINIC) */
export interface ClinicResource {
  clinicIen: string;
  clinicName: string;
  resourceIen?: string;
  resourceName?: string;
  abbreviation?: string;
  slotLength?: number;
  maxOverbooksPerDay?: number;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string[];
  raw?: string[];
}

/** Phase 147: SDES clinic availability slot */
export interface SdesAvailSlot {
  clinicIen?: string;
  date?: string;
  time?: string;
  dateTime?: string;
  slotCount?: number;
  slotsAvailable: number;
  slotLength?: number;
  resourceIen?: string;
  raw?: string;
}

/** Phase 147: Truth gate result for scheduling verification */
export interface TruthGateResult {
  gate: string;
  passed: boolean;
  vistaVerified: boolean;
  vistaIen?: string;
  rpcUsed?: string;
  verificationMethod?: string;
  appointmentRef?: string;
  patientDfn?: string;
  vistaData?: string;
  detail?: string;
  error?: string;
  checkedAt?: string;
  timestamp?: string;
}

/** Phase 147: Scheduling mode indicator */
export interface SchedulingMode {
  writebackEnabled: boolean;
  sdesInstalled: boolean;
  sdoeInstalled: boolean;
  sdwlInstalled: boolean;
  sdvwInstalled?: boolean;
  mode: 'vista_direct' | 'vista_waitlist' | 'sdes_partial' | 'request_only';
  detail: string;
}

export interface SchedulingAdapter extends BaseAdapter {
  readonly adapterType: 'scheduling';
  /** List appointments for a patient (SDOE encounter-based) */
  listAppointments(
    patientDfn: string,
    startDate?: string,
    endDate?: string
  ): Promise<AdapterResult<Appointment[]>>;
  /** Create/book an appointment (SD W/L CREATE FILE -> SDEC when available, else request store) */
  createAppointment(
    request: AppointmentRequest
  ): Promise<AdapterResult<Appointment | WaitListEntry>>;
  /** Cancel an appointment or submit cancel request */
  cancelAppointment(
    appointmentId: string,
    reason: string,
    patientDfn?: string
  ): Promise<AdapterResult<void>>;
  /** Get available time slots for a clinic */
  getAvailableSlots(
    clinicIen: string,
    startDate: string,
    endDate: string
  ): Promise<AdapterResult<TimeSlot[]>>;
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
  /** Phase 131: Get CPRS-style appointment list (ORWPT APPTLST) */
  getAppointmentsCprs(patientDfn: string): Promise<AdapterResult<CprsAppointment[]>>;
  /** Phase 131: Get wait-list reference data (SD W/L PRIORITY/TYPE/STATUS) */
  getReferenceData(): Promise<AdapterResult<ReferenceDataSet>>;
  /** Phase 131: Get RPC availability posture for scheduling subsystem */
  getRpcPosture(): Promise<AdapterResult<RpcPostureEntry[]>>;
  /** Phase 147: Get appointment types (SDES GET APPT TYPES) */
  getAppointmentTypes(): Promise<AdapterResult<AppointmentType[]>>;
  /** Phase 147: Get cancel reasons (SDES GET CANCEL REASONS) */
  getCancelReasons(): Promise<AdapterResult<CancelReason[]>>;
  /** Phase 147: Get resource/hours for a clinic (SDES GET RESOURCE BY CLINIC) */
  getClinicResource(clinicIen: string): Promise<AdapterResult<ClinicResource>>;
  /** Phase 147: Get SDES clinic availability (SDES GET CLIN AVAILABILITY) */
  getSdesAvailability(
    clinicIen: string,
    startDate: string,
    endDate: string
  ): Promise<AdapterResult<SdesAvailSlot[]>>;
  /** Phase 147: Verify an appointment exists in VistA (truth gate) */
  verifyAppointment(
    appointmentRef: string,
    patientDfn: string
  ): Promise<AdapterResult<TruthGateResult>>;
  /** Phase 147: Get scheduling mode for this tenant */
  getSchedulingMode(): Promise<AdapterResult<SchedulingMode>>;
}
