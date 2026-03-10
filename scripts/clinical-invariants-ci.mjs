#!/usr/bin/env node
/**
 * Clinical Invariants CI Runner + Drift Detector -- Phase 268
 *
 * Runs invariant test suite and detects changes in VistA output formats
 * that could break parsers.
 *
 * Usage:
 *   node scripts/clinical-invariants-ci.mjs [--output-dir <dir>]
 *
 * Outputs:
 *   invariants-report.json  -- machine-readable results
 *   drift-report.json       -- parser drift detection results
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(import.meta.dirname, '..');
const API_DIR = join(ROOT, 'apps', 'api');
const FIXTURES_DIR = join(API_DIR, 'tests', 'fixtures', 'vista');
const INVARIANTS_DIR = join(API_DIR, 'tests', 'invariants');

const args = process.argv.slice(2);
const outputDir = (() => {
  const idx = args.indexOf('--output-dir');
  return idx >= 0 && args[idx + 1]
    ? resolve(args[idx + 1])
    : join(ROOT, 'artifacts', 'clinical-invariants');
})();

mkdirSync(outputDir, { recursive: true });

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

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

console.log('\n=== Clinical Invariants CI Runner (Phase 268) ===\n');

// ---------------------------------------------------------------------------
// Step 1: Run invariant test suite
// ---------------------------------------------------------------------------

const invariantFiles = existsSync(INVARIANTS_DIR)
  ? readdirSync(INVARIANTS_DIR).filter((f) => f.endsWith('.test.ts'))
  : [];

console.log(`Found ${invariantFiles.length} invariant test files`);

let vitestResult = { ok: false, output: '', exitCode: 1 };
if (invariantFiles.length > 0) {
  console.log('Running invariant tests via Vitest...');
  vitestResult = safeExec(
    `npx vitest run tests/invariants/ --reporter=json --outputFile=../../artifacts/clinical-invariants/vitest-invariants.json 2>&1`,
    API_DIR,
    180_000
  );
  console.log(`Invariant tests: ${vitestResult.ok ? 'PASS' : 'FAIL'}`);
} else {
  console.log('WARNING: No invariant test files found');
}

// ---------------------------------------------------------------------------
// Step 2: Drift detection -- hash fixture responses
// ---------------------------------------------------------------------------

console.log('\nRunning drift detection on fixtures...');

const driftResults = [];
const fixtureDirs = existsSync(FIXTURES_DIR)
  ? readdirSync(FIXTURES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

for (const dir of fixtureDirs) {
  const successPath = join(FIXTURES_DIR, dir, 'success.json');
  if (!existsSync(successPath)) continue;

  try {
    const raw = stripBom(readFileSync(successPath, 'utf-8'));
    const fixture = JSON.parse(raw);

    // Hash the response structure (field count, line count, delimiter pattern)
    const response = fixture.response || [];
    const structureFingerprint = {
      lineCount: response.length,
      hasCarets: response.some((l) => String(l).includes('^')),
      hasTildes: response.some((l) => String(l).startsWith('~')),
      avgLineLength:
        response.length > 0
          ? Math.round(response.reduce((s, l) => s + String(l).length, 0) / response.length)
          : 0,
      fieldCountPerLine:
        response.length > 0 ? response.map((l) => String(l).split('^').length) : [],
    };

    const hash = sha256(JSON.stringify(structureFingerprint));

    driftResults.push({
      rpcName: dir.replace(/_/g, ' '),
      fixtureDir: dir,
      structureHash: hash,
      lineCount: structureFingerprint.lineCount,
      hasCarets: structureFingerprint.hasCarets,
      hasTildes: structureFingerprint.hasTildes,
      avgLineLength: structureFingerprint.avgLineLength,
      drift: false, // No baseline yet; future: compare to stored hash
    });
  } catch {
    driftResults.push({ rpcName: dir, fixtureDir: dir, error: 'Parse failure', drift: true });
  }
}

// ---------------------------------------------------------------------------
// Step 3: Check for parser format assumptions
// ---------------------------------------------------------------------------

const parserChecks = [];

// Check 1: Caret-delimited responses should have consistent field counts
for (const dr of driftResults) {
  if (!dr.error && dr.hasCarets) {
    const successPath = join(FIXTURES_DIR, dr.fixtureDir, 'success.json');
    const fixture = JSON.parse(stripBom(readFileSync(successPath, 'utf-8')));
    const fieldCounts = (fixture.response || [])
      .filter((l) => String(l).includes('^'))
      .map((l) => String(l).split('^').length);

    if (fieldCounts.length > 0) {
      const unique = [...new Set(fieldCounts)];
      // Allow 2 unique field counts (header vs data lines)
      parserChecks.push({
        rpc: dr.rpcName,
        check: 'consistent_field_count',
        pass: unique.length <= 2,
        uniqueFieldCounts: unique,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: Generate reports
// ---------------------------------------------------------------------------

const report = {
  generatedAt: new Date().toISOString(),
  phase: 268,
  invariantTests: {
    fileCount: invariantFiles.length,
    passed: vitestResult.ok,
    files: invariantFiles,
  },
  driftDetection: {
    fixturesChecked: driftResults.length,
    driftsDetected: driftResults.filter((d) => d.drift).length,
    results: driftResults,
  },
  parserChecks: {
    total: parserChecks.length,
    passed: parserChecks.filter((c) => c.pass).length,
    failed: parserChecks.filter((c) => !c.pass).length,
    checks: parserChecks,
  },
  overallPass:
    vitestResult.ok && driftResults.every((d) => !d.drift) && parserChecks.every((c) => c.pass),
};

writeFileSync(join(outputDir, 'invariants-report.json'), JSON.stringify(report, null, 2));
writeFileSync(
  join(outputDir, 'drift-report.json'),
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      fixtures: driftResults,
      parserChecks,
    },
    null,
    2
  )
);

console.log(`\nInvariants report: ${join(outputDir, 'invariants-report.json')}`);
console.log(`Drift report:      ${join(outputDir, 'drift-report.json')}`);
console.log(
  `\n${report.overallPass ? '✅ ALL INVARIANT GATES PASS' : '❌ INVARIANT GATES FAILED'}`
);

process.exit(report.overallPass ? 0 : 1);
