#!/usr/bin/env node
/**
 * Phase 479 -- RPC Contract Trace Comparator
 *
 * Compares a recorded JSONL trace file against a golden baseline.
 * Used in CI to detect RPC contract drift between VistA instances.
 *
 * Usage:
 *   node scripts/rpc-contract-compare.mjs <workflow> [--trace FILE] [--golden DIR]
 *   node scripts/rpc-contract-compare.mjs --list
 *   node scripts/rpc-contract-compare.mjs --all
 *
 * Arguments:
 *   workflow         Workflow name (e.g. patient-search, note-create-sign)
 *   --trace FILE     Path to actual trace JSONL (default: latest in data/rpc-traces/)
 *   --golden DIR     Path to golden directory (default: data/rpc-traces/golden/)
 *   --list           List available golden baselines
 *   --all            Compare all workflows that have both golden and actual traces
 *   --strict         Fail on any diff (default: only fail on missing/extra RPCs)
 *
 * Exit codes:
 *   0 -- all comparisons passed
 *   1 -- one or more comparisons failed
 *   2 -- no golden baseline found
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_TRACE_DIR = join(ROOT, 'data', 'rpc-traces');
const DEFAULT_GOLDEN_DIR = join(DEFAULT_TRACE_DIR, 'golden');

/* -- CLI ---------------------------------------------------- */

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(name);
}
function opt(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const LIST_MODE = flag('--list');
const ALL_MODE = flag('--all');
const STRICT = flag('--strict');
const GOLDEN_DIR = opt('--golden', DEFAULT_GOLDEN_DIR);
const TRACE_FILE = opt('--trace', null);
const WORKFLOW = args.find((a) => !a.startsWith('-'));

/* -- Helpers ------------------------------------------------ */

function loadJsonl(filepath) {
  let raw = readFileSync(filepath, 'utf-8').trim();
  // Strip BOM if present (BUG-064: PowerShell Set-Content adds UTF-8 BOM)
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const lines = raw.split('\n');
  const meta = JSON.parse(lines[0]);
  const entries = lines.slice(1).map((l) => JSON.parse(l));
  return { meta, entries };
}

function findLatestTrace(workflow, dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(workflow + '_') && f.endsWith('.jsonl'))
    .sort()
    .reverse();
  return files.length > 0 ? join(dir, files[0]) : null;
}

function compare(actual, golden) {
  const diffs = [];
  const goldenRpcs = golden.entries.map((e) => e.rpcName);
  const actualRpcs = actual.entries.map((e) => e.rpcName);
  let matched = 0;

  const maxLen = Math.max(goldenRpcs.length, actualRpcs.length);
  for (let i = 0; i < maxLen; i++) {
    const g = goldenRpcs[i];
    const a = actualRpcs[i];
    if (!g && a) {
      diffs.push({ type: 'extra', seq: i, rpc: a, detail: `Extra: ${a}` });
    } else if (g && !a) {
      diffs.push({ type: 'missing', seq: i, rpc: g, detail: `Missing: ${g}` });
    } else if (g !== a) {
      diffs.push({ type: 'order', seq: i, rpc: a, detail: `Expected ${g}, got ${a}` });
    } else {
      const gSuccess = golden.entries[i].success;
      const aSuccess = actual.entries[i].success;
      if (gSuccess !== aSuccess) {
        diffs.push({
          type: 'success',
          seq: i,
          rpc: a,
          detail: `golden=${gSuccess}, actual=${aSuccess}`,
        });
      } else {
        matched++;
      }
    }
  }

  const criticalDiffs = diffs.filter((d) => d.type === 'missing' || d.type === 'extra');
  return {
    passed: STRICT ? diffs.length === 0 : criticalDiffs.length === 0,
    workflow: actual.meta.workflow,
    goldenCount: goldenRpcs.length,
    actualCount: actualRpcs.length,
    matched,
    diffs,
    criticalDiffs,
  };
}

/* -- Main --------------------------------------------------- */

function main() {
  console.log('RPC Contract Trace Comparator (Phase 479)\n');

  // List mode
  if (LIST_MODE) {
    if (!existsSync(GOLDEN_DIR)) {
      console.log('No golden directory found at:', GOLDEN_DIR);
      process.exit(0);
    }
    const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.jsonl'));
    if (files.length === 0) {
      console.log('No golden traces found.');
      process.exit(0);
    }
    console.log('Golden baselines:');
    for (const f of files) {
      try {
        const { meta } = loadJsonl(join(GOLDEN_DIR, f));
        console.log(`  ${meta.workflow.padEnd(25)} ${meta.entryCount} RPCs  (${f})`);
      } catch {
        console.log(`  ${f} (parse error)`);
      }
    }
    process.exit(0);
  }

  // All mode
  if (ALL_MODE) {
    if (!existsSync(GOLDEN_DIR)) {
      console.log('No golden directory. Nothing to compare.');
      process.exit(2);
    }
    const goldenFiles = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.jsonl'));
    const workflows = [...new Set(goldenFiles.map((f) => f.split('_')[0]))];

    let allPassed = true;
    let compared = 0;

    for (const wf of workflows) {
      const goldenPath = findLatestTrace(wf, GOLDEN_DIR);
      if (!goldenPath) {
        console.log(`SKIP  ${wf} -- golden file missing or removed`);
        continue;
      }
      const actualPath = findLatestTrace(wf, DEFAULT_TRACE_DIR);
      if (!actualPath) {
        console.log(`SKIP  ${wf} -- no actual trace found`);
        continue;
      }
      const golden = loadJsonl(goldenPath);
      const actual = loadJsonl(actualPath);
      const result = compare(actual, golden);
      compared++;

      if (result.passed) {
        console.log(`PASS  ${wf} (${result.matched}/${result.goldenCount} matched)`);
      } else {
        console.log(`FAIL  ${wf}`);
        for (const d of result.diffs) {
          console.log(`        [${d.type}] seq=${d.seq} ${d.detail}`);
        }
        allPassed = false;
      }
    }

    console.log(`\n${compared} workflow(s) compared.`);
    process.exit(allPassed ? 0 : 1);
  }

  // Single workflow mode
  if (!WORKFLOW) {
    console.error('Usage: node rpc-contract-compare.mjs <workflow> [--trace FILE] [--golden DIR]');
    console.error('       node rpc-contract-compare.mjs --list');
    console.error('       node rpc-contract-compare.mjs --all');
    process.exit(2);
  }

  // Load golden
  const goldenPath = findLatestTrace(WORKFLOW, GOLDEN_DIR);
  if (!goldenPath) {
    console.error(`No golden baseline for workflow "${WORKFLOW}" in ${GOLDEN_DIR}`);
    process.exit(2);
  }

  // Load actual
  const actualPath = TRACE_FILE || findLatestTrace(WORKFLOW, DEFAULT_TRACE_DIR);
  if (!actualPath || !existsSync(actualPath)) {
    console.error(`No actual trace found for workflow "${WORKFLOW}"`);
    console.error(`  Looked in: ${DEFAULT_TRACE_DIR}`);
    process.exit(2);
  }

  const golden = loadJsonl(goldenPath);
  const actual = loadJsonl(actualPath);

  console.log(`Workflow:  ${WORKFLOW}`);
  console.log(`Golden:    ${goldenPath}`);
  console.log(`Actual:    ${actualPath}`);
  console.log();

  const result = compare(actual, golden);

  if (result.passed) {
    console.log(`PASS  ${result.matched}/${result.goldenCount} RPCs matched`);
    if (result.diffs.length > 0) {
      console.log(`  (${result.diffs.length} non-critical differences)`);
      for (const d of result.diffs) {
        console.log(`    [${d.type}] seq=${d.seq} ${d.detail}`);
      }
    }
  } else {
    console.log(`FAIL  Contract mismatch`);
    for (const d of result.diffs) {
      const prefix = d.type === 'missing' || d.type === 'extra' ? '!!' : '  ';
      console.log(`  ${prefix} [${d.type}] seq=${d.seq} ${d.detail}`);
    }
  }

  process.exit(result.passed ? 0 : 1);
}

main();
