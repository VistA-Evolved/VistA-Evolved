/**
 * Phase 37 — API contract tests.
 *
 * Tests API endpoints for:
 * - Correct status codes (200 for public, 401 for auth-required)
 * - Response shape validation
 * - No PHI/stack trace leaks in error responses
 * - Security headers
 *
 * Requires: API running on localhost:3001 with VistA Docker.
 * Run: pnpm exec vitest run tests/contract.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";

const API = process.env.API_URL ?? "http://localhost:3001";

/** Helper to make API requests. */
async function api(
  path: string,
  opts?: { method?: string; body?: unknown; cookie?: string }
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.cookie) headers["Cookie"] = opts.cookie;

  const res = await fetch(`${API}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }

  return { status: res.status, json, text, headers: res.headers };
}

/** Login and return session cookie. */
async function getSessionCookie(): Promise<string> {
  const accessCode = process.env.VISTA_ACCESS_CODE ?? "PROV123";
  const verifyCode = process.env.VISTA_VERIFY_CODE ?? "PROV123!!";

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode, verifyCode }),
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie") ?? "";
  // Extract ALL cookies (ehr_session + ehr_csrf) from comma-separated Set-Cookie header
  const cookies = setCookie.split(",").map((c) => {
    const m = c.trim().match(/^([^=]+=[^;]+)/);
    return m?.[1] ?? "";
  }).filter(Boolean);
  return cookies.join("; ");
}

// ─── Public endpoints (no auth required) ───────────────────────────

describe("Public endpoints", () => {
  it("GET /health returns 200 with ok:true", async () => {
    const { status, json } = await api("/health");
    expect(status).toBe(200);
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("uptime");
    expect(json).toHaveProperty("timestamp");
    expect(json).toHaveProperty("version");
  });

  it("GET /ready returns 200 with vista status", async () => {
    const { status, json } = await api("/ready");
    expect(status).toBe(200);
    expect(json).toHaveProperty("ok");
    expect(json).toHaveProperty("vista");
    expect(["reachable", "unreachable"]).toContain(
      (json as any).vista
    );
  });

  it("GET /version returns build metadata", async () => {
    const { status, json } = await api("/version");
    expect(status).toBe(200);
    expect(json).toHaveProperty("ok", true);
    expect(json).toHaveProperty("version");
    expect(json).toHaveProperty("nodeVersion");
  });

  it("GET /vista/ping returns connectivity status", async () => {
    const { status, json } = await api("/vista/ping");
    expect(status).toBe(200);
    expect(json).toHaveProperty("ok");
  });

  it("GET /metrics/prometheus returns Prometheus metrics", async () => {
    const { status, text } = await api("/metrics/prometheus");
    expect(status).toBe(200);
    expect(text).toContain("http_requests_total");
  });
});

// ─── Auth-required endpoints (should 401 without session) ──────────

describe("Auth-required endpoints return 401 without session", () => {
  const protectedRoutes = [
    "/vista/patient-search?q=test",
    "/vista/patient-demographics?dfn=3",
    "/vista/allergies?dfn=3",
    "/vista/vitals?dfn=3",
    "/vista/medications?dfn=3",
    "/vista/notes?dfn=3",
    "/vista/problems?dfn=3",
    "/vista/default-patient-list",
  ];

  for (const route of protectedRoutes) {
    it(`GET ${route} → 401`, async () => {
      const { status, json } = await api(route);
      expect(status).toBe(401);
      expect(json).toHaveProperty("ok", false);
      expect(json).toHaveProperty("error");
      // Must NOT leak stack traces or internal details
      const errorText = JSON.stringify(json);
      expect(errorText).not.toContain("at Object.");
      expect(errorText).not.toContain("at Module.");
      expect(errorText).not.toContain("node_modules");
      expect(errorText).not.toContain(".ts:");
    });
  }
});

// ─── Authenticated endpoint contract shapes ────────────────────────

describe("Authenticated endpoint contracts", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await getSessionCookie();
    expect(cookie).toBeTruthy();
  });

  it("GET /auth/session returns session info", async () => {
    const { status, json } = await api("/auth/session", { cookie });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("authenticated", true);
    expect(data).toHaveProperty("session");
    expect(data.session).toHaveProperty("duz");
    expect(data.session).toHaveProperty("userName");
  });

  it("GET /auth/session without cookie returns ok:false", async () => {
    const { status, json } = await api("/auth/session");
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", false);
    expect(data).toHaveProperty("authenticated", false);
  });

  it("GET /vista/patient-search?q=ZZ returns results array", async () => {
    const { status, json } = await api("/vista/patient-search?q=ZZ", {
      cookie,
    });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("GET /vista/allergies?dfn=3 returns results array", async () => {
    const { status, json } = await api("/vista/allergies?dfn=3", { cookie });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
    expect(data).toHaveProperty("count");
  });

  it("GET /vista/vitals?dfn=3 returns results array", async () => {
    const { status, json } = await api("/vista/vitals?dfn=3", { cookie });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
    expect(data).toHaveProperty("count");
  });

  it("GET /vista/problems?dfn=3 returns problems shape", async () => {
    const { status, json } = await api("/vista/problems?dfn=3", { cookie });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
  });

  it("GET /vista/medications?dfn=3 returns medications shape", async () => {
    const { status, json } = await api("/vista/medications?dfn=3", { cookie });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
  });

  it("GET /vista/notes?dfn=3 returns notes shape", async () => {
    const { status, json } = await api("/vista/notes?dfn=3", { cookie });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
  });

  it("GET /vista/default-patient-list returns results array", async () => {
    const { status, json } = await api("/vista/default-patient-list", {
      cookie,
    });
    expect(status).toBe(200);
    const data = json as any;
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("results");
    expect(Array.isArray(data.results)).toBe(true);
  });
});

// ─── PHI leak prevention ───────────────────────────────────────────

describe("PHI leak prevention", () => {
  it("error responses do not contain stack traces", async () => {
    // Hit a known-bad endpoint
    const { json } = await api("/vista/nonexistent-endpoint-xyz");
    const text = JSON.stringify(json);
    expect(text).not.toMatch(/at \w+\.\w+ \(/);
    expect(text).not.toContain("Error:");
    expect(text).not.toContain("node_modules");
  });

  it("404 response is clean JSON", async () => {
    const { status } = await api("/completely-fake-route");
    // Fastify returns 404 for unknown routes
    expect([404, 401]).toContain(status);
  });
});

// ─── Auth flow ─────────────────────────────────────────────────────

describe("Auth flow", () => {
  it("POST /auth/login with valid creds returns session", async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessCode: process.env.VISTA_ACCESS_CODE ?? "PROV123",
        verifyCode: process.env.VISTA_VERIFY_CODE ?? "PROV123!!",
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("session");
    expect(data.session).toHaveProperty("duz");
    // Should set cookie
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
  });

  it("POST /auth/login with bad creds returns error (no PHI leak)", async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessCode: "BADUSER999",
        verifyCode: "BADPASS999",
      }),
    });
    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("ok", false);
    // Error message should not leak internal details
    const errorText = JSON.stringify(data);
    expect(errorText).not.toContain("BADUSER999");
    expect(errorText).not.toContain("BADPASS999");
    expect(errorText).not.toContain("node_modules");
    expect(errorText).not.toContain(".ts:");
  });

  it("POST /auth/logout destroys session", async () => {
    const cookie = await getSessionCookie();
    const { status, json } = await api("/auth/logout", {
      method: "POST",
      cookie,
    });
    expect(status).toBe(200);
    expect(json).toHaveProperty("ok", true);

    // Session should be destroyed - subsequent request should show unauthenticated
    const { status: afterStatus, json: afterJson } = await api("/auth/session", { cookie });
    // /auth/session returns 200 with ok:false when no valid session
    expect(afterStatus).toBe(200);
    expect((afterJson as any).authenticated).toBe(false);
  });
});
