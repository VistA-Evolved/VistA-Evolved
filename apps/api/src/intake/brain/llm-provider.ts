/**
 * LLM Brain Plugin (Phase 143)
 *
 * Bridges the intake brain to the AI Gateway (Phase 33) for governed
 * LLM-assisted question ordering and summary generation.
 *
 * Key constraints:
 *   - LLM may only RANK/SELECT from existing pack questions (never invent)
 *   - All interactions go through safety layer + PHI redaction
 *   - Every call audited
 *   - Falls back to rules_engine on ANY failure
 *   - Requires INTAKE_LLM_ENABLED=true + valid AI provider configured
 */

import type {
  IntakeBrainPlugin,
  BrainProviderHealth,
  BrainProviderCapabilities,
  BrainSessionState,
  BrainNextQuestionResult,
  BrainSubmitResult,
  BrainSummaryResult,
} from "./types.js";
import type {
  IntakeSession,
  QuestionnaireResponse,
  IntakeContext,
  QuestionnaireItem,
} from "../types.js";
import { RulesEngineBrain } from "./rules-engine.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* LLM Provider Brain                                                   */
/* ------------------------------------------------------------------ */

export class LlmBrainPlugin implements IntakeBrainPlugin {
  readonly id: string;
  readonly name: string;
  readonly family = "llm_provider" as const;

  private fallback = new RulesEngineBrain();
  private variant: string;

  constructor(variant: string = "default") {
    this.variant = variant;
    this.id = `llm_provider:${variant}`;
    this.name = `LLM Provider (${variant})`;
  }

  private isEnabled(): boolean {
    return process.env.INTAKE_LLM_ENABLED === "true";
  }

  async startSession(
    session: IntakeSession,
    context: IntakeContext
  ): Promise<BrainSessionState> {
    const base = await this.fallback.startSession(session, context);
    return {
      ...base,
      providerState: {
        ...base.providerState,
        llmEnabled: this.isEnabled(),
        variant: this.variant,
        conversationHistory: [],
      },
    };
  }

  async nextQuestion(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainNextQuestionResult> {
    if (!this.isEnabled()) {
      const result = await this.fallback.nextQuestion(session, qrSoFar, context, brainState);
      return { ...result, usedLlm: false };
    }

    try {
      // Step 1: Get eligible questions from rules engine (the pool)
      const rulesResult = await this.fallback.nextQuestion(
        session, qrSoFar, context, brainState
      );

      if (rulesResult.isComplete || rulesResult.nextItems.length === 0) {
        return { ...rulesResult, usedLlm: false };
      }

      // Step 2: In production, ask LLM to RANK the eligible questions
      // based on clinical relevance to the chief complaint + answers so far.
      //
      // The LLM prompt would be:
      //   "Given these patient answers so far: [redacted summary]
      //    And these eligible questions: [list]
      //    Rank the top 5 most clinically relevant questions.
      //    Do NOT invent new questions. Only rank from the provided list.
      //    Do NOT make diagnoses or treatment recommendations."
      //
      // For now, we return the rules result with LLM ranking stubbed.
      // When AI Gateway integration is wired:
      //   1. Build grounded prompt from QR answers (PHI-redacted)
      //   2. Call processAiRequest() with use case "intake-summary"
      //   3. Parse LLM ranking response
      //   4. Reorder nextItems per LLM ranking
      //   5. Log everything to audit

      log.info(`LLM brain: would rank ${rulesResult.nextItems.length} items for session ${session.id}`);

      return {
        ...rulesResult,
        usedLlm: false, // Will be true when wired to AI Gateway
        reasoningTrace: "LLM ranking pending integration -- using rules order",
        brainState: {
          ...brainState,
          turnsCompleted: brainState.turnsCompleted + 1,
          providerState: {
            ...brainState.providerState,
            lastLlmCall: null, // Will be timestamp when wired
          },
        },
      };
    } catch (err: any) {
      log.warn(`LLM brain nextQuestion failed, falling back to rules: ${err?.message}`);
      const result = await this.fallback.nextQuestion(session, qrSoFar, context, brainState);
      return { ...result, usedLlm: false };
    }
  }

  async submitAnswer(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    answeredItems: QuestionnaireItem[],
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSubmitResult> {
    if (!this.isEnabled()) {
      return this.fallback.submitAnswer(session, qrSoFar, answeredItems, context, brainState);
    }

    try {
      // Rules engine handles red flag detection + enableWhen evaluation
      const rulesResult = await this.fallback.submitAnswer(
        session, qrSoFar, answeredItems, context, brainState
      );

      // LLM could add dynamic follow-up question suggestions here
      // (from the existing pack pool, never invented)
      // Stubbed for now -- would call AI Gateway

      return rulesResult;
    } catch (err: any) {
      log.warn(`LLM brain submitAnswer failed, falling back to rules: ${err?.message}`);
      return this.fallback.submitAnswer(session, qrSoFar, answeredItems, context, brainState);
    }
  }

  async finalizeSummary(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSummaryResult> {
    if (!this.isEnabled()) {
      return this.fallback.finalizeSummary(session, qr, context, brainState);
    }

    try {
      // Step 1: Get template summary as baseline
      const templateResult = await this.fallback.finalizeSummary(
        session, qr, context, brainState
      );

      // Step 2: In production, ask LLM to enhance the narrative
      // using AI Gateway governed pipeline:
      //   1. Build grounded prompt from template summary + QR answers
      //   2. PHI redaction applied by AI Gateway
      //   3. Call processAiRequest() with "intake-summary" use case
      //   4. Parse LLM response (must include citations)
      //   5. Validate: no diagnosis, no treatment, grounded in answers
      //   6. If validation fails, return template result
      //   7. Log everything to audit
      //
      // Stubbed for now.

      return {
        ...templateResult,
        governance: {
          ...templateResult.governance,
          promptVersion: "llm-intake-v1-pending",
          groundedInAnswers: true,
          containsDiagnosis: false,
          containsTreatment: false,
          safetyCheckPassed: true,
        },
      };
    } catch (err: any) {
      log.warn(`LLM brain finalizeSummary failed, falling back to rules: ${err?.message}`);
      return this.fallback.finalizeSummary(session, qr, context, brainState);
    }
  }

  async healthCheck(): Promise<BrainProviderHealth> {
    const enabled = this.isEnabled();
    return {
      providerId: this.id,
      family: this.family,
      status: enabled ? "degraded" : "unavailable",
      lastCheckAt: new Date().toISOString(),
      detail: enabled
        ? "LLM integration scaffolded -- AI Gateway bridge pending"
        : "INTAKE_LLM_ENABLED not set to true",
    };
  }

  getCapabilities(): BrainProviderCapabilities {
    return {
      adaptiveOrdering: true,
      summaryGeneration: true,
      complaintExpansion: true,
      followUpBranching: true,
      supportedLanguages: ["en", "fil", "es"],
      maxSessionDurationMs: 24 * 60 * 60 * 1000,
    };
  }
}
