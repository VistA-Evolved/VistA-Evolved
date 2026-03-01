/**
 * Phase 393 (W22-P5): Lab Deep Workflows — Types
 *
 * Full lab lifecycle: order → specimen collect → process → result →
 * review → verify → critical alert → acknowledge.
 *
 * Bridges existing lab reads (ORWLRR INTERIM/CHART), writeback executor
 * (ORWDX SAVE for orders), Wave 21 POCT device ingest, and event bus.
 *
 * Dependencies:
 *   - CPRS Wave1 (Phase 56): ORWLRR CHART
 *   - CPRS Wave2 (Phase 59): ORWLRR ACK
 *   - Writeback (Phase 304): lab-executor PLACE_LAB_ORDER, ACK_LAB_RESULT
 *   - Wave 21 (Phase 382): ASTM/POCT1-A device ingest + normalization
 *   - Event bus (Phase 354): LAB_RESULT_POSTED event
 */

// ─── Lab Order ──────────────────────────────────────────────

export type LabOrderStatus =
  | "pending"
  | "collected"
  | "in_process"
  | "resulted"
  | "reviewed"
  | "verified"
  | "final"
  | "cancelled"
  | "on_hold";

export type LabOrderPriority = "routine" | "stat" | "asap" | "timed" | "preop";

export interface LabOrder {
  id: string;
  tenantId: string;
  patientDfn: string;
  /** VistA order IEN (from ORWDX SAVE, if written) */
  vistaOrderIen: string | null;
  status: LabOrderStatus;
  /** Lab test name */
  testName: string;
  /** Lab test code (LOINC if mapped, else local) */
  testCode: string | null;
  /** LOINC code for interoperability */
  loincCode: string | null;
  priority: LabOrderPriority;
  /** Specimen type required (e.g., "Serum", "Whole Blood") */
  specimenType: string;
  /** Collection instructions */
  collectionInstructions: string;
  /** Ordering provider */
  orderingProviderDuz: string;
  orderingProviderName: string;
  /** Collection timestamp */
  collectedAt: string | null;
  collectedByDuz: string | null;
  /** Result available timestamp */
  resultedAt: string | null;
  /** Reviewing pathologist/lab tech */
  reviewedByDuz: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  /** Verifying provider (final sign-off) */
  verifiedByDuz: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Specimen Tracking ──────────────────────────────────────

export type SpecimenStatus =
  | "ordered"
  | "collected"
  | "in_transit"
  | "received"
  | "processing"
  | "completed"
  | "rejected"
  | "lost";

export interface SpecimenSample {
  id: string;
  tenantId: string;
  labOrderId: string;
  patientDfn: string;
  /** Barcode / accession number */
  accessionNumber: string;
  specimenType: string;
  status: SpecimenStatus;
  /** Collection site (e.g., "Right arm", "Left hand") */
  collectionSite: string | null;
  /** Volume in mL */
  volumeMl: number | null;
  /** Container type (e.g., "Purple top EDTA", "Red top SST") */
  containerType: string | null;
  collectedByDuz: string | null;
  collectedByName: string | null;
  collectedAt: string | null;
  receivedAt: string | null;
  /** Reject reason if specimen rejected */
  rejectReason: string | null;
  /** Wave 21 device observation IDs linked to this specimen */
  deviceObservationIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Lab Result ─────────────────────────────────────────────

export type ResultStatus = "preliminary" | "final" | "corrected" | "amended" | "cancelled";

export type AbnormalFlag =
  | "normal"
  | "low"
  | "high"
  | "critical_low"
  | "critical_high"
  | "abnormal"
  | "very_abnormal";

export interface LabResult {
  id: string;
  tenantId: string;
  labOrderId: string;
  patientDfn: string;
  /** Test/analyte name */
  analyteName: string;
  /** LOINC code */
  loincCode: string | null;
  /** Result value */
  value: string;
  /** Units (UCUM preferred) */
  units: string | null;
  /** Reference range (e.g., "3.5-5.0") */
  referenceRange: string | null;
  /** Abnormal flag */
  flag: AbnormalFlag;
  status: ResultStatus;
  /** Interpretation/comment by lab */
  comment: string | null;
  /** Method used */
  method: string | null;
  /** Instrument/device that produced result */
  performingDevice: string | null;
  /** Source: manual entry, device, imported */
  source: "manual" | "device" | "imported" | "vista";
  /** Wave 21 device observation ID (if from device ingest) */
  deviceObservationId: string | null;
  /** VistA Lab file IEN (File 63 entry) */
  vistaLabIen: string | null;
  resultedAt: string;
  createdAt: string;
}

// ─── Critical Result Alerting ───────────────────────────────

export type CriticalAlertStatus = "active" | "acknowledged" | "escalated" | "resolved";

export interface CriticalAlert {
  id: string;
  tenantId: string;
  labResultId: string;
  labOrderId: string;
  patientDfn: string;
  analyteName: string;
  value: string;
  units: string | null;
  flag: AbnormalFlag;
  /** Critical value threshold that triggered the alert */
  threshold: string;
  status: CriticalAlertStatus;
  /** Provider to notify */
  notifyProviderDuz: string;
  notifyProviderName: string;
  /** Acknowledgement details */
  acknowledgedByDuz: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  /** Read-back verification (Joint Commission NPSG) */
  readBackVerified: boolean;
  /** Escalation timeline (minutes since alert) */
  escalationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Lab Dashboard Stats ────────────────────────────────────

export interface LabDashboardStats {
  pendingOrders: number;
  specimensInTransit: number;
  resultsAwaitingReview: number;
  activeCriticalAlerts: number;
  completedToday: number;
  averageTurnaroundMinutes: number | null;
}

// ─── Lab Writeback Posture ──────────────────────────────────

export interface LabWritebackPosture {
  orderPlace: { rpc: string; status: "available" | "integration_pending"; note: string };
  resultAck: { rpc: string; status: "available" | "integration_pending"; note: string };
  resultVerify: { rpc: string; status: "available" | "integration_pending"; note: string };
  specimenCollect: { rpc: string; status: "available" | "integration_pending"; note: string };
  labReport: { rpc: string; status: "available" | "integration_pending"; note: string };
}
