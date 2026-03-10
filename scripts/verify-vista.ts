/**
 * VistA Connectivity Verification Script -- Phase P1-1
 *
 * Standalone script that tests VistA RPC connectivity:
 *   1. ORWU USERINFO -- returns authenticated user info
 *   2. ORWPT LIST ALL -- returns patient list (>=1 patient)
 *   3. ORWORDG IEN -- returns order display group IEN
 *   4. ORWU DT -- returns server date/time
 *   5. Disconnect -- clean teardown
 *
 * Usage:
 *   pnpm run verify:vista
 *   (loads apps/api/.env.local via the root package script, or accepts env vars directly)
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = one or more failures
 *   2 = missing configuration
 */

import { VistaRpcBridge } from '../apps/api/src/services/vistaRpcBridge.js';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const host = process.env.VISTA_HOST || '127.0.0.1';
const port = Number(process.env.VISTA_PORT || 9431);
const accessCode = process.env.VISTA_ACCESS_CODE || '';
const verifyCode = process.env.VISTA_VERIFY_CODE || '';

if (!accessCode || !verifyCode) {
  console.error(
    '\n❌ Missing VistA credentials.\n' +
      'Set VISTA_ACCESS_CODE and VISTA_VERIFY_CODE in environment or .env.local\n' +
      'Example: VISTA_ACCESS_CODE=PRO1234 VISTA_VERIFY_CODE=PRO1234!!\n'
  );
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* Test runner                                                         */
/* ------------------------------------------------------------------ */

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  detail: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  try {
    const detail = await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs, detail });
    console.log(`  PASS  ${name}  (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, durationMs, detail: msg });
    console.log(`  FAIL  ${name}  (${durationMs}ms) -- ${msg}`);
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log(`\nVistA RPC Bridge Verification`);
  console.log(`  Host: ${host}:${port}`);
  console.log(`  User: (credentials set)\n`);

  const bridge = new VistaRpcBridge({ host, port, accessCode, verifyCode });

  // Test 0: Connect
  try {
    const start = Date.now();
    await bridge.connect();
    const durationMs = Date.now() - start;
    results.push({
      name: 'Connect',
      passed: true,
      durationMs,
      detail: `DUZ=${bridge.duz}`,
    });
    console.log(`  PASS  Connect  (${durationMs}ms) -- DUZ=${bridge.duz}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Connect', passed: false, durationMs: 0, detail: msg });
    console.log(`  FAIL  Connect -- ${msg}`);
    console.log(`\nVistA connectivity: 0/5 tests passed`);
    process.exit(1);
  }

  // Test 1: ORWU USERINFO
  await runTest('ORWU USERINFO', async () => {
    const resp = await bridge.call('ORWU USERINFO', []);
    if (!resp || resp.trim().length === 0) throw new Error('Empty response');
    const firstLine = resp.split('\n')[0];
    return `First line: ${firstLine?.substring(0, 80)}`;
  });

  // Test 2: ORWPT LIST ALL
  await runTest('ORWPT LIST ALL', async () => {
    const resp = await bridge.call('ORWPT LIST ALL', ['', '1']);
    if (!resp || resp.trim().length === 0) throw new Error('Empty response');
    const lines = resp.split('\n').filter((l) => l.trim().length > 0);
    return `${lines.length} patient(s) returned`;
  });

  // Test 3: ORWORDG IEN
  await runTest('ORWORDG IEN', async () => {
    const resp = await bridge.call('ORWORDG IEN', ['ALL']);
    return `Response: ${(resp || '(empty)').substring(0, 80)}`;
  });

  // Test 4: ORWU DT (server date/time)
  await runTest('ORWU DT', async () => {
    const resp = await bridge.call('ORWU DT', ['NOW']);
    if (!resp || resp.trim().length === 0) throw new Error('Empty response');
    return `Server time: ${resp.trim().substring(0, 40)}`;
  });

  // Test 5: Disconnect
  await runTest('Disconnect', async () => {
    await bridge.disconnect();
    if (bridge.isConnected) throw new Error('Still connected after disconnect');
    return 'Clean disconnect';
  });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nVistA connectivity: ${passed}/${total} tests passed`);

  if (passed < total) {
    console.log('\nFailed tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
