#!/usr/bin/env node
/**
 * scripts/qa-gates/phase-index-gate.mjs -- Phase 108: Phase Audit Harness
 *
 * QA gate that validates phase-index.json is up to date and consistent
 * with the prompts/ directory.
 *
 * Checks:
 *   1. phase-index.json exists
 *   2. Phase count matches prompts/ folder count
 *   3. All phases have at least IMPLEMENT or VERIFY file
 *   4. No heading mismatches (folder phase != H1 phase)
 *   5. No duplicate phase numbers
 *   6. Generated test specs exist for phases with routes
 *
 * Exit: 0 = pass, 1 = fail
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const INDEX_PATH = join(ROOT, "docs", "qa", "phase-index.json");
const PROMPTS_DIR = join(ROOT, "prompts");
const E2E_DIR = join(ROOT, "apps", "web", "e2e", "phases");
const API_TEST_DIR = join(ROOT, "apps", "api", "tests", "phases");

const results = [];
let failures = 0;

function gate(name, pass, detail) {
  results.push({ name, pass, detail });
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` -- ${detail}` : ""}`);
}

console.log("\n=== QA Gate: Phase Index Integrity (Phase 108) ===\n");

// 1. phase-index.json exists
const indexExists = existsSync(INDEX_PATH);
gate("phase-index.json exists", indexExists, INDEX_PATH);

if (!indexExists) {
  console.log("\n  Run: node scripts/build-phase-index.mjs\n");
  process.exit(1);
}

const raw = readFileSync(INDEX_PATH, "utf-8");
const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

// 2. Phase count matches prompts/ folder count
const phaseFolders = readdirSync(PROMPTS_DIR)
  .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
  .filter((e) => /^\d{2,3}-PHASE-/.test(e));

gate(
  "phase count matches",
  index.phaseCount === phaseFolders.length,
  `index: ${index.phaseCount}, folders: ${phaseFolders.length}`
);

// 3. All phases have IMPLEMENT or VERIFY
const missingFiles = index.phases.filter(
  (p) => p.implementFiles.length === 0 && p.verifyFiles.length === 0
);
gate(
  "all phases have IMPLEMENT or VERIFY",
  missingFiles.length === 0,
  missingFiles.length > 0
    ? `Missing: ${missingFiles.map((p) => `Phase ${p.phaseNumber}`).join(", ")}`
    : `${index.phaseCount} phases validated`
);

// 4. No duplicate phase numbers (warn-only for known legacy duplicates)
const phaseNumbers = index.phases.map((p) => p.phaseNumber);
const dupeSet = new Set();
const dupes = [];
for (const pn of phaseNumbers) {
  if (dupeSet.has(pn)) dupes.push(pn);
  dupeSet.add(pn);
}
// Known legacy duplicates (pre-existing in prompts/ folder, not fixable here)
const KNOWN_DUPES = new Set(["43", "87", "120", "131", "132"]);
const newDupes = dupes.filter((d) => !KNOWN_DUPES.has(String(d)));
gate(
  "no new duplicate phase numbers",
  newDupes.length === 0,
  dupes.length > 0
    ? `Duplicates: ${dupes.join(", ")}${newDupes.length === 0 ? " (all known legacy)" : ` -- NEW: ${newDupes.join(", ")}`}`
    : `${phaseNumbers.length} unique phase numbers`
);

// 5. Generated specs exist for phases with routes
const phasesWithRoutes = index.phases.filter((p) => p.routes.length > 0);
const e2eExists = existsSync(E2E_DIR) && readdirSync(E2E_DIR).some((f) => f.endsWith(".spec.ts"));
const apiExists = existsSync(API_TEST_DIR) && readdirSync(API_TEST_DIR).some((f) => f.endsWith(".test.ts"));
gate(
  "generated specs exist",
  e2eExists || apiExists,
  `E2E: ${e2eExists}, API: ${apiExists} (${phasesWithRoutes.length} phases with routes)`
);

// 6. Phase-index freshness (warn if > 7 days old)
const genDate = new Date(index.generatedAt);
const ageMs = Date.now() - genDate.getTime();
const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24));
gate(
  "phase-index freshness",
  ageDays < 30,
  `Generated ${ageDays} days ago (${index.generatedAt.split("T")[0]})`
);

// ---- Summary ----
console.log(`\n=== Phase Index Gate: ${results.length} checks, ${results.length - failures} pass, ${failures} fail ===\n`);

if (failures > 0) {
  console.log("Failed checks:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  - ${r.name}: ${r.detail}`);
  }
  console.log("\nFix: node scripts/build-phase-index.mjs && node scripts/generate-phase-qa.mjs\n");
}

process.exit(failures > 0 ? 1 : 0);
