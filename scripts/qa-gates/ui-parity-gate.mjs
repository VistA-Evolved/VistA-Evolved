#!/usr/bin/env node
/**
 * UI Parity Gap Gate -- CI-runnable quality gate
 * Phase 532 (Wave 39 P2)
 *
 * Reads the UI estate catalogs and enforces forward-only coverage.
 * Exits non-zero if covered surface count regresses vs baseline.
 *
 * Usage:
 *   node scripts/qa-gates/ui-parity-gate.mjs              # check mode
 *   node scripts/qa-gates/ui-parity-gate.mjs --update-baseline  # set new baseline
 *   node scripts/qa-gates/ui-parity-gate.mjs --json        # JSON output
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const VA_CATALOG = resolve(ROOT, 'data/ui-estate/va-ui-estate.json');
const IHS_CATALOG = resolve(ROOT, 'data/ui-estate/ihs-ui-estate.json');
const BASELINE_FILE = resolve(ROOT, 'data/ui-estate/parity-baseline.json');
const GAP_REPORT = resolve(ROOT, 'data/ui-estate/ui-gap-report.json');

const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');
const jsonOutput = args.includes('--json');

// ----- helpers -----
function loadCatalog(path) {
  if (!existsSync(path)) return { systems: [] };
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
}

function countSurfaces(catalog) {
  let total = 0,
    covered = 0,
    rpcWired = 0,
    writebackReady = 0,
    tested = 0;
  for (const sys of catalog.systems || []) {
    for (const surf of sys.surfaces || []) {
      total++;
      const c = surf.coverage || {};
      if (c.present_ui && c.present_api) covered++;
      if (c.vista_rpc_wired) rpcWired++;
      if (c.writeback_ready) writebackReady++;
      if (c.tests_present) tested++;
    }
  }
  return { total, covered, rpcWired, writebackReady, tested };
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return null;
  const raw = readFileSync(BASELINE_FILE, 'utf8');
  return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
}

// ----- main -----
const va = loadCatalog(VA_CATALOG);
const ihs = loadCatalog(IHS_CATALOG);

const vaStats = countSurfaces(va);
const ihsStats = countSurfaces(ihs);

const current = {
  total: vaStats.total + ihsStats.total,
  covered: vaStats.covered + ihsStats.covered,
  rpcWired: vaStats.rpcWired + ihsStats.rpcWired,
  writebackReady: vaStats.writebackReady + ihsStats.writebackReady,
  tested: vaStats.tested + ihsStats.tested,
  coveragePercent: 0,
  timestamp: new Date().toISOString(),
};
current.coveragePercent =
  current.total > 0 ? Math.round((current.covered / current.total) * 1000) / 10 : 0;

// ----- update baseline mode -----
if (updateBaseline) {
  const dir = dirname(BASELINE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2) + '\n', 'utf8');
  console.log(
    `[ui-parity-gate] Baseline updated: ${current.covered}/${current.total} covered (${current.coveragePercent}%)`
  );
  process.exit(0);
}

// ----- check mode -----
const baseline = loadBaseline();

const result = {
  gate: 'ui-parity-gate',
  current,
  baseline: baseline || { note: 'no baseline found -- first run' },
  delta: {},
  passed: true,
  regressions: [],
};

if (baseline) {
  result.delta = {
    total: current.total - baseline.total,
    covered: current.covered - baseline.covered,
    rpcWired: current.rpcWired - baseline.rpcWired,
    writebackReady: current.writebackReady - baseline.writebackReady,
    tested: current.tested - baseline.tested,
  };

  // Regression = fewer covered surfaces than baseline
  if (current.covered < baseline.covered) {
    result.passed = false;
    result.regressions.push(
      `covered: ${current.covered} < baseline ${baseline.covered} (delta: ${result.delta.covered})`
    );
  }
  // Also flag rpcWired regression
  if (current.rpcWired < baseline.rpcWired) {
    result.passed = false;
    result.regressions.push(
      `rpcWired: ${current.rpcWired} < baseline ${baseline.rpcWired} (delta: ${result.delta.rpcWired})`
    );
  }
} else {
  // No baseline = first run, always pass but warn
  result.passed = true;
  result.regressions.push('No baseline found. Run with --update-baseline to set.');
}

// ----- output -----
if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\n=== UI Parity Gap Gate ===`);
  console.log(`Total surfaces:   ${current.total}`);
  console.log(`Covered (UI+API): ${current.covered} (${current.coveragePercent}%)`);
  console.log(`RPC-wired:        ${current.rpcWired}`);
  console.log(`Writeback-ready:  ${current.writebackReady}`);
  console.log(`Tests present:    ${current.tested}`);
  if (baseline) {
    console.log(`\n--- vs Baseline ---`);
    console.log(`  covered:   ${result.delta.covered >= 0 ? '+' : ''}${result.delta.covered}`);
    console.log(`  rpcWired:  ${result.delta.rpcWired >= 0 ? '+' : ''}${result.delta.rpcWired}`);
    console.log(`  tested:    ${result.delta.tested >= 0 ? '+' : ''}${result.delta.tested}`);
  } else {
    console.log(`\nNo baseline found. Run with --update-baseline to set.`);
  }
  if (result.passed) {
    console.log(`\nRESULT: PASS`);
  } else {
    console.log(`\nRESULT: FAIL -- coverage regression detected`);
    result.regressions.forEach((r) => console.log(`  - ${r}`));
  }
}

process.exit(result.passed ? 0 : 1);
