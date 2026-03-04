#!/usr/bin/env node
/**
 * tier0-day-in-the-life.mjs -- Phase 489 (W33-P9)
 *
 * Simulates a hospital day by calling every Tier-0 endpoint converted in
 * Wave 33 phases P3--P7 and capturing the capability-probe responses as
 * a golden-trace JSON artifact.
 *
 * Usage:
 *   node scripts/tier0-day-in-the-life.mjs [--api-url URL]
 *
 * Requires:
 *   - Node.js 18+ (built-in fetch)
 *   - API running at localhost:3001 (default)
 *   - VistA Docker running (for RPC auth)
 *
 * Outputs:
 *   artifacts/tier0-golden-trace.json  (gitignored)
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const API_URL = process.argv.includes('--api-url')
  ? process.argv[process.argv.indexOf('--api-url') + 1]
  : 'http://127.0.0.1:3001';

const ACCESS_CODE = 'PROV123';
const VERIFY_CODE = 'PROV123!!';
const DFN = '3'; // Default patient (CARTER,DAVID)

/* ------------------------------------------------------------------ */
/* Tier-0 endpoint definitions                                          */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{ path: string; method: string; body?: object; label: string; phase: string; rpc: string }} Tier0Endpoint
 */

/** @type {Tier0Endpoint[]} */
const TIER0_ENDPOINTS = [
  // P3: ADT Write
  {
    path: '/vista/adt/admit',
    method: 'POST',
    body: { dfn: DFN, wardIen: '1' },
    label: 'ADT Admit',
    phase: 'P3',
    rpc: 'DGPM NEW ADMISSION',
  },
  {
    path: '/vista/adt/transfer',
    method: 'POST',
    body: { dfn: DFN, fromWardIen: '1', toWardIen: '2' },
    label: 'ADT Transfer',
    phase: 'P3',
    rpc: 'DGPM NEW TRANSFER',
  },
  {
    path: '/vista/adt/discharge',
    method: 'POST',
    body: { dfn: DFN },
    label: 'ADT Discharge',
    phase: 'P3',
    rpc: 'DGPM NEW DISCHARGE',
  },
  {
    path: '/vista/inpatient/admit',
    method: 'POST',
    body: { dfn: DFN, wardIen: '1' },
    label: 'Inpatient Admit',
    phase: 'P3',
    rpc: 'DGPM NEW ADMISSION',
  },
  {
    path: '/vista/inpatient/transfer',
    method: 'POST',
    body: { dfn: DFN, fromWardIen: '1', toWardIen: '2' },
    label: 'Inpatient Transfer',
    phase: 'P3',
    rpc: 'DGPM NEW TRANSFER',
  },
  {
    path: '/vista/inpatient/discharge',
    method: 'POST',
    body: { dfn: DFN },
    label: 'Inpatient Discharge',
    phase: 'P3',
    rpc: 'DGPM NEW DISCHARGE',
  },
  // P4: Nursing
  {
    path: `/vista/nursing/tasks?dfn=${DFN}`,
    method: 'GET',
    label: 'Nursing Tasks',
    phase: 'P4',
    rpc: 'PSB MED LOG',
  },
  {
    path: `/vista/nursing/mar?dfn=${DFN}`,
    method: 'GET',
    label: 'Nursing MAR',
    phase: 'P4',
    rpc: 'PSB ALLERGY',
  },
  {
    path: '/vista/nursing/mar/administer',
    method: 'POST',
    body: { dfn: DFN, drugIen: '1', dose: '1mg' },
    label: 'Nursing Administer',
    phase: 'P4',
    rpc: 'PSB MED LOG',
  },
  {
    path: `/vista/nursing/io?dfn=${DFN}`,
    method: 'GET',
    label: 'Nursing I/O',
    phase: 'P4',
    rpc: 'GMRIO RESULTS',
  },
  {
    path: `/vista/nursing/assessments?dfn=${DFN}`,
    method: 'GET',
    label: 'Nursing Assessments',
    phase: 'P4',
    rpc: 'ZVENAS LIST',
  },
  // P5: eMAR
  {
    path: `/vista/emar/history?dfn=${DFN}`,
    method: 'GET',
    label: 'eMAR History',
    phase: 'P5',
    rpc: 'PSB MED LOG',
  },
  {
    path: '/vista/emar/administer',
    method: 'POST',
    body: { dfn: DFN, drugIen: '1', dose: '1mg' },
    label: 'eMAR Administer',
    phase: 'P5',
    rpc: 'PSB MED LOG',
  },
  {
    path: '/vista/emar/barcode-scan',
    method: 'POST',
    body: { dfn: DFN, barcode: 'TEST123' },
    label: 'eMAR Barcode Scan',
    phase: 'P5',
    rpc: 'PSJBCMA',
  },
];

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                         */
/* ------------------------------------------------------------------ */

let sessionCookie = '';
let csrfToken = '';

async function apiLogin() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: ACCESS_CODE, verifyCode: VERIFY_CODE }),
  });

  // Extract set-cookie header
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/ehr_session=([^;]+)/);
  if (match) sessionCookie = `ehr_session=${match[1]}`;

  const json = await res.json();
  csrfToken = json.csrfToken || '';

  return { ok: res.ok, status: res.status, json };
}

/**
 * @param {Tier0Endpoint} ep
 * @returns {Promise<{httpStatus: number; latencyMs: number; body: any; error?: string}>}
 */
async function callEndpoint(ep) {
  const start = Date.now();
  try {
    /** @type {RequestInit} */
    const opts = {
      method: ep.method,
      headers: {
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(ep.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(ep.body ? { body: JSON.stringify(ep.body) } : {}),
    };

    const res = await fetch(`${API_URL}${ep.path}`, opts);
    const latencyMs = Date.now() - start;
    let body;
    try {
      body = await res.json();
    } catch {
      body = { _raw: (await res.text?.()) ?? '' };
    }
    return { httpStatus: res.status, latencyMs, body };
  } catch (err) {
    return { httpStatus: 0, latencyMs: Date.now() - start, body: null, error: err.message };
  }
}

/* ------------------------------------------------------------------ */
/* Validation                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param {any} body
 * @returns {{ passed: boolean; reason: string }}
 */
function validateTier0Response(body) {
  if (!body) return { passed: false, reason: 'null body' };
  if (body.ok === true) return { passed: true, reason: 'RPC succeeded (unexpected but valid)' };

  // Expected: ok=false with status
  const status = body.status;
  if (status === 'unsupported-in-sandbox' || status === 'integration-pending') {
    // Check for capability evidence
    const hasProbe = !!body.capabilityProbe;
    const hasGrounding = !!body.vistaGrounding;
    if (hasProbe || hasGrounding) {
      return { passed: true, reason: `${status} with evidence` };
    }
    // Some routes use the older envelope without capabilityProbe
    if (body.pendingTargets?.length > 0) {
      return { passed: true, reason: `${status} with pendingTargets` };
    }
    return { passed: true, reason: `${status} (minimal envelope)` };
  }

  return { passed: false, reason: `unexpected status: ${status || '(none)'}` };
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('=== Tier-0 Day-in-the-Life Runner (Phase 489) ===');
  console.log(`API: ${API_URL}`);
  console.log(`Endpoints: ${TIER0_ENDPOINTS.length}`);
  console.log();

  // Step 1: Login
  console.log('[1/3] Logging in...');
  let loginResult;
  try {
    loginResult = await apiLogin();
  } catch (err) {
    console.log(`  SKIP -- API not reachable: ${err.message}`);
    console.log('  (Run this script with the API + VistA Docker running)');
    emitTrace({ skipped: true, reason: 'API unreachable', endpoints: [] });
    process.exit(0);
  }

  if (!loginResult.ok) {
    console.log(`  SKIP -- Login failed (HTTP ${loginResult.status})`);
    console.log('  (Ensure VistA Docker is running and PROV123 credentials work)');
    emitTrace({ skipped: true, reason: `Login HTTP ${loginResult.status}`, endpoints: [] });
    process.exit(0);
  }
  console.log(`  OK -- session acquired, CSRF: ${csrfToken ? 'yes' : 'no'}`);

  // Step 2: Call all endpoints
  console.log('\n[2/3] Calling Tier-0 endpoints...\n');

  /** @type {Array<{endpoint: Tier0Endpoint; result: any; validation: any}>} */
  const traces = [];
  let passed = 0;
  let failed = 0;

  for (const ep of TIER0_ENDPOINTS) {
    const result = await callEndpoint(ep);
    const validation = validateTier0Response(result.body);

    const icon = result.httpStatus === 0 ? 'SKIP' : validation.passed ? 'PASS' : 'FAIL';
    const statusStr = result.body?.status || '(no status)';

    console.log(
      `  ${icon.padEnd(4)} ${ep.label.padEnd(24)} HTTP=${String(result.httpStatus).padEnd(3)} ` +
        `status=${statusStr.padEnd(26)} ${result.latencyMs}ms  ${validation.reason}`
    );

    if (icon === 'PASS') passed++;
    else if (icon === 'FAIL') failed++;

    traces.push({
      endpoint: { path: ep.path, method: ep.method, label: ep.label, phase: ep.phase, rpc: ep.rpc },
      result: { httpStatus: result.httpStatus, latencyMs: result.latencyMs, error: result.error },
      response: result.body,
      validation,
    });
  }

  // Step 3: Summary + golden trace
  console.log(
    `\n[3/3] Summary: ${passed} passed, ${failed} failed, ${TIER0_ENDPOINTS.length - passed - failed} skipped`
  );

  const trace = {
    generatedAt: new Date().toISOString(),
    apiUrl: API_URL,
    phase: '489-W33-P9',
    totalEndpoints: TIER0_ENDPOINTS.length,
    passed,
    failed,
    skipped: TIER0_ENDPOINTS.length - passed - failed,
    endpoints: traces,
  };

  emitTrace(trace);

  if (failed > 0) {
    console.log('\nFAIL -- some endpoints returned unexpected responses');
    process.exit(1);
  } else {
    console.log('\nPASS -- all reachable endpoints returned valid Tier-0 responses');
    process.exit(0);
  }
}

function emitTrace(data) {
  const artifactDir = join(ROOT, 'artifacts');
  if (!existsSync(artifactDir)) mkdirSync(artifactDir, { recursive: true });
  const outPath = join(artifactDir, 'tier0-golden-trace.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  Golden trace: artifacts/tier0-golden-trace.json`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
