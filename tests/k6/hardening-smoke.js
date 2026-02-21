/**
 * Phase 62 Hardening Load Test
 *
 * Focused on security and resilience endpoints:
 * - Health/ready probes under load
 * - Audit verify endpoints
 * - Rate limiter validation
 * - Session auth flow
 *
 * Run:
 *   k6 run tests/k6/hardening-smoke.js
 *   k6 run -e TIER=load tests/k6/hardening-smoke.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";
const TIER = __ENV.TIER || "smoke";

const TIERS = {
  smoke: { vus: 1, duration: "30s", sleepSec: 2 },
  load:  { vus: 5, duration: "1m",  sleepSec: 1 },
  stress:{ vus: 15, duration: "2m", sleepSec: 0.5 },
};

const tier = TIERS[TIER] || TIERS.smoke;

export const options = {
  vus: tier.vus,
  duration: tier.duration,
  thresholds: {
    // Infrastructure endpoints must be fast
    "http_req_duration{group:::health-probes}": ["p(95)<200"],
    // Audit verify may scan entries -- allow more time
    "http_req_duration{group:::audit-verify}": ["p(95)<2000"],
    // Auth endpoints
    "http_req_duration{group:::auth-flow}": ["p(95)<5000"],
    // Global
    http_req_duration: ["p(95)<10000"],
  },
  tags: { testid: `hardening-${TIER}` },
};

/* Custom metrics */
const healthLatency = new Trend("health_latency", true);
const auditVerifyLatency = new Trend("audit_verify_latency", true);
const authLatency = new Trend("auth_latency", true);
const failedChecks = new Counter("failed_checks");

export default function () {
  /* ---------------------------------------------------------------- */
  /* Health probes                                                     */
  /* ---------------------------------------------------------------- */
  group("health-probes", () => {
    const healthRes = http.get(`${BASE_URL}/health`);
    healthLatency.add(healthRes.timings.duration);
    const healthOk = check(healthRes, {
      "health returns 200": (r) => r.status === 200,
      "health has ok:true": (r) => {
        try { return JSON.parse(r.body).ok === true; } catch { return false; }
      },
    });
    if (!healthOk) failedChecks.add(1);

    const readyRes = http.get(`${BASE_URL}/ready`);
    healthLatency.add(readyRes.timings.duration);
    check(readyRes, {
      "ready returns 200": (r) => r.status === 200,
    });

    // Metrics endpoint (for Prometheus scraper)
    const metricsRes = http.get(`${BASE_URL}/metrics`);
    healthLatency.add(metricsRes.timings.duration);
    check(metricsRes, {
      "metrics returns 200": (r) => r.status === 200,
    });
  });

  sleep(tier.sleepSec);

  /* ---------------------------------------------------------------- */
  /* Audit verification                                                */
  /* ---------------------------------------------------------------- */
  group("audit-verify", () => {
    // These may return 401 without session -- that's fine for load testing
    const iamRes = http.get(`${BASE_URL}/iam/audit/verify`);
    auditVerifyLatency.add(iamRes.timings.duration);
    check(iamRes, {
      "iam audit verify responds": (r) => r.status === 200 || r.status === 401,
    });

    const imgRes = http.get(`${BASE_URL}/imaging/audit/verify`);
    auditVerifyLatency.add(imgRes.timings.duration);
    check(imgRes, {
      "imaging audit verify responds": (r) => r.status === 200 || r.status === 401,
    });

    const rcmRes = http.get(`${BASE_URL}/rcm/audit/verify`);
    auditVerifyLatency.add(rcmRes.timings.duration);
    check(rcmRes, {
      "rcm audit verify responds": (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(tier.sleepSec);

  /* ---------------------------------------------------------------- */
  /* Auth flow                                                         */
  /* ---------------------------------------------------------------- */
  group("auth-flow", () => {
    // Login attempt (will succeed if VistA is running)
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ accessCode: "PROV123", verifyCode: "PROV123!!" }),
      { headers: { "Content-Type": "application/json" } }
    );
    authLatency.add(loginRes.timings.duration);
    check(loginRes, {
      "login responds": (r) => r.status === 200 || r.status === 401 || r.status === 429,
    });
  });

  sleep(tier.sleepSec);
}
