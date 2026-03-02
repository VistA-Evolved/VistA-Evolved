#!/usr/bin/env node
// scripts/qa/simulate-outage.mjs
// Phase 503 -- VistA Outage Simulation (offline pattern check)
// Validates that all RC_EXIT_CRITERIA downtime behaviors are architecturally present.
//
// Offline mode (default): checks file patterns only, no API needed
// Live mode (--live):     actually calls /admin/circuit-breaker/force-open, checks /health, /ready
//
// Usage:
//   node scripts/qa/simulate-outage.mjs              # offline pattern check
//   node scripts/qa/simulate-outage.mjs --live       # live API simulation

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const isLive = process.argv.includes('--live');

let failures = 0;
let passes = 0;
const results = [];

function check(label, ok, detail) {
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${label}${detail ? ' -- ' + detail : ''}`);
  if (ok) passes++; else failures++;
  results.push({ label, status: tag, detail: detail || '' });
}

console.log('=== VistA Outage Simulation (Phase 503) ===');
console.log(`  Mode: ${isLive ? 'LIVE' : 'OFFLINE (pattern check)'}\n`);

// ---- Offline checks (file pattern validation) ----

// Check 1: /health always returns ok:true
const inlineR = resolve(root, 'apps/api/src/server/inline-routes.ts');
if (existsSync(inlineR)) {
  const src = readFileSync(inlineR, 'utf8');
  check('/health returns ok:true unconditionally',
    src.includes('ok: true') && src.includes('/health'),
    'inline-routes.ts');
  check('/ready checks circuit breaker state',
    src.includes('circuitBreaker') && src.includes('/ready'),
    'inline-routes.ts');
  check('Admin force-open endpoint exists',
    src.includes('force-open'),
    'POST /admin/circuit-breaker/force-open');
  check('Admin reset endpoint exists',
    src.includes('circuit-breaker/reset'),
    'POST /admin/circuit-breaker/reset');
} else {
  check('inline-routes.ts exists', false, inlineR);
}

// Check 2: Circuit breaker has forceOpen
const resilience = resolve(root, 'apps/api/src/lib/rpc-resilience.ts');
if (existsSync(resilience)) {
  const src = readFileSync(resilience, 'utf8');
  check('forceOpenCircuitBreaker() exists',
    src.includes('forceOpenCircuitBreaker'),
    'rpc-resilience.ts');
  check('CircuitOpenError is exported',
    src.includes('CircuitOpenError'),
    'rpc-resilience.ts');
} else {
  check('rpc-resilience.ts exists', false, resilience);
}

// Check 3: DegradedBanner polls /ready
const banner = resolve(root, 'apps/web/src/components/cprs/DegradedBanner.tsx');
if (existsSync(banner)) {
  const src = readFileSync(banner, 'utf8');
  check('DegradedBanner polls /ready',
    src.includes('/ready'),
    'DegradedBanner.tsx');
  check('DegradedBanner shows degraded state',
    src.includes('degraded') || src.includes('unreachable'),
    'DegradedBanner.tsx');
  check('DegradedBanner exports useSystemStatus',
    src.includes('useSystemStatus'),
    'DegradedBanner.tsx');
} else {
  check('DegradedBanner.tsx exists', false, banner);
}

// Check 4: DegradedBanner is used in layout
const layout = resolve(root, 'apps/web/src/app/cprs/layout.tsx');
if (existsSync(layout)) {
  const src = readFileSync(layout, 'utf8');
  check('DegradedBanner integrated in CPRS layout',
    src.includes('DegradedBanner'),
    'cprs/layout.tsx');
} else {
  check('cprs/layout.tsx exists', false, layout);
}

// Check 5: RC_EXIT_CRITERIA.md documents downtime behavior
const exitCriteria = resolve(root, 'docs/release/RC_EXIT_CRITERIA.md');
if (existsSync(exitCriteria)) {
  const src = readFileSync(exitCriteria, 'utf8');
  check('Exit criteria documents downtime behavior',
    src.includes('Downtime') || src.includes('downtime') || src.includes('outage'),
    'RC_EXIT_CRITERIA.md');
} else {
  check('RC_EXIT_CRITERIA.md exists', false, exitCriteria);
}

// ---- Live checks (requires running API) ----
if (isLive) {
  console.log('\n  --- Live Simulation ---');
  const API = process.env.API_BASE || 'http://127.0.0.1:3001';

  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API}${path}`, { ...opts, signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    return { status: res.status, body };
  }

  try {
    // Step 1: Verify /health is ok
    const h1 = await apiFetch('/health');
    check('[LIVE] /health returns 200 + ok:true before outage', h1.status === 200 && h1.body.ok === true);

    // Step 2: Force-open circuit breaker
    const fo = await apiFetch('/admin/circuit-breaker/force-open', { method: 'POST' });
    check('[LIVE] Force-open CB returns ok:true', fo.body.ok === true);

    // Step 3: /health still ok
    const h2 = await apiFetch('/health');
    check('[LIVE] /health still 200 during outage', h2.status === 200 && h2.body.ok === true);

    // Step 4: /ready shows not ok
    const r1 = await apiFetch('/ready');
    check('[LIVE] /ready returns ok:false during outage', r1.body.ok === false);
    check('[LIVE] /ready shows CB open', r1.body.circuitBreaker === 'open');

    // Step 5: Reset circuit breaker
    const rs = await apiFetch('/admin/circuit-breaker/reset', { method: 'POST' });
    check('[LIVE] CB reset returns ok:true', rs.body.ok === true);

    // Step 6: /ready recovers
    const r2 = await apiFetch('/ready');
    check('[LIVE] /ready shows CB closed after reset', r2.body.circuitBreaker === 'closed');
  } catch (e) {
    check('[LIVE] API reachable', false, e.message);
  }
}

// ---- Summary ----
console.log(`\n=== Outage Simulation: ${passes} pass, ${failures} fail ===`);

// Write report
const evDir = resolve(root, 'evidence/wave-35/503-W35-P4-DOWNTIME-MODE');
mkdirSync(evDir, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  mode: isLive ? 'live' : 'offline',
  passes,
  failures,
  results
};
writeFileSync(resolve(evDir, 'outage-sim-report.json'), JSON.stringify(report, null, 2));

process.exit(failures === 0 ? 0 : 1);
