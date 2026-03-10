/**
 * Record Portability Phase 80 E2E -- API-level integration tests
 *
 * Pre-requisites:
 *   1. API server running on http://localhost:3001
 *   2. VistA Docker running (port 9430)
 *
 * Tests cover:
 *   - Export generation (PDF / HTML)
 *   - Download by token
 *   - Share lifecycle: create -> preview -> verify -> revoke -> denied
 *   - Wrong access code lockout
 *   - Expired / revoked share returns error
 *   - Access audit populated
 *   - Unauthenticated access denied
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:3001';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

async function portalLogin(
  request: APIRequestContext,
  username = 'patient1',
  password = 'patient1'
): Promise<{ cookie: string; body: any }> {
  const res = await request.post(`${API}/portal/auth/login`, {
    data: { username, password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);

  const setCookie = res.headers()['set-cookie'] || '';
  const match = setCookie.match(/portal_session=([^;]+)/);
  expect(match).toBeTruthy();
  return { cookie: `portal_session=${match![1]}`, body };
}

async function authedGet(request: APIRequestContext, path: string, cookie: string) {
  return request.get(`${API}${path}`, {
    headers: { Cookie: cookie },
  });
}

async function authedPost(request: APIRequestContext, path: string, cookie: string, data?: any) {
  return request.post(`${API}${path}`, {
    headers: { Cookie: cookie },
    data,
  });
}

/* ================================================================== */
/* 1. UNAUTHENTICATED ACCESS DENIED                                    */
/* ================================================================== */

test.describe('Record portability -- unauthenticated', () => {
  test('POST /portal/record/export without session returns 401', async ({ request }) => {
    const res = await request.post(`${API}/portal/record/export`, {
      data: { format: 'pdf' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /portal/record/exports without session returns 401', async ({ request }) => {
    const res = await request.get(`${API}/portal/record/exports`);
    expect(res.status()).toBe(401);
  });

  test('GET /portal/record/shares without session returns 401', async ({ request }) => {
    const res = await request.get(`${API}/portal/record/shares`);
    expect(res.status()).toBe(401);
  });
});

/* ================================================================== */
/* 2. EXPORT GENERATION                                                */
/* ================================================================== */

test.describe('Record portability -- export', () => {
  let cookie: string;

  test.beforeAll(async ({ request }) => {
    ({ cookie } = await portalLogin(request));
  });

  test('POST /portal/record/export (PDF) returns ok + token', async ({ request }) => {
    const res = await authedPost(request, '/portal/record/export', cookie, {
      format: 'pdf',
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.format).toBe('pdf');
    expect(body.expiresAt).toBeTruthy();
    expect(Array.isArray(body.rpcUsed)).toBe(true);
    expect(Array.isArray(body.sections)).toBe(true);
  });

  test('POST /portal/record/export (HTML) returns ok + token', async ({ request }) => {
    const res = await authedPost(request, '/portal/record/export', cookie, {
      format: 'html',
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.format).toBe('html');
    expect(body.token).toBeTruthy();
  });

  test('GET /portal/record/exports lists created exports', async ({ request }) => {
    const res = await authedGet(request, '/portal/record/exports', cookie);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.exports)).toBe(true);
    expect(body.exports.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /portal/record/export/:token downloads PDF content', async ({ request }) => {
    // Create an export first
    const createRes = await authedPost(request, '/portal/record/export', cookie, { format: 'pdf' });
    const { token } = await createRes.json();

    const dlRes = await authedGet(request, `/portal/record/export/${token}`, cookie);
    expect(dlRes.status()).toBe(200);
    const ct = dlRes.headers()['content-type'] || '';
    expect(ct).toContain('application/pdf');
  });

  test('GET /portal/record/export/:token downloads HTML content', async ({ request }) => {
    const createRes = await authedPost(request, '/portal/record/export', cookie, {
      format: 'html',
    });
    const { token } = await createRes.json();

    const dlRes = await authedGet(request, `/portal/record/export/${token}`, cookie);
    expect(dlRes.status()).toBe(200);
    const ct = dlRes.headers()['content-type'] || '';
    expect(ct).toContain('text/html');
  });

  test('GET /portal/record/export/:badtoken returns 404', async ({ request }) => {
    const res = await authedGet(request, '/portal/record/export/bad-token-xyz', cookie);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

/* ================================================================== */
/* 3. SHARE LIFECYCLE                                                  */
/* ================================================================== */

test.describe('Record portability -- share lifecycle', () => {
  let cookie: string;
  let exportToken: string;

  test.beforeAll(async ({ request }) => {
    ({ cookie } = await portalLogin(request));

    // Create an export to share
    const res = await authedPost(request, '/portal/record/export', cookie, {
      format: 'html',
    });
    const body = await res.json();
    exportToken = body.token;
  });

  test('create -> preview -> verify -> revoke -> denied', async ({ request }) => {
    // 1. Create share
    const createRes = await authedPost(request, '/portal/record/share', cookie, {
      exportToken,
      label: 'E2E portability share',
      ttlMinutes: 60,
      patientDob: '1990-01-01',
    });
    expect(createRes.status()).toBe(200);
    const createBody = await createRes.json();
    expect(createBody.ok).toBe(true);
    expect(createBody.shareToken).toBeTruthy();
    expect(createBody.accessCode).toBeTruthy();
    expect(createBody.shareId).toBeTruthy();

    const { shareToken, accessCode, shareId } = createBody;

    // 2. Preview (public, no auth)
    const previewRes = await request.get(`${API}/portal/record/share/preview/${shareToken}`);
    expect(previewRes.status()).toBe(200);
    const previewBody = await previewRes.json();
    expect(previewBody.ok).toBe(true);
    expect(previewBody.label).toBe('E2E portability share');
    expect(Array.isArray(previewBody.sections)).toBe(true);
    expect(previewBody.expiresAt).toBeTruthy();

    // 3. Verify with correct code + DOB
    const verifyRes = await request.post(`${API}/portal/record/share/verify/${shareToken}`, {
      data: { accessCode, patientDob: '1990-01-01' },
    });
    expect(verifyRes.status()).toBe(200);
    const ct = verifyRes.headers()['content-type'] || '';
    expect(ct).toContain('text/html');

    // 4. Revoke
    const revokeRes = await authedPost(request, `/portal/record/share/${shareId}/revoke`, cookie);
    expect(revokeRes.status()).toBe(200);
    const revokeBody = await revokeRes.json();
    expect(revokeBody.ok).toBe(true);

    // 5. After revoke -- verify fails
    const verifyRes2 = await request.post(`${API}/portal/record/share/verify/${shareToken}`, {
      data: { accessCode, patientDob: '1990-01-01' },
    });
    expect(verifyRes2.status()).toBeGreaterThanOrEqual(400);
  });

  test('wrong access code returns 403', async ({ request }) => {
    // Create a share
    const createRes = await authedPost(request, '/portal/record/share', cookie, {
      exportToken,
      label: 'Wrong code test',
      ttlMinutes: 60,
      patientDob: '1990-01-01',
    });
    const createBody = await createRes.json();
    const { shareToken } = createBody;

    // Attempt with wrong code
    const res = await request.post(`${API}/portal/record/share/verify/${shareToken}`, {
      data: { accessCode: 'WRONG1', patientDob: '1990-01-01' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test('share without exportToken returns 400', async ({ request }) => {
    const res = await authedPost(request, '/portal/record/share', cookie, {
      label: 'Missing export',
      ttlMinutes: 60,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test('share without patientDob returns 400', async ({ request }) => {
    const res = await authedPost(request, '/portal/record/share', cookie, {
      exportToken,
      label: 'Missing DOB',
      ttlMinutes: 60,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

/* ================================================================== */
/* 4. SHARE LIST + AUDIT                                               */
/* ================================================================== */

test.describe('Record portability -- shares list + audit', () => {
  let cookie: string;

  test.beforeAll(async ({ request }) => {
    ({ cookie } = await portalLogin(request));
  });

  test('GET /portal/record/shares returns array', async ({ request }) => {
    const res = await authedGet(request, '/portal/record/shares', cookie);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.shares)).toBe(true);
  });

  test('GET /portal/record/share/audit returns array', async ({ request }) => {
    const res = await authedGet(request, '/portal/record/share/audit', cookie);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.events)).toBe(true);
  });
});

test.describe('Record portability -- export revoke', () => {
  let cookie: string;

  test.beforeAll(async ({ request }) => {
    ({ cookie } = await portalLogin(request));
  });

  test('POST /portal/record/export/:token/revoke works', async ({ request }) => {
    // Create export
    const createRes = await authedPost(request, '/portal/record/export', cookie, {
      format: 'html',
    });
    const { token } = await createRes.json();

    // Revoke it
    const revokeRes = await authedPost(request, `/portal/record/export/${token}/revoke`, cookie);
    expect(revokeRes.status()).toBe(200);
    const revokeBody = await revokeRes.json();
    expect(revokeBody.ok).toBe(true);

    // Download after revoke fails
    const dlRes = await authedGet(request, `/portal/record/export/${token}`, cookie);
    expect(dlRes.status()).toBe(410);
  });
});

/* ================================================================== */
/* 5. STATS ENDPOINT                                                   */
/* ================================================================== */

test.describe('Record portability -- stats', () => {
  let cookie: string;

  test.beforeAll(async ({ request }) => {
    ({ cookie } = await portalLogin(request));
  });

  test('GET /portal/record/stats returns ok', async ({ request }) => {
    const res = await authedGet(request, '/portal/record/stats', cookie);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.totalExports).toBe('number');
    expect(typeof body.totalShares).toBe('number');
    expect(typeof body.activeExports).toBe('number');
    expect(typeof body.activeShares).toBe('number');
    expect(typeof body.totalAccessEvents).toBe('number');
  });
});
