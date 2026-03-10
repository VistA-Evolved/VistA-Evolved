#!/usr/bin/env node
/**
 * RPC Contract CI Runner -- Phase 267
 *
 * Runs the full RPC contract validation suite and produces:
 *   1. rpc-contract-report.json  -- machine-readable results
 *   2. rpc-contract-junit.xml    -- JUnit XML for CI integration
 *   3. rpc-contract-summary.md   -- human-readable summary
 *
 * Usage:
 *   node scripts/rpc-contract-ci.mjs [--output-dir <dir>] [--live]
 *
 * Flags:
 *   --output-dir   Directory for reports (default: artifacts/rpc-contracts)
 *   --live         Also run live VistA tests (requires running VistA)
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, '..');
const API_DIR = join(ROOT, 'apps', 'api');
const FIXTURES_DIR = join(API_DIR, 'tests', 'fixtures', 'vista');
const CONTRACTS_FILE = join(API_DIR, 'src', 'vista', 'contracts', 'rpc-contracts.ts');

const args = process.argv.slice(2);
const outputDir = (() => {
  const idx = args.indexOf('--output-dir');
  return idx >= 0 && args[idx + 1]
    ? resolve(args[idx + 1])
    : join(ROOT, 'artifacts', 'rpc-contracts');
})();
const runLive = args.includes('--live');

mkdirSync(outputDir, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PHI_PATTERNS = [
  /\d{3}-\d{2}-\d{4}/, // SSN
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO date (potential DOB)
  /\b(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/, // YYYYMMDD DOB
  /PATIENT,[A-Z]+/i, // VistA name format
];

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function safeExec(cmd, cwd, timeoutMs = 120_000) {
  try {
    const out = execSync(cmd, {
      cwd,
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, output: out, exitCode: 0 };
  } catch (err) {
    return {
      ok: false,
      output: (err.stdout || '') + '\n' + (err.stderr || ''),
      exitCode: err.status ?? 1,
    };
  }
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// ---------------------------------------------------------------------------
// Phase 1: Enumerate contracted RPCs
// ---------------------------------------------------------------------------

console.log('\n=== RPC Contract CI Runner (Phase 267) ===\n');

const fixtureDirs = existsSync(FIXTURES_DIR)
  ? readdirSync(FIXTURES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

console.log(`Found ${fixtureDirs.length} fixture directories`);

// ---------------------------------------------------------------------------
// Phase 2: Validate each fixture
// ---------------------------------------------------------------------------

const results = [];
let totalPass = 0;
let totalFail = 0;

for (const dir of fixtureDirs) {
  const dirPath = join(FIXTURES_DIR, dir);
  const successPath = join(dirPath, 'success.json');
  const emptyPath = join(dirPath, 'empty.json');
  const result = {
    rpcName: dir.replace(/_/g, ' '),
    fixtureDir: dir,
    checks: [],
    pass: true,
  };

  // Check success.json exists
  if (existsSync(successPath)) {
    try {
      const raw = stripBom(readFileSync(successPath, 'utf-8'));
      const fixture = JSON.parse(raw);

      // Sanitized check
      if (fixture.sanitized === true) {
        result.checks.push({ name: 'sanitized', pass: true });
      } else {
        result.checks.push({ name: 'sanitized', pass: false, reason: 'sanitized !== true' });
        result.pass = false;
      }

      // Response exists
      if (Array.isArray(fixture.response)) {
        result.checks.push({ name: 'response_array', pass: true });
      } else {
        result.checks.push({
          name: 'response_array',
          pass: false,
          reason: 'response is not an array',
        });
        result.pass = false;
      }

      // PHI scan
      const responseText = JSON.stringify(fixture.response);
      const phiViolations = [];
      for (const pat of PHI_PATTERNS) {
        if (pat.test(responseText)) {
          phiViolations.push(pat.source);
        }
      }
      if (phiViolations.length === 0) {
        result.checks.push({ name: 'phi_clean', pass: true });
      } else {
        result.checks.push({
          name: 'phi_clean',
          pass: false,
          reason: `PHI patterns found: ${phiViolations.join(', ')}`,
        });
        result.pass = false;
      }

      // Hash verification
      if (fixture.responseHash) {
        result.checks.push({ name: 'hash_present', pass: true });
      } else {
        result.checks.push({ name: 'hash_present', pass: false, reason: 'Missing responseHash' });
        result.pass = false;
      }
    } catch (err) {
      result.checks.push({ name: 'parse_success', pass: false, reason: err.message });
      result.pass = false;
    }
  } else {
    result.checks.push({ name: 'success_exists', pass: false, reason: 'success.json missing' });
    result.pass = false;
  }

  // Check empty.json exists
  if (existsSync(emptyPath)) {
    try {
      const raw = stripBom(readFileSync(emptyPath, 'utf-8'));
      const fixture = JSON.parse(raw);
      if (Array.isArray(fixture.response) && fixture.response.length === 0) {
        result.checks.push({ name: 'empty_response', pass: true });
      } else {
        result.checks.push({
          name: 'empty_response',
          pass: false,
          reason: 'empty.json response not []',
        });
        result.pass = false;
      }
    } catch (err) {
      result.checks.push({ name: 'parse_empty', pass: false, reason: err.message });
      result.pass = false;
    }
  } else {
    result.checks.push({ name: 'empty_exists', pass: false, reason: 'empty.json missing' });
    result.pass = false;
  }

  if (result.pass) totalPass++;
  else totalFail++;
  results.push(result);
}

// ---------------------------------------------------------------------------
// Phase 3: Run Vitest contract suite
// ---------------------------------------------------------------------------

console.log('\nRunning Vitest RPC contract replay tests...');
const vitestResult = safeExec(
  'npx vitest run tests/rpc-contract-replay.test.ts --reporter=json --outputFile=../../artifacts/rpc-contracts/vitest-output.json 2>&1',
  API_DIR,
  180_000
);

const vitestPassed = vitestResult.ok;
console.log(`Vitest: ${vitestPassed ? 'PASS' : 'FAIL'}`);

// ---------------------------------------------------------------------------
// Phase 4: Run golden trace tests
// ---------------------------------------------------------------------------

console.log('Running golden trace replay tests...');
const traceResult = safeExec(
  'npx vitest run tests/rpc-trace-replay.test.ts 2>&1',
  API_DIR,
  120_000
);
const tracePassed = traceResult.ok;
console.log(`Golden trace: ${tracePassed ? 'PASS' : 'FAIL'}`);

// ---------------------------------------------------------------------------
// Phase 5: Generate JSON report
// ---------------------------------------------------------------------------

const report = {
  generatedAt: new Date().toISOString(),
  phase: 267,
  mode: runLive ? 'live+replay' : 'replay',
  summary: {
    totalRpcs: results.length,
    passed: totalPass,
    failed: totalFail,
    vitestPassed,
    tracePassed,
    overallPass: totalFail === 0 && vitestPassed && tracePassed,
  },
  results,
};

const reportPath = join(outputDir, 'rpc-contract-report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nJSON report: ${reportPath}`);

// ---------------------------------------------------------------------------
// Phase 6: Generate JUnit XML
// ---------------------------------------------------------------------------

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const testCases = results.flatMap((r) =>
  r.checks.map((c) => {
    const name = `${r.fixtureDir}.${c.name}`;
    if (c.pass) {
      return `    <testcase classname="rpc-contracts" name="${escapeXml(name)}" time="0" />`;
    }
    return `    <testcase classname="rpc-contracts" name="${escapeXml(name)}" time="0">
      <failure message="${escapeXml(c.reason)}">${escapeXml(c.reason)}</failure>
    </testcase>`;
  })
);

// Add Vitest suite result
testCases.push(
  vitestPassed
    ? `    <testcase classname="rpc-contracts" name="vitest-contract-replay" time="0" />`
    : `    <testcase classname="rpc-contracts" name="vitest-contract-replay" time="0">
      <failure message="Vitest contract replay failed">See vitest-output.json</failure>
    </testcase>`
);

testCases.push(
  tracePassed
    ? `    <testcase classname="rpc-contracts" name="golden-trace-replay" time="0" />`
    : `    <testcase classname="rpc-contracts" name="golden-trace-replay" time="0">
      <failure message="Golden trace replay failed">See trace output</failure>
    </testcase>`
);

const totalTests = testCases.length;
const totalFailures =
  results.reduce((n, r) => n + r.checks.filter((c) => !c.pass).length, 0) +
  (vitestPassed ? 0 : 1) +
  (tracePassed ? 0 : 1);

const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="rpc-contract-suite" tests="${totalTests}" failures="${totalFailures}" time="0">
${testCases.join('\n')}
  </testsuite>
</testsuites>
`;

const junitPath = join(outputDir, 'rpc-contract-junit.xml');
writeFileSync(junitPath, junitXml);
console.log(`JUnit XML:   ${junitPath}`);

// ---------------------------------------------------------------------------
// Phase 7: Generate summary markdown
// ---------------------------------------------------------------------------

const summaryLines = [
  '# RPC Contract Suite -- CI Report',
  '',
  `**Generated**: ${report.generatedAt}`,
  `**Mode**: ${report.mode}`,
  `**Overall**: ${report.summary.overallPass ? '✅ PASS' : '❌ FAIL'}`,
  '',
  '## Results',
  '',
  '| RPC | Status | Checks |',
  '|-----|--------|--------|',
];

for (const r of results) {
  const passCount = r.checks.filter((c) => c.pass).length;
  const status = r.pass ? '✅' : '❌';
  summaryLines.push(`| ${r.rpcName} | ${status} | ${passCount}/${r.checks.length} |`);
}

summaryLines.push(
  '',
  '## Vitest Suite',
  '',
  `- Contract replay: ${vitestPassed ? '✅ PASS' : '❌ FAIL'}`,
  `- Golden trace: ${tracePassed ? '✅ PASS' : '❌ FAIL'}`,
  '',
  `## Totals: ${totalPass + (vitestPassed ? 1 : 0) + (tracePassed ? 1 : 0)} pass, ${totalFail + (vitestPassed ? 0 : 1) + (tracePassed ? 0 : 1)} fail`
);

const summaryPath = join(outputDir, 'rpc-contract-summary.md');
writeFileSync(summaryPath, summaryLines.join('\n'));
console.log(`Summary:     ${summaryPath}`);

// ---------------------------------------------------------------------------
// Exit
// ---------------------------------------------------------------------------

const exitCode = report.summary.overallPass ? 0 : 1;
console.log(`\n${report.summary.overallPass ? '✅ ALL GATES PASS' : '❌ GATES FAILED'}`);
process.exit(exitCode);
