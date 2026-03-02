#!/usr/bin/env node
/**
 * scripts/qa-gates/wave-phase-lint.mjs
 *
 * Enforces strict file-naming for wave-phase prompt folders:
 *   Folders matching ^\d+-W\d+-P\d+- MUST contain exactly:
 *     IMPLEMENT.md, VERIFY.md, NOTES.md
 *
 * FAILs if:
 *   - Old-style (NNN-01-IMPLEMENT.md, NNN-99-VERIFY.md, NNN-NOTES.md) found
 *   - Required file missing
 *
 * Exit: 0 = pass, 1 = fail
 */

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const PROMPTS = join(ROOT, "prompts");

const WAVE_FOLDER_RE = /^\d+-W\d+-P\d+-/;
const REQUIRED_FILES = ["IMPLEMENT.md", "VERIFY.md", "NOTES.md"];
const OLD_PATTERNS = [
  /^\d+-01-IMPLEMENT\.md$/i,
  /^\d+-99-VERIFY\.md$/i,
  /^\d+-NOTES\.md$/i,
];

let passed = 0;
let failed = 0;

function pass(gate, detail) {
  passed++;
  console.log(`  PASS  ${gate}: ${detail}`);
}

function fail(gate, detail) {
  failed++;
  console.log(`  FAIL  ${gate}: ${detail}`);
}

console.log("\n=== QA Gate: Wave Phase File Lint ===\n");

const folders = readdirSync(PROMPTS).filter(
  (e) => WAVE_FOLDER_RE.test(e) && statSync(join(PROMPTS, e)).isDirectory()
);

console.log(`Scanning ${folders.length} wave-phase folders...\n`);

let oldStyleCount = 0;
let missingCount = 0;

for (const folder of folders) {
  const files = readdirSync(join(PROMPTS, folder));

  // Check for old-style files
  for (const pat of OLD_PATTERNS) {
    const oldFile = files.find((f) => pat.test(f) && !REQUIRED_FILES.includes(f));
    if (oldFile) {
      fail("old-style-name", `${folder}/${oldFile} — must be renamed to standard form`);
      oldStyleCount++;
    }
  }

  // Check for required files
  for (const req of REQUIRED_FILES) {
    if (!files.includes(req)) {
      fail("missing-required", `${folder} missing ${req}`);
      missingCount++;
    }
  }
}

if (oldStyleCount === 0) {
  pass("old-style-name", "No old-style file names in wave folders");
}
if (missingCount === 0) {
  pass("missing-required", "All wave folders have IMPLEMENT.md + VERIFY.md + NOTES.md");
}

// Summary
console.log("\n=== Summary ===");
console.log(`  Folders scanned: ${folders.length}`);
console.log(`  PASS: ${passed}`);
console.log(`  FAIL: ${failed}`);

const exitCode = failed > 0 ? 1 : 0;
console.log(`\nExit code: ${exitCode}`);
process.exit(exitCode);
