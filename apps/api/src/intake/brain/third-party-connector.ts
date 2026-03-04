/**
 * Third-Party Connector Brain Plugin (Phase 143)
 *
 * Scaffold for external API adapters such as:
 *   - Instant Medical History (IMH)
 *   - Phreesia
 *   - Custom facility-registered adapters
 *
 * Each 3P connector translates the IntakeBrainPlugin interface
 * to the vendor's API format. Falls back to rules on any failure.
 *
 * Key constraints:
 *   - Vendor API keys via env vars (never hardcoded)
 *   - PHI handling per vendor agreement
 *   - All interactions audited
 *   - Falls back to rules_engine on any failure
 */

import type {
  IntakeBrainPlugin,
  BrainProviderHealth,
  BrainProviderCapabilities,
  BrainSessionState,
  BrainNextQuestionResult,
  BrainSubmitResult,
  BrainSummaryResult,
} from './types.js';
import type {
  IntakeSession,
  QuestionnaireResponse,
  IntakeContext,
  QuestionnaireItem,
} from '../types.js';
import { RulesEngineBrain } from './rules-engine.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Third-Party Connector Interface                                      */
/* ------------------------------------------------------------------ */

/**
 * Adapter interface for a specific vendor integration.
 * Implementors translate between our types and the vendor's API.
 */
export interface ThirdPartyAdapter {
  /** Vendor identifier */
  vendorId: string;
  /** Vendor display name */
  vendorName: string;
  /** Whether the adapter is configured (has API keys etc.) */
  isConfigured(): boolean;
  /** Vendor-specific health check */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

/* ------------------------------------------------------------------ */
/* Third-Party Brain Plugin                                             */
/* ------------------------------------------------------------------ */

export class ThirdPartyBrainPlugin implements IntakeBrainPlugin {
  readonly id: string;
  readonly name: string;
  readonly family = 'third_party' as const;

  private fallback = new RulesEngineBrain();
  private variant: string;

  constructor(variant: string = 'stub') {
    this.variant = variant;
    this.id = `third_party:${variant}`;
    this.name = `Third-Party Connector (${variant})`;
  }

  private isConfigured(): boolean {
    const envKey = `INTAKE_3P_${this.variant.toUpperCase()}_API_KEY`;
    return !!process.env[envKey];
  }

  async startSession(session: IntakeSession, context: IntakeContext): Promise<BrainSessionState> {
    const base = await this.fallback.startSession(session, context);
    return {
      ...base,
      providerState: {
        ...base.providerState,
        thirdPartyConfigured: this.isConfigured(),
        variant: this.variant,
        vendorSessionId: null,
      },
    };
  }

  async nextQuestion(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainNextQuestionResult> {
    if (!this.isConfigured()) {
      log.info(`3P connector ${this.variant} not configured, using rules engine`);
      const result = await this.fallback.nextQuestion(session, qrSoFar, context, brainState);
      return { ...result, usedLlm: false };
    }

    try {
      // In production, this would:
      // 1. Call vendor API with session context
      // 2. Convert vendor questions to QuestionnaireItem format
      // 3. Return merged result
      // Falls back to rules on failure

      log.info(`3P connector ${this.variant}: integration pending`);
      const result = await this.fallback.nextQuestion(session, qrSoFar, context, brainState);
      return {
        ...result,
        usedLlm: false,
        reasoningTrace: `Third-party ${this.variant} integration pending`,
      };
    } catch (err: any) {
      log.warn(`3P connector ${this.variant} nextQuestion failed: ${err?.message}`);
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
    if (!this.isConfigured()) {
      return this.fallback.submitAnswer(session, qrSoFar, answeredItems, context, brainState);
    }

    try {
      // Vendor-specific answer processing would go here
      return this.fallback.submitAnswer(session, qrSoFar, answeredItems, context, brainState);
    } catch (err: any) {
      log.warn(`3P connector ${this.variant} submitAnswer failed: ${err?.message}`);
      return this.fallback.submitAnswer(session, qrSoFar, answeredItems, context, brainState);
    }
  }

  async finalizeSummary(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSummaryResult> {
    if (!this.isConfigured()) {
      return this.fallback.finalizeSummary(session, qr, context, brainState);
    }

    try {
      // Vendor-specific summary generation would go here
      const result = await this.fallback.finalizeSummary(session, qr, context, brainState);
      return {
        ...result,
        providerId: this.id,
        governance: {
          ...result.governance,
          promptVersion: `3p-${this.variant}-pending`,
        },
      };
    } catch (err: any) {
      log.warn(`3P connector ${this.variant} finalizeSummary failed: ${err?.message}`);
      return this.fallback.finalizeSummary(session, qr, context, brainState);
    }
  }

  async healthCheck(): Promise<BrainProviderHealth> {
    const configured = this.isConfigured();
    return {
      providerId: this.id,
      family: this.family,
      status: configured ? 'degraded' : 'unavailable',
      lastCheckAt: new Date().toISOString(),
      detail: configured
        ? `Third-party ${this.variant} configured -- integration pending`
        : `INTAKE_3P_${this.variant.toUpperCase()}_API_KEY not set`,
    };
  }

  getCapabilities(): BrainProviderCapabilities {
    return {
      adaptiveOrdering: false, // depends on vendor
      summaryGeneration: false, // depends on vendor
      complaintExpansion: false,
      followUpBranching: false,
      supportedLanguages: ['en'],
      maxSessionDurationMs: 24 * 60 * 60 * 1000,
    };
  }
}
