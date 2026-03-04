/**
 * Phase 165 — QA Ladder Extension for Specialty Coverage
 *
 * Extends the existing QA ladder framework with specialty-level
 * validation gates that produce numeric scores rather than binary
 * PASS/FAIL. Each gate checks a specific coverage dimension.
 */

import { SPECIALTY_TAGS, type SpecialtyTag } from './types.js';
import { generateCoverageReport, type LetterGrade, scoreToGrade } from './coverage-scorer.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type QaCheckStatus = 'pass' | 'warn' | 'fail';

export interface QaSpecialtyCheck {
  specialty: SpecialtyTag;
  hasPack: QaCheckStatus;
  hasMultipleTemplates: QaCheckStatus;
  hasSufficientFields: QaCheckStatus;
  hasSufficientSections: QaCheckStatus;
  overallStatus: QaCheckStatus;
  score: number;
}

export interface QaLadderResult {
  generatedAt: string;
  gateId: string;
  gateLabel: string;
  totalChecks: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  aggregateScore: number; // 0–100
  aggregateGrade: LetterGrade;
  status: QaCheckStatus;
  checks: QaSpecialtyCheck[];
}

// ─── Gate Logic ──────────────────────────────────────────────────────────────

function toStatus(condition: boolean, warnCondition?: boolean): QaCheckStatus {
  if (condition) return 'pass';
  if (warnCondition) return 'warn';
  return 'fail';
}

function worstStatus(...statuses: QaCheckStatus[]): QaCheckStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warn')) return 'warn';
  return 'pass';
}

/**
 * Run the specialty coverage QA ladder gate.
 *
 * Pass thresholds:
 *   - hasPack: pack exists → pass, else fail
 *   - hasMultipleTemplates: ≥3 → pass, ≥1 → warn, 0 → fail
 *   - hasSufficientFields: avgFields ≥5 → pass, ≥2 → warn, else fail
 *   - hasSufficientSections: avgSections ≥3 → pass, ≥1 → warn, else fail
 */
export function runSpecialtyCoverageGate(): QaLadderResult {
  const report = generateCoverageReport();
  const checks: QaSpecialtyCheck[] = [];

  for (const s of report.specialties) {
    const hasPack = toStatus(s.packExists);
    const hasMultipleTemplates = toStatus(s.templateCount >= 3, s.templateCount >= 1);
    const hasSufficientFields = toStatus(s.avgFieldsPerTemplate >= 5, s.avgFieldsPerTemplate >= 2);
    const hasSufficientSections = toStatus(
      s.avgSectionsPerTemplate >= 3,
      s.avgSectionsPerTemplate >= 1
    );

    checks.push({
      specialty: s.specialty,
      hasPack,
      hasMultipleTemplates,
      hasSufficientFields,
      hasSufficientSections,
      overallStatus: worstStatus(
        hasPack,
        hasMultipleTemplates,
        hasSufficientFields,
        hasSufficientSections
      ),
      score: s.score,
    });
  }

  const passCount = checks.filter((c) => c.overallStatus === 'pass').length;
  const warnCount = checks.filter((c) => c.overallStatus === 'warn').length;
  const failCount = checks.filter((c) => c.overallStatus === 'fail').length;

  const aggregateScore = report.overallScore;
  const status: QaCheckStatus =
    failCount > SPECIALTY_TAGS.length * 0.3
      ? 'fail'
      : warnCount > SPECIALTY_TAGS.length * 0.3
        ? 'warn'
        : 'pass';

  return {
    generatedAt: new Date().toISOString(),
    gateId: 'G-SPECIALTY-COVERAGE',
    gateLabel: 'Specialty Template Coverage',
    totalChecks: checks.length,
    passCount,
    warnCount,
    failCount,
    aggregateScore,
    aggregateGrade: scoreToGrade(aggregateScore),
    status,
    checks,
  };
}
