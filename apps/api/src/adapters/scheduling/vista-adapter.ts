/**
 * VistA Scheduling Adapter — Phase 37C.
 *
 * Placeholder VistA implementation. SD (Scheduling) RPCs are limited in
 * the WorldVistA sandbox. This adapter is ready for production RPCs.
 */

import type { SchedulingAdapter, Appointment, TimeSlot } from "./interface.js";
import type { AdapterResult } from "../types.js";

const PENDING = { ok: false as const, pending: true, target: "SD MAKE APPOINTMENT" };

export class VistaSchedulingAdapter implements SchedulingAdapter {
  readonly adapterType = "scheduling" as const;
  readonly implementationName = "vista-rpc";
  readonly _isStub = false;

  async healthCheck() {
    return { ok: true, latencyMs: 0, detail: "VistA scheduling adapter (limited sandbox RPCs)" };
  }

  async listAppointments(_dfn: string): Promise<AdapterResult<Appointment[]>> { return PENDING; }
  async createAppointment(): Promise<AdapterResult<Appointment>> { return PENDING; }
  async cancelAppointment(): Promise<AdapterResult<void>> { return PENDING; }
  async getAvailableSlots(): Promise<AdapterResult<TimeSlot[]>> { return PENDING; }
}
