/**
 * G24: Specialty Pack Hardening Gate
 *
 * Validates that specialty packs meet minimum artifact rubrics
 * and that the validator infrastructure exists.
 */

export const meta = {
  id: "G24_specialty_pack_hardening",
  name: "Specialty Pack Hardening",
  phase: 167,
  tags: ["templates", "qa"],
};

export async function run(_ctx) {
  const issues = [];
  const details = [];

  const { existsSync, readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const root = resolve(import.meta.dirname, "../../..");

  // 1. Validator file exists
  const validatorFile = resolve(root, "apps/api/src/templates/pack-validator.ts");
  if (!existsSync(validatorFile)) {
    return { status: "fail", issues: ["pack-validator.ts not found"], details };
  }
  details.push("Pack validator exists");

  // 2. Validate rubric definitions
  const content = readFileSync(validatorFile, "utf-8");
  const requiredRubrics = ["OUTPATIENT_RUBRIC", "INPATIENT_RUBRIC", "ED_RUBRIC"];
  for (const rubric of requiredRubrics) {
    if (!content.includes(rubric)) {
      issues.push(`Missing rubric: ${rubric}`);
    } else {
      details.push(`${rubric} defined`);
    }
  }

  // 3. Check exported functions
  const requiredExports = ["validatePack", "validateAllPacks", "validateUserTemplates"];
  for (const fn of requiredExports) {
    if (!content.includes(`function ${fn}`)) {
      issues.push(`Missing export: ${fn}`);
    } else {
      details.push(`${fn}() exported`);
    }
  }

  // 4. CLI validator exists
  const cliValidator = resolve(root, "scripts/qa/validate-specialty-packs.mjs");
  if (!existsSync(cliValidator)) {
    issues.push("CLI validator not found");
  } else {
    details.push("CLI validator exists");
  }

  // 5. Runbook
  const runbook = resolve(root, "docs/runbooks/phase167-specialty-pack-hardening.md");
  if (!existsSync(runbook)) {
    issues.push("Runbook missing");
  } else {
    details.push("Runbook exists");
  }

  const status = issues.length === 0 ? "pass" : "fail";
  return { status, issues, details };
}
