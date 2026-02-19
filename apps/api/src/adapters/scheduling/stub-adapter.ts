/**
 * Stub Scheduling Adapter — Phase 37C.
 */

import type { SchedulingAdapter, Appointment, TimeSlot } from "./interface.js";
import type { AdapterResult } from "../types.js";

const STUB = { ok: false as const, pending: true, error: "Scheduling adapter not configured" };

export class StubSchedulingAdapter implements SchedulingAdapter {
  readonly adapterType = "scheduling" as const;
  readonly implementationName = "external-stub";
  readonly _isStub = true;

  async healthCheck() { return { ok: false, latencyMs: 0, detail: "Stub adapter" }; }
  async listAppointments(): Promise<AdapterResult<Appointment[]>> { return STUB; }
  async createAppointment(): Promise<AdapterResult<Appointment>> { return STUB; }
  async cancelAppointment(): Promise<AdapterResult<void>> { return STUB; }
  async getAvailableSlots(): Promise<AdapterResult<TimeSlot[]>> { return STUB; }
}
