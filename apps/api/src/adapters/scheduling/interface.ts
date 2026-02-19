/**
 * Scheduling Adapter Interface — Phase 37C.
 */

import type { BaseAdapter, AdapterResult } from "../types.js";

export interface Appointment {
  id: string;
  patientDfn: string;
  dateTime: string;
  clinic: string;
  provider?: string;
  status: string;
  type?: string;
}

export interface TimeSlot {
  dateTime: string;
  clinic: string;
  provider?: string;
  durationMinutes: number;
  available: boolean;
}

export interface SchedulingAdapter extends BaseAdapter {
  readonly adapterType: "scheduling";
  listAppointments(patientDfn: string): Promise<AdapterResult<Appointment[]>>;
  createAppointment(patientDfn: string, slotDateTime: string, clinic: string): Promise<AdapterResult<Appointment>>;
  cancelAppointment(appointmentId: string, reason: string): Promise<AdapterResult<void>>;
  getAvailableSlots(clinic: string, startDate: string, endDate: string): Promise<AdapterResult<TimeSlot[]>>;
}
