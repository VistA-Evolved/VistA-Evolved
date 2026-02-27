/**
 * Phase 167: Specialty Pack Hardening — Artifact Rubrics & Validators
 *
 * Defines minimum required artifacts per clinical setting and enforces
 * them against specialty packs. Each rubric specifies required sections,
 * minimum field counts, and mandatory template types.
 *
 * Rubric sources:
 *   - CMS E&M 1995/1997 Guidelines (outpatient)
 *   - Joint Commission RC.01.01.01 (inpatient documentation)
 *   - ACEP Clinical Policy (ED)
 */

import type { TemplateSetting, ClinicalTemplate, TemplateSection } from "./types.js";
import { getAllSpecialtyPacks } from "./specialty-packs.js";
import { listTemplates } from "./template-engine.js";

/** Minimal template shape needed for validation (works with both ClinicalTemplate and TemplateInput) */
type ValidatableTemplate = Pick<ClinicalTemplate, "name" | "sections"> & { setting?: TemplateSetting };

// ── Rubric Definitions ──────────────────────────────────────

export interface ArtifactRequirement {
  /** Section ID or template type that must be present */
  artifact: string;
  /** Human-readable description */
  description: string;
  /** Minimum fields in this section (0 = just needs to exist) */
  minFields: number;
  /** Whether this is required (vs recommended) */
  required: boolean;
}

export interface SettingRubric {
  setting: TemplateSetting;
  label: string;
  requiredSections: ArtifactRequirement[];
  minTemplates: number;
  minSectionsPerTemplate: number;
  minFieldsPerTemplate: number;
}

export interface PackValidationResult {
  specialty: string;
  setting: TemplateSetting;
  passed: boolean;
  score: number; // 0-100
  missingArtifacts: string[];
  warnings: string[];
  details: {
    templateCount: number;
    requiredTemplates: number;
    sectionsCovered: string[];
    sectionsMissing: string[];
    avgFieldsPerTemplate: number;
  };
}

export interface ValidationReport {
  generatedAt: string;
  totalPacks: number;
  totalPassed: number;
  totalFailed: number;
  results: PackValidationResult[];
}

// ── Rubrics per Setting ─────────────────────────────────────

export const OUTPATIENT_RUBRIC: SettingRubric = {
  setting: "outpatient",
  label: "Outpatient Visit",
  requiredSections: [
    { artifact: "hpi", description: "History of Present Illness", minFields: 4, required: true },
    { artifact: "ros", description: "Review of Systems", minFields: 6, required: true },
    { artifact: "pe", description: "Physical Examination", minFields: 4, required: true },
    { artifact: "assessment", description: "Assessment & Plan", minFields: 2, required: true },
    { artifact: "medications", description: "Medication List", minFields: 1, required: false },
    { artifact: "followup", description: "Follow-up Plan", minFields: 1, required: false },
  ],
  minTemplates: 1,
  minSectionsPerTemplate: 3,
  minFieldsPerTemplate: 5,
};

export const INPATIENT_RUBRIC: SettingRubric = {
  setting: "inpatient",
  label: "Inpatient Stay",
  requiredSections: [
    { artifact: "hpi", description: "History of Present Illness", minFields: 4, required: true },
    { artifact: "assessment", description: "Assessment & Plan", minFields: 2, required: true },
    { artifact: "medications", description: "Medication List / Reconciliation", minFields: 1, required: true },
    { artifact: "pe", description: "Physical Examination", minFields: 3, required: false },
    { artifact: "ros", description: "Review of Systems", minFields: 4, required: false },
  ],
  minTemplates: 1,
  minSectionsPerTemplate: 2,
  minFieldsPerTemplate: 4,
};

export const ED_RUBRIC: SettingRubric = {
  setting: "ed",
  label: "Emergency Department",
  requiredSections: [
    { artifact: "hpi", description: "Triage / HPI", minFields: 3, required: true },
    { artifact: "pe", description: "Physical Examination", minFields: 3, required: true },
    { artifact: "assessment", description: "Assessment & Plan", minFields: 2, required: true },
    { artifact: "medications", description: "Medication List", minFields: 1, required: false },
  ],
  minTemplates: 1,
  minSectionsPerTemplate: 2,
  minFieldsPerTemplate: 4,
};

export const ALL_RUBRICS: SettingRubric[] = [
  OUTPATIENT_RUBRIC,
  INPATIENT_RUBRIC,
  ED_RUBRIC,
];

// ── Validation Logic ────────────────────────────────────────

function getRubricForSetting(setting: TemplateSetting): SettingRubric {
  switch (setting) {
    case "inpatient": return INPATIENT_RUBRIC;
    case "ed": return ED_RUBRIC;
    case "outpatient":
    case "any":
    default: return OUTPATIENT_RUBRIC;
  }
}

function findSectionInTemplates(
  templates: ValidatableTemplate[],
  artifactId: string,
): { found: boolean; fieldCount: number } {
  for (const t of templates) {
    const section = t.sections.find(
      (s: TemplateSection) => s.id === artifactId || s.id.startsWith(artifactId),
    );
    if (section) {
      return { found: true, fieldCount: section.fields.length };
    }
  }
  return { found: false, fieldCount: 0 };
}

export function validatePack(
  specialty: string,
  setting: TemplateSetting,
  templates: ValidatableTemplate[],
): PackValidationResult {
  const rubric = getRubricForSetting(setting);
  const missingArtifacts: string[] = [];
  const warnings: string[] = [];
  const sectionsCovered: string[] = [];
  const sectionsMissing: string[] = [];

  // Check template count
  if (templates.length < rubric.minTemplates) {
    missingArtifacts.push(
      `Need at least ${rubric.minTemplates} template(s), have ${templates.length}`,
    );
  }

  // Check required sections
  for (const req of rubric.requiredSections) {
    const { found, fieldCount } = findSectionInTemplates(templates, req.artifact);
    if (!found) {
      if (req.required) {
        missingArtifacts.push(`Required section missing: ${req.description} (${req.artifact})`);
        sectionsMissing.push(req.artifact);
      } else {
        warnings.push(`Recommended section missing: ${req.description} (${req.artifact})`);
        sectionsMissing.push(req.artifact);
      }
    } else {
      sectionsCovered.push(req.artifact);
      if (fieldCount < req.minFields) {
        warnings.push(
          `Section "${req.artifact}" has ${fieldCount} fields, minimum recommended: ${req.minFields}`,
        );
      }
    }
  }

  // Check per-template quality
  for (const t of templates) {
    if (t.sections.length < rubric.minSectionsPerTemplate) {
      warnings.push(
        `Template "${t.name}" has ${t.sections.length} sections, minimum: ${rubric.minSectionsPerTemplate}`,
      );
    }
    const totalFields = t.sections.reduce((a: number, s: TemplateSection) => a + s.fields.length, 0);
    if (totalFields < rubric.minFieldsPerTemplate) {
      warnings.push(
        `Template "${t.name}" has ${totalFields} fields, minimum: ${rubric.minFieldsPerTemplate}`,
      );
    }
  }

  // Compute score (0-100)
  const requiredCount = rubric.requiredSections.filter((r) => r.required).length;
  const coveredRequired = rubric.requiredSections
    .filter((r) => r.required)
    .filter((r) => sectionsCovered.includes(r.artifact)).length;
  const sectionScore = requiredCount > 0 ? (coveredRequired / requiredCount) * 60 : 60;
  const templateScore = Math.min(templates.length / Math.max(rubric.minTemplates, 1), 1) * 20;
  const avgFields = templates.length > 0
    ? templates.reduce((a, t) => a + t.sections.reduce((b: number, s: TemplateSection) => b + s.fields.length, 0), 0) / templates.length
    : 0;
  const fieldScore = Math.min(avgFields / rubric.minFieldsPerTemplate, 1) * 20;
  const score = Math.round(sectionScore + templateScore + fieldScore);

  return {
    specialty,
    setting,
    passed: missingArtifacts.length === 0,
    score,
    missingArtifacts,
    warnings,
    details: {
      templateCount: templates.length,
      requiredTemplates: rubric.minTemplates,
      sectionsCovered,
      sectionsMissing,
      avgFieldsPerTemplate: Math.round(avgFields * 10) / 10,
    },
  };
}

/**
 * Validate all specialty packs against their setting rubrics.
 */
export function validateAllPacks(): ValidationReport {
  const packs = getAllSpecialtyPacks();
  const results: PackValidationResult[] = [];

  for (const pack of packs) {
    const inferredSetting: TemplateSetting =
      (pack.templates[0]?.setting as TemplateSetting) || "outpatient";
    const result = validatePack(pack.specialty, inferredSetting, pack.templates);
    results.push(result);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalPacks: results.length,
    totalPassed: results.filter((r) => r.passed).length,
    totalFailed: results.filter((r) => !r.passed).length,
    results,
  };
}

/**
 * Validate user-created templates grouped by setting.
 */
export async function validateUserTemplates(tenantId: string): Promise<ValidationReport> {
  const allTemplates = await listTemplates(tenantId);
  const bySettings = new Map<TemplateSetting, ClinicalTemplate[]>();

  for (const t of allTemplates) {
    const setting = t.setting || "outpatient";
    if (!bySettings.has(setting)) bySettings.set(setting, []);
    bySettings.get(setting)!.push(t);
  }

  const results: PackValidationResult[] = [];
  for (const [setting, templates] of bySettings) {
    const result = validatePack(`user-${setting}`, setting, templates);
    results.push(result);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalPacks: results.length,
    totalPassed: results.filter((r) => r.passed).length,
    totalFailed: results.filter((r) => !r.passed).length,
    results,
  };
}
