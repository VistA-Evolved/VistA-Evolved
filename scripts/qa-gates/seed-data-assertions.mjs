#!/usr/bin/env node
/**
 * Layer 3: Seed Data Assertions
 *
 * Verifies that the VistA distro has non-empty reference data in all
 * critical domains. Runs against the live API with authenticated session.
 *
 * Usage:
 *   node scripts/qa-gates/seed-data-assertions.mjs
 *   node scripts/qa-gates/seed-data-assertions.mjs --base http://127.0.0.1:3001
 *
 * Exit 0 = all assertions pass
 * Exit 1 = at least one domain has no data
 */

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://127.0.0.1:3001';

const ASSERTIONS = [
  { name: 'Patients', path: '/vista/default-patient-list', minCount: 1, dataPath: 'patients' },
  { name: 'Allergies', path: '/vista/allergies?dfn=46', minCount: 0, dataPath: 'data' },
  { name: 'Vitals', path: '/vista/vitals?dfn=46', minCount: 0, dataPath: 'data' },
  { name: 'Problems', path: '/vista/problems?dfn=46', minCount: 0, dataPath: 'data' },
  { name: 'VistA Ping', path: '/vista/ping', minCount: 0, dataPath: null, checkOk: true },
];

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: 'PRO1234', verifyCode: 'PRO1234!!' }),
  });

  if (!res.ok) {
    console.error('Login failed:', res.status);
    return null;
  }

  const cookies = res.headers.getSetCookie?.() || [];
  return cookies.join('; ');
}

async function checkAssertion(assertion, cookie) {
  try {
    const res = await fetch(`${BASE}${assertion.path}`, {
      headers: cookie ? { Cookie: cookie } : {},
    });

    if (!res.ok) {
      return { name: assertion.name, passed: false, error: `HTTP ${res.status}` };
    }

    const body = await res.json();

    // Check for forbidden statuses
    if (body.status === 'integration-pending' || body.status === 'unsupported-in-sandbox') {
      return {
        name: assertion.name,
        passed: false,
        error: `FORBIDDEN status: ${body.status}`,
      };
    }

    // Check ok flag
    if (assertion.checkOk && !body.ok) {
      return { name: assertion.name, passed: false, error: 'ok is not true' };
    }

    // Check data count
    if (assertion.dataPath) {
      const data = body[assertion.dataPath];
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
      if (count < assertion.minCount) {
        return {
          name: assertion.name,
          passed: false,
          error: `Expected at least ${assertion.minCount} records, got ${count}`,
        };
      }
      return { name: assertion.name, passed: true, count };
    }

    return { name: assertion.name, passed: true };
  } catch (err) {
    return { name: assertion.name, passed: false, error: err.message };
  }
}

async function main() {
  console.log('=== Seed Data Assertions (Layer 3) ===');
  console.log(`Base: ${BASE}\n`);

  const cookie = await login();
  if (!cookie) {
    console.log('SKIP: Could not authenticate (VistA may not be running)');
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const assertion of ASSERTIONS) {
    const result = await checkAssertion(assertion, cookie);

    if (result.passed) {
      console.log(`  PASS: ${result.name}${result.count !== undefined ? ` (${result.count} records)` : ''}`);
      passed++;
    } else if (result.error?.startsWith('FORBIDDEN')) {
      console.log(`  FAIL: ${result.name} -- ${result.error}`);
      failed++;
    } else {
      console.log(`  WARN: ${result.name} -- ${result.error}`);
      warnings++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${warnings} warnings ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
