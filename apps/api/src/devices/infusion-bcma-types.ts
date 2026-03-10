/**
 * Infusion / BCMA Safety Bridge -- Types
 *
 * Phase 385 (W21-P8): Infusion pump integration and Barcode Medication
 * Administration (BCMA) safety bridge. Implements the "right 6" checks
 * (right patient, drug, dose, route, time, documentation) and pump
 * event staging for VistA order verification.
 */

// ---------------------------------------------------------------------------
// BCMA Right-6 Check Types
// ---------------------------------------------------------------------------

export type BcmaCheckStatus = 'pass' | 'fail' | 'warning' | 'pending' | 'override';

export interface BcmaRight6Result {
  /** Right patient -- barcode scan matches ordered patient DFN */
  rightPatient: BcmaCheckStatus;
  /** Right drug -- scanned NDC/UPC matches ordered medication */
  rightDrug: BcmaCheckStatus;
  /** Right dose -- scanned quantity matches ordered dose */
  rightDose: BcmaCheckStatus;
  /** Right route -- matches ordered route of administration */
  rightRoute: BcmaCheckStatus;
  /** Right time -- within allowable administration window */
  rightTime: BcmaCheckStatus;
  /** Right documentation -- order is active and unsigned med pass exists */
  rightDocumentation: BcmaCheckStatus;
  /** Overall pass/fail */
  overallStatus: BcmaCheckStatus;
  /** Failure details (if any check failed) */
  failures: BcmaCheckFailure[];
}

export interface BcmaCheckFailure {
  check: string;
  expected: string;
  actual: string;
  severity: 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Medication Barcode Scan
// ---------------------------------------------------------------------------

export interface MedicationScan {
  /** Scan ID */
  id: string;
  /** Raw barcode data */
  barcodeData: string;
  /** Barcode type (NDC, UPC, GS1, DataMatrix) */
  barcodeType: string;
  /** Resolved medication name */
  medicationName?: string;
  /** Resolved NDC (National Drug Code) */
  ndc?: string;
  /** Lot number (from 2D barcode if available) */
  lotNumber?: string;
  /** Expiration date (from 2D barcode if available) */
  expirationDate?: string;
  /** Scanner device ID */
  scannerDeviceId?: string;
  /** Scanned at */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Patient Wristband Scan
// ---------------------------------------------------------------------------

export interface PatientScan {
  /** Scan ID */
  id: string;
  /** Raw barcode data from wristband */
  barcodeData: string;
  /** Resolved patient DFN */
  patientDfn?: string;
  /** Resolved patient name (last,first) */
  patientName?: string;
  /** Scanner device ID */
  scannerDeviceId?: string;
  /** Scanned at */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Infusion Pump Types
// ---------------------------------------------------------------------------

export type PumpEventType =
  | 'infusion_start'
  | 'infusion_stop'
  | 'rate_change'
  | 'bolus'
  | 'alarm'
  | 'occlusion'
  | 'air_in_line'
  | 'battery_low'
  | 'infusion_complete'
  | 'bag_change';

export type PumpChannel = 'A' | 'B' | 'C' | 'primary' | 'secondary' | 'piggyback';

export interface InfusionPumpEvent {
  /** Event ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Pump serial number */
  pumpSerial: string;
  /** Pump model (e.g., "Alaris 8015", "BD Sigma") */
  pumpModel?: string;
  /** Pump channel */
  channel?: PumpChannel;
  /** Event type */
  eventType: PumpEventType;
  /** Associated patient DFN */
  patientDfn?: string;
  /** Associated order reference (VistA order IEN) */
  orderRef?: string;
  /** Medication being infused */
  medication?: string;
  /** Current rate (mL/hr) */
  rate?: number;
  /** Volume to be infused (mL) */
  vtbi?: number;
  /** Volume infused so far (mL) */
  volumeInfused?: number;
  /** Concentration */
  concentration?: string;
  /** Event detail/message */
  detail?: string;
  /** Whether this event has been verified against VistA */
  vistaVerified: boolean;
  /** VistA MAH (Medication Administration History) IEN if documented */
  vistaMahIen?: string;
  /** Event timestamp from the pump */
  pumpTimestamp: string;
  /** When we received the event */
  receivedAt: string;
}

// ---------------------------------------------------------------------------
// BCMA Administration Session
// ---------------------------------------------------------------------------

export type BcmaSessionStatus =
  | 'scanning'
  | 'verified'
  | 'administered'
  | 'refused'
  | 'held'
  | 'error';

export interface BcmaSession {
  /** Session ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Nurse/clinician who initiated the session */
  clinicianDuz: string;
  /** Patient scan */
  patientScan?: PatientScan;
  /** Medication scan */
  medicationScan?: MedicationScan;
  /** Right-6 check results */
  right6Result?: BcmaRight6Result;
  /** Associated VistA order IEN */
  orderIen?: string;
  /** Session status */
  status: BcmaSessionStatus;
  /** Administration notes */
  notes?: string;
  /** If infusion, linked pump event */
  pumpEventId?: string;
  /** Started at */
  startedAt: string;
  /** Completed at */
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface InfusionBcmaStats {
  totalPumpEvents: number;
  totalBcmaSessions: number;
  right6PassRate: number;
  right6FailCount: number;
  overrideCount: number;
  byEventType: Record<string, number>;
  byStatus: Record<string, number>;
}
