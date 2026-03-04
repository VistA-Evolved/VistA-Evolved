/**
 * Intake Brain Plugin Architecture — Core Types (Phase 143)
 *
 * Defines the IntakeBrainPlugin interface that all providers must implement.
 * Three provider families:
 *   1. rules_engine         — deterministic, pack-driven (default, always available)
 *   2. llm_provider:<name>  — governed via AI Gateway (Phase 33)
 *   3. third_party:<name>   — external API adapters (e.g., Instant Medical History)
 *
 * Non-negotiables:
 *   - NO medical diagnosis or treatment recommendations
 *   - Every LLM interaction audited (PHI-redacted)
 *   - Rules engine is ALWAYS the fallback
 *   - Human-in-the-loop for all clinical output
 */

import type {
  IntakeSession,
  QuestionnaireResponse,
  IntakeContext,
  NextQuestionResult,
  DraftClinicianSummary,
  QuestionnaireItem,
} from '../types.js';

/* ------------------------------------------------------------------ */
/* Provider Identifier                                                  */
/* ------------------------------------------------------------------ */

/**
 * Typed provider identifier.
 *   - "rules_engine"          — built-in deterministic
 *   - "llm_provider:stub"     — stub LLM (dev/test)
 *   - "llm_provider:openai"   — OpenAI adapter
 *   - "llm_provider:medgemma" — MedGemma on-prem
 *   - "third_party:imh"       — Instant Medical History
 *   - "third_party:custom"    — facility-registered adapter
 */
export type BrainProviderId = string;

/** Provider family extracted from the id. */
export type BrainProviderFamily = 'rules_engine' | 'llm_provider' | 'third_party';

export function parseBrainProviderId(id: BrainProviderId): {
  family: BrainProviderFamily;
  variant: string;
} {
  if (id === 'rules_engine' || id === 'rules') {
    return { family: 'rules_engine', variant: 'default' };
  }
  if (id.startsWith('llm_provider:')) {
    return { family: 'llm_provider', variant: id.slice('llm_provider:'.length) };
  }
  if (id.startsWith('third_party:')) {
    return { family: 'third_party', variant: id.slice('third_party:'.length) };
  }
  // Legacy BrainProvider values
  if (id === 'vendor_adapter') return { family: 'third_party', variant: 'vendor' };
  if (id === 'llm_constrained') return { family: 'llm_provider', variant: 'default' };
  // Default to rules
  return { family: 'rules_engine', variant: 'default' };
}

/* ------------------------------------------------------------------ */
/* Governance / Audit                                                   */
/* ------------------------------------------------------------------ */

export interface BrainDecisionAudit {
  /** Unique decision ID */
  id: string;
  /** Session this decision belongs to */
  sessionId: string;
  /** Provider that made the decision */
  providerId: BrainProviderId;
  /** Provider family */
  providerFamily: BrainProviderFamily;
  /** Decision type */
  decisionType: 'next_question' | 'submit_answer' | 'finalize_summary' | 'start_session';
  /** Input hash (SHA-256 of inputs, no PHI) */
  inputHash: string;
  /** Output hash (SHA-256 of output) */
  outputHash: string;
  /** Whether the decision required LLM interaction */
  usedLlm: boolean;
  /** Whether PHI was redacted before LLM call */
  phiRedacted: boolean;
  /** Latency in ms */
  latencyMs: number;
  /** Whether fallback to rules was triggered */
  fellBackToRules: boolean;
  /** Safety warnings generated */
  safetyWarnings: string[];
  /** Timestamp */
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Provider Health                                                      */
/* ------------------------------------------------------------------ */

export interface BrainProviderHealth {
  providerId: BrainProviderId;
  family: BrainProviderFamily;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheckAt: string;
  detail?: string;
}

/* ------------------------------------------------------------------ */
/* Provider Capabilities                                                */
/* ------------------------------------------------------------------ */

export interface BrainProviderCapabilities {
  /** Can this provider do adaptive question ordering? */
  adaptiveOrdering: boolean;
  /** Can this provider generate summary narratives? */
  summaryGeneration: boolean;
  /** Can this provider do complaint-to-question expansion? */
  complaintExpansion: boolean;
  /** Can this provider do follow-up question branching? */
  followUpBranching: boolean;
  /** Supported languages */
  supportedLanguages: string[];
  /** Maximum session duration supported (ms) */
  maxSessionDurationMs: number;
}

/* ------------------------------------------------------------------ */
/* IntakeBrainPlugin Interface                                          */
/* ------------------------------------------------------------------ */

/**
 * The core plugin interface. Every intake brain provider MUST implement this.
 * All methods are async to accommodate external API calls.
 */
export interface IntakeBrainPlugin {
  /** Unique provider identifier */
  readonly id: BrainProviderId;
  /** Human-readable name */
  readonly name: string;
  /** Provider family */
  readonly family: BrainProviderFamily;

  /**
   * Initialize a brain session. Called when an intake session starts or
   * switches provider. Returns any provider-specific session state.
   */
  startSession(session: IntakeSession, context: IntakeContext): Promise<BrainSessionState>;

  /**
   * Determine the next set of questions. May use rules, LLM ranking,
   * or external API to decide ordering and branching.
   *
   * CONSTRAINT: Must never INVENT new medical questions.
   * Can only select/rank/branch from registered pack items.
   */
  nextQuestion(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainNextQuestionResult>;

  /**
   * Process a submitted answer. May trigger follow-up expansions
   * or complaint cluster resolution.
   */
  submitAnswer(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    answeredItems: QuestionnaireItem[],
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSubmitResult>;

  /**
   * Generate the final clinician-facing summary.
   * MUST be grounded in patient answers (citations required).
   * MUST NOT include diagnosis or treatment recommendations.
   */
  finalizeSummary(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSummaryResult>;

  /** Health check */
  healthCheck(): Promise<BrainProviderHealth>;

  /** Capabilities descriptor */
  getCapabilities(): BrainProviderCapabilities;
}

/* ------------------------------------------------------------------ */
/* Result Types                                                         */
/* ------------------------------------------------------------------ */

export interface BrainSessionState {
  /** Provider-specific state blob */
  providerState: Record<string, unknown>;
  /** Conversation turns completed so far */
  turnsCompleted: number;
  /** Estimated total turns remaining */
  estimatedTurnsRemaining: number;
  /** Active complaint clusters being explored */
  activeComplaintClusters: string[];
}

export interface BrainNextQuestionResult extends NextQuestionResult {
  /** Reasoning trace (for audit, not displayed to patient) */
  reasoningTrace?: string;
  /** Whether LLM was consulted for this decision */
  usedLlm: boolean;
  /** Updated brain state */
  brainState: BrainSessionState;
}

export interface BrainSubmitResult {
  /** Any new follow-up questions triggered by the answer */
  followUpItems: QuestionnaireItem[];
  /** Red flags detected from this answer */
  newRedFlags: Array<{
    flag: string;
    severity: 'info' | 'warning' | 'critical' | 'high' | 'medium';
    triggerLinkId: string;
  }>;
  /** Complaint clusters resolved or expanded */
  clusterUpdates: Array<{
    clusterId: string;
    action: 'expanded' | 'resolved' | 'escalated';
  }>;
  /** Updated brain state */
  brainState: BrainSessionState;
}

export interface BrainSummaryResult extends DraftClinicianSummary {
  /** Provider that generated the summary */
  providerId: BrainProviderId;
  /** Whether TIU-ready note text is available */
  tiuReady: boolean;
  /** TIU note title (for VistA filing) */
  tiuNoteTitle: string;
  /** Governance metadata */
  governance: {
    promptVersion: string;
    promptHash: string;
    groundedInAnswers: boolean;
    citationCount: number;
    containsDiagnosis: boolean;
    containsTreatment: boolean;
    safetyCheckPassed: boolean;
  };
}
