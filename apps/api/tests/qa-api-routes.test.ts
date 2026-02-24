/**
 * Phase 105 -- QA Gauntlet: API Route Validation
 *
 * Validates that all routes used by the UI actually exist and respond
 * with correct status codes and response shapes.
 *
 * Requires: API running on localhost:3001
 * Run: cd apps/api && pnpm exec vitest run tests/qa-api-routes.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";

const API = process.env.API_URL ?? "http://localhost:3001";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function apiGet(path: string, opts?: { cookie?: string }) {
  const headers: Record<string, string> = {};
  if (opts?.cookie) headers["Cookie"] = opts.cookie;
  const res = await fetch(`${API}${path}`, { headers });
  let json: any = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, json };
}

async function apiPost(path: string, body: unknown, opts?: { cookie?: string; csrf?: string }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.cookie) headers["Cookie"] = opts.cookie;
  if (opts?.csrf) headers["x-csrf-token"] = opts.csrf;
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, json, headers: res.headers };
}

async function login(): Promise<{ cookie: string; csrf: string }> {
  const accessCode = process.env.VISTA_ACCESS_CODE ?? "PROV123";
  const verifyCode = process.env.VISTA_VERIFY_CODE ?? "PROV123!!";
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode, verifyCode }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  // Extract all cookies
  const cookies = setCookie.split(",").map((c) => {
    const match = c.trim().match(/^([^=]+=[^;]+)/);
    return match?.[1] ?? "";
  }).filter(Boolean);
  const cookieStr = cookies.join("; ");
  // Extract CSRF token
  const csrfMatch = setCookie.match(/ehr_csrf=([^;]+)/);
  const csrf = csrfMatch?.[1] ?? "";
  return { cookie: cookieStr, csrf };
}

let authed: { cookie: string; csrf: string };

beforeAll(async () => {
  authed = await login();
});

/* ================================================================== */
/* 1. Public endpoints                                                 */
/* ================================================================== */

describe("Public endpoints (no auth)", () => {
  it("GET /health returns ok", async () => {
    const { status, json } = await apiGet("/health");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("GET /ready returns ok", async () => {
    const { status, json } = await apiGet("/ready");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("GET /version returns version", async () => {
    const { status, json } = await apiGet("/version");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.version).toBeTruthy();
  });
});

/* ================================================================== */
/* 2. Auth flow                                                        */
/* ================================================================== */

describe("Auth flow", () => {
  it("POST /auth/login with good creds returns 200 + session", async () => {
    const { status, json } = await apiPost("/auth/login", {
      accessCode: "PROV123",
      verifyCode: "PROV123!!",
    });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.session).toBeTruthy();
    expect(json.session.duz).toBeTruthy();
    expect(json.session.role).toBeTruthy();
  });

  it("POST /auth/login with bad creds returns 401", async () => {
    const { status, json } = await apiPost("/auth/login", {
      accessCode: "BADUSER",
      verifyCode: "BADPASS!!",
    });
    expect(status).toBe(401);
    expect(json.ok).toBe(false);
  });

  it("GET /auth/session with valid cookie returns session", async () => {
    const { status, json } = await apiGet("/auth/session", { cookie: authed.cookie });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("GET /auth/session without cookie returns unauthenticated", async () => {
    const { status, json } = await apiGet("/auth/session");
    // Session endpoint returns 200 with {ok:false, authenticated:false} when no session
    expect(status).toBe(200);
    expect(json.authenticated).toBe(false);
  });
});

/* ================================================================== */
/* 3. Clinical endpoints require auth                                  */
/* ================================================================== */

describe("Clinical endpoints require auth", () => {
  const authRequired = [
    "/vista/allergies?dfn=3",
    "/vista/vitals?dfn=3",
    "/vista/problems?dfn=3",
    "/vista/medications?dfn=3",
    "/vista/notes?dfn=3",
    "/vista/orders?dfn=3",
    "/vista/labs?dfn=3",
    "/vista/consults?dfn=3",
    "/vista/patient-demographics?dfn=3",
  ];

  for (const path of authRequired) {
    it(`GET ${path} without auth returns 401`, async () => {
      const { status } = await apiGet(path);
      expect(status).toBe(401);
    });
  }
});

/* ================================================================== */
/* 4. Authenticated clinical read routes respond                       */
/* ================================================================== */

describe("Authenticated clinical reads", () => {
  const clinicalReads = [
    { path: "/vista/allergies?dfn=3", name: "allergies" },
    { path: "/vista/vitals?dfn=3", name: "vitals" },
    { path: "/vista/problems?dfn=3", name: "problems" },
    { path: "/vista/patient-demographics?dfn=3", name: "demographics" },
  ];

  for (const { path, name } of clinicalReads) {
    it(`GET ${path} returns data or structured pending`, async () => {
      const { status, json } = await apiGet(path, { cookie: authed.cookie });
      // Must authenticate successfully (not 401/403)
      expect(status).toBeLessThan(400);
      // Response must be structured JSON
      expect(json).toBeTruthy();
      // Must have ok:true or structured integration-pending
      const isOk = json.ok === true;
      const isPending = json.integrationPending === true || json.status === "integration-pending";
      const isData = Array.isArray(json.data) || Array.isArray(json.items);
      expect(isOk || isPending || isData).toBe(true);
    });
  }
});

/* ================================================================== */
/* 5. Admin endpoints require admin role                               */
/* ================================================================== */

describe("Admin endpoints", () => {
  it("GET /admin/payer-db/payers requires auth", async () => {
    const { status } = await apiGet("/admin/payer-db/payers");
    expect(status).toBe(401);
  });

  it("GET /admin/payer-db/payers with auth returns payers", async () => {
    const { status, json } = await apiGet("/admin/payer-db/payers", { cookie: authed.cookie });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.count).toBeGreaterThan(0);
  });

  it("GET /admin/payer-db/audit/retention returns policy", async () => {
    const { status, json } = await apiGet("/admin/payer-db/audit/retention", { cookie: authed.cookie });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.policy).toBeTruthy();
  });
});

/* ================================================================== */
/* 6. RCM endpoints                                                    */
/* ================================================================== */

describe("RCM endpoints", () => {
  it("GET /rcm/claims with auth returns claims list", async () => {
    const { status, json } = await apiGet("/rcm/claims", { cookie: authed.cookie });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("GET /rcm/payers with auth returns payer list", async () => {
    const { status, json } = await apiGet("/rcm/payers", { cookie: authed.cookie });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

/* ================================================================== */
/* 7. Analytics endpoints                                              */
/* ================================================================== */

describe("Analytics endpoints", () => {
  it("GET /analytics/events returns events", async () => {
    const { status, json } = await apiGet("/analytics/events?limit=1", { cookie: authed.cookie });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

/* ================================================================== */
/* 8. Response shape: no PHI/stack leaks in errors                     */
/* ================================================================== */

describe("Error response safety", () => {
  it("404 does not leak stack traces", async () => {
    const { json } = await apiGet("/nonexistent/path/12345");
    const str = JSON.stringify(json);
    expect(str).not.toContain("node_modules");
    expect(str).not.toContain("at Object.");
    expect(str).not.toContain(".ts:");
  });

  it("401 does not leak internal info", async () => {
    const { json } = await apiGet("/vista/allergies?dfn=3");
    const str = JSON.stringify(json);
    expect(str).not.toContain("PROV123");
    expect(str).not.toContain("password");
  });
});
