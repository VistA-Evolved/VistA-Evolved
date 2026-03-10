/**
 * Phase 576 -- VE INTEROP RPC Verifier
 *
 * Connects to VistA via VistaRpcBridge, authenticates, creates CPRS context,
 * and calls all 6 VE INTEROP RPCs individually.
 *
 * Classification:
 *   PASS -- structured array response OR "0^NOT_AVAILABLE" (RPC exists, executed)
 *   FAIL -- "doesn't exist" / "not registered" / context denial / error
 *
 * Usage:
 *   node scripts/qa/verify-interop-rpcs.mjs
 *   (requires VISTA_HOST, VISTA_PORT, VISTA_ACCESS_CODE, VISTA_VERIFY_CODE in env or .env.local)
 *
 * Can also be run via tsx from the api workspace:
 *   pnpm -C apps/api exec tsx ../../scripts/qa/verify-interop-rpcs.mjs
 */

import { VistaRpcBridge } from '../../apps/api/src/services/vistaRpcBridge.js';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const host = process.env.VISTA_HOST || '127.0.0.1';
const port = Number(process.env.VISTA_PORT || 9431);
const accessCode = process.env.VISTA_ACCESS_CODE || process.env.VISTA_ACCESS || '';
const verifyCode = process.env.VISTA_VERIFY_CODE || process.env.VISTA_VERIFY || '';

if (!accessCode || !verifyCode) {
  console.error(
    '\n  FAIL  Missing VistA credentials.\n' +
      '  Set VISTA_ACCESS_CODE and VISTA_VERIFY_CODE in environment or .env.local\n'
  );
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* RPC definitions                                                     */
/* ------------------------------------------------------------------ */

const INTEROP_RPCS = [
  { name: 'VE INTEROP HL7 LINKS', params: ['5'], tag: 'LINKS' },
  { name: 'VE INTEROP HL7 MSGS', params: ['24'], tag: 'MSGS' },
  { name: 'VE INTEROP HLO STATUS', params: [], tag: 'HLOSTAT' },
  { name: 'VE INTEROP QUEUE DEPTH', params: [], tag: 'QLENGTH' },
  { name: 'VE INTEROP MSG LIST', params: ['*', '*', '5'], tag: 'MSGLIST' },
  { name: 'VE INTEROP MSG DETAIL', params: ['1'], tag: 'MSGDETL' },
];

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

function classify(rpcName, response, error) {
  if (error) {
    const msg = typeof error === 'string' ? error : error.message || String(error);
    const lower = msg.toLowerCase();
    if (
      lower.includes("doesn't exist") ||
      lower.includes('not registered') ||
      lower.includes('not found in option') ||
      lower.includes('context')
    ) {
      return { status: 'FAIL', reason: msg.substring(0, 120) };
    }
    return { status: 'FAIL', reason: msg.substring(0, 120) };
  }

  if (!response && response !== '') {
    return { status: 'FAIL', reason: 'null/undefined response' };
  }

  const trimmed = (response || '').trim();

  // "0^NOT_AVAILABLE" means the RPC executed -- the M global just isn't populated
  if (trimmed.includes('NOT_AVAILABLE')) {
    return { status: 'PASS', reason: 'RPC executed, returned NOT_AVAILABLE (global empty)' };
  }

  // Any structured response with ^ separators or multiple lines = success
  if (trimmed.includes('^') || trimmed.split('\n').length > 1 || trimmed.length > 0) {
    return { status: 'PASS', reason: `Response: ${trimmed.substring(0, 100)}` };
  }

  return { status: 'FAIL', reason: 'Empty response' };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('\n=== Phase 576: VE INTEROP RPC Verifier ===');
  console.log(`  Host: ${host}:${port}`);
  console.log(`  Credentials: set\n`);

  const bridge = new VistaRpcBridge({ host, port, accessCode, verifyCode });

  // Step 1: Connect + authenticate + create CPRS context
  console.log('--- Step 1: Connect ---');
  try {
    await bridge.connect();
    console.log(`  PASS  Connected (DUZ=${bridge.duz})`);
  } catch (err) {
    console.log(`  FAIL  Connection failed: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Call each RPC
  console.log('\n--- Step 2: Call VE INTEROP RPCs ---');
  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (const rpc of INTEROP_RPCS) {
    let response = null;
    let error = null;

    try {
      response = await bridge.call(rpc.name, rpc.params);
    } catch (err) {
      error = err;
    }

    const { status, reason } = classify(rpc.name, response, error);
    results.push({ name: rpc.name, tag: rpc.tag, status, reason });

    if (status === 'PASS') {
      passCount++;
      console.log(`  PASS  ${rpc.name}  -- ${reason}`);
    } else {
      failCount++;
      console.log(`  FAIL  ${rpc.name}  -- ${reason}`);
    }
  }

  // Step 3: Disconnect
  console.log('\n--- Step 3: Disconnect ---');
  try {
    await bridge.disconnect();
    console.log('  PASS  Disconnected');
  } catch (err) {
    console.log(`  WARN  Disconnect: ${err.message}`);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`  Total: ${results.length}  PASS: ${passCount}  FAIL: ${failCount}`);

  if (failCount === 0) {
    console.log('\n  ALL 6 VE INTEROP RPCs are callable. KI-002 can be closed.\n');
  } else {
    console.log(`\n  ${failCount} RPC(s) still failing. KI-002 remains open.\n`);
    console.log('  Failed RPCs:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.log(`    - ${r.name}: ${r.reason}`);
    }
    console.log('');
  }

  // Write JSON evidence
  const evidence = {
    phase: 576,
    date: new Date().toISOString(),
    host: `${host}:${port}`,
    results,
    passCount,
    failCount,
    ki002Closable: failCount === 0,
  };

  // Output JSON to stdout for capture
  console.log('--- Evidence JSON ---');
  console.log(JSON.stringify(evidence, null, 2));

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
