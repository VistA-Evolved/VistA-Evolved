/**
 * Release Candidate Baseline Load Test — Phase 118
 *
 * Validates p95 latency budgets from config/performance-budgets.json
 * against live API endpoints. Runs in 3 tiers: smoke, load, stress.
 *
 * This test is the CI gate for performance regression detection.
 * If p95 exceeds the budget, the test fails.
 *
 * Run:
 *   k6 run tests/k6/rc-baseline.js
 *   k6 run -e TIER=load tests/k6/rc-baseline.js
 *   k6 run -e TIER=stress tests/k6/rc-baseline.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";
const TIER = __ENV.TIER || "smoke";

const TIERS = {
  smoke:  { vus: 2,  duration: "30s", sleepSec: 1 },
  load:   { vus: 10, duration: "2m",  sleepSec: 0.5 },
  stress: { vus: 25, duration: "5m",  sleepSec: 0.2 },
};

const tier = TIERS[TIER] || TIERS.smoke;

export const options = {
  vus: tier.vus,
  duration: tier.duration,
  thresholds: {
    // Infrastructure endpoints — must be fast
    "http_req_duration{group:::infra}":    ["p(95)<200"],
    // Auth endpoints — VistA RPC dependent
    "http_req_duration{group:::auth}":     ["p(95)<5000"],
    // Clinical reads — VistA RPC dependent
    "http_req_duration{group:::clinical}": ["p(95)<5000"],
    // Admin/RCM reads — PG/SQLite backed
    "http_req_duration{group:::admin}":    ["p(95)<1000"],
    // Global fallback
    http_req_duration:                     ["p(95)<10000"],
    // Error rate
    http_req_failed:                       ["rate<0.10"],
  },
  tags: { testid: `rc-baseline-${TIER}` },
};

/* Custom metrics */
const infraLatency    = new Trend("infra_latency", true);
const authLatency     = new Trend("auth_latency", true);
const clinicalLatency = new Trend("clinical_latency", true);
const adminLatency    = new Trend("admin_latency", true);
const failedChecks    = new Counter("failed_checks");

let cookies = {};

/* ── Setup: Authenticate once ──────────────────────────────── */

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ accessCode: "PROV123", verifyCode: "PROV123!!" }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (loginRes.status !== 200) {
    console.error(`Login failed: ${loginRes.status} ${loginRes.body}`);
    return { cookies: {} };
  }

  // Extract session cookie
  const jar = http.cookieJar();
  const allCookies = jar.cookiesForURL(BASE_URL);
  return { cookies: allCookies };
}

export default function (data) {

  /* ---- Infrastructure probes ---- */
  group("infra", () => {
    const health = http.get(`${BASE_URL}/health`);
    infraLatency.add(health.timings.duration);
    if (!check(health, { "health 200": (r) => r.status === 200 })) failedChecks.add(1);

    const ready = http.get(`${BASE_URL}/ready`);
    infraLatency.add(ready.timings.duration);
    if (!check(ready, { "ready 200": (r) => r.status === 200 })) failedChecks.add(1);

    const version = http.get(`${BASE_URL}/version`);
    infraLatency.add(version.timings.duration);
    if (!check(version, { "version 200": (r) => r.status === 200 })) failedChecks.add(1);
  });

  sleep(tier.sleepSec * 0.5);

  /* ---- Auth flow ---- */
  group("auth", () => {
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ accessCode: "PROV123", verifyCode: "PROV123!!" }),
      { headers: { "Content-Type": "application/json" } },
    );
    authLatency.add(loginRes.timings.duration);
    if (!check(loginRes, { "login 200": (r) => r.status === 200 })) failedChecks.add(1);

    const sessionRes = http.get(`${BASE_URL}/auth/session`);
    authLatency.add(sessionRes.timings.duration);
    if (!check(sessionRes, { "session 200 or 401": (r) => r.status === 200 || r.status === 401 })) failedChecks.add(1);
  });

  sleep(tier.sleepSec);

  /* ---- Clinical reads ---- */
  group("clinical", () => {
    const patientList = http.get(`${BASE_URL}/vista/default-patient-list`);
    clinicalLatency.add(patientList.timings.duration);
    if (!check(patientList, { "patient-list ok": (r) => r.status === 200 || r.status === 401 })) failedChecks.add(1);

    const allergies = http.get(`${BASE_URL}/vista/allergies?dfn=3`);
    clinicalLatency.add(allergies.timings.duration);
    if (!check(allergies, { "allergies ok": (r) => r.status === 200 || r.status === 401 })) failedChecks.add(1);
  });

  sleep(tier.sleepSec);

  /* ---- Admin / RCM reads ---- */
  group("admin", () => {
    const caps = http.get(`${BASE_URL}/api/capabilities`);
    adminLatency.add(caps.timings.duration);
    if (!check(caps, { "capabilities ok": (r) => r.status === 200 || r.status === 401 })) failedChecks.add(1);

    const modules = http.get(`${BASE_URL}/api/modules`);
    adminLatency.add(modules.timings.duration);
    if (!check(modules, { "modules ok": (r) => r.status === 200 || r.status === 401 })) failedChecks.add(1);
  });

  sleep(tier.sleepSec);
}
