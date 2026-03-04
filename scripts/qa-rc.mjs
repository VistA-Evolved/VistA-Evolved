#!/usr/bin/env node
/**
 * qa-rc.mjs -- One-shot RC (Release Candidate) gates command.
 *
 * Runs the 9 core hygiene QA gates from Wave 40 in sequence.
 * For the full gauntlet, use `pnpm qa:gauntlet:rc` instead.
 *
 * Usage:
 *   node scripts/qa-rc.mjs
 *   pnpm qa:rc
 *
 * Outputs:
 *   - Human-readable pass/fail summary to stdout
 *   - Machine output: artifacts/qa-rc-evidence.json (gitignored)
 *
 * Exit: 0 = all pass, 1 = any fail
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTIFACTS_DIR = resolve(ROOT, 'artifacts');

// ── Gate definitions ────────────────────────────────────────

const GATES = [
  {
    id: 'G1_prompts_tree_health',
    label: 'Prompts tree health',
    cmd: ['node', 'scripts/qa-gates/prompts-tree-health.mjs'],
  },
  {
    id: 'G2_wave_phase_lint',
    label: 'Wave/phase folder lint',
    cmd: ['node', 'scripts/qa-gates/wave-phase-lint.mjs'],
  },
  {
    id: 'G3_prompts_quality',
    label: 'Prompts quality gate',
    cmd: ['node', 'scripts/qa-gates/prompts-quality-gate.mjs'],
  },
  {
    id: 'G4_secret_scan',
    label: 'Secret scan',
    cmd: ['node', 'scripts/secret-scan.mjs'],
  },
  {
    id: 'G5_phi_leak_scan',
    label: 'PHI leak scan',
    cmd: ['node', 'scripts/phi-leak-scan.mjs'],
  },
  {
    id: 'G6_rpc_snapshot_drift',
    label: 'RPC snapshot drift',
    cmd: ['node', 'scripts/qa-gates/rpc-trace-compare.mjs'],
  },
  {
    id: 'G7_integration_pending',
    label: 'Integration-pending budget',
    cmd: ['node', 'scripts/qa-gates/integration-pending-budget.mjs'],
  },
  {
    id: 'G8_i18n_coverage',
    label: 'i18n coverage gate',
    cmd: ['node', 'scripts/qa-gates/i18n-coverage-gate.mjs'],
  },
  {
    id: 'G9_no_hardcoded_localhost',
    label: 'No hardcoded localhost',
    cmd: ['node', 'scripts/qa-gates/no-hardcoded-localhost.mjs'],
  },
];

// ── Runner ──────────────────────────────────────────────────

const SEP = '-'.repeat(60);
const results = [];
let passCount = 0;
let failCount = 0;

console.log('');
console.log('='.repeat(60));
console.log('  RC GATES -- Wave 40 hygiene checks');
console.log('='.repeat(60));
console.log('');

for (const gate of GATES) {
  const start = Date.now();
  let status = 'PASS';
  let output = '';

  try {
    output = execFileSync(gate.cmd[0], gate.cmd.slice(1), {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    status = 'FAIL';
    output = (err.stdout || '') + '\n' + (err.stderr || '');
  }

  const elapsed = Date.now() - start;
  const icon = status === 'PASS' ? 'OK' : 'FAIL';

  console.log(`  [${icon}]  ${gate.label}  (${elapsed}ms)`);

  if (status === 'PASS') passCount++;
  else failCount++;

  results.push({
    id: gate.id,
    label: gate.label,
    status,
    elapsedMs: elapsed,
    outputTail: output.trim().split('\n').slice(-5).join('\n'),
  });
}

console.log('');
console.log(SEP);
console.log(`  TOTAL: ${passCount} pass, ${failCount} fail out of ${GATES.length} gates`);
console.log(SEP);
console.log('');

// ── Evidence output ─────────────────────────────────────────

mkdirSync(ARTIFACTS_DIR, { recursive: true });
const evidence = {
  runner: 'qa-rc.mjs',
  timestamp: new Date().toISOString(),
  summary: { pass: passCount, fail: failCount, total: GATES.length },
  gates: results,
};

const evidencePath = resolve(ARTIFACTS_DIR, 'qa-rc-evidence.json');
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(`  Evidence written to: artifacts/qa-rc-evidence.json`);
console.log('');

process.exit(failCount > 0 ? 1 : 0);
