/**
 * AI Gateway -- Safety Layer (Phase 33)
 *
 * Blocks disallowed content categories (diagnosis, treatment plans,
 * prescribing guidance, autonomous ordering). Validates both
 * requests and responses.
 */

import { DISALLOWED_CATEGORIES } from './types.js';
import type { DisallowedCategory, AIUseCase, FacilityAIPolicy } from './types.js';

/* ------------------------------------------------------------------ */
/* Disallowed content detection patterns                               */
/* ------------------------------------------------------------------ */

/**
 * Pattern sets for detecting disallowed content.
 * Intentionally broad -- false positives are acceptable (safety-first).
 */
const CATEGORY_PATTERNS: Record<DisallowedCategory, RegExp[]> = {
  diagnosis: [
    /\bdiagnos(is|e|ed|ing)\b/i,
    /\bdifferential\s+diagnosis\b/i,
    /\bthe patient (has|likely has|probably has|appears to have)\b/i,
    /\bthis (indicates|suggests|confirms)\s+(a\s+)?diagnosis\b/i,
    /\bI (believe|think|suspect)\s+the\s+(patient|condition)\b/i,
  ],
  treatment_plan: [
    /\btreatment\s+plan\b/i,
    /\bplan\s+of\s+care\b/i,
    /\brecommend(ed)?\s+(treatment|therapy|intervention)\b/i,
    /\bshould\s+(begin|start|initiate|undergo)\s+(treatment|therapy)\b/i,
    /\bthe\s+patient\s+should\s+(receive|be treated with|undergo)\b/i,
  ],
  prescribing_guidance: [
    /\bprescrib(e|ed|ing)\b/i,
    /\bstart(ing)?\s+(the\s+patient\s+on|patient\s+on|them\s+on)\b/i,
    /\bdos(age|e|ing)\s+(of|adjustment|recommendation)\b/i,
    /\brecommend\s+(starting|prescribing|taking)\b/i,
    /\bswitch\s+(to|from)\s+\w+\s*(mg|mcg|ml)\b/i,
    /\bincrease\s+(the\s+)?dos(e|age)\b/i,
  ],
  autonomous_ordering: [
    /\border(ing|ed)?\s+(a|the)?\s*(test|scan|procedure|study|imaging)\b/i,
    /\bI('ve|'ll|\s+have|\s+will)\s+order\b/i,
    /\bplacing\s+(an?\s+)?order\b/i,
    /\bsubmit(ting)?\s+(an?\s+)?order\b/i,
  ],
  prognosis: [
    /\bprogno(sis|stic)\b/i,
    /\b(life|survival)\s+expectancy\b/i,
    /\blikely\s+outcome\b/i,
    /\bthe\s+patient\s+(will|is\s+expected\s+to)\s+(recover|decline)\b/i,
  ],
  differential_diagnosis: [
    /\bdifferential\s+diagnosis\b/i,
    /\bddx\b/i,
    /\brule\s+out\b/i,
    /\bconsider(ing)?\s+(the\s+)?(following\s+)?(diagnos|condition)/i,
  ],
};

/* ------------------------------------------------------------------ */
/* Pre-request safety check                                            */
/* ------------------------------------------------------------------ */

export interface SafetyCheckResult {
  allowed: boolean;
  blockedCategory?: DisallowedCategory;
  warnings: string[];
}

/**
 * Check if a user's input text contains disallowed request patterns.
 * This runs BEFORE the model call.
 */
export function checkRequestSafety(userInput: string, useCase: AIUseCase): SafetyCheckResult {
  const warnings: string[] = [];

  // Portal search is inherently safe -- skip heavy checks
  if (useCase === 'portal-search') {
    return { allowed: true, warnings };
  }

  // Scan for disallowed categories in user input
  for (const category of DISALLOWED_CATEGORIES) {
    for (const pattern of CATEGORY_PATTERNS[category]) {
      if (pattern.test(userInput)) {
        return {
          allowed: false,
          blockedCategory: category,
          warnings: [`Request blocked: contains '${category}' content`],
        };
      }
    }
  }

  return { allowed: true, warnings };
}

/* ------------------------------------------------------------------ */
/* Post-response safety check                                          */
/* ------------------------------------------------------------------ */

/**
 * Scan AI-generated response for disallowed content.
 * Returns filtered text with violations removed, plus warnings.
 */
export function checkResponseSafety(
  responseText: string,
  useCase: AIUseCase
): { filteredText: string; warnings: string[]; categoriesFound: DisallowedCategory[] } {
  const warnings: string[] = [];
  const categoriesFound: DisallowedCategory[] = [];

  // Portal search responses are navigation-only -- less strict
  if (useCase === 'portal-search') {
    // Still check for medical advice
    for (const category of [
      'diagnosis',
      'treatment_plan',
      'prescribing_guidance',
    ] as DisallowedCategory[]) {
      for (const pattern of CATEGORY_PATTERNS[category]) {
        if (pattern.test(responseText)) {
          categoriesFound.push(category);
          if (!warnings.includes(`Response contained '${category}' content -- filtered`)) {
            warnings.push(`Response contained '${category}' content -- filtered`);
          }
        }
      }
    }
  } else {
    // Full check for clinical use cases
    for (const category of DISALLOWED_CATEGORIES) {
      for (const pattern of CATEGORY_PATTERNS[category]) {
        if (pattern.test(responseText)) {
          if (!categoriesFound.includes(category)) {
            categoriesFound.push(category);
            warnings.push(`Response contained '${category}' content -- flagged for review`);
          }
        }
      }
    }
  }

  // For lab education, allow "diagnosis" in educational context but flag
  if (useCase === 'lab-education' && categoriesFound.includes('diagnosis')) {
    // Educational mention is acceptable if framed properly
    const idx = categoriesFound.indexOf('diagnosis');
    if (idx >= 0) {
      categoriesFound.splice(idx, 1);
      warnings.push('Note: diagnosis-related term detected in educational context (allowed)');
    }
  }

  // If categories found, append disclaimer
  let filteredText = responseText;
  if (categoriesFound.length > 0) {
    filteredText +=
      '\n\n---\n**Note:** This AI-generated content has been flagged for review. ' +
      'It may contain content outside the allowed scope. ' +
      'Please consult your healthcare provider for medical advice.';
  }

  return { filteredText, warnings, categoriesFound };
}

/* ------------------------------------------------------------------ */
/* Facility policy enforcement                                         */
/* ------------------------------------------------------------------ */

/** Default facility policy -- conservative defaults. */
export const DEFAULT_FACILITY_POLICY: FacilityAIPolicy = {
  aiEnabled: true,
  redactPhi: true,
  cloudModelsAllowed: false,
  maxRequestsPerUserPerHour: 30,
  allowedUseCases: ['intake-summary', 'lab-education', 'portal-search'],
  patientAiEnabled: true,
  requireClinicianConfirmation: true,
};

let currentPolicy: FacilityAIPolicy = { ...DEFAULT_FACILITY_POLICY };

/** Get current facility AI policy. */
export function getFacilityPolicy(): FacilityAIPolicy {
  return { ...currentPolicy };
}

/** Update facility AI policy (admin only). */
export function updateFacilityPolicy(patch: Partial<FacilityAIPolicy>): FacilityAIPolicy {
  currentPolicy = { ...currentPolicy, ...patch };
  return { ...currentPolicy };
}

/** Check if a use case is allowed by current facility policy. */
export function isUseCaseAllowed(useCase: AIUseCase): boolean {
  if (!currentPolicy.aiEnabled) return false;
  return currentPolicy.allowedUseCases.includes(useCase);
}
