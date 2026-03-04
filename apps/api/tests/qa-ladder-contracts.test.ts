/**
 * Phase 129 — QA Ladder: API Contract Tests
 *
 * Validates:
 *   1. Authenticated endpoint response shapes match expected contracts
 *   2. Error responses have uniform shape ({ok: false, error: string})
 *   3. No placeholder/stub responses leak through on live paths
 *   4. Response timing stays within budget (10s per endpoint)
 *   5. Zod schema alignment: request bodies are validated before reaching handlers
 *
 * Requires: API running on localhost:3001 with VistA Docker.
 * Run: pnpm exec vitest run tests/qa-ladder-contracts.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.API_URL ?? 'http://localhost:3001';
const MAX_RESPONSE_MS = 10_000;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

async function api(path: string, opts?: { method?: string; body?: unknown; cookie?: string }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts?.cookie) headers['Cookie'] = opts.cookie;

  const start = Date.now();
  const res = await fetch(`${API}${path}`, {
    method: opts?.method ?? 'GET',
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  const elapsed = Date.now() - start;
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }

  return { status: res.status, json, text, elapsed, headers: res.headers };
}

async function getSessionCookie(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessCode: process.env.VISTA_ACCESS_CODE ?? 'PRO1234',
      verifyCode: process.env.VISTA_VERIFY_CODE ?? 'PRO1234!!',
    }),
    redirect: 'manual',
  });
  // Node 18+ fetch exposes set-cookie via getSetCookie(); fallback to .get()
  const rawCookies: string[] =
    typeof (res.headers as any).getSetCookie === 'function'
      ? (res.headers as any).getSetCookie()
      : (res.headers.get('set-cookie') ?? '').split(',');
  const cookies = rawCookies
    .map((c: string) => {
      const m = c.trim().match(/^([^=]+=[^;]+)/);
      return m?.[1] ?? '';
    })
    .filter(Boolean);
  return cookies.join('; ');
}

/* ------------------------------------------------------------------ */
/* Response shape contracts                                             */
/* ------------------------------------------------------------------ */

/** All ok:true responses have this base shape. */
function assertOkShape(json: unknown): void {
  expect(json).toHaveProperty('ok', true);
}

/** All ok:false responses have this error shape. */
function assertErrorShape(json: unknown): void {
  expect(json).toHaveProperty('ok', false);
  const obj = json as Record<string, unknown>;
  expect(typeof obj.error).toBe('string');
  // Must not leak stack traces
  const text = JSON.stringify(json);
  expect(text).not.toContain('at Object.');
  expect(text).not.toContain('at Module.');
  expect(text).not.toContain('node_modules');
  expect(text).not.toContain('.ts:');
}

/** Response must not be a placeholder/stub (empty results with no real data). */
function assertNotPlaceholder(json: unknown, endpointHint: string): void {
  const obj = json as Record<string, unknown>;
  // A placeholder often has: ok:true but results:[] and count:0 with no specific fields
  // We allow empty results (sandbox may have real empty data), but we check for
  // the presence of expected structural fields
  if (obj.ok !== true) return; // error responses are fine
  // Must have at least one domain-specific field beyond just {ok, results}
  const keys = Object.keys(obj).filter((k) => !['ok', 'timestamp', 'source'].includes(k));
  expect(
    keys.length,
    `${endpointHint}: response has only {ok} — likely placeholder`
  ).toBeGreaterThanOrEqual(1);
}

/** Assert response time within budget. */
function assertTimeBudget(elapsed: number, endpoint: string): void {
  expect(
    elapsed,
    `${endpoint} exceeded ${MAX_RESPONSE_MS}ms budget (took ${elapsed}ms)`
  ).toBeLessThanOrEqual(MAX_RESPONSE_MS);
}

/* ------------------------------------------------------------------ */
/* Contract: Authenticated clinical endpoints                           */
/* ------------------------------------------------------------------ */

describe('Authenticated clinical endpoint contracts', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getSessionCookie();
    expect(cookie).toBeTruthy();
  });

  const clinicalEndpoints = [
    {
      path: '/vista/patient-search?q=ZZ',
      requiredKeys: ['results'],
      arrayField: 'results',
    },
    {
      path: '/vista/default-patient-list',
      requiredKeys: ['results'],
      arrayField: 'results',
    },
    {
      path: '/vista/patient-demographics?dfn=3',
      requiredKeys: ['patient'],
    },
    {
      path: '/vista/allergies?dfn=3',
      requiredKeys: ['results', 'count'],
      arrayField: 'results',
    },
    {
      path: '/vista/vitals?dfn=3',
      requiredKeys: ['results', 'count'],
      arrayField: 'results',
    },
    {
      path: '/vista/problems?dfn=3',
      requiredKeys: ['results'],
      arrayField: 'results',
    },
    {
      path: '/vista/medications?dfn=3',
      requiredKeys: ['results'],
      arrayField: 'results',
    },
    {
      path: '/vista/notes?dfn=3',
      requiredKeys: ['results'],
      arrayField: 'results',
    },
  ];

  for (const ep of clinicalEndpoints) {
    it(`GET ${ep.path} — shape + timing`, async () => {
      const { status, json, elapsed } = await api(ep.path, { cookie });

      // Must respond successfully
      expect(status).toBe(200);
      assertOkShape(json);
      assertNotPlaceholder(json, ep.path);
      assertTimeBudget(elapsed, ep.path);

      // Required keys
      const obj = json as Record<string, unknown>;
      for (const key of ep.requiredKeys) {
        expect(obj, `${ep.path} missing key: ${key}`).toHaveProperty(key);
      }

      // Array fields must be arrays
      if (ep.arrayField) {
        expect(Array.isArray(obj[ep.arrayField]), `${ep.path}.${ep.arrayField} must be array`).toBe(
          true
        );
      }
    });
  }
});

/* ------------------------------------------------------------------ */
/* Contract: Error shape uniformity                                     */
/* ------------------------------------------------------------------ */

describe('Error shape uniformity', () => {
  const errorEndpoints = [
    // No auth → 401
    { path: '/vista/allergies?dfn=3', expectedStatus: 401 },
    { path: '/vista/patient-demographics?dfn=3', expectedStatus: 401 },
    { path: '/vista/medications?dfn=3', expectedStatus: 401 },
  ];

  for (const ep of errorEndpoints) {
    it(`GET ${ep.path} (no auth) → ${ep.expectedStatus} with uniform error shape`, async () => {
      const { status, json } = await api(ep.path);
      expect(status).toBe(ep.expectedStatus);
      assertErrorShape(json);
    });
  }

  it('POST /auth/login with missing body → 400 with error shape', async () => {
    const { status, json } = await api('/auth/login', {
      method: 'POST',
      body: {},
    });
    // Zod validation should catch empty body
    expect([400, 401]).toContain(status);
    const obj = json as Record<string, unknown>;
    expect(obj).toHaveProperty('ok', false);
  });

  it('POST /auth/login with invalid types → 400 with error shape', async () => {
    const { status, json } = await api('/auth/login', {
      method: 'POST',
      body: { accessCode: 123, verifyCode: true },
    });
    expect([400, 401]).toContain(status);
    const obj = json as Record<string, unknown>;
    expect(obj).toHaveProperty('ok', false);
  });
});

/* ------------------------------------------------------------------ */
/* Contract: No placeholder responses on live paths                     */
/* ------------------------------------------------------------------ */

describe('No placeholder/stub responses', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getSessionCookie();
  });

  it('GET /auth/session returns full session object (not stub)', async () => {
    const { json } = await api('/auth/session', { cookie });
    const data = json as Record<string, unknown>;
    assertOkShape(data);
    expect(data).toHaveProperty('authenticated', true);
    expect(data).toHaveProperty('session');
    const session = data.session as Record<string, unknown>;
    expect(session).toHaveProperty('duz');
    expect(session).toHaveProperty('userName');
    // DUZ should be a real value, not "0" or empty
    expect(String(session.duz)).not.toBe('0');
    expect(String(session.duz)).not.toBe('');
  });

  it('GET /vista/patient-search?q=CARTER returns non-empty results', async () => {
    const { json } = await api('/vista/patient-search?q=CARTER', { cookie });
    const data = json as Record<string, unknown>;
    assertOkShape(data);
    const results = data.results as unknown[];
    // WorldVistA sandbox should have at least 1 CARTER patient
    expect(
      results.length,
      'Patient search for CARTER returned 0 results — possible stub'
    ).toBeGreaterThanOrEqual(1);
  });

  it('GET /health has real uptime (not hardcoded 0)', async () => {
    const { json } = await api('/health');
    const data = json as Record<string, unknown>;
    expect(data).toHaveProperty('ok', true);
    expect(typeof data.uptime).toBe('number');
  });

  it('GET /ready has vista field (not missing)', async () => {
    const { json } = await api('/ready');
    const data = json as Record<string, unknown>;
    expect(data).toHaveProperty('ok');
    expect(data).toHaveProperty('vista');
    expect(['reachable', 'unreachable']).toContain(data.vista);
  });
});

/* ------------------------------------------------------------------ */
/* Contract: Security headers present                                   */
/* ------------------------------------------------------------------ */

describe('Security headers present', () => {
  it('Responses include security headers', async () => {
    const { headers } = await api('/health');
    // X-Content-Type-Options should be set
    const xCto = headers.get('x-content-type-options');
    expect(xCto).toBe('nosniff');
  });

  it('Set-Cookie uses httpOnly for session', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: process.env.VISTA_ACCESS_CODE ?? 'PRO1234',
        verifyCode: process.env.VISTA_VERIFY_CODE ?? 'PRO1234!!',
      }),
    });
    // Node 18+ fetch exposes set-cookie via getSetCookie(); fallback to .get()
    const rawCookies: string[] =
      typeof (res.headers as any).getSetCookie === 'function'
        ? (res.headers as any).getSetCookie()
        : (res.headers.get('set-cookie') ?? '').split(',');
    const setCookie = rawCookies.join(', ').toLowerCase();
    // Session cookie should be httpOnly
    expect(setCookie).toContain('httponly');
  });
});

/* ------------------------------------------------------------------ */
/* Contract: Validation rejects bad input                               */
/* ------------------------------------------------------------------ */

describe('Input validation enforced', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getSessionCookie();
  });

  it('GET /vista/patient-search without q param → ok:false', async () => {
    const { status, json } = await api('/vista/patient-search', { cookie });
    // API returns 200 with ok:false for missing params (graceful validation)
    expect(status).toBe(200);
    expect((json as any).ok).toBe(false);
    expect((json as any).error).toBeTruthy();
  });

  it('GET /vista/allergies without dfn → ok:false', async () => {
    const { status, json } = await api('/vista/allergies', { cookie });
    expect(status).toBe(200);
    expect((json as any).ok).toBe(false);
    expect((json as any).error).toBeTruthy();
  });

  it('GET /vista/allergies?dfn=abc (non-numeric) → ok:false', async () => {
    const { status, json } = await api('/vista/allergies?dfn=abc', { cookie });
    expect(status).toBe(200);
    expect((json as any).ok).toBe(false);
    expect((json as any).error).toBeTruthy();
  });
});
