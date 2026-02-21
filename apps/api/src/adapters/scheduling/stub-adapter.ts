/**
 * Stub Scheduling Adapter -- Phase 37C, updated Phase 63.
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

const STUB = { ok: false as const, pending: true, error: "Scheduling adapter not configured" };

export class StubSchedulingAdapter implements SchedulingAdapter {
  readonly adapterType = "scheduling" as const;
  readonly implementationName = "external-stub";
  readonly _isStub = true;

  async healthCheck() { return { ok: false, latencyMs: 0, detail: "Stub adapter" }; }
  async listAppointments(): Promise<AdapterResult<Appointment[]>> { return STUB; }
  async createAppointment(): Promise<AdapterResult<Appointment | WaitListEntry>> { return STUB; }
  async cancelAppointment(): Promise<AdapterResult<void>> { return STUB; }
  async getAvailableSlots(): Promise<AdapterResult<TimeSlot[]>> { return STUB; }
  async listClinics(): Promise<AdapterResult<ClinicInfo[]>> { return STUB; }
  async listProviders(): Promise<AdapterResult<ProviderInfo[]>> { return STUB; }
  async listEncountersByDate(): Promise<AdapterResult<Appointment[]>> { return STUB; }
}
