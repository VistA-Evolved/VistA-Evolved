/**
 * apps/api/src/service-lines/icu/types.ts
 *
 * Phase 468 (W31-P5). ICU Flowsheet & Device domain types.
 * Covers patient monitoring, ventilators, I&O, severity scoring.
 */

// -- ICU Bed / Admission --------------------------------------------

export type IcuBedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked';

export interface IcuBed {
  id: string;
  unit: string; // e.g., "MICU", "SICU", "CCU", "NICU"
  bedNumber: string;
  status: IcuBedStatus;
  currentAdmissionId?: string;
  monitors: string[]; // e.g., ["cardiac", "hemodynamic", "neuro"]
}

export type IcuAdmissionStatus =
  | 'active'
  | 'pending-transfer'
  | 'transferred'
  | 'discharged'
  | 'expired';

export interface IcuAdmission {
  id: string;
  patientDfn: string;
  bedId: string;
  unit: string;
  status: IcuAdmissionStatus;
  admitTime: string;
  admitSource: 'ed' | 'or' | 'floor' | 'transfer' | 'direct';
  attendingProvider: string;
  diagnosis: string;
  codeStatus: 'full' | 'dnr' | 'dni' | 'dnr-dni' | 'comfort';
  isolationPrecautions?: string[];
  dischargeTime?: string;
  dischargeDisposition?: string;
  createdAt: string;
  updatedAt: string;
}

// -- Flowsheet ------------------------------------------------------

export type FlowsheetCategory =
  | 'vitals'
  | 'ventilator'
  | 'hemodynamics'
  | 'neuro'
  | 'io' // intake & output
  | 'labs'
  | 'drips'
  | 'assessment'
  | 'intervention';

export interface FlowsheetEntry {
  id: string;
  admissionId: string;
  category: FlowsheetCategory;
  timestamp: string;
  recordedBy: string;
  values: Record<string, string | number | boolean>;
  validated: boolean;
}

// -- Ventilator Settings --------------------------------------------

export type VentMode = 'ac-vc' | 'ac-pc' | 'simv' | 'psv' | 'cpap' | 'bipap' | 'aprv' | 'hfov';

export interface VentSettings {
  id: string;
  admissionId: string;
  timestamp: string;
  mode: VentMode;
  tidalVolume?: number; // mL
  respiratoryRate?: number;
  peep: number; // cmH2O
  fio2: number; // 0.21 - 1.0
  pressureSupport?: number;
  inspiratoryPressure?: number;
  pip?: number; // peak inspiratory pressure
  plateau?: number; // plateau pressure
  compliance?: number; // mL/cmH2O
  recordedBy: string;
}

// -- Intake & Output ------------------------------------------------

export type IoType = 'intake' | 'output';
export type IoSource =
  | 'iv-fluid'
  | 'oral'
  | 'blood-product'
  | 'tpn'
  | 'medication' // intake
  | 'urine'
  | 'drain'
  | 'emesis'
  | 'stool'
  | 'blood-loss'
  | 'ng-output'; // output

export interface IoRecord {
  id: string;
  admissionId: string;
  type: IoType;
  source: IoSource;
  volumeMl: number;
  timestamp: string;
  recordedBy: string;
  description?: string;
}

// -- Severity Scores ------------------------------------------------

export type SeverityScoreType = 'apache-ii' | 'sofa' | 'gcs' | 'rass' | 'cam-icu' | 'braden';

export interface SeverityScore {
  id: string;
  admissionId: string;
  scoreType: SeverityScoreType;
  score: number;
  components?: Record<string, number>;
  timestamp: string;
  calculatedBy: string;
}

// -- ICU Metrics ----------------------------------------------------

export interface IcuMetrics {
  totalBeds: number;
  occupiedBeds: number;
  occupancyPct: number;
  activeAdmissions: number;
  ventilatedCount: number;
  avgLosHours: number;
  byUnit: Record<string, { total: number; occupied: number }>;
  byCodeStatus: Record<string, number>;
}
