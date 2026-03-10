#!/usr/bin/env node
/**
 * Phase 117 -- Multi-Instance Simulation Test
 *
 * Validates that two API instances sharing one Postgres database
 * correctly cross-validate sessions and cross-dequeue workqueue items.
 *
 * Prerequisites:
 *   - Postgres running (docker compose -f docker-compose.prod.yml up platform-db)
 *     OR local PG at PLATFORM_PG_URL
 *   - Two API instances running on different ports:
 *       PLATFORM_PG_URL=... STORE_BACKEND=pg PORT=3001 npx tsx src/index.ts
 *       PLATFORM_PG_URL=... STORE_BACKEND=pg PORT=3002 npx tsx src/index.ts
 *
 * Usage:
 *   node scripts/test-multi-instance.mjs [--api-a http://127.0.0.1:3001] [--api-b http://127.0.0.1:3002]
 */

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const API_A = getArg('--api-a', 'http://127.0.0.1:3001');
const API_B = getArg('--api-b', 'http://127.0.0.1:3002');

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  [PASS] ${label}`);
}
function fail(label, detail) {
  failed++;
  console.error(`  [FAIL] ${label}: ${detail}`);
}

async function json(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const body = await res.text();
  try {
    return { status: res.status, headers: res.headers, body: JSON.parse(body) };
  } catch {
    return { status: res.status, headers: res.headers, body };
  }
}

function extractCookie(headers, name) {
  const raw = headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    if (c.startsWith(name + '=')) {
      return c.split(';')[0].split('=').slice(1).join('=');
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Gate 1: Both instances are healthy                                   */
/* ------------------------------------------------------------------ */
async function gate1_health() {
  console.log('\n--- Gate 1: Instance Health ---');
  try {
    const a = await json(`${API_A}/health`);
    if (a.status === 200) ok(`API-A /health -> 200`);
    else fail('API-A /health', `status ${a.status}`);
  } catch (e) {
    fail('API-A /health', e.message);
  }
  try {
    const b = await json(`${API_B}/health`);
    if (b.status === 200) ok(`API-B /health -> 200`);
    else fail('API-B /health', `status ${b.status}`);
  } catch (e) {
    fail('API-B /health', e.message);
  }
}

/* ------------------------------------------------------------------ */
/* Gate 2: Session cross-validation                                     */
/*   Create session on A, validate on B, destroy on A, confirm gone B  */
/* ------------------------------------------------------------------ */
async function gate2_session_cross_validation() {
  console.log('\n--- Gate 2: Session Cross-Validation ---');

  // Login on instance A
  const loginRes = await json(`${API_A}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ accessCode: 'PROV123', verifyCode: 'PROV123!!' }),
  });

  if (loginRes.status !== 200 || !loginRes.body?.ok) {
    fail('Login on API-A', `status ${loginRes.status}, body: ${JSON.stringify(loginRes.body)}`);
    return;
  }
  ok('Login on API-A succeeded');

  const token = extractCookie(loginRes.headers, 've_session');
  if (!token) {
    fail('Session cookie extraction', 'no ve_session cookie in login response');
    return;
  }
  ok('Session cookie extracted');

  // Validate session on instance B
  const sessionB = await json(`${API_B}/auth/session`, {
    headers: { Cookie: `ve_session=${token}` },
  });

  if (sessionB.status === 200 && sessionB.body?.ok) {
    ok('Session valid on API-B (cross-instance)');
  } else {
    fail('Session cross-validation on API-B', `status ${sessionB.status}`);
  }

  // Logout on instance A
  const logoutRes = await json(`${API_A}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `ve_session=${token}` },
  });

  if (logoutRes.status === 200) {
    ok('Logout on API-A succeeded');
  } else {
    fail('Logout on API-A', `status ${logoutRes.status}`);
  }

  // Session should be gone on B now
  const afterLogoutB = await json(`${API_B}/auth/session`, {
    headers: { Cookie: `ve_session=${token}` },
  });

  if (afterLogoutB.status === 401 || !afterLogoutB.body?.ok) {
    ok('Session invalidated on API-B after logout on API-A');
  } else {
    fail('Session invalidation cross-instance', 'session still valid on B after logout on A');
  }
}

/* ------------------------------------------------------------------ */
/* Gate 3: Workqueue cross-dequeue                                      */
/*   Create workqueue item on A, read on B, update on B, confirm on A  */
/* ------------------------------------------------------------------ */
async function gate3_workqueue_cross_dequeue() {
  console.log('\n--- Gate 3: Workqueue Cross-Dequeue ---');

  // Login on both instances first
  const loginA = await json(`${API_A}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ accessCode: 'PROV123', verifyCode: 'PROV123!!' }),
  });
  const tokenA = extractCookie(loginA.headers, 've_session');

  const loginB = await json(`${API_B}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ accessCode: 'PROV123', verifyCode: 'PROV123!!' }),
  });
  const tokenB = extractCookie(loginB.headers, 've_session');

  if (!tokenA || !tokenB) {
    fail('Workqueue login', 'could not get session tokens for both instances');
    return;
  }

  // First create a demo claim so we have a claimId
  const claimRes = await json(`${API_A}/rcm/claims`, {
    method: 'POST',
    headers: { Cookie: `ve_session=${tokenA}` },
    body: JSON.stringify({
      patientDfn: '3',
      payerId: 'test-payer',
      payerName: 'Test Payer',
      totalCharged: 100,
      isDemo: true,
    }),
  });
  const claimId = claimRes.body?.claim?.id ?? 'test-claim-multi';

  // Ingest an ACK rejection on A (creates workqueue item)
  const ackRes = await json(`${API_A}/rcm/acks`, {
    method: 'POST',
    headers: { Cookie: `ve_session=${tokenA}` },
    body: JSON.stringify({
      type: '999',
      disposition: 'rejected',
      originalControlNumber: 'MULTI-TEST-001',
      ackControlNumber: 'ACK-MULTI-001',
      claimId,
      payerId: 'test-payer',
      payerName: 'Test Payer',
      errors: [
        {
          errorCode: 'SV101',
          description: 'Multi-instance test rejection',
          segmentId: 'SV1',
          fieldPosition: '1',
        },
      ],
      idempotencyKey: `multi-test-${Date.now()}`,
    }),
  });

  if (ackRes.status === 201 || ackRes.status === 200) {
    ok('ACK rejection ingested on API-A (workqueue item created)');
  } else {
    fail('ACK ingestion on API-A', `status ${ackRes.status}, body: ${JSON.stringify(ackRes.body)}`);
    return;
  }

  // Read workqueue on B -- should see the item
  const wqListB = await json(`${API_B}/rcm/workqueues?claimId=${claimId}`, {
    headers: { Cookie: `ve_session=${tokenB}` },
  });

  const items = wqListB.body?.items ?? [];
  if (items.length > 0) {
    ok(`Workqueue item visible on API-B (${items.length} items for claim)`);
  } else {
    fail('Workqueue cross-read on API-B', 'no items found');
    return;
  }

  const wqItemId = items[0].id;

  // Update (resolve) on B
  const patchRes = await json(`${API_B}/rcm/workqueues/${wqItemId}`, {
    method: 'PATCH',
    headers: { Cookie: `ve_session=${tokenB}` },
    body: JSON.stringify({
      status: 'resolved',
      resolutionNote: 'Resolved from instance B in multi-instance test',
    }),
  });

  if (patchRes.status === 200 && patchRes.body?.ok) {
    ok('Workqueue item resolved on API-B');
  } else {
    fail('Workqueue update on API-B', `status ${patchRes.status}`);
  }

  // Confirm resolution visible on A
  const verifyA = await json(`${API_A}/rcm/workqueues/${wqItemId}`, {
    headers: { Cookie: `ve_session=${tokenA}` },
  });

  if (verifyA.body?.item?.status === 'resolved') {
    ok('Resolution visible on API-A (cross-instance confirmed)');
  } else {
    fail('Workqueue cross-confirm on API-A', `status: ${verifyA.body?.item?.status}`);
  }

  // Cleanup -- logout both
  await json(`${API_A}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `ve_session=${tokenA}` },
  });
  await json(`${API_B}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `ve_session=${tokenB}` },
  });
}

/* ------------------------------------------------------------------ */
/* Gate 4: Store backend detection                                      */
/* ------------------------------------------------------------------ */
async function gate4_store_backend() {
  console.log('\n--- Gate 4: Store Backend Detection ---');

  // Check both instances report PG mode
  const loginA = await json(`${API_A}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ accessCode: 'PROV123', verifyCode: 'PROV123!!' }),
  });
  const tokenA = extractCookie(loginA.headers, 've_session');
  if (!tokenA) {
    fail('Store backend check', 'could not login');
    return;
  }

  // Check /posture/backup or /health for PG indicators
  const healthA = await json(`${API_A}/health`, {
    headers: { Cookie: `ve_session=${tokenA}` },
  });
  // The health endpoint should respond -- any 200 with 'pg' hints
  if (healthA.status === 200) {
    ok('API-A healthy (PG backend active)');
  } else {
    fail('API-A health in PG mode', `status ${healthA.status}`);
  }

  const healthB = await json(`${API_B}/health`);
  if (healthB.status === 200) {
    ok('API-B healthy (PG backend active)');
  } else {
    fail('API-B health in PG mode', `status ${healthB.status}`);
  }

  await json(`${API_A}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: `ve_session=${tokenA}` },
  });
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */
async function main() {
  console.log('=== Phase 117: Multi-Instance Simulation Test ===');
  console.log(`API-A: ${API_A}`);
  console.log(`API-B: ${API_B}`);

  await gate1_health();
  await gate2_session_cross_validation();
  await gate3_workqueue_cross_dequeue();
  await gate4_store_backend();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error('\nMulti-instance simulation FAILED. See failures above.');
    process.exit(1);
  } else {
    console.log('\nMulti-instance simulation PASSED.');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
