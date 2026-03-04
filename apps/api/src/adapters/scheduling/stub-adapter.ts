/**
 * Stub Scheduling Adapter -- Phase 37C, updated Phase 63, Phase 123, Phase 131.
 */

import type {
  SchedulingAdapter,
  Appointment,
  TimeSlot,
  ClinicInfo,
  ProviderInfo,
  WaitListEntry,
  EncounterDetail,
  EncounterProvider,
  EncounterDiagnosis,
  CprsAppointment,
  ReferenceDataSet,
  RpcPostureEntry,
  AppointmentType,
  CancelReason,
  ClinicResource,
  SdesAvailSlot,
  TruthGateResult,
  SchedulingMode,
} from './interface.js';
import type { AdapterResult } from '../types.js';

const STUB = { ok: false as const, pending: true, error: 'Scheduling adapter not configured' };

export class StubSchedulingAdapter implements SchedulingAdapter {
  readonly adapterType = 'scheduling' as const;
  readonly implementationName = 'external-stub';
  readonly _isStub = true;

  async healthCheck() {
    return { ok: false, latencyMs: 0, detail: 'Stub adapter' };
  }
  async listAppointments(): Promise<AdapterResult<Appointment[]>> {
    return STUB;
  }
  async createAppointment(): Promise<AdapterResult<Appointment | WaitListEntry>> {
    return STUB;
  }
  async cancelAppointment(): Promise<AdapterResult<void>> {
    return STUB;
  }
  async getAvailableSlots(): Promise<AdapterResult<TimeSlot[]>> {
    return STUB;
  }
  async listClinics(): Promise<AdapterResult<ClinicInfo[]>> {
    return STUB;
  }
  async listProviders(): Promise<AdapterResult<ProviderInfo[]>> {
    return STUB;
  }
  async listEncountersByDate(): Promise<AdapterResult<Appointment[]>> {
    return STUB;
  }
  // Phase 123: new methods
  async getEncounterDetail(): Promise<AdapterResult<EncounterDetail>> {
    return STUB;
  }
  async getEncounterProviders(): Promise<AdapterResult<EncounterProvider[]>> {
    return STUB;
  }
  async getEncounterDiagnoses(): Promise<AdapterResult<EncounterDiagnosis[]>> {
    return STUB;
  }
  async getWaitList(): Promise<AdapterResult<WaitListEntry[]>> {
    return STUB;
  }
  // Phase 131: new methods
  async getAppointmentsCprs(): Promise<AdapterResult<CprsAppointment[]>> {
    return STUB;
  }
  async getReferenceData(): Promise<AdapterResult<ReferenceDataSet>> {
    return STUB;
  }
  async getRpcPosture(): Promise<AdapterResult<RpcPostureEntry[]>> {
    return STUB;
  }
  // Phase 147: new methods
  async getAppointmentTypes(): Promise<AdapterResult<AppointmentType[]>> {
    return STUB;
  }
  async getCancelReasons(): Promise<AdapterResult<CancelReason[]>> {
    return STUB;
  }
  async getClinicResource(): Promise<AdapterResult<ClinicResource>> {
    return STUB;
  }
  async getSdesAvailability(): Promise<AdapterResult<SdesAvailSlot[]>> {
    return STUB;
  }
  async verifyAppointment(): Promise<AdapterResult<TruthGateResult>> {
    return {
      ok: false,
      pending: true,
      data: {
        gate: 'vista_verify',
        passed: false,
        vistaVerified: false,
        detail: 'Stub adapter -- no VistA',
        checkedAt: new Date().toISOString(),
      },
    };
  }
  async getSchedulingMode(): Promise<AdapterResult<SchedulingMode>> {
    return {
      ok: true,
      data: {
        writebackEnabled: false,
        sdesInstalled: false,
        sdoeInstalled: false,
        sdwlInstalled: false,
        mode: 'request_only' as const,
        detail: 'Stub adapter',
      },
    };
  }
}
