/**
 * Clinical Writeback Command Bus — Types
 *
 * Phase 300 (W12-P2): Unified safety wrapper for all VistA writebacks.
 *
 * All writeback operations flow through the command bus:
 *   request validated -> persisted -> idempotency checked ->
 *   worker executes RPC -> audit recorded -> result returned
 *
 * Safety: tenant feature gate, per-domain gate, dry-run mode, circuit breaker.
 */

/* ------------------------------------------------------------------ */
/* Domain + Intent                                                     */
/* ------------------------------------------------------------------ */

export type WritebackDomain = "TIU" | "ORDERS" | "PHARM" | "LAB" | "ADT" | "IMG";

export type WritebackIntent =
  // TIU
  | "CREATE_NOTE_DRAFT"
  | "UPDATE_NOTE_TEXT"
  | "SIGN_NOTE"
  | "CREATE_ADDENDUM"
  // Orders
  | "PLACE_ORDER"
  | "DISCONTINUE_ORDER"
  | "VERIFY_ORDER"
  | "SIGN_ORDER"
  | "FLAG_ORDER"
  // Pharmacy
  | "PLACE_MED_ORDER"
  | "DISCONTINUE_MED_ORDER"
  | "ADMINISTER_MED"
  // Labs
  | "PLACE_LAB_ORDER"
  | "ACK_LAB_RESULT"
  // ADT
  | "ADMIT_PATIENT"
  | "TRANSFER_PATIENT"
  | "DISCHARGE_PATIENT"
  // Imaging
  | "PLACE_IMAGING_ORDER"
  | "LINK_IMAGING_STUDY";

/** Maps each intent to its domain for validation. */
export const INTENT_DOMAIN_MAP: Record<WritebackIntent, WritebackDomain> = {
  CREATE_NOTE_DRAFT: "TIU",
  UPDATE_NOTE_TEXT: "TIU",
  SIGN_NOTE: "TIU",
  CREATE_ADDENDUM: "TIU",
  PLACE_ORDER: "ORDERS",
  DISCONTINUE_ORDER: "ORDERS",
  VERIFY_ORDER: "ORDERS",
  SIGN_ORDER: "ORDERS",
  FLAG_ORDER: "ORDERS",
  PLACE_MED_ORDER: "PHARM",
  DISCONTINUE_MED_ORDER: "PHARM",
  ADMINISTER_MED: "PHARM",
  PLACE_LAB_ORDER: "LAB",
  ACK_LAB_RESULT: "LAB",
  ADMIT_PATIENT: "ADT",
  TRANSFER_PATIENT: "ADT",
  DISCHARGE_PATIENT: "ADT",
  PLACE_IMAGING_ORDER: "IMG",
  LINK_IMAGING_STUDY: "IMG",
};

/* ------------------------------------------------------------------ */
/* Command lifecycle                                                   */
/* ------------------------------------------------------------------ */

export type CommandStatus =
  | "pending"           // Created, not yet processed
  | "processing"        // Worker picked up
  | "completed"         // RPC succeeded
  | "failed"            // RPC failed (terminal)
  | "dry_run"           // Dry-run recorded (no RPC executed)
  | "rejected"          // Validation failed
  | "retrying"          // Transient failure, will retry
  | "awaiting_review";  // Supervised-mode: waiting for clinician review (Phase 437)

/* ------------------------------------------------------------------ */
/* Supervised review (Phase 437)                                       */
/* ------------------------------------------------------------------ */

export type ReviewDecision = "approve" | "reject";

export interface SupervisedReviewMeta {
  /** Is this command subject to supervised review? */
  requiresReview: boolean;
  /** Safe-harbor tier of the target RPC */
  safeHarborTier?: string;
  /** Who reviewed this command */
  reviewedBy?: string;
  /** When reviewed (ISO 8601) */
  reviewedAt?: string;
  /** Approve or reject */
  reviewDecision?: ReviewDecision;
  /** Rejection reason (if rejected) */
  reviewReason?: string;
}

/* ------------------------------------------------------------------ */
/* Command record                                                      */
/* ------------------------------------------------------------------ */

export interface ClinicalCommand {
  id: string;
  tenantId: string;
  /** SHA-256 hash of patient identifier (no raw DFN/MRN) */
  patientRefHash: string;
  domain: WritebackDomain;
  intent: WritebackIntent;
  /** Validated payload (domain-specific, PHI-redacted for audit) */
  payloadJson: Record<string, unknown>;
  idempotencyKey: string;
  status: CommandStatus;
  createdAt: string;   // ISO 8601
  createdBy: string;   // DUZ or user ID
  correlationId: string;
  /** If dry-run, contains the would-be RPC transcript */
  dryRunTranscript?: DryRunTranscript;
  /** Number of execution attempts */
  attemptCount: number;
  /** Most recent error (redacted) */
  lastError?: string;
  /** Supervised review metadata (Phase 437) */
  supervisedMeta?: SupervisedReviewMeta;
}

/* ------------------------------------------------------------------ */
/* Attempt record                                                      */
/* ------------------------------------------------------------------ */

export interface CommandAttempt {
  commandId: string;
  attemptNo: number;
  startedAt: string;
  endedAt?: string;
  status: "running" | "success" | "transient_failure" | "permanent_failure";
  errorClass?: string;
  errorDetailRedacted?: string;
}

/* ------------------------------------------------------------------ */
/* Result record                                                       */
/* ------------------------------------------------------------------ */

export interface CommandResult {
  commandId: string;
  /** VistA IEN(s) returned by the RPC */
  vistaRefs: Record<string, string>;
  resultSummary: string;
  completedAt: string;
}

/* ------------------------------------------------------------------ */
/* Dry-run transcript                                                   */
/* ------------------------------------------------------------------ */

export interface DryRunTranscript {
  rpcName: string;
  params: Record<string, unknown>;
  /** Simulated result */
  simulatedResult: string;
  recordedAt: string;
}

/* ------------------------------------------------------------------ */
/* Command submission request (from routes)                             */
/* ------------------------------------------------------------------ */

export interface SubmitCommandRequest {
  tenantId: string;
  patientRefHash: string;
  domain: WritebackDomain;
  intent: WritebackIntent;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdBy: string;
  correlationId?: string;
  /** Force dry-run regardless of global setting */
  forceDryRun?: boolean;
}

/* ------------------------------------------------------------------ */
/* Command execution result                                            */
/* ------------------------------------------------------------------ */

export interface CommandExecutionResult {
  commandId: string;
  status: CommandStatus;
  vistaRefs?: Record<string, string>;
  resultSummary?: string;
  dryRunTranscript?: DryRunTranscript;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Feature gate config                                                 */
/* ------------------------------------------------------------------ */

export interface WritebackGateConfig {
  /** Global kill-switch */
  globalEnabled: boolean;
  /** Per-domain gates */
  domainGates: Record<WritebackDomain, boolean>;
  /** Global dry-run mode */
  dryRunMode: boolean;
}

/* ------------------------------------------------------------------ */
/* RPC executor interface (adapter pattern)                             */
/* ------------------------------------------------------------------ */

export interface RpcExecutor {
  /**
   * Execute an RPC for the given command.
   * Returns the VistA refs and result summary on success.
   * Throws on failure (with errorClass for retry categorization).
   */
  execute(command: ClinicalCommand): Promise<{
    vistaRefs: Record<string, string>;
    resultSummary: string;
  }>;

  /**
   * Generate a dry-run transcript for the given command.
   * Does NOT execute any RPC.
   */
  dryRun(command: ClinicalCommand): DryRunTranscript;
}
