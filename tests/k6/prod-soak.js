/**
 * k6 Production Load Test: Soak
 * Phase 289 -- Production-Scale Load Test Campaign
 *
 * Long-running test to detect memory leaks, connection exhaustion,
 * and gradual performance degradation.
 *
 * Duration: 30 minutes (override with -e SOAK_DURATION=60m)
 * VUs: Constant 20
 *
 * Run: k6 run tests/k6/prod-soak.js
 * Run longer: k6 run -e SOAK_DURATION=60m tests/k6/prod-soak.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";

const soakLatency = new Trend("soak_latency", true);
const soakErrors = new Rate("soak_error_rate");
const totalRequests = new Counter("soak_total_requests");

export const options = {
  stages: [
    { duration: "1m", target: 20 },              // warm up
    { duration: SOAK_DURATION, target: 20 },     // sustained soak
    { duration: "1m", target: 0 },               // cool down
  ],
  thresholds: {
    http_req_duration: ["p(50)<500", "p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    soak_latency: ["p(95)<2000"],
    soak_error_rate: ["rate<0.01"],
  },
  tags: { testid: "prod-soak", campaign: "phase289" },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      accessCode: __ENV.ACCESS_CODE || "PROV123",
      verifyCode: __ENV.VERIFY_CODE || "PROV123!!",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, { "login 200": (r) => r.status === 200 });
  return {};
}

export default function () {
  const roll = Math.random();

  if (roll < 0.50) {
    // 50% reads
    group("soak-reads", () => {
      const r = http.get(`${BASE_URL}/vista/default-patient-list`);
      soakLatency.add(r.timings.duration);
      soakErrors.add(r.status >= 400);
      totalRequests.add(1);
      check(r, { "patients 2xx": (r) => r.status < 400 });
    });
  } else if (roll < 0.80) {
    // 30% FHIR
    group("soak-fhir", () => {
      const r = http.get(`${BASE_URL}/fhir/r4/Patient?_count=5`);
      soakLatency.add(r.timings.duration);
      soakErrors.add(r.status >= 400 && r.status !== 404);
      totalRequests.add(1);
      check(r, { "fhir 2xx/404": (r) => r.status < 500 });
    });
  } else {
    // 20% health checks
    group("soak-health", () => {
      const r1 = http.get(`${BASE_URL}/health`);
      soakLatency.add(r1.timings.duration);
      totalRequests.add(1);
      check(r1, { "health ok": (r) => r.status === 200 });

      const r2 = http.get(`${BASE_URL}/ready`);
      soakLatency.add(r2.timings.duration);
      totalRequests.add(1);
      check(r2, { "ready ok": (r) => r.status === 200 });
    });
  }

  sleep(1 + Math.random() * 2); // 1-3s think time (realistic soak pace)
}

export function teardown(data) {
  console.log("Soak test complete. Check metrics for memory/latency trends.");
  console.log("Look for: monotonically increasing p99, growing error rate.");
}
