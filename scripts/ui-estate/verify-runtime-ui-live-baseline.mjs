#!/usr/bin/env node
/**
 * verify-runtime-ui-live-baseline.mjs -- Phase 726
 *
 * Purpose:
 *   - Produce a repeatable live VEHU evidence bundle for the highest-value
 *     runtime UI surfaces.
 *   - Keep verification outcomes in artifacts/ rather than in committed docs.
 *
 * Outputs:
 *   - artifacts/phase726-p1-live-baseline.json
 *   - artifacts/phase726-p1-live-baseline.md
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const API_BASE = process.env.PHASE726_API_BASE || 'http://127.0.0.1:3001';
const ACCESS_CODE = process.env.PHASE726_ACCESS_CODE || 'PRO1234';
const VERIFY_CODE = process.env.PHASE726_VERIFY_CODE || 'PRO1234!!';
const DEFAULT_DFN = process.env.PHASE726_DFN || '46';

const OUTPUT_JSON = join(ROOT, 'artifacts/phase726-p1-live-baseline.json');
const OUTPUT_MD = join(ROOT, 'artifacts/phase726-p1-live-baseline.md');

const ROUTES = [
  {
    surfaceId: 'baseline:/health',
    label: 'API Health',
    path: '/health',
    auth: false,
    requiredFields: ['ok'],
  },
  {
    surfaceId: 'baseline:/vista/ping',
    label: 'VistA Ping',
    path: '/vista/ping',
    auth: false,
    requiredFields: ['ok', 'vista'],
  },
  {
    surfaceId: 'web:/patient-search',
    label: 'Default Patient List',
    path: '/vista/default-patient-list',
    auth: true,
    requiredFields: ['ok', 'count', 'rpcUsed'],
    expectedRpc: ['ORQPT DEFAULT PATIENT LIST'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Allergies',
    path: `/vista/allergies?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'count', 'rpcUsed'],
    expectedRpc: ['ORQQAL LIST'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Problems',
    path: `/vista/problems?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'count', 'rpcUsed'],
    expectedRpc: ['ORQQPL PROBLEM LIST'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Vitals',
    path: `/vista/vitals?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'count', 'rpcUsed'],
    expectedRpc: ['ORQQVI VITALS'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Medications',
    path: `/vista/medications?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'count', 'rpcUsed'],
    expectedRpc: ['ORWPS ACTIVE'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Notes',
    path: `/vista/notes?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'count', 'rpcUsed'],
    expectedRpc: ['TIU DOCUMENTS BY CONTEXT'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Labs',
    path: `/vista/labs?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'rpcUsed'],
    expectedRpc: ['ORWLRR INTERIM'],
  },
  {
    surfaceId: 'web:/cprs/scheduling',
    label: 'Appointments',
    path: `/vista/cprs/appointments?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'status', 'rpcUsed'],
    expectedRpc: ['ORWPT APPTLST'],
  },
  {
    surfaceId: 'web:/chart/:dfn/:tab',
    label: 'Reminders',
    path: `/vista/cprs/reminders?dfn=${DEFAULT_DFN}`,
    auth: true,
    requiredFields: ['ok', 'status', 'rpcUsed'],
    expectedRpc: ['ORQQPX REMINDERS LIST'],
  },
];

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function rel(filePath) {
  return relative(ROOT, filePath).replace(/\\/g, '/');
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
}

function normalizeRpcUsed(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

async function httpJson(path, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: response.status,
    ok: response.ok,
    elapsedMs: Date.now() - startedAt,
    headers: response.headers,
    text,
    json,
  };
}

async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: ACCESS_CODE, verifyCode: VERIFY_CODE }),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok || !json?.ok) {
    throw new Error(`Login failed with status ${response.status}: ${text}`);
  }

  const cookie = response.headers
    .getSetCookie()
    .map(value => value.split(';', 1)[0])
    .join('; ');

  return {
    cookie,
    session: json.session || null,
  };
}

function evaluateRoute(route, result) {
  const json = result.json;
  const missingFields = [];
  for (const field of route.requiredFields || []) {
    if (getValueByPath(json, field) === undefined) missingFields.push(field);
  }

  const rpcUsed = normalizeRpcUsed(json?.rpcUsed);
  const expectedRpcMissing = (route.expectedRpc || []).filter(expected => !rpcUsed.some(actual => actual === expected));

  return {
    surfaceId: route.surfaceId,
    label: route.label,
    path: route.path,
    liveOk: Boolean(json?.ok) && missingFields.length === 0,
    statusCode: result.status,
    elapsedMs: result.elapsedMs,
    count: typeof json?.count === 'number' ? json.count : Array.isArray(json?.results) ? json.results.length : null,
    rpcUsed,
    expectedRpc: route.expectedRpc || [],
    expectedRpcMissing,
    fallbackUsed: Boolean(json?.fallbackUsed),
    note: json?.note || json?.fallbackReason || '',
    missingFields,
    responsePreview: json
      ? {
          ok: json.ok,
          status: json.status,
          count: json.count,
          vista: json.vista,
        }
      : { nonJson: true, text: result.text.slice(0, 200) },
  };
}

function toMarkdown(report) {
  const lines = [
    '# Phase 726 P1 Live Baseline',
    '',
    `Generated: ${report.generatedAt}`,
    `API Base: ${report.apiBase}`,
    `DFN: ${report.patientDfn}`,
    '',
    '## Summary',
    '',
    `- Total checks: ${report.summary.totalChecks}`,
    `- Passing checks: ${report.summary.passingChecks}`,
    `- Failing checks: ${report.summary.failingChecks}`,
    `- Login user: ${report.session?.userName || 'unknown'}`,
    '',
    '## Checks',
    '',
  ];

  for (const check of report.checks) {
    const status = check.liveOk && check.expectedRpcMissing.length === 0 ? 'PASS' : 'FAIL';
    const rpcPart = check.rpcUsed.length ? check.rpcUsed.join(', ') : 'none';
    const missingPart = check.expectedRpcMissing.length ? ` | missing expected RPC: ${check.expectedRpcMissing.join(', ')}` : '';
    const notePart = check.note ? ` | note: ${check.note}` : '';
    lines.push(`- [${status}] ${check.label} (${check.path}) | status ${check.statusCode} | count ${check.count ?? 'n/a'} | rpcUsed: ${rpcPart}${missingPart}${notePart}`);
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const loginResult = await login();
  const checks = [];

  for (const route of ROUTES) {
    const headers = {};
    if (route.auth) headers.Cookie = loginResult.cookie;
    const result = await httpJson(route.path, { headers });
    checks.push(evaluateRoute(route, result));
  }

  const summary = {
    totalChecks: checks.length,
    passingChecks: checks.filter(check => check.liveOk && check.expectedRpcMissing.length === 0).length,
    failingChecks: checks.filter(check => !check.liveOk || check.expectedRpcMissing.length > 0).length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'Phase 726 - Full Truth And UX Audit',
    apiBase: API_BASE,
    patientDfn: DEFAULT_DFN,
    session: loginResult.session,
    summary,
    checks,
  };

  ensureDir(OUTPUT_JSON);
  ensureDir(OUTPUT_MD);
  writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(OUTPUT_MD, toMarkdown(report), 'utf8');

  if (summary.failingChecks > 0) {
    process.stdout.write(`[verify-runtime-ui-live-baseline] Wrote ${rel(OUTPUT_JSON)} and ${rel(OUTPUT_MD)} with ${summary.failingChecks} failing checks\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`[verify-runtime-ui-live-baseline] Wrote ${rel(OUTPUT_JSON)} and ${rel(OUTPUT_MD)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});