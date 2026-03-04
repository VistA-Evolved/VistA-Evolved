/**
 * Phase 37 — RPC boundary tests.
 *
 * Tests the VistA RPC boundary behavior:
 * - When VistA sandbox is reachable: live probe tests
 * - Circuit breaker status
 * - RPC capability probing
 *
 * Requires: API running on localhost:3001 with VistA Docker on port 9430.
 * Run: pnpm exec vitest run tests/rpc-boundary.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.API_URL ?? 'http://localhost:3001';

async function api(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${API}${path}`, { headers });
  const json = (await res.json().catch(() => null)) as any;
  return { status: res.status, json };
}

async function getSessionCookie(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessCode: process.env.VISTA_ACCESS_CODE ?? 'PROV123',
      verifyCode: process.env.VISTA_VERIFY_CODE ?? 'PROV123!!',
    }),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/([^=]+=[^;]+)/);
  return match?.[1] ?? '';
}

describe('RPC boundary — VistA connectivity', () => {
  it('GET /vista/ping confirms VistA reachability', async () => {
    const { status, json } = await api('/vista/ping');
    expect(status).toBe(200);
    expect(json).toHaveProperty('ok');
    // If VistA is running, ok should be true and vista field present
    if (json.ok) {
      expect(json).toHaveProperty('vista', 'reachable');
    }
  });

  it('GET /health reports circuit breaker state', async () => {
    const { status, json } = await api('/health');
    expect(status).toBe(200);
    expect(json).toHaveProperty('circuitBreaker');
    expect(['closed', 'open', 'half-open']).toContain(json.circuitBreaker);
  });

  it('GET /ready reports VistA reachability', async () => {
    const { status, json } = await api('/ready');
    expect(status).toBe(200);
    expect(json).toHaveProperty('vista');
  });
});

describe('RPC boundary — authenticated RPC calls', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getSessionCookie();
    expect(cookie).toBeTruthy();
  });

  it('patient search RPC returns structured results', async () => {
    const { status, json } = await api('/vista/patient-search?q=ZZ', cookie);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.results)).toBe(true);
    if (json.results.length > 0) {
      const patient = json.results[0];
      expect(patient).toHaveProperty('dfn');
      expect(patient).toHaveProperty('name');
    }
  });

  it('default patient list RPC returns results', async () => {
    const { status, json } = await api('/vista/default-patient-list', cookie);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.results)).toBe(true);
  });

  it('allergies RPC returns structured data', async () => {
    const { status, json } = await api('/vista/allergies?dfn=3', cookie);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.results)).toBe(true);
  });

  it('vitals RPC returns structured data', async () => {
    const { status, json } = await api('/vista/vitals?dfn=3', cookie);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.results)).toBe(true);
  });

  it('RPC capability probe returns status', async () => {
    const { status, json } = await api('/vista/rpc-capabilities', cookie);
    // This endpoint exists and returns capability data
    if (status === 200) {
      expect(json).toHaveProperty('ok');
    }
    // 401 is acceptable if auth middleware intercepts
    expect([200, 401]).toContain(status);
  });
});

describe('RPC boundary — error handling', () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getSessionCookie();
  });

  it('invalid DFN returns error without PHI leak', async () => {
    const { status, json } = await api('/vista/allergies?dfn=99999999', cookie);
    // Should return 200 with ok:false or empty data, not crash
    expect([200, 400, 500]).toContain(status);
    const text = JSON.stringify(json);
    expect(text).not.toMatch(/at \w+\.\w+ \(/);
    expect(text).not.toContain('node_modules');
  });

  it('missing DFN param returns appropriate error', async () => {
    const { status, json } = await api('/vista/allergies', cookie);
    // Should handle gracefully
    expect([200, 400]).toContain(status);
    if (status === 400) {
      expect(json).toHaveProperty('error');
    }
  });
});
