/**
 * Phase 391 (W22-P3): Inpatient Core -- Types
 *
 * ADT bedboard, nursing flowsheets, vitals capture, and writeback posture.
 * Reuses the Wave 17 Facility -> Department -> Location hierarchy from
 * facility-service.ts. Extends Location with bed-level assignments.
 */

// --- Bed Assignment ---------------------------------------------

export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'blocked' | 'reserved';

export interface BedAssignment {
  id: string;
  tenantId: string;
  /** References Location.id from facility-service.ts */
  locationId: string;
  /** Bed identifier within the room (e.g., "A", "B", "1") */
  bedLabel: string;
  status: BedStatus;
  /** Patient DFN assigned to this bed (null if unoccupied) */
  patientDfn: string | null;
  patientName: string | null;
  /** Admitting provider DUZ */
  admittingProviderDuz: string | null;
  /** Ward/unit display name (denormalized for bedboard rendering) */
  wardName: string;
  roomNumber: string;
  /** ADT event that created this assignment */
  admitDateTime: string | null;
  /** Expected or actual discharge */
  dischargeDateTime: string | null;
  /** Isolation/precaution flags */
  precautions: string[];
  /** Acuity level for sorting */
  acuity: 'low' | 'medium' | 'high' | 'critical' | null;
  updatedAt: string;
}

// --- ADT Events -------------------------------------------------

export type AdtEventType =
  | 'admit'
  | 'transfer'
  | 'discharge'
  | 'update'
  | 'cancel_admit'
  | 'cancel_discharge';

export interface AdtEvent {
  id: string;
  tenantId: string;
  patientDfn: string;
  eventType: AdtEventType;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromBedLabel: string | null;
  toBedLabel: string | null;
  providerDuz: string;
  reason: string;
  /** VistA DGPM movement IEN (if written back) */
  vistaMovementIen: string | null;
  createdAt: string;
}

// --- Nursing Flowsheet Data -------------------------------------

export interface FlowsheetRow {
  id: string;
  tenantId: string;
  patientDfn: string;
  /** Flowsheet definition ID (from content-packs/pack-store) */
  flowsheetId: string;
  /** Column key -> value */
  values: Record<string, string | number | boolean>;
  /** Flags for out-of-range values */
  flags: Record<string, 'low' | 'high' | 'critical_low' | 'critical_high'>;
  recordedBy: string;
  recordedAt: string;
  /** Source: manual vs device ingest (Wave 21) */
  source: 'manual' | 'device' | 'imported';
  /** Device observation ID if ingested from Wave 21 */
  deviceObservationId: string | null;
}

// --- Vitals (Subset of Flowsheet) ------------------------------

export type VitalSign =
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'heart_rate'
  | 'respiratory_rate'
  | 'temperature'
  | 'spo2'
  | 'weight'
  | 'height'
  | 'bmi'
  | 'pain';

export interface VitalsEntry {
  id: string;
  tenantId: string;
  patientDfn: string;
  vitals: Partial<Record<VitalSign, number>>;
  /** Units per vital (e.g., { temperature: "F", weight: "kg" }) */
  units: Partial<Record<VitalSign, string>>;
  recordedBy: string;
  recordedAt: string;
  source: 'manual' | 'device' | 'imported';
  /** VistA writeback status */
  writebackStatus: 'not_attempted' | 'pending' | 'success' | 'failed' | 'not_available';
  /** VistA GMV file IEN if written back */
  vistaVitalsIen: string | null;
  writebackError: string | null;
}

// --- Writeback Posture ------------------------------------------

export interface WritebackPosture {
  vitals: {
    rpc: 'GMV ADD VM';
    status: 'available' | 'integration_pending' | 'unavailable';
    sandboxNote: string;
  };
  nursingNote: {
    rpc: 'TIU CREATE RECORD';
    status: 'available' | 'integration_pending' | 'unavailable';
    sandboxNote: string;
  };
  adtMovement: {
    rpc: 'DGPM ADT MOVEMENTS';
    status: 'available' | 'integration_pending' | 'unavailable';
    sandboxNote: string;
  };
}
