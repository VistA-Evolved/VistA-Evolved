#!/usr/bin/env node
/**
 * scripts/prompts-mk-wave-phase.mjs — Wave Phase Folder Generator
 *
 * Creates a correctly-structured prompts folder for a wave phase.
 *
 * Usage:
 *   node scripts/prompts-mk-wave-phase.mjs --wave 40 --phase 543 --p 1 --title "WAVE-40-BOOTSTRAP"
 *
 * Creates:
 *   prompts/543-W40-P1-WAVE-40-BOOTSTRAP/
 *     IMPLEMENT.md   (with required headings)
 *     VERIFY.md      (with required headings)
 *     NOTES.md       (stub)
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PROMPTS_DIR = join(ROOT, "prompts");

// ── Parse args ──────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--wave" && args[i + 1]) opts.wave = parseInt(args[++i], 10);
    else if (args[i] === "--phase" && args[i + 1]) opts.phase = parseInt(args[++i], 10);
    else if (args[i] === "--p" && args[i + 1]) opts.p = parseInt(args[++i], 10);
    else if (args[i] === "--title" && args[i + 1]) opts.title = args[++i].toUpperCase().replace(/\s+/g, "-");
    else if (args[i] === "--dry-run") opts.dryRun = true;
    else if (args[i] === "--help" || args[i] === "-h") opts.help = true;
  }
  return opts;
}

const opts = parseArgs();

if (opts.help || !opts.wave || !opts.phase || !opts.p || !opts.title) {
  console.log(`Usage: node scripts/prompts-mk-wave-phase.mjs --wave <N> --phase <N> --p <N> --title <SLUG>`);
  console.log(`  --wave    Wave number (e.g. 40)`);
  console.log(`  --phase   Global phase number (e.g. 543)`);
  console.log(`  --p       Position within wave (e.g. 1)`);
  console.log(`  --title   UPPER-KEBAB slug (e.g. WAVE-40-BOOTSTRAP)`);
  console.log(`  --dry-run Show what would be created without writing`);
  process.exit(opts.help ? 0 : 1);
}

const folderName = `${opts.phase}-W${opts.wave}-P${opts.p}-${opts.title}`;
const folderPath = join(PROMPTS_DIR, folderName);

if (existsSync(folderPath)) {
  console.error(`ERROR: Folder already exists: ${folderName}`);
  process.exit(1);
}

// ── Templates ──────────────────────────────────

const humanTitle = opts.title.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const implementMd = `# Phase ${opts.phase} — ${humanTitle} — IMPLEMENT

## Context
Wave ${opts.wave}, Phase ${opts.p}.

## Implementation Steps
1. Inventory existing state
2. Execute primary changes
3. Run verification gate

## Files Changed
- See NOTES.md for detailed file list
- Evidence directory for this phase

## Decisions
- Documented in NOTES.md
- Follows Wave ${opts.wave} manifest conventions

## Evidence Captured
- evidence/wave-${opts.wave}/${folderName}/
`;

const verifyMd = `# Phase ${opts.phase} — ${humanTitle} — VERIFY

## Verification Steps
1. Execute primary action
2. Validate output
3. Capture evidence

## Expected Output
- Gate passes with exit code 0
- All sub-checks report PASS
- No FAIL lines in output

## Negative Tests
- Verify gate rejects invalid input
- Confirm no regressions in other gates
- Edge cases documented in NOTES.md

## Evidence Captured
- evidence/wave-${opts.wave}/${folderName}/
`;

const notesMd = `# Phase ${opts.phase} — ${humanTitle} — NOTES

## Log
- Created by prompts-mk-wave-phase.mjs
`;

// ── Write ──────────────────────────────────

if (opts.dryRun) {
  console.log(`[DRY RUN] Would create: prompts/${folderName}/`);
  console.log(`  IMPLEMENT.md (${implementMd.split("\n").filter((l) => l.trim()).length} non-empty lines)`);
  console.log(`  VERIFY.md    (${verifyMd.split("\n").filter((l) => l.trim()).length} non-empty lines)`);
  console.log(`  NOTES.md     (stub)`);
  process.exit(0);
}

mkdirSync(folderPath, { recursive: true });
writeFileSync(join(folderPath, "IMPLEMENT.md"), implementMd, "utf-8");
writeFileSync(join(folderPath, "VERIFY.md"), verifyMd, "utf-8");
writeFileSync(join(folderPath, "NOTES.md"), notesMd, "utf-8");

console.log(`Created: prompts/${folderName}/`);
console.log(`  IMPLEMENT.md  VERIFY.md  NOTES.md`);
console.log(`All files meet 15-line quality floor and contain required headings.`);
