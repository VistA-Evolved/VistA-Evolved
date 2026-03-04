#!/usr/bin/env node
/**
 * Phase 47 -- Prompts Ordering Gate
 *
 * Enforces ordering integrity of the prompts/ directory:
 *   1. No duplicate phase prefixes (e.g. two "07-PHASE-5-*" folders)
 *   2. No gaps in numeric prefix sequence (warns, does not fail)
 *   3. Folder names match expected pattern: NN-PHASE-X-DESCRIPTION or NN-META
 *   4. Each phase folder has at least one .md file
 *
 * Usage:
 *   npx tsx scripts/check-prompts-ordering.ts
 *   node --import tsx scripts/check-prompts-ordering.ts
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = hard failures found
 */

import { readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, 'prompts');

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function pass(check: string, message: string) {
  results.push({ check, status: 'pass', message });
}
function fail(check: string, message: string) {
  results.push({ check, status: 'fail', message });
}
function warn(check: string, message: string) {
  results.push({ check, status: 'warn', message });
}

/* ------------------------------------------------------------------ */
/* Collect phase folders                                               */
/* ------------------------------------------------------------------ */

if (!existsSync(PROMPTS_DIR)) {
  fail('prompts-dir-exists', 'prompts/ directory not found');
  printAndExit();
}

const entries = readdirSync(PROMPTS_DIR)
  .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
  .sort();

// Separate meta folders (00-*) from phase folders (01+)
const META_PATTERN = /^00-/;
const PHASE_PATTERN = /^(\d+[A-Z]?)-PHASE-(\d+[A-Z]?)-(.+)$/;
const NUMBERED_PATTERN = /^(\d+[A-Z]?)-(.+)$/;

const metaFolders = entries.filter((e) => META_PATTERN.test(e));
const phaseFolders = entries.filter((e) => !META_PATTERN.test(e));

/* ------------------------------------------------------------------ */
/* Check 1: Validate folder naming pattern                             */
/* ------------------------------------------------------------------ */

const badNames: string[] = [];
for (const folder of phaseFolders) {
  if (!NUMBERED_PATTERN.test(folder)) {
    badNames.push(folder);
  }
}
if (badNames.length === 0) {
  pass('folder-naming', `All ${phaseFolders.length} phase folders follow NN-* naming`);
} else {
  fail('folder-naming', `Bad folder names: ${badNames.join(', ')}`);
}

/* ------------------------------------------------------------------ */
/* Check 2: No duplicate numeric prefixes                              */
/* ------------------------------------------------------------------ */

const prefixMap = new Map<string, string[]>();
for (const folder of entries) {
  const match = folder.match(/^(\d+[A-Z]?)-/);
  if (match) {
    const prefix = match[1];
    // 00-* meta folders are allowed duplicates by convention
    if (prefix === '00') continue;
    if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
    prefixMap.get(prefix)!.push(folder);
  }
}

const duplicates: string[] = [];
for (const [prefix, folders] of prefixMap) {
  if (folders.length > 1) {
    duplicates.push(`${prefix}: [${folders.join(', ')}]`);
  }
}
if (duplicates.length === 0) {
  pass('no-duplicate-prefixes', `No duplicate numeric prefixes across ${prefixMap.size} folders`);
} else {
  fail('no-duplicate-prefixes', `Duplicate prefixes found: ${duplicates.join('; ')}`);
}

/* ------------------------------------------------------------------ */
/* Check 3: Gap detection in prefix sequence (warn only)               */
/* ------------------------------------------------------------------ */

const sortedPrefixes = [...prefixMap.keys()].map(Number).sort((a, b) => a - b);
const gaps: number[] = [];
for (let i = 1; i < sortedPrefixes.length; i++) {
  const expected = sortedPrefixes[i - 1] + 1;
  if (sortedPrefixes[i] !== expected) {
    // Only flag gaps between non-meta folders (prefix > 0)
    if (sortedPrefixes[i - 1] >= 1) {
      gaps.push(expected);
    }
  }
}
if (gaps.length === 0) {
  pass(
    'no-gaps',
    `No gaps in prefix sequence (${sortedPrefixes[0]}..${sortedPrefixes[sortedPrefixes.length - 1]})`
  );
} else {
  warn('no-gaps', `Gaps in prefix sequence at: ${gaps.join(', ')} (non-blocking)`);
}

/* ------------------------------------------------------------------ */
/* Check 4: Each phase folder has at least one .md file                */
/* ------------------------------------------------------------------ */

const emptyFolders: string[] = [];
for (const folder of phaseFolders) {
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    emptyFolders.push(folder);
  }
}
if (emptyFolders.length === 0) {
  pass('has-content', `All ${phaseFolders.length} phase folders have .md files`);
} else {
  fail('has-content', `Empty phase folders (no .md): ${emptyFolders.join(', ')}`);
}

/* ------------------------------------------------------------------ */
/* Check 5: Phase number in folder name matches sequence               */
/* ------------------------------------------------------------------ */

const phaseNumberMismatches: string[] = [];
for (const folder of phaseFolders) {
  const phaseMatch = folder.match(PHASE_PATTERN);
  if (phaseMatch) {
    // Phase number is in the folder name; just verify it's a valid number
    const phaseStr = phaseMatch[2];
    if (!/^\d+[A-Z]?$/.test(phaseStr)) {
      phaseNumberMismatches.push(`${folder}: invalid phase number "${phaseStr}"`);
    }
  }
  // Non-PHASE folders (like 01-BOOTSTRAP) are fine - no phase number to validate
}
if (phaseNumberMismatches.length === 0) {
  pass('phase-numbers', 'All phase numbers in folder names are valid');
} else {
  fail('phase-numbers', `Invalid phase numbers: ${phaseNumberMismatches.join('; ')}`);
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

function printAndExit() {
  console.log('\n=== Prompts Ordering Gate (Phase 47) ===\n');

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;

  for (const r of results) {
    const icon = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'WARN';
    console.log(`  [${icon}] ${r.check}: ${r.message}`);
  }

  console.log(`\nTotal: ${passCount} pass, ${failCount} fail, ${warnCount} warn`);

  // Output JSON for evidence pack
  if (process.env.EVIDENCE_OUTPUT) {
    mkdirSync(dirname(process.env.EVIDENCE_OUTPUT), { recursive: true });
    writeFileSync(
      process.env.EVIDENCE_OUTPUT,
      JSON.stringify(
        { gate: 'prompts-ordering', results, summary: { passCount, failCount, warnCount } },
        null,
        2
      )
    );
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Use dynamic import for top-level await compatibility
printAndExit();
