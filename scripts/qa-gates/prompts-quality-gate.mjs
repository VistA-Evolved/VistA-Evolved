#!/usr/bin/env node
/**
 * scripts/qa-gates/prompts-quality-gate.mjs -- Phase 211: Prompts Quality Gate
 *
 * Enforces semantic quality for every phase folder in /prompts:
 *
 *   WARN (legacy tolerance):
 *     - Missing required headings in IMPLEMENT/VERIFY
 *     - Files below 15-line quality floor
 *
 *   FAIL:
 *     - Phase folder with neither IMPLEMENT nor VERIFY file
 *
 * Required headings:
 *   IMPLEMENT: "## Implementation Steps", "## Files Touched"
 *   VERIFY:    "## Verification Steps", "## Acceptance Criteria"
 *
 * Exit: 0 = pass (or WARN-only), 1 = FAIL
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const PROMPTS_DIR = join(ROOT, "prompts");

const MIN_LINES = 15;
const WAVE_FOLDER_RE = /^\d+-W(\d+)-P\d+-/;

// Strict heading enforcement starts at this wave number.
// Earlier waves pre-date the heading convention and get WARN-only.
const STRICT_WAVE_MIN = 40;

// Strict headings for wave folders
const WAVE_IMPL_HEADINGS = [
  /^##\s+(Context)/im,
  /^##\s+(Implementation\s+Steps|Steps|Changes)/im,
  /^##\s+(Files\s+(Changed|Touched|Modified)|Affected\s+Files)/im,
  /^##\s+(Decisions)/im,
  /^##\s+(Evidence\s+Captured)/im,
];
const WAVE_VERIFY_HEADINGS = [
  /^##\s+(Verification\s+Steps|Verify|Steps|Commands)/im,
  /^##\s+(Expected\s+Output|Expected\s+Results?)/im,
  /^##\s+(Negative\s+Tests)/im,
  /^##\s+(Evidence\s+Captured)/im,
];

let passed = 0;
let warned = 0;
let failed = 0;

function pass(gate, detail) {
  passed++;
  console.log(`  PASS  ${gate}: ${detail}`);
}
function warn(gate, detail) {
  warned++;
  console.log(`  WARN  ${gate}: ${detail}`);
}
function fail(gate, detail) {
  failed++;
  console.log(`  FAIL  ${gate}: ${detail}`);
}

console.log("\n=== QA Gate: Prompts Quality (Phase 211) ===\n");

// ── Inventory ────────────────────────────────────────

const allEntries = readdirSync(PROMPTS_DIR);

const phaseFolders = allEntries.filter((e) => {
  if (!statSync(join(PROMPTS_DIR, e)).isDirectory()) return false;
  if (e.startsWith("00-")) return false;
  return /^\d+-/.test(e);
});

let totalImpl = 0;
let totalVerify = 0;
let missingBoth = 0;
let belowFloor = 0;
let missingHeadings = 0;

for (const folder of phaseFolders) {
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith(".md"));

  const implFile = files.find((f) => f.includes("IMPLEMENT"));
  const verifyFile = files.find((f) => f.includes("VERIFY"));

  // Gate 1: Must have at least one of IMPLEMENT or VERIFY
  if (!implFile && !verifyFile) {
    // Check for legacy prompt.md
    const hasPrompt = files.some((f) => f === "prompt.md");
    if (hasPrompt) {
      warn("has-pair", `"${folder}" has legacy prompt.md only`);
    } else if (files.length > 0) {
      warn("has-pair", `"${folder}" has ${files.length} md files but no standard IMPLEMENT/VERIFY`);
    } else {
      fail("has-pair", `"${folder}" has no IMPLEMENT or VERIFY files`);
      missingBoth++;
    }
    continue;
  }

  const waveMatch = folder.match(WAVE_FOLDER_RE);
  const isStrictWave = waveMatch && parseInt(waveMatch[1], 10) >= STRICT_WAVE_MIN;

  // Gate 2: Check IMPLEMENT quality
  if (implFile) {
    totalImpl++;
    const content = readFileSync(join(folderPath, implFile), "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length < MIN_LINES) {
      if (isStrictWave) {
        fail("quality-floor", `"${folder}/${implFile}" has ${lines.length} non-empty lines (min ${MIN_LINES}) [WAVE-STRICT]`);
      } else {
        warn("quality-floor", `"${folder}/${implFile}" has ${lines.length} non-empty lines (min ${MIN_LINES})`);
      }
      belowFloor++;
    }

    if (isStrictWave) {
      // Strict: check all required wave headings
      for (const hRe of WAVE_IMPL_HEADINGS) {
        if (!hRe.test(content)) {
          fail("headings", `"${folder}/${implFile}" missing heading matching ${hRe.source} [WAVE-STRICT]`);
          missingHeadings++;
        }
      }
    } else {
      const hasImplSteps = /^##\s+(Implementation\s+Steps|Steps|Changes)/im.test(content);
      const hasFilesTouched = /^##\s+(Files\s+Touched|Files\s+Changed|Files\s+Modified|Affected\s+Files)/im.test(content);

      if (!hasImplSteps && !hasFilesTouched) {
        warn("headings", `"${folder}/${implFile}" missing both "## Implementation Steps" and "## Files Touched"`);
        missingHeadings++;
      }
    }
  }

  // Gate 3: Check VERIFY quality
  if (verifyFile) {
    totalVerify++;
    const content = readFileSync(join(folderPath, verifyFile), "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length < MIN_LINES) {
      if (isStrictWave) {
        fail("quality-floor", `"${folder}/${verifyFile}" has ${lines.length} non-empty lines (min ${MIN_LINES}) [WAVE-STRICT]`);
      } else {
        warn("quality-floor", `"${folder}/${verifyFile}" has ${lines.length} non-empty lines (min ${MIN_LINES})`);
      }
      belowFloor++;
    }

    if (isStrictWave) {
      // Strict: check all required wave headings
      for (const hRe of WAVE_VERIFY_HEADINGS) {
        if (!hRe.test(content)) {
          fail("headings", `"${folder}/${verifyFile}" missing heading matching ${hRe.source} [WAVE-STRICT]`);
          missingHeadings++;
        }
      }
    } else {
      const hasVerifySteps = /^##\s+(Verification\s+Steps|Verify|Steps|Commands)/im.test(content);
      const hasCriteria = /^##\s+(Acceptance\s+Criteria|Accept\s+if|Expected\s+Results?|Expected\s+Output)/im.test(content);

      if (!hasVerifySteps && !hasCriteria) {
        warn("headings", `"${folder}/${verifyFile}" missing both "## Verification Steps" and "## Acceptance Criteria"`);
        missingHeadings++;
      }
    }
  }
}

// ── Summary ──────────────────────────────────────────

console.log("\n=== Summary ===");
console.log(`  Phase folders checked: ${phaseFolders.length}`);
console.log(`  IMPLEMENT files: ${totalImpl}`);
console.log(`  VERIFY files: ${totalVerify}`);
console.log(`  Missing both: ${missingBoth}`);
console.log(`  Below quality floor: ${belowFloor}`);
console.log(`  Missing headings: ${missingHeadings}`);
console.log(`  PASS: ${passed}  WARN: ${warned}  FAIL: ${failed}`);

const exitCode = failed > 0 ? 1 : 0;
console.log(`\nExit code: ${exitCode}`);
process.exit(exitCode);
