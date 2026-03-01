/**
 * Phase 394 (W22-P6): Imaging/Radiology Deep Workflows -- Types
 *
 * Fills the key radiology gaps identified in specialty coverage:
 *  - Radiology order management (protocol assignment)
 *  - Radiologist reading worklist (study-to-reader assignment)
 *  - Report lifecycle (draft -> preliminary -> final -> addendum)
 *  - Radiation dose registry with DRL comparison
 *  - Critical finding alerting (ACR guidelines)
 *  - Peer review / quality scoring
 *
 * Dependencies:
 *   - Phase 23: imaging-worklist.ts (ordering-side worklist)
 *   - Phase 24: imaging-authz, imaging-audit, imaging-devices
 *   - Phase 386 (W21): MWL WorklistItem, MppsRecord, DoseReport, ModalityAeConfig
 *   - Writeback executor: img-executor.ts PLACE_IMAGING_ORDER intent
 */

// ── Radiology Order (extends Phase 23 worklist) ────────────

export type RadOrderStatus =
  | "ordered"
  | "protocoled"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "reported"
  | "verified"
  | "cancelled"
  | "on_hold";

export type RadPriority = "routine" | "stat" | "urgent" | "asap" | "wet_read";

export type RadModality =
  | "CR" | "CT" | "MR" | "US" | "NM" | "PT"
  | "XA" | "RF" | "MG" | "DX" | "IO" | "OT";

export interface RadOrder {
  id: string;
  tenantId: string;
  patientDfn: string;
  vistaOrderIen: string | null;
  /** RA PROCEDURE (File 71) IEN */
  vistaRadProcIen: string | null;
  status: RadOrderStatus;
  procedureName: string;
  procedureCode: string | null;
  /** CPT code (pass-through per ADR-W22-TERMINOLOGY) */
  cptCode: string | null;
  modality: RadModality;
  priority: RadPriority;
  /** Clinical indication / reason for exam */
  clinicalIndication: string;
  /** Ordering provider */
  orderingProviderDuz: string;
  orderingProviderName: string;
  /** Protocol assigned by tech/radiologist */
  protocolName: string | null;
  protocolAssignedByDuz: string | null;
  protocolAssignedAt: string | null;
  /** MWL worklist item ID (Wave 21 bridge) */
  mwlWorklistItemId: string | null;
  /** MPPS record ID (Wave 21 bridge) */
  mppsRecordId: string | null;
  /** Study instance UID (after acquisition) */
  studyInstanceUid: string | null;
  /** Accession number (VE- format or VistA RA ASSIGN ACC#) */
  accessionNumber: string | null;
  /** Scheduled datetime */
  scheduledAt: string | null;
  /** Actual start/end times */
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Radiologist Reading Worklist ────────────────────────────

export type ReadingStatus =
  | "unread"
  | "in_progress"
  | "preliminary"
  | "final"
  | "addendum_pending";

export type ReadingPriority = "routine" | "urgent" | "stat" | "critical";

export interface ReadingWorklistItem {
  id: string;
  tenantId: string;
  radOrderId: string;
  patientDfn: string;
  studyInstanceUid: string;
  accessionNumber: string;
  modality: RadModality;
  procedureName: string;
  status: ReadingStatus;
  priority: ReadingPriority;
  /** Assigned radiologist */
  assignedRadiologistDuz: string | null;
  assignedRadiologistName: string | null;
  assignedAt: string | null;
  /** Turnaround: order completed -> report finalized */
  reportStartedAt: string | null;
  reportFinalizedAt: string | null;
  /** Number of prior comparison studies available */
  priorStudyCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Radiology Report Lifecycle ──────────────────────────────

export type ReportStatus =
  | "draft"
  | "preliminary"
  | "final"
  | "addendum"
  | "amended"
  | "cancelled";

export interface RadReport {
  id: string;
  tenantId: string;
  radOrderId: string;
  readingWorklistItemId: string;
  patientDfn: string;
  studyInstanceUid: string;
  accessionNumber: string;
  status: ReportStatus;
  /** Findings section */
  findings: string;
  /** Impression/conclusion */
  impression: string;
  /** Full report text */
  reportText: string;
  /** Report template used (if any, from content packs) */
  templateId: string | null;
  /** Dictating radiologist */
  dictatedByDuz: string;
  dictatedByName: string;
  dictatedAt: string;
  /** Preliminary signer (e.g., resident) */
  prelimSignedByDuz: string | null;
  prelimSignedByName: string | null;
  prelimSignedAt: string | null;
  /** Final verifying radiologist (attending) */
  verifiedByDuz: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  /** VistA TIU note IEN once written */
  vistaTiuNoteIen: string | null;
  /** Critical finding flagged */
  criticalFinding: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Radiation Dose Registry ─────────────────────────────────

export interface DoseRegistryEntry {
  id: string;
  tenantId: string;
  patientDfn: string;
  radOrderId: string;
  studyInstanceUid: string;
  accessionNumber: string;
  modality: RadModality;
  procedureName: string;
  /** CT Dose Index volume (mGy) */
  ctdiVol: number | null;
  /** Dose Length Product (mGy*cm) */
  dlp: number | null;
  /** Dose Area Product (dGy*cm2) */
  dap: number | null;
  /** Fluoroscopy time (seconds) */
  fluoroTimeSec: number | null;
  /** Number of exposures */
  exposureCount: number | null;
  /** Effective dose (mSv) — estimated */
  effectiveDoseMSv: number | null;
  /** Exceeded Diagnostic Reference Level? */
  exceedsDrl: boolean;
  /** DRL comparison value used */
  drlThreshold: number | null;
  drlMetric: string | null;
  /** MPPS record ID from Wave 21 */
  mppsRecordId: string | null;
  performedAt: string;
  createdAt: string;
}

// ── Critical Finding Alert ──────────────────────────────────

export type RadCriticalAlertStatus =
  | "active"
  | "acknowledged"
  | "communicated"
  | "resolved";

export interface RadCriticalAlert {
  id: string;
  tenantId: string;
  radReportId: string;
  radOrderId: string;
  patientDfn: string;
  finding: string;
  /** ACR Practice Parameter category */
  category: "unexpected" | "urgent" | "emergent";
  status: RadCriticalAlertStatus;
  /** Provider to notify (ordering clinician) */
  notifyProviderDuz: string;
  notifyProviderName: string;
  /** Communication tracking */
  communicatedToDuz: string | null;
  communicatedToName: string | null;
  communicatedAt: string | null;
  communicationMethod: "direct_verbal" | "phone" | "secure_message" | "in_person" | null;
  /** Acknowledgement */
  acknowledgedByDuz: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  /** Time limits (ACR recommends communication within specific timeframes) */
  communicationDeadlineMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ── Peer Review / Quality Scoring ───────────────────────────

export type PeerReviewScore = 1 | 2 | 3 | 4;
// 1 = Concur, 2 = Discrepancy (clinically insignificant),
// 3 = Discrepancy (clinically significant, no adverse outcome),
// 4 = Discrepancy (clinically significant, adverse outcome)

export interface PeerReview {
  id: string;
  tenantId: string;
  radReportId: string;
  radOrderId: string;
  patientDfn: string;
  /** Reviewer radiologist */
  reviewerDuz: string;
  reviewerName: string;
  /** Original dictating radiologist */
  originalDictatorDuz: string;
  originalDictatorName: string;
  score: PeerReviewScore;
  comments: string;
  /** Discrepancy category if score > 1 */
  discrepancyCategory: string | null;
  createdAt: string;
}

// ── Dashboard / Posture ─────────────────────────────────────

export interface RadDashboardStats {
  pendingOrders: number;
  unreadStudies: number;
  preliminaryReports: number;
  criticalAlertsActive: number;
  completedToday: number;
  averageTurnaroundMinutes: number | null;
  doseAlertsToday: number;
  peerReviewsThisMonth: number;
}

export interface RadWritebackPosture {
  orderPlace: { rpc: string; status: "available" | "integration_pending"; note: string };
  reportCreate: { rpc: string; status: "available" | "integration_pending"; note: string };
  reportVerify: { rpc: string; status: "available" | "integration_pending"; note: string };
  accessionAssign: { rpc: string; status: "available" | "integration_pending"; note: string };
  vistaRadProc: { rpc: string; status: "available" | "integration_pending"; note: string };
}
