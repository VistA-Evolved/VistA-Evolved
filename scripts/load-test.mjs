#!/usr/bin/env node
/**
 * Phase 16: Load test harness — smoke performance check.
 *
 * Hits key API endpoints concurrently and prints latency summary.
 * No external dependencies (uses Node fetch).
 *
 * Usage:
 *   node scripts/load-test.mjs [--base http://127.0.0.1:3001] [--concurrency 5] [--rounds 10]
 *
 * Requires a running API server with valid VistA credentials.
 */

const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
}

const BASE = getArg('--base', 'http://127.0.0.1:3001');
const CONCURRENCY = parseInt(getArg('--concurrency', '5'), 10);
const ROUNDS = parseInt(getArg('--rounds', '10'), 10);

/** Endpoints to test (public + authenticated) */
const ENDPOINTS = [
  { name: 'GET /health', path: '/health', auth: false },
  { name: 'GET /ready', path: '/ready', auth: false },
  { name: 'GET /metrics', path: '/metrics', auth: false },
  { name: 'GET /version', path: '/version', auth: false },
];

/** Authenticated endpoints (need session cookie) */
const AUTH_ENDPOINTS = [
  { name: 'GET /vista/default-patient-list', path: '/vista/default-patient-list', auth: true },
  {
    name: 'GET /vista/patient-search?term=CARTER',
    path: '/vista/patient-search?term=CARTER',
    auth: true,
  },
];

/** Results storage */
const results = {};

function initResults(name) {
  results[name] = { total: 0, success: 0, errors: 0, latencies: [] };
}

async function hitEndpoint(endpoint, cookie) {
  const url = `${BASE}${endpoint.path}`;
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;

  const start = performance.now();
  try {
    const res = await fetch(url, { headers });
    const elapsed = performance.now() - start;
    const r = results[endpoint.name];
    r.total++;
    r.latencies.push(elapsed);
    if (res.ok) {
      r.success++;
    } else {
      r.errors++;
    }
  } catch (err) {
    const elapsed = performance.now() - start;
    const r = results[endpoint.name];
    r.total++;
    r.errors++;
    r.latencies.push(elapsed);
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('  LOAD TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`  Base URL: ${BASE}`);
  console.log(`  Concurrency: ${CONCURRENCY}  |  Rounds: ${ROUNDS}`);
  console.log('-'.repeat(80));
  console.log(
    '  Endpoint'.padEnd(45) +
      'Total'.padStart(6) +
      'OK'.padStart(6) +
      'Err'.padStart(6) +
      'Avg(ms)'.padStart(10) +
      'P50(ms)'.padStart(10) +
      'P95(ms)'.padStart(10)
  );
  console.log('-'.repeat(80));

  let allOk = true;
  for (const [name, r] of Object.entries(results)) {
    const avg =
      r.latencies.length > 0 ? r.latencies.reduce((a, b) => a + b, 0) / r.latencies.length : 0;
    const p50 = percentile(r.latencies, 50);
    const p95 = percentile(r.latencies, 95);

    if (r.errors > 0) allOk = false;

    console.log(
      `  ${name}`.padEnd(45) +
        `${r.total}`.padStart(6) +
        `${r.success}`.padStart(6) +
        `${r.errors}`.padStart(6) +
        `${avg.toFixed(1)}`.padStart(10) +
        `${p50.toFixed(1)}`.padStart(10) +
        `${p95.toFixed(1)}`.padStart(10)
    );
  }

  console.log('='.repeat(80));
  console.log(allOk ? '  ✓ All endpoints healthy' : '  ✗ Some endpoints had errors');
  console.log('');

  return allOk;
}

async function login() {
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: process.env.VISTA_ACCESS_CODE || 'PROV123',
        verifyCode: process.env.VISTA_VERIFY_CODE || 'PROV123!!',
      }),
    });

    // Extract Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Extract just the cookie name=value
      const match = setCookie.match(/^([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch (err) {
    console.error('  Login failed:', err.message);
    return null;
  }
}

async function main() {
  console.log('Phase 16 — Load Test Harness');
  console.log(`  Target: ${BASE}`);
  console.log(`  Concurrency: ${CONCURRENCY}, Rounds: ${ROUNDS}\n`);

  // Initialize results
  for (const ep of [...ENDPOINTS, ...AUTH_ENDPOINTS]) {
    initResults(ep.name);
  }

  // Login for authenticated endpoints
  console.log('  Authenticating...');
  const cookie = await login();
  if (!cookie) {
    console.log('  ⚠ Login failed — will only test public endpoints.\n');
  } else {
    console.log('  ✓ Authenticated successfully.\n');
  }

  // Run rounds
  for (let round = 0; round < ROUNDS; round++) {
    process.stdout.write(`  Round ${round + 1}/${ROUNDS}...\r`);

    const batch = [];

    // Public endpoints
    for (let c = 0; c < CONCURRENCY; c++) {
      for (const ep of ENDPOINTS) {
        batch.push(hitEndpoint(ep, null));
      }
    }

    // Auth endpoints (if we have a cookie)
    if (cookie) {
      for (let c = 0; c < CONCURRENCY; c++) {
        for (const ep of AUTH_ENDPOINTS) {
          batch.push(hitEndpoint(ep, cookie));
        }
      }
    }

    await Promise.all(batch);
  }

  const ok = printResults();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('Load test error:', err);
  process.exit(1);
});
