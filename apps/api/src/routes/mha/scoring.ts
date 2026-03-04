/**
 * MHA Scoring Engine — Phase 535
 *
 * Server-side scoring for standardized MH instruments.
 * Each instrument has a registered scorer that computes total score
 * and severity level from FHIR QuestionnaireResponse-style answers.
 */

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface MhaAnswer {
  linkId: string;
  value: string; // numeric code as string (e.g. "0", "1", "2", "3")
}

export interface MhaScoreResult {
  instrumentId: string;
  totalScore: number;
  maxScore: number;
  severity: string;
  interpretation: string;
  redFlag: boolean;
  redFlagReason?: string;
  itemScores: Array<{ linkId: string; score: number }>;
}

export interface ScoringRule {
  instrumentId: string;
  maxScore: number;
  thresholds: Array<{ min: number; max: number; severity: string; interpretation: string }>;
  redFlagItems?: string[]; // linkId items that trigger red flag if score > 0
}

/* ------------------------------------------------------------------ */
/* Scoring rules                                                        */
/* ------------------------------------------------------------------ */

const SCORING_RULES: Record<string, ScoringRule> = {
  'phq-9': {
    instrumentId: 'phq-9',
    maxScore: 27,
    thresholds: [
      { min: 0, max: 4, severity: 'minimal', interpretation: 'Minimal depression' },
      { min: 5, max: 9, severity: 'mild', interpretation: 'Mild depression' },
      { min: 10, max: 14, severity: 'moderate', interpretation: 'Moderate depression' },
      {
        min: 15,
        max: 19,
        severity: 'moderately-severe',
        interpretation: 'Moderately severe depression',
      },
      { min: 20, max: 27, severity: 'severe', interpretation: 'Severe depression' },
    ],
    redFlagItems: ['phq9-9'], // suicidal ideation item
  },
  'gad-7': {
    instrumentId: 'gad-7',
    maxScore: 21,
    thresholds: [
      { min: 0, max: 4, severity: 'minimal', interpretation: 'Minimal anxiety' },
      { min: 5, max: 9, severity: 'mild', interpretation: 'Mild anxiety' },
      { min: 10, max: 14, severity: 'moderate', interpretation: 'Moderate anxiety' },
      { min: 15, max: 21, severity: 'severe', interpretation: 'Severe anxiety' },
    ],
  },
  'pcl-5': {
    instrumentId: 'pcl-5',
    maxScore: 80,
    thresholds: [
      { min: 0, max: 30, severity: 'below-threshold', interpretation: 'Below clinical threshold' },
      {
        min: 31,
        max: 32,
        severity: 'borderline',
        interpretation: 'Borderline -- consider further evaluation',
      },
      {
        min: 33,
        max: 80,
        severity: 'probable-ptsd',
        interpretation: 'Probable PTSD -- clinical evaluation recommended',
      },
    ],
  },
  'c-ssrs': {
    instrumentId: 'c-ssrs',
    maxScore: 6,
    thresholds: [
      { min: 0, max: 0, severity: 'no-risk', interpretation: 'No identified risk' },
      {
        min: 1,
        max: 2,
        severity: 'low',
        interpretation: 'Low risk -- wish to be dead or non-specific thoughts',
      },
      {
        min: 3,
        max: 4,
        severity: 'moderate',
        interpretation: 'Moderate risk -- method or intent identified',
      },
      {
        min: 5,
        max: 6,
        severity: 'high',
        interpretation: 'High risk -- plan with intent or recent behavior',
      },
    ],
    redFlagItems: ['cssrs-2', 'cssrs-3', 'cssrs-4', 'cssrs-5', 'cssrs-6'],
  },
  'audit-c': {
    instrumentId: 'audit-c',
    maxScore: 12,
    thresholds: [
      { min: 0, max: 2, severity: 'low-risk', interpretation: 'Low risk drinking' },
      {
        min: 3,
        max: 3,
        severity: 'at-risk-female',
        interpretation: 'At-risk drinking (female threshold)',
      },
      { min: 4, max: 7, severity: 'at-risk', interpretation: 'At-risk drinking' },
      { min: 8, max: 12, severity: 'high-risk', interpretation: 'High-risk or dependent drinking' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Score computation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compute score for a completed instrument.
 * Returns null if instrument scoring rules not found.
 */
export function scoreInstrument(instrumentId: string, answers: MhaAnswer[]): MhaScoreResult | null {
  const rule = SCORING_RULES[instrumentId];
  if (!rule) return null;

  const itemScores: Array<{ linkId: string; score: number }> = [];
  let totalScore = 0;

  for (const answer of answers) {
    const score = parseInt(answer.value, 10);
    const itemScore = isNaN(score) ? 0 : score;
    itemScores.push({ linkId: answer.linkId, score: itemScore });
    totalScore += itemScore;
  }

  // Clamp to max
  if (totalScore > rule.maxScore) totalScore = rule.maxScore;

  // Determine severity
  let severity = 'unknown';
  let interpretation = 'Unable to determine severity';
  for (const t of rule.thresholds) {
    if (totalScore >= t.min && totalScore <= t.max) {
      severity = t.severity;
      interpretation = t.interpretation;
      break;
    }
  }

  // Red flag check
  let redFlag = false;
  let redFlagReason: string | undefined;
  if (rule.redFlagItems) {
    for (const rfLinkId of rule.redFlagItems) {
      const rfAnswer = itemScores.find((i) => i.linkId === rfLinkId);
      if (rfAnswer && rfAnswer.score > 0) {
        redFlag = true;
        redFlagReason = `Positive response on safety item: ${rfLinkId}`;
        break;
      }
    }
  }

  return {
    instrumentId,
    totalScore,
    maxScore: rule.maxScore,
    severity,
    interpretation,
    redFlag,
    redFlagReason,
    itemScores,
  };
}

/**
 * Get all supported instrument IDs.
 */
export function getSupportedInstrumentIds(): string[] {
  return Object.keys(SCORING_RULES);
}

/**
 * Check if an instrument has scoring rules.
 */
export function hasScoringRule(instrumentId: string): boolean {
  return instrumentId in SCORING_RULES;
}
