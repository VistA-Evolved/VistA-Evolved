/**
 * Phase 165 — Specialty Coverage Score + QA Ladder Extension
 *
 * Per-specialty scoring engine. Scores each of the 45 specialties on:
 *   1. Pack existence  (does a specialty pack exist?)         — 25 pts
 *   2. Template count  (≥3 templates in the pack)             — 25 pts
 *   3. Field coverage  (avg fields-per-template ≥ 5)          — 25 pts
 *   4. Section depth   (avg sections-per-template ≥ 3)        — 25 pts
 *
 * Produces a 0–100 numeric score per specialty plus an aggregate.
 */

import { SPECIALTY_TAGS, type SpecialtyTag } from './types.js';
import { getAllSpecialtyPacks } from './specialty-packs.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SpecialtyScore {
  specialty: SpecialtyTag;
  score: number; // 0–100
  grade: LetterGrade;
  packExists: boolean;
  templateCount: number;
  avgFieldsPerTemplate: number;
  avgSectionsPerTemplate: number;
  breakdown: {
    packExistence: number; // 0 | 25
    templateCount: number; // 0–25
    fieldCoverage: number; // 0–25
    sectionDepth: number; // 0–25
  };
}

export interface CoverageReport {
  generatedAt: string;
  totalSpecialties: number;
  scoredSpecialties: number;
  overallScore: number; // weighted average 0–100
  overallGrade: LetterGrade;
  distribution: Record<LetterGrade, number>;
  specialties: SpecialtyScore[];
  gaps: SpecialtyScore[]; // specialties scoring < 50
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function scoreToGrade(score: number): LetterGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Core Scorer ─────────────────────────────────────────────────────────────

/**
 * Score a single specialty based on its pack data.
 */
export function scoreSpecialty(
  specialty: SpecialtyTag,
  pack: { templates: { sections?: { fields?: unknown[] }[] }[] } | null
): SpecialtyScore {
  if (!pack || pack.templates.length === 0) {
    return {
      specialty,
      score: 0,
      grade: 'F',
      packExists: false,
      templateCount: 0,
      avgFieldsPerTemplate: 0,
      avgSectionsPerTemplate: 0,
      breakdown: { packExistence: 0, templateCount: 0, fieldCoverage: 0, sectionDepth: 0 },
    };
  }

  const templates = pack.templates;
  const templateCount = templates.length;

  // Dimension 1: pack existence (binary)
  const packExistence = 25;

  // Dimension 2: template count (linear 1–3 → 0–25)
  const templateCountScore = clamp(Math.round((templateCount / 3) * 25), 0, 25);

  // Dimension 3: avg fields per template (linear 1–5 → 0–25)
  const totalFields = templates.reduce((sum, t) => {
    const sections = t.sections ?? [];
    return sum + sections.reduce((s, sec) => s + (sec.fields?.length ?? 0), 0);
  }, 0);
  const avgFields = templateCount > 0 ? totalFields / templateCount : 0;
  const fieldCoverage = clamp(Math.round((avgFields / 5) * 25), 0, 25);

  // Dimension 4: avg sections per template (linear 1–3 → 0–25)
  const totalSections = templates.reduce((sum, t) => sum + (t.sections?.length ?? 0), 0);
  const avgSections = templateCount > 0 ? totalSections / templateCount : 0;
  const sectionDepth = clamp(Math.round((avgSections / 3) * 25), 0, 25);

  const score = packExistence + templateCountScore + fieldCoverage + sectionDepth;
  return {
    specialty,
    score,
    grade: scoreToGrade(score),
    packExists: true,
    templateCount,
    avgFieldsPerTemplate: Math.round(avgFields * 10) / 10,
    avgSectionsPerTemplate: Math.round(avgSections * 10) / 10,
    breakdown: { packExistence, templateCount: templateCountScore, fieldCoverage, sectionDepth },
  };
}

// ─── Report Builder ──────────────────────────────────────────────────────────

let cachedReport: CoverageReport | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export function generateCoverageReport(force = false): CoverageReport {
  const now = Date.now();
  if (!force && cachedReport && now - cachedAt < CACHE_TTL_MS) {
    return cachedReport;
  }

  const allPacks = getAllSpecialtyPacks();
  const packMap = new Map<string, (typeof allPacks)[number]>();
  for (const p of allPacks) {
    packMap.set(p.specialty, p);
  }

  const specialties: SpecialtyScore[] = SPECIALTY_TAGS.map((tag) => {
    const pack = packMap.get(tag) ?? null;
    return scoreSpecialty(tag, pack as any);
  });

  const totalSpecialties = SPECIALTY_TAGS.length;
  const scoredSpecialties = specialties.filter((s) => s.packExists).length;
  const overallScore =
    totalSpecialties > 0
      ? Math.round(specialties.reduce((sum, s) => sum + s.score, 0) / totalSpecialties)
      : 0;

  const distribution: Record<LetterGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const s of specialties) {
    distribution[s.grade]++;
  }

  const gaps = specialties.filter((s) => s.score < 50).sort((a, b) => a.score - b.score);

  const report: CoverageReport = {
    generatedAt: new Date().toISOString(),
    totalSpecialties,
    scoredSpecialties,
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    distribution,
    specialties,
    gaps,
  };

  cachedReport = report;
  cachedAt = now;
  return report;
}

/**
 * Reset the coverage report cache (for testing).
 */
export function resetCoverageCache(): void {
  cachedReport = null;
  cachedAt = 0;
}
