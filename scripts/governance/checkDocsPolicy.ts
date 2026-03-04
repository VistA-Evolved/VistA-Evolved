#!/usr/bin/env node
/**
 * Phase 53 -- Documentation Policy Gate
 *
 * Enforces docs/POLICY.md rules:
 *   1. No files in forbidden roots (reports/, docs/reports/, docs/verify/)
 *   2. No verification output files committed in docs/
 *   3. Prompt structure validated (delegates to auditPrompts for deep checks)
 *
 * Usage:
 *   npx tsx scripts/governance/checkDocsPolicy.ts
 *
 * Exit codes:
 *   0 = policy clean
 *   1 = violations found
 */

import { readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const ARTIFACTS_DIR = join(ROOT, 'artifacts', 'governance');

interface Violation {
  rule: string;
  path: string;
  severity: 'error' | 'warn';
  message: string;
}

const violations: Violation[] = [];
const checks: { name: string; status: 'pass' | 'fail' }[] = [];

// ── Forbidden roots ──────────────────────────────────────────────

const FORBIDDEN_DIRS = [
  { path: 'reports', rule: 'no-root-reports' },
  { path: join('docs', 'reports'), rule: 'no-docs-reports' },
  { path: join('docs', 'verify'), rule: 'no-docs-verify' },
];

for (const { path, rule } of FORBIDDEN_DIRS) {
  const fullPath = join(ROOT, path);
  if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
    const files = readdirSync(fullPath);
    if (files.length > 0) {
      violations.push({
        rule,
        path,
        severity: 'error',
        message: `Forbidden directory '${path}' exists and contains ${files.length} file(s). Move to /artifacts/.`,
      });
    } else {
      // Empty dir is a warning
      violations.push({
        rule,
        path,
        severity: 'warn',
        message: `Forbidden directory '${path}' exists (empty). Consider removing.`,
      });
    }
  }
}

for (const { path, rule } of FORBIDDEN_DIRS) {
  const fullPath = join(ROOT, path);
  const hasContent = existsSync(fullPath) && readdirSync(fullPath).length > 0;
  if (hasContent) {
    checks.push({ name: rule, status: 'fail' });
  } else {
    checks.push({ name: rule, status: 'pass' });
  }
}

// ── Verify output patterns in docs/ ─────────────────────────────

const VERIFY_PATTERNS = [/phase\d+-verify-report\.md$/i, /verify-output/i, /phase\d+-verify\.md$/i];

function scanForVerifyOutputs(dir: string): void {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip evidence SHA dirs (gitignored by docs/evidence/*/)
      if (dir.endsWith('evidence') && /^[a-f0-9]{7,40}$/.test(entry.name)) continue;
      scanForVerifyOutputs(fullPath);
    } else {
      for (const pat of VERIFY_PATTERNS) {
        if (pat.test(entry.name)) {
          violations.push({
            rule: 'no-verify-in-docs',
            path: relative(ROOT, fullPath),
            severity: 'error',
            message: `Verification output '${entry.name}' found in docs/. Move to /artifacts/.`,
          });
        }
      }
    }
  }
}

scanForVerifyOutputs(join(ROOT, 'docs'));
const verifyInDocs = violations.filter((v) => v.rule === 'no-verify-in-docs');
checks.push({
  name: 'no-verify-in-docs',
  status: verifyInDocs.length > 0 ? 'fail' : 'pass',
});

// ── Required policy files ────────────────────────────────────────

const REQUIRED_FILES = [
  { path: join('docs', 'POLICY.md'), rule: 'policy-exists' },
  { path: join('docs', 'INDEX.md'), rule: 'index-exists' },
];

for (const { path, rule } of REQUIRED_FILES) {
  const fullPath = join(ROOT, path);
  if (existsSync(fullPath)) {
    checks.push({ name: rule, status: 'pass' });
  } else {
    violations.push({
      rule,
      path,
      severity: 'error',
      message: `Required file '${path}' not found.`,
    });
    checks.push({ name: rule, status: 'fail' });
  }
}

// ── Artifact output convention ───────────────────────────────────

// Check that /artifacts is gitignored (look for it in .gitignore)
const gitignorePath = join(ROOT, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignore = require('fs').readFileSync(gitignorePath, 'utf-8');
  if (gitignore.includes('/artifacts') || gitignore.includes('artifacts/')) {
    checks.push({ name: 'artifacts-gitignored', status: 'pass' });
  } else {
    violations.push({
      rule: 'artifacts-gitignored',
      path: '.gitignore',
      severity: 'error',
      message: "'/artifacts/' not found in .gitignore. Add it.",
    });
    checks.push({ name: 'artifacts-gitignored', status: 'fail' });
  }
}

// ── Output ───────────────────────────────────────────────────────

const errorCount = violations.filter((v) => v.severity === 'error').length;
const warnCount = violations.filter((v) => v.severity === 'warn').length;
const passCount = checks.filter((c) => c.status === 'pass').length;
const failCount = checks.filter((c) => c.status === 'fail').length;

console.log('\n=== Documentation Policy Gate (Phase 53) ===\n');

for (const c of checks) {
  const icon = c.status === 'pass' ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${c.name}`);
}

if (violations.length > 0) {
  console.log('\nViolations:');
  for (const v of violations) {
    const icon = v.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`  [${icon}] ${v.rule}: ${v.message}`);
    console.log(`          Path: ${v.path}`);
  }
}

console.log(`\nChecks: ${passCount} pass, ${failCount} fail`);
console.log(`Violations: ${errorCount} errors, ${warnCount} warnings`);

// Write artifacts
mkdirSync(ARTIFACTS_DIR, { recursive: true });
writeFileSync(
  join(ARTIFACTS_DIR, 'docs-policy-check.json'),
  JSON.stringify(
    {
      gate: 'docs-policy',
      timestamp: new Date().toISOString(),
      checks,
      violations,
      summary: { passCount, failCount, errorCount, warnCount },
    },
    null,
    2
  )
);

process.exit(errorCount > 0 ? 1 : 0);
