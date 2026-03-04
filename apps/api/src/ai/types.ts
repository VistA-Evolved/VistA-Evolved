/**
 * AI Gateway — Core Type Definitions (Phase 33)
 *
 * Governed AI integration types. The gateway routes requests through
 * safety, redaction, RAG grounding, and audit layers. AI augments —
 * it never replaces — clinical decision-making.
 *
 * NOT ALLOWED: diagnosis, treatment plans, prescribing guidance,
 * autonomous ordering.
 */

/* ------------------------------------------------------------------ */
/* Model Registry Types                                                */
/* ------------------------------------------------------------------ */

/** Deployment locations determine PHI handling rules. */
export type ModelDeployment = 'on-premises' | 'cloud';

/** Approved model status — only "active" models accept requests. */
export type ModelStatus = 'active' | 'deprecated' | 'disabled';

/** A registered AI model with governance metadata. */
export interface ModelConfig {
  /** Unique model identifier (e.g., "stub-v1", "medgemma-4b"). */
  id: string;
  /** Human-readable model name. */
  name: string;
  /** Provider key (maps to provider adapter). */
  provider: string;
  /** Where model runs — determines PHI handling. */
  deployment: ModelDeployment;
  /** Whether this model may receive un-redacted PHI. */
  phiAllowed: boolean;
  /** Active/deprecated/disabled. */
  status: ModelStatus;
  /** Maximum input tokens. */
  maxInputTokens: number;
  /** Maximum output tokens. */
  maxOutputTokens: number;
  /** Allowed use-case IDs this model may serve. */
  allowedUseCases: string[];
  /** ISO timestamp of when model was added to registry. */
  registeredAt: string;
}

/* ------------------------------------------------------------------ */
/* Prompt Registry Types                                               */
/* ------------------------------------------------------------------ */

/** A versioned, auditable prompt template. No ad-hoc hidden prompts. */
export interface PromptTemplate {
  /** Unique prompt identifier (e.g., "intake-summary-v1"). */
  id: string;
  /** Semantic version. */
  version: string;
  /** Which use case this prompt serves. */
  useCase: AIUseCase;
  /** System prompt text — the core instruction. */
  systemPrompt: string;
  /** User prompt template with {{variable}} placeholders. */
  userPromptTemplate: string;
  /** SHA-256 hash of (systemPrompt + userPromptTemplate) for audit. */
  contentHash: string;
  /** Allowed variable names that may be interpolated. */
  allowedVariables: string[];
  /** ISO timestamp of last update. */
  updatedAt: string;
  /** Who approved this prompt version. */
  approvedBy: string;
}

/* ------------------------------------------------------------------ */
/* Use Case Types                                                      */
/* ------------------------------------------------------------------ */

/** Allowed AI use cases — strictly scoped. */
export type AIUseCase =
  | 'intake-summary' // Intake → clinician-ready note draft (grounded)
  | 'lab-education' // Explain lab results in plain language
  | 'portal-search' // Navigation help ("where do I find...")
  | 'custom'; // Facility-registered custom prompts

/** Disallowed content categories — requests matching these are BLOCKED. */
export const DISALLOWED_CATEGORIES = [
  'diagnosis',
  'treatment_plan',
  'prescribing_guidance',
  'autonomous_ordering',
  'prognosis',
  'differential_diagnosis',
] as const;

export type DisallowedCategory = (typeof DISALLOWED_CATEGORIES)[number];

/* ------------------------------------------------------------------ */
/* Request / Response Types                                            */
/* ------------------------------------------------------------------ */

/** Role of the actor making the AI request. */
export type AIActorRole = 'clinician' | 'patient' | 'proxy' | 'system';

/** AI request — all fields required for audit trail. */
export interface AIRequest {
  /** Which use case. */
  useCase: AIUseCase;
  /** Prompt template ID to use (must exist in registry). */
  promptId: string;
  /** Variable values to interpolate into the prompt template. */
  variables: Record<string, string>;
  /** Patient DFN (for RAG context). Null for non-patient queries. */
  patientDfn: string | null;
  /** Actor info. */
  actor: {
    id: string;
    role: AIActorRole;
    name?: string;
  };
  /** Optional: preferred model ID. Gateway may override. */
  preferredModelId?: string;
  /** Optional: max output tokens override (capped by model max). */
  maxTokens?: number;
}

/** Citation to a source fact used in the AI response. */
export interface Citation {
  /** Source label (e.g., "Lab: BMP 2025-02-01"). */
  source: string;
  /** Data category (e.g., "lab", "medication", "vital", "intake"). */
  category: string;
  /** The exact text snippet grounded from the source. */
  snippet: string;
}

/** Confidence level for AI-generated content. */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** AI response — includes grounding metadata. */
export interface AIResponse {
  /** Generated text. */
  text: string;
  /** Model that generated this response. */
  modelId: string;
  /** Prompt template used. */
  promptId: string;
  /** Prompt content hash at time of generation (for audit). */
  promptHash: string;
  /** Citations to source facts. */
  citations: Citation[];
  /** Confidence level. */
  confidence: ConfidenceLevel;
  /** Whether clinician confirmation is required before use. */
  requiresConfirmation: boolean;
  /** Whether response was redacted before return. */
  wasRedacted: boolean;
  /** Safety warnings (empty if clean). */
  safetyWarnings: string[];
  /** Generation latency in milliseconds. */
  latencyMs: number;
  /** Unique response ID for audit cross-reference. */
  responseId: string;
  /** ISO timestamp. */
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* RAG Context Types                                                   */
/* ------------------------------------------------------------------ */

/** Allowed RAG data sources — must match role-visible data. */
export type RAGSourceCategory =
  | 'demographics'
  | 'medications'
  | 'allergies'
  | 'problems'
  | 'vitals'
  | 'labs'
  | 'notes'
  | 'intake'
  | 'appointments';

/** A chunk of patient context for RAG grounding. */
export interface RAGChunk {
  /** Source category. */
  category: RAGSourceCategory;
  /** Human-readable label. */
  label: string;
  /** The text content for context injection. */
  content: string;
  /** ISO timestamp of the source data. */
  dataTimestamp: string;
}

/** RAG context assembled for a request. */
export interface RAGContext {
  /** All chunks assembled. */
  chunks: RAGChunk[];
  /** Total character count of assembled context. */
  totalChars: number;
  /** Which source categories were included. */
  categoriesIncluded: RAGSourceCategory[];
  /** Which source categories were excluded (role restriction). */
  categoriesExcluded: RAGSourceCategory[];
}

/* ------------------------------------------------------------------ */
/* Audit Types                                                         */
/* ------------------------------------------------------------------ */

/** AI audit event — logged for every gateway invocation. */
export interface AIAuditEvent {
  /** Unique event ID. */
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Use case. */
  useCase: AIUseCase;
  /** Model used. */
  modelId: string;
  /** Prompt template ID. */
  promptId: string;
  /** SHA-256 hash of the prompt content. */
  promptHash: string;
  /** Actor role. */
  actorRole: AIActorRole;
  /** Hashed actor ID (never raw DUZ/DFN). */
  actorHash: string;
  /** Hashed patient ID (never raw DFN). */
  patientHash: string | null;
  /** Outcome. */
  outcome: 'success' | 'blocked' | 'error' | 'safety_filtered';
  /** If blocked, which category triggered the block. */
  blockedCategory?: DisallowedCategory;
  /** Safety warnings emitted. */
  safetyWarnings: string[];
  /** Whether response was redacted. */
  wasRedacted: boolean;
  /** Approximate input tokens. */
  inputTokens: number;
  /** Approximate output tokens. */
  outputTokens: number;
  /** End-to-end latency ms. */
  latencyMs: number;
  /** RAG categories used. */
  ragCategories: RAGSourceCategory[];
  /** Number of citations in response. */
  citationCount: number;
  /** Whether clinician confirmed the result (null if pending). */
  clinicianConfirmed: boolean | null;
}

/** Provider adapter interface — pluggable model backends. */
export interface AIProvider {
  /** Provider identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Generate a completion. */
  complete(opts: { systemPrompt: string; userPrompt: string; maxTokens: number }): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  }>;
  /** Health check. */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

/* ------------------------------------------------------------------ */
/* Facility Policy Types                                               */
/* ------------------------------------------------------------------ */

/** Per-facility AI policy toggles. */
export interface FacilityAIPolicy {
  /** Whether AI gateway is enabled at all. */
  aiEnabled: boolean;
  /** Whether to redact PHI before model calls. */
  redactPhi: boolean;
  /** Whether cloud models are permitted. */
  cloudModelsAllowed: boolean;
  /** Max requests per user per hour. */
  maxRequestsPerUserPerHour: number;
  /** Which use cases are allowed at this facility. */
  allowedUseCases: AIUseCase[];
  /** Whether patient-facing AI (portal) is enabled. */
  patientAiEnabled: boolean;
  /** Require clinician confirmation for all drafted clinical text. */
  requireClinicianConfirmation: boolean;
}
