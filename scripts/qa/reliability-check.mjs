#!/usr/bin/env node
// scripts/qa/reliability-check.mjs
// Phase 505 -- Unified reliability posture check (offline)
// Validates that restart durability, graceful shutdown, CB recovery,
// and store policy patterns are in place.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

let failures = 0;
let passes = 0;
const results = [];

function check(label, ok, detail) {
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${label}${detail ? ' -- ' + detail : ''}`);
  if (ok) passes++; else failures++;
  results.push({ label, status: tag, detail: detail || '' });
}

function fileContains(rel, ...patterns) {
  const p = resolve(root, rel);
  if (!existsSync(p)) return false;
  const src = readFileSync(p, 'utf8');
  return patterns.every(pat => src.includes(pat));
}

console.log('=== Reliability Posture Check (Phase 505) ===\n');

// 1. Graceful shutdown
check('Graceful shutdown handler exists',
  fileContains('apps/api/src/middleware/security.ts', 'SIGINT', 'SIGTERM'),
  'security.ts');

check('Shutdown disconnects RPC broker',
  fileContains('apps/api/src/middleware/security.ts', 'disconnectRpcBroker'),
  'security.ts');

check('Shutdown drain timeout configurable',
  fileContains('apps/api/src/middleware/security.ts', 'SHUTDOWN_DRAIN_TIMEOUT'),
  'security.ts');

// 2. Circuit breaker
check('Circuit breaker with 3 states',
  fileContains('apps/api/src/lib/rpc-resilience.ts', 'closed', 'open', 'half-open'),
  'rpc-resilience.ts');

check('Circuit breaker admin reset',
  fileContains('apps/api/src/lib/rpc-resilience.ts', 'resetCircuitBreaker'),
  'rpc-resilience.ts');

check('Circuit breaker force-open (outage sim)',
  fileContains('apps/api/src/lib/rpc-resilience.ts', 'forceOpenCircuitBreaker'),
  'rpc-resilience.ts');

check('Circuit breaker Prometheus metrics',
  fileContains('apps/api/src/telemetry/metrics.ts', 'circuit_breaker'),
  'metrics.ts');

// 3. Store policy
check('Store policy registry exists',
  existsSync(resolve(root, 'apps/api/src/platform/store-policy.ts')),
  'store-policy.ts');

check('Store policy tracks in-memory stores',
  fileContains('apps/api/src/platform/store-policy.ts', 'in_memory'),
  'store-policy.ts');

// 4. Restart durability gate scripts
check('restart-chaos-gate.mjs exists',
  existsSync(resolve(root, 'scripts/qa-gates/restart-chaos-gate.mjs')),
  'scripts/qa-gates/');

check('restart-durability.mjs exists',
  existsSync(resolve(root, 'scripts/qa-gates/restart-durability.mjs')),
  'scripts/qa-gates/');

// 5. Health/Ready probes
check('/health liveness probe (always 200)',
  fileContains('apps/api/src/server/inline-routes.ts', '/health', 'ok: true'),
  'inline-routes.ts');

check('/ready readiness probe (CB-gated)',
  fileContains('apps/api/src/server/inline-routes.ts', '/ready', 'circuitBreaker'),
  'inline-routes.ts');

// 6. DegradedBanner for UI resilience
check('DegradedBanner polls /ready',
  fileContains('apps/web/src/components/cprs/DegradedBanner.tsx', '/ready', 'degraded'),
  'DegradedBanner.tsx');

// 7. Backup/restore script
check('backup-restore.mjs exists',
  existsSync(resolve(root, 'scripts/backup-restore.mjs')),
  'scripts/');

// 8. Performance budgets config
check('performance-budgets.json exists',
  existsSync(resolve(root, 'config/performance-budgets.json')),
  'config/');

console.log(`\n=== Reliability: ${passes} pass, ${failures} fail ===`);

// Write report
const evDir = resolve(root, 'evidence/wave-35/505-W35-P6-RELIABILITY-CHAOS');
mkdirSync(evDir, { recursive: true });
writeFileSync(resolve(evDir, 'reliability-report.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), passes, failures, results }, null, 2));

process.exit(failures === 0 ? 0 : 1);
