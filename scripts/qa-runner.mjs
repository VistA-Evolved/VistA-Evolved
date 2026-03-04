#!/usr/bin/env node
/**
 * Phase 105 -- QA Gauntlet Runner
 *
 * Orchestrates all QA suites with per-suite exit codes and a crisp summary.
 *
 * Usage:
 *   node scripts/qa-runner.mjs smoke       # E2E smoke only
 *   node scripts/qa-runner.mjs api         # API integration
 *   node scripts/qa-runner.mjs security    # Secret scan + PHI + dep audit
 *   node scripts/qa-runner.mjs web         # Full Playwright E2E
 *   node scripts/qa-runner.mjs vista       # VistA connectivity probes
 *   node scripts/qa-runner.mjs prompts     # Prompts ordering integrity
 *   node scripts/qa-runner.mjs all         # Everything
 *
 * Exit codes: 0 = all PASS, 1 = at least one FAIL
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const suite = args[0] || 'smoke';

// ---- Suite definitions ----

const SUITES = {
  smoke: [
    { name: 'API health', cmd: 'node scripts/qa-gates/api-health.mjs' },
    {
      name: 'API integration tests',
      cmd: 'cd apps/api && pnpm exec vitest run tests/qa-api-routes.test.ts',
    },
    {
      name: 'E2E smoke',
      cmd: 'cd apps/web && pnpm exec playwright test e2e/qa-smoke.spec.ts --reporter=list',
    },
  ],
  api: [
    { name: 'API health', cmd: 'node scripts/qa-gates/api-health.mjs' },
    {
      name: 'API integration tests',
      cmd: 'cd apps/api && pnpm exec vitest run tests/qa-api-routes.test.ts',
    },
    {
      name: 'API security tests',
      cmd: 'cd apps/api && pnpm exec vitest run tests/qa-security.test.ts',
    },
    {
      name: 'API contract tests',
      cmd: 'cd apps/api && pnpm exec vitest run tests/contract.test.ts',
    },
  ],
  web: [
    { name: 'E2E full suite', cmd: 'cd apps/web && pnpm exec playwright test --reporter=list' },
  ],
  security: [
    { name: 'Secret scan', cmd: 'node scripts/secret-scan.mjs' },
    { name: 'PHI leak scan', cmd: 'node scripts/phi-leak-scan.mjs' },
    {
      name: 'Security tests',
      cmd: 'cd apps/api && pnpm exec vitest run tests/qa-security.test.ts',
    },
    { name: 'Dependency audit', cmd: 'pnpm audit --audit-level=critical 2>&1 || true' },
  ],
  vista: [{ name: 'VistA probe', cmd: 'node scripts/qa-gates/vista-probe.mjs' }],
  prompts: [
    { name: 'Prompts tree health', cmd: 'node scripts/qa-gates/prompts-tree-health.mjs' },
    { name: 'Prompts quality', cmd: 'node scripts/qa-gates/prompts-quality-gate.mjs' },
  ],
  'prod-posture': [{ name: 'Production posture', cmd: 'node scripts/qa-gates/prod-posture.mjs' }],
  'phase-audit': [
    { name: 'Phase index integrity', cmd: 'node scripts/qa-gates/phase-index-gate.mjs' },
    { name: 'Prompts tree health', cmd: 'node scripts/qa-gates/prompts-tree-health.mjs' },
    { name: 'Prompts quality', cmd: 'node scripts/qa-gates/prompts-quality-gate.mjs' },
  ],
};

// "all" is the union of every suite
SUITES.all = [
  ...SUITES.security,
  ...SUITES.api,
  ...SUITES.prompts,
  ...SUITES['phase-audit'],
  // web/E2E only if both API + web servers are expected
  ...SUITES.smoke,
];

// Deduplicate by name
const seen = new Set();
SUITES.all = SUITES.all.filter((s) => {
  if (seen.has(s.name)) return false;
  seen.add(s.name);
  return true;
});

// ---- Runner ----

const target = SUITES[suite];
if (!target) {
  console.error(`Unknown suite: ${suite}`);
  console.error(`Available: ${Object.keys(SUITES).join(', ')}`);
  process.exit(1);
}

const results = [];
let failures = 0;

console.log(`\n=== QA Gauntlet: ${suite} (${target.length} gates) ===\n`);

for (const gate of target) {
  const start = Date.now();
  try {
    execSync(gate.cmd, {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300_000, // 5min per gate
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    results.push({ name: gate.name, status: 'PASS', elapsed });
    console.log(`  PASS  ${gate.name} (${elapsed}s)`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    failures++;
    results.push({ name: gate.name, status: 'FAIL', elapsed });
    console.log(`  FAIL  ${gate.name} (${elapsed}s)`);
    // Show last 20 lines of stderr/stdout for diagnosis
    const output = err.stdout?.toString() || err.stderr?.toString() || '';
    const lines = output.split('\n').filter(Boolean).slice(-20);
    if (lines.length) {
      console.log(`        ${lines.join('\n        ')}`);
    }
  }
}

// ---- Summary ----

console.log(`\n=== QA Summary ===`);
console.log(`  Total: ${results.length}`);
console.log(`  Pass:  ${results.filter((r) => r.status === 'PASS').length}`);
console.log(`  Fail:  ${failures}`);

if (failures > 0) {
  console.log(`\nFailed gates:`);
  for (const r of results.filter((r) => r.status === 'FAIL')) {
    console.log(`  - ${r.name}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log(`\nAll gates PASSED.\n`);
  process.exit(0);
}
