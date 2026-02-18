/**
 * Intake OS - Rules-Based Next Question Provider (Phase 28)
 *
 * DEFAULT provider. Fully deterministic: same inputs -> same output.
 * Uses pack registry + context resolver to determine next questions.
 * No external API calls; pure logic.
 */

import type {
  IntakeSession,
  QuestionnaireResponse,
  IntakeContext,
  NextQuestionResult,
  NextQuestionProvider,
  QuestionnaireItem,
  QRItem,
  EnableWhen,
} from "./types.js";
import { resolvePacks, mergePackItems, computeRequiredCoverage } from "./pack-registry.js";

/* ------------------------------------------------------------------ */
/* EnableWhen evaluator                                                 */
/* ------------------------------------------------------------------ */

function getAnswerValue(qr: QuestionnaireResponse, linkId: string): unknown {
  function findInItems(items: QRItem[]): unknown {
    for (const item of items) {
      if (item.linkId === linkId) {
        if (!item.answer?.length) return undefined;
        const a = item.answer[0];
        return (
          a.valueCoding?.code ??
          a.valueString ??
          a.valueInteger ??
          a.valueDecimal ??
          a.valueBoolean ??
          a.valueDate ??
          a.valueDateTime
        );
      }
      if (item.item) {
        const found = findInItems(item.item);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
  return findInItems(qr.item);
}

function evaluateEnableWhen(
  conditions: EnableWhen[],
  behavior: "all" | "any",
  qr: QuestionnaireResponse
): boolean {
  const results = conditions.map((cond) => {
    const val = getAnswerValue(qr, cond.question);
    switch (cond.operator) {
      case "=":
        return val === cond.answer;
      case "!=":
        return val !== cond.answer;
      case ">":
        return typeof val === "number" && typeof cond.answer === "number" && val > cond.answer;
      case "<":
        return typeof val === "number" && typeof cond.answer === "number" && val < cond.answer;
      case ">=":
        return typeof val === "number" && typeof cond.answer === "number" && val >= cond.answer;
      case "<=":
        return typeof val === "number" && typeof cond.answer === "number" && val <= cond.answer;
      case "exists":
        return cond.answer ? val !== undefined : val === undefined;
      default:
        return true;
    }
  });

  return behavior === "any" ? results.some(Boolean) : results.every(Boolean);
}

/* ------------------------------------------------------------------ */
/* Section coverage tracker                                             */
/* ------------------------------------------------------------------ */

function getAnsweredSections(
  allItems: QuestionnaireItem[],
  qr: QuestionnaireResponse
): Set<string> {
  const answeredLinkIds = new Set<string>();
  function collectAnswered(items: QRItem[]) {
    for (const item of items) {
      if (item.answer?.length) answeredLinkIds.add(item.linkId);
      if (item.item) collectAnswered(item.item);
    }
  }
  collectAnswered(qr.item);

  const sections = new Set<string>();
  for (const item of allItems) {
    if (!item.section) continue;
    if (!item.required) continue;
    // A section is "complete" if all required items in it are answered
    const sectionItems = allItems.filter(
      (i) => i.section === item.section && i.required
    );
    const allAnswered = sectionItems.every((i) => answeredLinkIds.has(i.linkId));
    if (allAnswered && sectionItems.length > 0) {
      sections.add(item.section);
    }
  }

  return sections;
}

/* ------------------------------------------------------------------ */
/* Provider implementation                                              */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 5; // Number of questions per adaptive step

export class RulesNextQuestionProvider implements NextQuestionProvider {
  async getNext(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<NextQuestionResult> {
    // 1. Resolve packs for this context
    const packs = resolvePacks(context);
    const allItems = mergePackItems(packs);
    const requiredCoverage = computeRequiredCoverage(packs);

    // 2. Find answered linkIds
    const answeredIds = new Set<string>();
    function collectIds(items: QRItem[]) {
      for (const item of items) {
        if (item.answer?.length) answeredIds.add(item.linkId);
        if (item.item) collectIds(item.item);
      }
    }
    collectIds(qrSoFar.item);

    // 3. Filter to unanswered, enabled items
    const eligible = allItems.filter((item) => {
      // Skip already answered
      if (answeredIds.has(item.linkId)) return false;

      // Skip display-only items
      if (item.type === "display") return false;

      // Evaluate enableWhen conditions
      if (item.enableWhen?.length) {
        const enabled = evaluateEnableWhen(
          item.enableWhen,
          item.enableBehavior ?? "all",
          qrSoFar
        );
        if (!enabled) return false;
      }

      return true;
    });

    // 4. Compute progress
    const answeredSections = getAnsweredSections(allItems, qrSoFar);
    const totalRequired = allItems.filter((i) => i.required).length;
    const answeredRequired = allItems.filter(
      (i) => i.required && answeredIds.has(i.linkId)
    ).length;
    const percentComplete =
      totalRequired > 0 ? Math.round((answeredRequired / totalRequired) * 100) : 100;
    const coverageRemaining = requiredCoverage.filter(
      (c) => !answeredSections.has(c)
    );

    // 5. Pick next batch (up to ITEMS_PER_PAGE)
    const nextItems = eligible.slice(0, ITEMS_PER_PAGE);
    const isComplete = eligible.length === 0 && coverageRemaining.length === 0;

    return {
      nextItems,
      progress: {
        percentComplete,
        sectionsComplete: Array.from(answeredSections),
        requiredCoverageRemaining: coverageRemaining,
      },
      containedQuestionnaire: {
        resourceType: "Questionnaire",
        item: nextItems,
      },
      isComplete,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Vendor Adapter Provider (STUB)                                       */
/* ------------------------------------------------------------------ */

export class VendorAdapterProvider implements NextQuestionProvider {
  async getNext(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<NextQuestionResult> {
    const apiKey = process.env.INTAKE_VENDOR_API_KEY;
    if (!apiKey) {
      // Fall back to rules
      return new RulesNextQuestionProvider().getNext(session, qrSoFar, context);
    }

    // STUB: In production, this would:
    // 1. Convert session/QR to vendor API format
    // 2. Call vendor endpoint
    // 3. Convert response back to NextQuestionResult
    // Never hardwired to one vendor - uses adapter pattern

    // For now, fall back to rules
    return new RulesNextQuestionProvider().getNext(session, qrSoFar, context);
  }
}

/* ------------------------------------------------------------------ */
/* LLM Constrained Provider (STUB)                                      */
/* ------------------------------------------------------------------ */

export class LLMConstrainedProvider implements NextQuestionProvider {
  async getNext(
    session: IntakeSession,
    qrSoFar: QuestionnaireResponse,
    context: IntakeContext
  ): Promise<NextQuestionResult> {
    const enabled = process.env.INTAKE_LLM_ENABLED === "true";
    const apiKey = process.env.INTAKE_LLM_API_KEY;

    if (!enabled || !apiKey) {
      return new RulesNextQuestionProvider().getNext(session, qrSoFar, context);
    }

    // STUB: In production, this would:
    // 1. Get eligible questions from rules provider
    // 2. Ask LLM to RANK (not invent) the eligible questions
    // 3. LLM must cite which answers caused the ranking
    // 4. Log LLM prompt + response (PHI-redacted) for audit
    // 5. Cannot invent new medical questions
    // 6. Falls back to rules on any LLM failure

    return new RulesNextQuestionProvider().getNext(session, qrSoFar, context);
  }
}

/* ------------------------------------------------------------------ */
/* Provider Factory                                                     */
/* ------------------------------------------------------------------ */

export function createNextQuestionProvider(
  providerName?: string
): NextQuestionProvider {
  const name = providerName ?? process.env.INTAKE_BRAIN_PROVIDER ?? "rules";
  switch (name) {
    case "vendor_adapter":
      return new VendorAdapterProvider();
    case "llm_constrained":
      return new LLMConstrainedProvider();
    case "rules":
    default:
      return new RulesNextQuestionProvider();
  }
}
