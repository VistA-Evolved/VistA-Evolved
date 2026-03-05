/**
 * Phase 568 — ZVEADT Crash + Cascade Fix Verification
 *
 * Standalone script that:
 *   1. Runs a full RPC capability probe (discoverCapabilities with forceRefresh)
 *   2. Reports available/missing/error counts
 *   3. Specifically checks ZVEADT WARDS and the cascade group
 *   4. Runs an ADT sequence test: ZVEADT WARDS → ORWPT LIST ALL
 *      to prove the socket survives after ZVEADT
 *
 * Usage:
 *   npx tsx --env-file=apps/api/.env.local scripts/qa/verify-zveadt-fix.ts
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more failures
 */

import { connect, disconnect, callRpc } from '../../apps/api/src/vista/rpcBrokerClient.js';
import { discoverCapabilities, KNOWN_RPCS } from '../../apps/api/src/vista/rpcCapabilities.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CASCADE_GROUP = [
  'ZVEADT WARDS',
  'ZVEADT BEDS',
  'ZVEADT MVHIST',
  'DGPM NEW ADMISSION',
  'DGPM NEW TRANSFER',
  'DGPM NEW DISCHARGE',
  'PSB MED LOG',
  'PSB ALLERGY',
  'PSB VALIDATE ORDER',
  'PSJBCMA',
  'NURS TASK LIST',
  'NURS ASSESSMENTS',
  'LR VERIFY',
  'GMRIO RESULTS',
  'GMRIO ADD',
  'ZVENAS LIST',
  'ZVENAS SAVE',
];

let exitCode = 0;
function fail(msg: string) {
  console.error(`  FAIL  ${msg}`);
  exitCode = 1;
}
function pass(msg: string) {
  console.log(`  PASS  ${msg}`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('\n=== Phase 568: ZVEADT Crash + Cascade Fix Verification ===\n');

  // ── PART 1: Full capability probe ──────────────────────────────────
  console.log('--- PART 1: Full Capability Probe ---');
  let result;
  try {
    result = await discoverCapabilities(true);
  } catch (err: any) {
    fail(`discoverCapabilities threw: ${err.message}`);
    process.exit(1);
  }

  const totalProbed = [...new Set(KNOWN_RPCS.map((r) => r.rpc))].length;
  console.log(`  Total probed:    ${totalProbed}`);
  console.log(`  Available:       ${result.availableList.length}`);
  console.log(`  Missing:         ${result.missingList.length}`);
  console.log(`  Expected missing: ${result.expectedMissing.length}`);

  // Dump missing list
  console.log('\n  Missing RPCs:');
  for (const rpc of result.missingList) {
    const cap = result.rpcs[rpc];
    console.log(`    ${rpc}: ${cap?.error || 'unknown'}`);
  }

  // ── PART 2: Cascade check ─────────────────────────────────────────
  console.log('\n--- PART 2: Cascade Check ---');
  let cascadeNotConnected = 0;
  for (const rpc of CASCADE_GROUP) {
    const cap = result.rpcs[rpc];
    if (!cap) {
      console.log(`    ${rpc}: NOT IN PROBE (skipped)`);
      continue;
    }
    if (!cap.available && cap.error && /not connected/i.test(cap.error)) {
      fail(`${rpc}: "Not connected" CASCADE DETECTED — error: ${cap.error}`);
      cascadeNotConnected++;
    } else if (!cap.available) {
      console.log(`    ${rpc}: missing (genuine) — ${cap.error}`);
    } else {
      pass(`${rpc}: available`);
    }
  }

  if (cascadeNotConnected === 0) {
    pass('No "Not connected" cascade in the cascade group');
  } else {
    fail(`${cascadeNotConnected} RPCs still show "Not connected" cascade`);
  }

  // ── PART 3: ZVEADT WARDS specific ──────────────────────────────────
  console.log('\n--- PART 3: ZVEADT WARDS Specific ---');
  const wardsEntry = result.rpcs['ZVEADT WARDS'];
  if (!wardsEntry) {
    fail('ZVEADT WARDS not found in probe results');
  } else if (wardsEntry.available) {
    pass(`ZVEADT WARDS is available (no socket crash)`);
  } else if (wardsEntry.error && /socket closed/i.test(wardsEntry.error)) {
    fail(`ZVEADT WARDS still crashes socket: ${wardsEntry.error}`);
  } else {
    // Missing for a genuine reason (e.g. doesn't exist) — not a socket crash
    console.log(`    ZVEADT WARDS: missing but NOT a socket crash — ${wardsEntry.error}`);
  }

  // ── PART 4: ADT sequence test ──────────────────────────────────────
  console.log('\n--- PART 4: ADT Sequence Test (ZVEADT WARDS → ORWPT LIST ALL) ---');
  try {
    await connect();

    // Step A: Call ZVEADT WARDS
    let wardsResp: string[];
    try {
      wardsResp = await callRpc('ZVEADT WARDS', []);
      pass(
        `ZVEADT WARDS returned ${wardsResp.length} line(s), first: ${wardsResp[0]?.substring(0, 100) || '(empty)'}`
      );
    } catch (err: any) {
      fail(`ZVEADT WARDS threw: ${err.message}`);
      // If the socket died, try reconnect for the next test
      try {
        disconnect();
        await connect();
      } catch {
        /* give up */
      }
    }

    // Step B: Call ORWPT LIST ALL immediately after
    try {
      const patResp = await callRpc('ORWPT LIST ALL', ['1', '1']);
      if (patResp.length > 0) {
        pass(
          `ORWPT LIST ALL returned ${patResp.length} line(s) AFTER ZVEADT WARDS — socket survived`
        );
      } else {
        fail('ORWPT LIST ALL returned empty — socket may be degraded');
      }
    } catch (err: any) {
      fail(`ORWPT LIST ALL threw AFTER ZVEADT WARDS: ${err.message}`);
    }

    // Step C: Call ORWU DT as a second sanity check
    try {
      const dtResp = await callRpc('ORWU DT', []);
      pass(`ORWU DT returned: ${dtResp[0]?.substring(0, 50) || '(empty)'} — socket fully alive`);
    } catch (err: any) {
      fail(`ORWU DT threw: ${err.message}`);
    }

    disconnect();
  } catch (err: any) {
    fail(`ADT sequence test connection error: ${err.message}`);
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  console.log(`  Available RPCs: ${result.availableList.length}/${totalProbed}`);
  console.log(`  Missing RPCs:   ${result.missingList.length}/${totalProbed}`);
  console.log(`  Cascade "Not connected": ${cascadeNotConnected}`);
  console.log(`  Exit code: ${exitCode}`);
  console.log('');

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
