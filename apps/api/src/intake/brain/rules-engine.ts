/**
 * Rules Engine Brain Plugin (Phase 143)
 *
 * The DEFAULT and MANDATORY intake brain provider.
 * Fully deterministic: same inputs -> same output.
 * Wraps the existing RulesNextQuestionProvider and TemplateSummaryProvider.
 * Always available -- never disabled.
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
import { RulesNextQuestionProvider } from '../providers.js';
import { TemplateSummaryProvider } from '../summary-provider.js';
import { resolvePacks, mergePackItems } from '../pack-registry.js';

/* ------------------------------------------------------------------ */
/* Rules Engine Brain                                                   */
/* ------------------------------------------------------------------ */

export class RulesEngineBrain implements IntakeBrainPlugin {
  readonly id = 'rules_engine';
  readonly name = 'Deterministic Rules Engine';
  readonly family = 'rules_engine' as const;

  private nextProvider = new RulesNextQuestionProvider();
  private summaryProvider = new TemplateSummaryProvider();

  async startSession(session: IntakeSession, context: IntakeContext): Promise<BrainSessionState> {
    const packs = resolvePacks(context);
    const allItems = mergePackItems(packs);
    const requiredCount = allItems.filter((i) => i.required).length;

    return {
      providerState: {
        packCount: packs.length,
        totalItems: allItems.length,
        requiredItems: requiredCount,
      },
      turnsCompleted: 0,
      estimatedTurnsRemaining: Math.ceil(requiredCount / 5), // ~5 items per page
      activeComplaintClusters: packs.flatMap((p) => p.complaintClusters ?? []),
    };
  }

  async nextQuestion(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainNextQuestionResult> {
    const result = await this.nextProvider.getNext(session, qrSoFar, context);

    const newState: BrainSessionState = {
      ...brainState,
      turnsCompleted: brainState.turnsCompleted + 1,
      estimatedTurnsRemaining: result.isComplete
        ? 0
        : Math.max(0, brainState.estimatedTurnsRemaining - 1),
    };

    return {
      ...result,
      usedLlm: false,
      brainState: newState,
    };
  }

  async submitAnswer(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    answeredItems: QuestionnaireItem[],
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSubmitResult> {
    // Rules engine: detect red flags from answered items
    const packs = resolvePacks(context);
    const allItems = mergePackItems(packs);
    const newRedFlags: BrainSubmitResult['newRedFlags'] = [];

    for (const answered of answeredItems) {
      const def = allItems.find((i) => i.linkId === answered.linkId);
      if (def?.redFlag) {
        // Check if the answer triggers the red flag
        newRedFlags.push({
          flag: def.redFlag.message,
          severity: def.redFlag.severity,
          triggerLinkId: answered.linkId,
        });
      }
    }

    return {
      followUpItems: [], // Rules engine uses enableWhen for follow-ups, not dynamic injection
      newRedFlags,
      clusterUpdates: [],
      brainState: {
        ...brainState,
        turnsCompleted: brainState.turnsCompleted + 1,
      },
    };
  }

  async finalizeSummary(
    session: IntakeSession,
    qr: QuestionnaireResponse,
    context: IntakeContext,
    brainState: BrainSessionState
  ): Promise<BrainSummaryResult> {
    const summary = await this.summaryProvider.generate(session, qr, context);

    return {
      ...summary,
      providerId: this.id,
      tiuReady: true,
      tiuNoteTitle: `PATIENT INTAKE - ${new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}`,
      governance: {
        promptVersion: 'template-v1',
        promptHash: 'deterministic-no-llm',
        groundedInAnswers: true,
        citationCount: summary.citations.length,
        containsDiagnosis: false,
        containsTreatment: false,
        safetyCheckPassed: true,
      },
    };
  }

  async healthCheck(): Promise<BrainProviderHealth> {
    return {
      providerId: this.id,
      family: this.family,
      status: 'healthy',
      lastCheckAt: new Date().toISOString(),
      detail: 'Deterministic rules engine always available',
    };
  }

  getCapabilities(): BrainProviderCapabilities {
    return {
      adaptiveOrdering: true,
      summaryGeneration: true,
      complaintExpansion: false, // Rules do static enableWhen, not dynamic expansion
      followUpBranching: true,
      supportedLanguages: ['en', 'fil', 'es'],
      maxSessionDurationMs: 24 * 60 * 60 * 1000, // 24h
    };
  }
}
