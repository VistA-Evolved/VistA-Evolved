/**
 * Phase 74 -- Tripwire: Fake Success Detection Proof
 *
 * Proves that the no-fake-success middleware correctly identifies responses
 * that return ok:true without effectProof or pendingTargets.
 *
 * Uses the exported `validateResponseForTripwire()` function from the
 * actual middleware to ensure the _real_ logic is tested, not a mock.
 *
 * Tests:
 *   1. ok:true + no proof fields -> VIOLATION (pass=false)
 *   2. ok:true + effectProof field -> PASS (pass=true)
 *   3. ok:true + pendingTargets -> PASS (pass=true)
 *   4. ok:true + items (collection proof) -> PASS (pass=true)
 *   5. ok:false -> SKIP (not checked)
 *   6. Exempt route -> SKIP (always passes)
 *   7. Bidirectional: add proof -> remove proof -> violation returns
 */

import { validateResponseForTripwire } from '../../apps/api/src/middleware/no-fake-success.js';

/* ------------------------------------------------------------------ */
/* Test runner                                                         */
/* ------------------------------------------------------------------ */

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`TRIPWIRE FAIL: ${message}`);
  }
}

function runTripwireTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void): void {
    try {
      fn();
      passed++;
      results.push(`  PASS  ${name}`);
    } catch (e: unknown) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`  FAIL  ${name}: ${msg}`);
    }
  }

  // ---- Tripwire 1: ok:true with NO proof -> VIOLATION ----
  test('ok:true with no proof fields -> violation', () => {
    const result = validateResponseForTripwire('/vista/some-endpoint', {
      ok: true,
    });
    assert(result.pass === false, `Expected pass=false, got pass=${result.pass}`);
    assert(
      result.reason === 'missing-effect-proof',
      `Expected reason=missing-effect-proof, got ${result.reason}`
    );
  });

  // ---- Tripwire 2: ok:true + effectProof -> PASS ----
  test('ok:true with effectProof field -> pass', () => {
    const result = validateResponseForTripwire('/vista/some-endpoint', {
      ok: true,
      effectProof: { messageId: '123' },
    });
    assert(result.pass === true, `Expected pass=true, got pass=${result.pass}`);
    assert(result.reason === 'has-effect-proof', `Expected has-effect-proof, got ${result.reason}`);
  });

  // ---- Tripwire 3: ok:true + pendingTargets -> PASS ----
  test('ok:true with pendingTargets -> pass', () => {
    const result = validateResponseForTripwire('/vista/some-endpoint', {
      ok: true,
      pendingTargets: [{ rpc: 'ORWDX LOCK', package: 'OR', reason: 'Not integrated' }],
    });
    assert(result.pass === true, `Expected pass=true, got pass=${result.pass}`);
  });

  // ---- Tripwire 4: ok:true + items (collection proof) -> PASS ----
  test('ok:true with items array -> pass', () => {
    const result = validateResponseForTripwire('/vista/allergies', {
      ok: true,
      items: [{ name: 'PENICILLIN', ien: '42' }],
      rpcUsed: ['ORQQAL LIST'],
    });
    assert(result.pass === true, `Expected pass=true, got pass=${result.pass}`);
  });

  // ---- Tripwire 5: ok:false -> not checked (always passes) ----
  test('ok:false -> not checked', () => {
    const result = validateResponseForTripwire('/vista/something', {
      ok: false,
      error: 'Something failed',
    });
    assert(result.pass === true, `Expected pass=true for ok:false`);
    assert(result.reason === 'not-ok-true', `Expected not-ok-true, got ${result.reason}`);
  });

  // ---- Tripwire 6: Exempt route -> always passes ----
  test('exempt route (health) -> always passes', () => {
    const result = validateResponseForTripwire('/health', {
      ok: true,
      // No proof fields, but exempt
    });
    assert(result.pass === true, `Expected pass=true for exempt route`);
    assert(result.reason === 'exempt-route', `Expected exempt-route, got ${result.reason}`);
  });

  test('exempt route (auth) -> always passes', () => {
    const result = validateResponseForTripwire('/auth/login', {
      ok: true,
    });
    assert(result.pass === true, `Expected pass=true for auth route`);
  });

  test('exempt route (metrics) -> always passes', () => {
    const result = validateResponseForTripwire('/metrics/prometheus', {
      ok: true,
    });
    assert(result.pass === true, `Expected pass=true for metrics route`);
  });

  // ---- Tripwire 7: ok:true + count (aggregate proof) -> PASS ----
  test('ok:true with count -> pass', () => {
    const result = validateResponseForTripwire('/admin/something', {
      ok: true,
      count: 42,
    });
    assert(result.pass === true, `Expected pass=true, got pass=${result.pass}`);
  });

  // ---- Tripwire 8: ok:true + null proof field -> VIOLATION ----
  test("ok:true with null proof field -> violation (null doesn't count)", () => {
    const result = validateResponseForTripwire('/vista/endpoint', {
      ok: true,
      items: null,
    });
    assert(result.pass === false, `Expected pass=false for null items`);
  });

  // ---- Tripwire 9: ok:true + undefined proof field -> VIOLATION ----
  test('ok:true with undefined proof field -> violation', () => {
    const result = validateResponseForTripwire('/vista/endpoint', {
      ok: true,
      items: undefined,
    });
    assert(result.pass === false, `Expected pass=false for undefined items`);
  });

  // ---- Tripwire 10: Bidirectional proof ----
  test('bidirectional: no proof -> add proof -> remove proof', () => {
    // Start with violation
    const body: Record<string, unknown> = { ok: true };
    let result = validateResponseForTripwire('/vista/test', body);
    assert(result.pass === false, 'Should fail without proof');

    // Add proof
    body.items = [{ ien: '1' }];
    result = validateResponseForTripwire('/vista/test', body);
    assert(result.pass === true, 'Should pass with proof');

    // Remove proof
    delete body.items;
    result = validateResponseForTripwire('/vista/test', body);
    assert(result.pass === false, 'Should fail again without proof');
  });

  // ---- Tripwire 11: ok:true + empty array proof -> PASS (empty is non-null) ----
  test('ok:true with empty array (items: []) -> pass (non-null)', () => {
    const result = validateResponseForTripwire('/vista/endpoint', {
      ok: true,
      items: [],
    });
    assert(result.pass === true, `Expected pass=true for empty array (non-null)`);
  });

  // ---- Tripwire 12: Mutation proof fields ----
  test('ok:true with created: true -> pass', () => {
    const result = validateResponseForTripwire('/rcm/claims', {
      ok: true,
      created: true,
    });
    assert(result.pass === true, `Expected pass=true for created`);
  });

  test('ok:true with claimId -> pass', () => {
    const result = validateResponseForTripwire('/rcm/claims/submit', {
      ok: true,
      claimId: 'CLM-001',
    });
    assert(result.pass === true, `Expected pass=true for claimId`);
  });

  return { passed, failed, results };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const { passed, failed, results } = runTripwireTests();

for (const line of results) {
  // eslint-disable-next-line no-console
  console.log(line);
}

// eslint-disable-next-line no-console
console.log(`\nTripwire Fake Success: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
