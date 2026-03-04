/**
 * Intake OS - Pack Registry & Context Resolver (Phase 28)
 *
 * Loads all intake packs and resolves which packs apply to a given context.
 * Packs are loaded from the packs/ directory at startup.
 */

import type { IntakePack, IntakeContext, QuestionnaireItem } from './types.js';

/* ------------------------------------------------------------------ */
/* Registry                                                             */
/* ------------------------------------------------------------------ */

const packRegistry = new Map<string, IntakePack>();

export function registerPack(pack: IntakePack): void {
  packRegistry.set(pack.packId, pack);
}

export function getPack(packId: string): IntakePack | undefined {
  return packRegistry.get(packId);
}

export function getAllPacks(): IntakePack[] {
  return Array.from(packRegistry.values());
}

export function getPackCount(): number {
  return packRegistry.size;
}

/* ------------------------------------------------------------------ */
/* Context Resolver                                                     */
/* ------------------------------------------------------------------ */

/**
 * Given a clinical context, return an ordered list of applicable packs.
 * Ordering: priority (lower first), then by specificity of match.
 */
export function resolvePacks(context: IntakeContext): IntakePack[] {
  const all = getAllPacks();
  const scored: { pack: IntakePack; score: number }[] = [];

  for (const pack of all) {
    let score = 0;
    const ctx = pack.applicableContexts;

    // Normalize: support both singular and plural keys
    const depts = ctx.department ?? ctx.departments ?? [];
    const specs = ctx.specialty ?? ctx.specialties ?? [];
    const vtypes = ctx.visitType ?? ctx.visitTypes ?? [];

    // Department match
    if (context.department && depts.length) {
      if (depts.includes(context.department)) score += 10;
      else if (depts.includes('*')) score += 2;
      else continue; // Pack explicitly lists departments and this one doesn't match
    }

    // Specialty match
    if (context.specialty && specs.length) {
      if (specs.includes(context.specialty)) score += 10;
      else if (specs.includes('*')) score += 2;
      else continue;
    }

    // Visit type match
    if (context.visitType && vtypes.length) {
      if (vtypes.includes(context.visitType)) score += 5;
      else if (vtypes.includes('*')) score += 1;
    }

    // Chief complaint cluster match (from pack complaintClusters or context chiefComplaints)
    if (context.chiefComplaint && (pack.complaintClusters?.length || ctx.chiefComplaints?.length)) {
      const cc = context.chiefComplaint.toLowerCase();
      const clusters = [...(pack.complaintClusters ?? []), ...(ctx.chiefComplaints ?? [])];
      const match = clusters.some((c) => cc.includes(c.toLowerCase()));
      if (match) score += 15;
    }

    // Universal packs always included (no filtering criteria)
    const isUniversal = !depts.length && !specs.length && !vtypes.length;
    if (isUniversal) score += 1;

    // Age/sex gating (peds packs need age)
    if (pack.specialtyTags?.includes('pediatrics') && context.age !== undefined) {
      if (context.age >= 18) continue; // skip peds pack for adults
    }
    if (pack.specialtyTags?.includes('adult_only') && context.age !== undefined) {
      if (context.age < 18) continue;
    }

    // OB/GYN gating
    if (pack.specialtyTags?.includes('ob_gyn')) {
      if (context.sex === 'M') continue;
    }

    scored.push({ pack, score });
  }

  // Sort by priority (lower first), then score (higher first)
  scored.sort((a, b) => {
    if (a.pack.priority !== b.pack.priority) return a.pack.priority - b.pack.priority;
    return b.score - a.score;
  });

  return scored.map((s) => s.pack);
}

/**
 * Merge items from all resolved packs, deduplicating by linkId.
 * Items are grouped by section in deterministic order.
 */
export function mergePackItems(packs: IntakePack[]): QuestionnaireItem[] {
  const seen = new Set<string>();

  // Section ordering
  const sectionOrder = [
    'demographics',
    'chief_complaint',
    'hpi',
    'ros',
    'pmh',
    'fh',
    'sh',
    'medications',
    'allergies',
    'vitals',
    'screening',
    'custom',
  ];

  // Collect all items
  const allItems: QuestionnaireItem[] = [];
  for (const pack of packs) {
    for (const item of pack.items) {
      if (!seen.has(item.linkId)) {
        seen.add(item.linkId);
        allItems.push(item);
      }
    }
  }

  // Sort by section order, then by original position
  allItems.sort((a, b) => {
    const aIdx = sectionOrder.indexOf(a.section ?? 'custom');
    const bIdx = sectionOrder.indexOf(b.section ?? 'custom');
    return aIdx - bIdx;
  });

  return allItems;
}

/**
 * Compute required coverage union from all resolved packs.
 */
export function computeRequiredCoverage(packs: IntakePack[]): string[] {
  const coverage = new Set<string>();
  for (const pack of packs) {
    for (const c of pack.requiredCoverage) coverage.add(c);
  }
  return Array.from(coverage);
}
