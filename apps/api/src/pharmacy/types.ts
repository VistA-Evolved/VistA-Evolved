/**
 * Phase 392 (W22-P4): Pharmacy Deep Workflows — Types
 *
 * Full pharmacy lifecycle: order → verify → dispense → administer → discontinue
 * Bridges existing eMAR, writeback executor, BCMA, and med-rec modules into a
 * unified pharmacy workflow FSM.
 *
 * Dependencies:
 *   - eMAR (Phase 85): ORWPS ACTIVE, ORWORR GETTXT
 *   - Writeback (Phase 303): ORWDX SAVE/DC
 *   - BCMA (Wave 21 Phase 385): Infusion pump events, right-6 checks
 *   - Med-Rec (Phase 168): Reconciliation sessions
 */

// ─── Pharmacy Order Lifecycle ───────────────────────────────

export type PharmOrderStatus =
  | 'pending'
  | 'pharmacist_review'
  | 'verified'
  | 'dispensing'
  | 'dispensed'
  | 'ready_for_admin'
  | 'administered'
  | 'returned'
  | 'discontinued'
  | 'cancelled'
  | 'on_hold'
  | 'expired';

export type PharmOrderType = 'inpatient' | 'outpatient' | 'iv' | 'prn' | 'one_time' | 'standing';

export interface PharmOrder {
  id: string;
  tenantId: string;
  patientDfn: string;
  /** VistA order IEN (from ORWDX SAVE writeback, if written) */
  vistaOrderIen: string | null;
  orderType: PharmOrderType;
  status: PharmOrderStatus;
  /** Drug name (free text or from VistA) */
  drugName: string;
  /** National Drug Code (NDC) */
  ndc: string | null;
  /** Drug class for DDI checking */
  drugClass: string | null;
  /** Dosage (e.g., "500mg") */
  dose: string;
  /** Route (PO, IV, IM, SQ, etc.) */
  route: string;
  /** Schedule (e.g., "Q8H", "BID", "PRN") */
  schedule: string;
  /** Duration in days (null = indefinite) */
  durationDays: number | null;
  /** Special instructions */
  instructions: string;
  /** Ordering provider DUZ */
  orderingProviderDuz: string;
  orderingProviderName: string;
  /** Verifying pharmacist DUZ */
  verifyingPharmacistDuz: string | null;
  verifyingPharmacistName: string | null;
  verifiedAt: string | null;
  /** Clinical check results at order time */
  clinicalChecks: ClinicalCheckResult[];
  /** Step-up auth required for high-alert meds */
  requiresStepUp: boolean;
  stepUpCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Clinical Checks (DDI, Allergy, Duplicate) ─────────────

export type ClinicalCheckType =
  | 'ddi'
  | 'allergy'
  | 'duplicate_therapy'
  | 'dose_range'
  | 'renal_dose'
  | 'high_alert';

export type ClinicalCheckSeverity = 'info' | 'warning' | 'critical';

export interface ClinicalCheckResult {
  type: ClinicalCheckType;
  severity: ClinicalCheckSeverity;
  message: string;
  /** Override reason (if clinician acknowledged and continued) */
  overrideReason: string | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
}

// ─── Dispensing ─────────────────────────────────────────────

export type DispenseStatus = 'pending' | 'picking' | 'checked' | 'ready' | 'delivered' | 'returned';

export interface DispenseEvent {
  id: string;
  tenantId: string;
  pharmOrderId: string;
  patientDfn: string;
  status: DispenseStatus;
  /** Quantity dispensed */
  quantity: number;
  /** NDC of actual dispensed product */
  dispensedNdc: string | null;
  /** Lot number for recall tracking */
  lotNumber: string | null;
  /** Expiration date of dispensed product */
  expirationDate: string | null;
  /** Pharmacist who dispensed */
  dispensedByDuz: string | null;
  dispensedByName: string | null;
  /** Final check pharmacist (double verify for high-alert) */
  checkedByDuz: string | null;
  checkedByName: string | null;
  /** Delivery location/ward */
  deliveryLocation: string | null;
  /** VistA dispensing IEN (File 52 or 53.461) */
  vistaDispenseIen: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Administration Record ──────────────────────────────────

export type AdminStatus = 'scheduled' | 'given' | 'held' | 'refused' | 'missed' | 'self_admin';

export interface AdminRecord {
  id: string;
  tenantId: string;
  pharmOrderId: string;
  patientDfn: string;
  status: AdminStatus;
  /** Dose actually administered */
  givenDose: string | null;
  givenRoute: string | null;
  /** Who administered */
  adminByDuz: string;
  adminByName: string;
  /** When administered */
  administeredAt: string;
  /** BCMA session ID from Wave 21 (if scanned) */
  bcmaSessionId: string | null;
  /** Barcode scan verified? */
  barcodeVerified: boolean;
  /** Right-6 check result */
  right6Passed: boolean | null;
  /** Site/location of administration */
  site: string | null;
  /** Patient response/reaction note */
  patientResponse: string | null;
  /** Reason for hold/refusal */
  holdReason: string | null;
  /** VistA PSB MED LOG IEN (if written back) */
  vistaPsbIen: string | null;
  writebackStatus: 'not_attempted' | 'pending' | 'success' | 'failed' | 'not_available';
  createdAt: string;
}

// ─── Pharmacy Dashboard Stats ───────────────────────────────

export interface PharmacyDashboardStats {
  pendingVerification: number;
  pendingDispensing: number;
  readyForAdmin: number;
  administered24h: number;
  discontinued24h: number;
  highAlertOrders: number;
  clinicalChecksOverridden: number;
}

// ─── Writeback Posture ──────────────────────────────────────

export interface PharmWritebackPosture {
  orderPlace: { rpc: string; status: 'available' | 'integration_pending'; note: string };
  orderDc: { rpc: string; status: 'available' | 'integration_pending'; note: string };
  medAdmin: { rpc: string; status: 'available' | 'integration_pending'; note: string };
  dispense: { rpc: string; status: 'available' | 'integration_pending'; note: string };
  barcodeVerify: { rpc: string; status: 'available' | 'integration_pending'; note: string };
}
