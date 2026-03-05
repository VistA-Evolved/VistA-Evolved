#!/usr/bin/env node
/**
 * Phase 166: Clinic Day Simulator — CLI Runner
 * Usage: node scripts/qa/clinic-day-runner.mjs [--base-url URL] [--journey J1]
 *
 * Runs all 6 A-Z proof journeys against the live API and prints results.
 * Exit code 0 = all passed, 1 = failures.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ARTIFACTS_DIR = resolve(ROOT, 'artifacts');

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const baseUrl = getArg('base-url') || 'http://127.0.0.1:3001';
const journeyFilter = getArg('journey');
const artifactName = getArg('artifact-name'); // optional override for output filename
const accessCode = getArg('access-code') || process.env.VISTA_ACCESS_CODE || 'PROV123';
const verifyCode = getArg('verify-code') || process.env.VISTA_VERIFY_CODE || 'PROV123!!';

async function loginAndGetCookie() {
  try {
    const resp = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode, verifyCode }),
      redirect: 'manual',
    });
    const setCookie = resp.headers.get('set-cookie') || '';
    const cookie = setCookie
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .join('; ');
    // Extract CSRF token from response body (Phase 132 session-bound CSRF)
    let csrfToken = '';
    try {
      const body = await resp.json();
      csrfToken = body.csrfToken || '';
    } catch {
      /* non-JSON is ok */
    }
    return { cookie, csrfToken };
  } catch {
    return { cookie: '', csrfToken: '' };
  }
}

async function runJourneys() {
  console.log(`\n  Clinic Day Simulator`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Filter: ${journeyFilter || 'all'}\n`);

  // Check API reachability
  try {
    const h = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (!h.ok) throw new Error('not ok');
  } catch {
    console.error('  ERROR: API not reachable at', baseUrl);
    process.exit(1);
  }

  // Login
  const { cookie, csrfToken } = await loginAndGetCookie();
  if (!cookie) {
    console.warn('  WARN: Could not authenticate, some journeys may fail\n');
  }

  // Fetch journey definitions
  const defResp = await fetch(`${baseUrl}/admin/qa/journeys`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const defs = await defResp.json();
  if (!defs.ok) {
    console.error('  ERROR: Cannot fetch journey definitions');
    process.exit(1);
  }

  // Run journeys
  const runBody = { baseUrl, cookie };
  const postHeaders = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
  let report;
  if (journeyFilter) {
    const resp = await fetch(`${baseUrl}/admin/qa/journeys/${journeyFilter}/run`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify(runBody),
    });
    const data = await resp.json();
    report = {
      generatedAt: new Date().toISOString(),
      durationMs: data.result?.durationMs || 0,
      journeys: [data.result],
      summary: {
        totalJourneys: 1,
        passed: data.result?.passed ? 1 : 0,
        failed: data.result?.passed ? 0 : 1,
        totalSteps: data.result?.summary?.totalSteps || 0,
        passedSteps: data.result?.summary?.passedSteps || 0,
        failedSteps: data.result?.summary?.failedSteps || 0,
      },
    };
  } else {
    const resp = await fetch(`${baseUrl}/admin/qa/journeys/run`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify(runBody),
    });
    const data = await resp.json();
    report = data.report;
  }

  // Print results
  if (!report) {
    console.error('  ERROR: No report returned');
    process.exit(1);
  }

  console.log('  ============================================================');
  for (const j of report.journeys) {
    const icon = j.passed ? 'PASS' : 'FAIL';
    console.log(`  ${icon}  ${j.journeyId} ${j.journeyName} (${j.durationMs}ms)`);
    for (const s of j.steps) {
      const sIcon = s.passed ? '  ok' : '  FAIL';
      console.log(`       ${sIcon}  ${s.stepName} [${s.status}] ${s.durationMs}ms`);
      if (s.errors.length > 0) {
        for (const e of s.errors) {
          console.log(`             -> ${e}`);
        }
      }
    }
  }
  console.log('  ============================================================');
  console.log(
    `  Summary: ${report.summary.passed}/${report.summary.totalJourneys} journeys passed`
  );
  console.log(`           ${report.summary.passedSteps}/${report.summary.totalSteps} steps passed`);
  console.log(`  Duration: ${report.durationMs}ms`);
  console.log('  ============================================================\n');

  // Write artifact
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const defaultName = artifactName || 'clinic-day-report';
  const reportPath = resolve(ARTIFACTS_DIR, `${defaultName}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Report written to artifacts/${defaultName}.json\n`);

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

runJourneys().catch((err) => {
  console.error('  FATAL:', err.message);
  process.exit(1);
});
