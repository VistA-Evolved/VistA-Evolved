#!/usr/bin/env node
/**
 * scripts/qa-gates/prod-posture.mjs -- Phase 107: Production Posture QA Gate
 *
 * Offline checks that validate production readiness without requiring a running API.
 * For live posture checks, use the /posture endpoints instead.
 *
 * Gates:
 *  1. Posture modules exist (5 files)
 *  2. Backup script exists
 *  3. Performance budgets file valid
 *  4. Runbook exists
 *  5. Tenant RLS infrastructure exists (pg-migrate applyRlsPolicies)
 *  6. Structured logger module exists
 *  7. Prometheus metrics module exists
 *  8. OTel tracing module exists
 *  9. Audit module exists
 * 10. Security middleware exists
 * 11. No console.log in posture modules
 *
 * Exit: 0 = all pass, 1 = failures
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const results = [];
let failures = 0;

function gate(name, pass, detail) {
  results.push({ name, pass, detail });
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
}

function fileExists(rel) {
  return existsSync(join(ROOT, rel));
}

console.log('\n=== QA Gate: Production Posture (Phase 107) ===\n');

// 1. Posture module files
const postureFiles = [
  'apps/api/src/posture/index.ts',
  'apps/api/src/posture/observability-posture.ts',
  'apps/api/src/posture/tenant-posture.ts',
  'apps/api/src/posture/perf-posture.ts',
  'apps/api/src/posture/backup-posture.ts',
];
for (const f of postureFiles) {
  gate(`posture module: ${f.split('/').pop()}`, fileExists(f), f);
}

// 2. Backup script
gate(
  'backup-restore script',
  fileExists('scripts/backup-restore.mjs'),
  'scripts/backup-restore.mjs'
);

// 3. Performance budgets
const budgetsPath = 'config/performance-budgets.json';
let budgetsValid = false;
try {
  const raw = readFileSync(join(ROOT, budgetsPath), 'utf-8');
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip BOM
  const obj = JSON.parse(clean);
  budgetsValid = obj && typeof obj === 'object' && Object.keys(obj).length > 0;
} catch {}
gate('performance-budgets.json valid', budgetsValid, budgetsPath);

// 4. Runbook
gate(
  'production posture runbook',
  fileExists('docs/runbooks/phase107-production-posture.md'),
  'docs/runbooks/phase107-production-posture.md'
);

// 5. Tenant RLS infrastructure
const rlsInfra = fileExists('apps/api/src/platform/pg/pg-migrate.ts');
let rlsFnExists = false;
if (rlsInfra) {
  try {
    const src = readFileSync(join(ROOT, 'apps/api/src/platform/pg/pg-migrate.ts'), 'utf-8');
    rlsFnExists = src.includes('applyRlsPolicies');
  } catch {}
}
gate('tenant RLS infrastructure (applyRlsPolicies)', rlsFnExists, 'pg-migrate.ts');

// 6. Structured logger
gate('structured logger', fileExists('apps/api/src/lib/logger.ts'), 'lib/logger.ts');

// 7. Prometheus metrics
gate('prometheus metrics', fileExists('apps/api/src/telemetry/metrics.ts'), 'telemetry/metrics.ts');

// 8. OTel tracing
gate('otel tracing', fileExists('apps/api/src/telemetry/tracing.ts'), 'telemetry/tracing.ts');

// 9. Audit module
gate('audit module', fileExists('apps/api/src/lib/audit.ts'), 'lib/audit.ts');

// 10. Security middleware
gate(
  'security middleware',
  fileExists('apps/api/src/middleware/security.ts'),
  'middleware/security.ts'
);

// 11. No console.log in posture modules
let consoleLogCount = 0;
for (const f of postureFiles) {
  try {
    const src = readFileSync(join(ROOT, f), 'utf-8');
    const matches = src.match(/console\.(log|warn|error)/g);
    if (matches) consoleLogCount += matches.length;
  } catch {}
}
gate(
  'no console.log in posture modules',
  consoleLogCount === 0,
  `found ${consoleLogCount} console calls`
);

// ---- Summary ----
console.log(
  `\n=== Prod-Posture QA: ${results.length} gates, ${results.length - failures} pass, ${failures} fail ===\n`
);

if (failures > 0) {
  console.log('Failed gates:');
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  - ${r.name}`);
  }
  console.log('');
}

process.exit(failures > 0 ? 1 : 0);
