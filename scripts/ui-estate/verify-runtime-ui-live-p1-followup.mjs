#!/usr/bin/env node
/**
 * verify-runtime-ui-live-p1-followup.mjs -- Phase 726
 *
 * Purpose:
 *   - Produce repeatable live evidence for unresolved P1 surfaces that were
 *     not covered by the initial chart-read baseline.
 *   - Distinguish between live VistA reads, truthful empty states,
 *     integration-pending states, and local-store surfaces.
 *
 * Outputs:
 *   - artifacts/phase726-p1-followup-baseline.json
 *   - artifacts/phase726-p1-followup-baseline.md
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

const OUTPUT_JSON = join(ROOT, 'artifacts/phase726-p1-followup-baseline.json');
const OUTPUT_MD = join(ROOT, 'artifacts/phase726-p1-followup-baseline.md');

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function rel(filePath) {
  return relative(ROOT, filePath).replace(/\\/g, '/');
}

function normalizeRpcUsed(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value) return [value];
  return [];
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
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
    .map((value) => value.split(';', 1)[0])
    .join('; ');

  return {
    cookie,
    session: json.session || null,
  };
}

function classifyCheck(check) {
  if (check.skipped) return 'skipped';
  if (!check.liveOk) return 'failing';
  if (check.source === 'local-store') return 'truthful-local-store';
  if (check.pendingTargetsCount > 0 || check.featureStatusIssues > 0) return 'truthful-integration-pending';
  if ((check.count ?? null) === 0) return 'truthful-empty';
  return 'live-vista';
}

function buildCheck(route, result, extras = {}) {
  const json = result.json || {};
  const missingFields = [];
  for (const field of route.requiredFields || []) {
    if (getValueByPath(json, field) === undefined) missingFields.push(field);
  }

  const rpcUsed = normalizeRpcUsed(json.rpcUsed);
  const expectedRpcMissing = (route.expectedRpc || []).filter(
    (expected) => !rpcUsed.some((actual) => actual === expected)
  );

  const count = typeof json.count === 'number'
    ? json.count
    : Array.isArray(json.results)
      ? json.results.length
      : Array.isArray(json.data)
        ? json.data.length
        : Array.isArray(json.items)
          ? json.items.length
          : Array.isArray(json.messages)
            ? json.messages.length
            : Array.isArray(json.folders)
              ? json.folders.length
              : Array.isArray(json.patients)
                ? json.patients.length
                : Array.isArray(json.reports)
                  ? json.reports.length
                  : null;

  const featureStatusIssues = Array.isArray(json.featureStatus)
    ? json.featureStatus.filter((entry) => entry?.status && entry.status !== 'available').length
    : 0;
  const pendingTargetsCount = Array.isArray(json.pendingTargets) ? json.pendingTargets.length : 0;

  const check = {
    surfaceId: route.surfaceId,
    label: route.label,
    path: route.path,
    statusCode: result.status,
    elapsedMs: result.elapsedMs,
    source: json.source || null,
    count,
    rpcUsed,
    expectedRpc: route.expectedRpc || [],
    expectedRpcMissing,
    pendingTargetsCount,
    featureStatusIssues,
    missingFields,
    liveOk:
      Boolean(json.ok) &&
      missingFields.length === 0 &&
      expectedRpcMissing.length === 0 &&
      (!route.expectedSource || json.source === route.expectedSource),
    note:
      json._note ||
      json.storageNote ||
      json.error ||
      (pendingTargetsCount > 0 ? 'Pending targets declared by route' : ''),
    responsePreview: {
      ok: json.ok,
      source: json.source,
      count: json.count,
      status: json.status,
    },
    ...extras,
  };
  check.classification = classifyCheck(check);
  return check;
}

function buildSkippedCheck(route, reason) {
  return {
    surfaceId: route.surfaceId,
    label: route.label,
    path: route.path,
    statusCode: null,
    elapsedMs: 0,
    source: null,
    count: null,
    rpcUsed: [],
    expectedRpc: route.expectedRpc || [],
    expectedRpcMissing: [],
    pendingTargetsCount: 0,
    featureStatusIssues: 0,
    missingFields: [],
    liveOk: false,
    skipped: true,
    note: reason,
    responsePreview: { skipped: true },
    classification: 'skipped',
  };
}

async function runRoute(route, cookie) {
  const headers = route.auth ? { Cookie: cookie } : {};
  const result = await httpJson(route.path, { headers });
  return buildCheck(route, result);
}

async function main() {
  const loginResult = await login();
  const cookie = loginResult.cookie;

  const seedRoutes = {
    inpatientWards: {
      surfaceId: 'web:/inpatient/census',
      label: 'Inpatient Wards',
      path: '/vista/inpatient/wards',
      auth: true,
      requiredFields: ['ok', 'source', 'count', 'results', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['ORQPT WARDS'],
    },
    adminWards: {
      surfaceId: 'web:/cprs/admin/vista/wards',
      label: 'Admin Wards',
      path: '/admin/vista/wards',
      auth: true,
      requiredFields: ['ok', 'source', 'count', 'data', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['VE WARD LIST'],
    },
  };

  const checks = [];
  const inpatientWardsResult = await httpJson(seedRoutes.inpatientWards.path, { headers: { Cookie: cookie } });
  const inpatientWardsCheck = buildCheck(seedRoutes.inpatientWards, inpatientWardsResult);
  checks.push(inpatientWardsCheck);

  const adminWardsResult = await httpJson(seedRoutes.adminWards.path, { headers: { Cookie: cookie } });
  const adminWardsCheck = buildCheck(seedRoutes.adminWards, adminWardsResult);
  checks.push(adminWardsCheck);

  const wardCandidate =
    inpatientWardsResult.json?.results?.[0]?.ien ||
    adminWardsResult.json?.data?.[0]?.ien ||
    null;
  const wardCandidateSource = inpatientWardsResult.json?.results?.[0]?.ien
    ? 'vista/inpatient/wards'
    : adminWardsResult.json?.data?.[0]?.ien
      ? 'admin/vista/wards'
      : null;

  const routes = [
    {
      surfaceId: 'web:/cprs/inbox',
      label: 'Inbox',
      path: '/vista/inbox',
      auth: true,
      requiredFields: ['ok', 'count', 'items', 'featureStatus'],
    },
    {
      surfaceId: 'web:/cprs/messages',
      label: 'MailMan Folders',
      path: '/vista/mailman/folders',
      auth: true,
      requiredFields: ['ok', 'source', 'folders'],
      expectedSource: 'vista',
    },
    {
      surfaceId: 'web:/cprs/messages',
      label: 'MailMan Inbox',
      path: '/vista/mailman/inbox?limit=5',
      auth: true,
      requiredFields: ['ok', 'source', 'messages'],
      expectedSource: 'vista',
    },
    {
      surfaceId: 'web:/cprs/nursing',
      label: 'Nursing Notes',
      path: `/vista/nursing/notes?dfn=${DEFAULT_DFN}`,
      auth: true,
      requiredFields: ['ok', 'source', 'items', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['TIU DOCUMENTS BY CONTEXT'],
    },
    {
      surfaceId: 'web:/cprs/nursing',
      label: 'Nursing Tasks',
      path: `/vista/nursing/tasks?dfn=${DEFAULT_DFN}`,
      auth: true,
      requiredFields: ['ok', 'source', 'items', 'rpcUsed'],
      expectedSource: 'vista',
    },
    {
      surfaceId: 'web:/cprs/nursing',
      label: 'Nursing I&O',
      path: `/vista/nursing/io?dfn=${DEFAULT_DFN}`,
      auth: true,
      requiredFields: ['ok', 'source'],
      expectedSource: 'vista',
    },
    {
      surfaceId: 'web:/cprs/admin/vista/dashboard',
      label: 'Admin VistA Dashboard',
      path: '/admin/vista/dashboard/operational',
      auth: true,
      requiredFields: ['ok', 'source', 'data'],
      expectedSource: 'vista',
    },
    {
      surfaceId: 'web:/cprs/admin/vista/users',
      label: 'Admin VistA Users',
      path: '/admin/vista/users?count=5',
      auth: true,
      requiredFields: ['ok', 'source', 'count', 'data', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['VE USER LIST'],
    },
    {
      surfaceId: 'web:/cprs/admin/vista/clinics',
      label: 'Admin VistA Clinics',
      path: '/admin/vista/clinics?count=5',
      auth: true,
      requiredFields: ['ok', 'source', 'count', 'data', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['VE CLIN LIST'],
    },
    {
      surfaceId: 'web:/cprs/admin/vista/system',
      label: 'Admin VistA System Status',
      path: '/admin/vista/system/status',
      auth: true,
      requiredFields: ['ok', 'source', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['VE SYS STATUS'],
    },
  ];

  for (const route of routes) {
    checks.push(await runRoute(route, cookie));
  }

  const wardRoutes = [
    {
      surfaceId: 'web:/inpatient/census',
      label: 'Inpatient Ward Census',
      path: `/vista/inpatient/ward-census?ward=${wardCandidate}`,
      auth: true,
      requiredFields: ['ok', 'source', 'results', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['ORQPT WARD PATIENTS'],
    },
    {
      surfaceId: 'web:/inpatient/bedboard',
      label: 'Inpatient Bedboard',
      path: `/vista/inpatient/bedboard?ward=${wardCandidate}`,
      auth: true,
      requiredFields: ['ok', 'source', 'results', 'rpcUsed'],
      expectedSource: 'vista',
      expectedRpc: ['ORQPT WARD PATIENTS'],
    },
    {
      surfaceId: 'web:/cprs/handoff',
      label: 'Handoff Ward Patients',
      path: `/handoff/ward-patients?ward=${wardCandidate}`,
      auth: true,
      requiredFields: ['ok', 'source', 'patients', 'rpcUsed', 'pendingTargets'],
      expectedSource: 'vista',
      expectedRpc: ['ORQPT WARD PATIENTS'],
    },
    {
      surfaceId: 'web:/cprs/handoff',
      label: 'Handoff Reports',
      path: `/handoff/reports${wardCandidate ? `?ward=${wardCandidate}` : ''}`,
      auth: true,
      requiredFields: ['ok', 'source', 'reports', 'storageNote', 'pendingTargets'],
      expectedSource: 'local-store',
    },
  ];

  for (const route of wardRoutes) {
    if (!wardCandidate && route.label !== 'Handoff Reports') {
      checks.push(buildSkippedCheck(route, 'No ward candidate available from inpatient or admin ward lists'));
      continue;
    }
    const check = await runRoute(route, cookie);
    if (wardCandidateSource) {
      check.wardCandidate = wardCandidate;
      check.wardCandidateSource = wardCandidateSource;
    }
    checks.push(check);
  }

  const summary = {
    totalChecks: checks.length,
    passingChecks: checks.filter((check) => check.liveOk).length,
    failingChecks: checks.filter((check) => !check.liveOk && !check.skipped).length,
    skippedChecks: checks.filter((check) => check.skipped).length,
    byClassification: checks.reduce((acc, check) => {
      acc[check.classification] = (acc[check.classification] || 0) + 1;
      return acc;
    }, {}),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'Phase 726 - Full Truth And UX Audit',
    apiBase: API_BASE,
    patientDfn: DEFAULT_DFN,
    session: loginResult.session,
    wardCandidate,
    wardCandidateSource,
    summary,
    checks,
  };

  const lines = [
    '# Phase 726 P1 Follow-up Baseline',
    '',
    `Generated: ${report.generatedAt}`,
    `API Base: ${report.apiBase}`,
    `DFN: ${report.patientDfn}`,
    `Ward Candidate: ${report.wardCandidate || 'none'}`,
    `Ward Candidate Source: ${report.wardCandidateSource || 'none'}`,
    '',
    '## Summary',
    '',
    `- Total checks: ${summary.totalChecks}`,
    `- Passing checks: ${summary.passingChecks}`,
    `- Failing checks: ${summary.failingChecks}`,
    `- Skipped checks: ${summary.skippedChecks}`,
    `- Login user: ${report.session?.userName || 'unknown'}`,
    '',
    '## Classification Counts',
    '',
  ];

  for (const [key, value] of Object.entries(summary.byClassification).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push('', '## Checks', '');
  for (const check of checks) {
    const status = check.skipped ? 'SKIP' : check.liveOk ? 'PASS' : 'FAIL';
    const rpcText = check.rpcUsed.length ? check.rpcUsed.join(', ') : 'none';
    const noteText = check.note ? ` | note: ${check.note}` : '';
    const missingRpcText = check.expectedRpcMissing.length
      ? ` | missing expected RPC: ${check.expectedRpcMissing.join(', ')}`
      : '';
    lines.push(
      `- [${status}] ${check.label} (${check.path}) | class: ${check.classification} | source: ${check.source || 'n/a'} | count: ${check.count ?? 'n/a'} | rpcUsed: ${rpcText}${missingRpcText}${noteText}`
    );
  }
  lines.push('');

  ensureDir(OUTPUT_JSON);
  ensureDir(OUTPUT_MD);
  writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(OUTPUT_MD, `${lines.join('\n')}\n`, 'utf8');

  process.stdout.write(
    `[verify-runtime-ui-live-p1-followup] Wrote ${rel(OUTPUT_JSON)} and ${rel(OUTPUT_MD)} with ${summary.failingChecks} failing checks and ${summary.skippedChecks} skipped checks\n`
  );

  if (summary.failingChecks > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});