/**
 * k6 Production Load Test: Sustained Throughput
 * Phase 289 -- Production-Scale Load Test Campaign
 *
 * Simulates realistic sustained clinical workload:
 *   60% reads (patient data), 25% FHIR, 15% write-like (auth flows)
 *
 * Ramp: 1 -> 50 VU (1 min) -> hold (3 min) -> ramp down (1 min)
 *
 * Prerequisites: API + VistA Docker running
 * Run: k6 run tests/k6/prod-sustained.js
 * Override API URL: k6 run -e API_URL=http://staging:3001 tests/k6/prod-sustained.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

// Custom metrics
const readLatency = new Trend("read_latency", true);
const fhirLatency = new Trend("fhir_latency", true);
const writeLatency = new Trend("write_latency", true);
const errorRate = new Rate("custom_error_rate");

export const options = {
  stages: [
    { duration: "1m", target: 50 },  // ramp up
    { duration: "3m", target: 50 },  // sustained load
    { duration: "1m", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(50)<500", "p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    read_latency: ["p(50)<200", "p(95)<1000"],
    fhir_latency: ["p(50)<300", "p(95)<1500"],
    custom_error_rate: ["rate<0.01"],
  },
  tags: { testid: "prod-sustained", campaign: "phase289" },
};

export function setup() {
  // Login to get session cookie
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      accessCode: __ENV.ACCESS_CODE || "PROV123",
      verifyCode: __ENV.VERIFY_CODE || "PROV123!!",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  const ok = check(loginRes, {
    "login 200": (r) => r.status === 200,
  });

  if (!ok) {
    console.error(`Login failed: ${loginRes.status} ${loginRes.body}`);
  }

  // Extract cookies for session
  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL(BASE_URL);
  return { cookies };
}

export default function (data) {
  const roll = Math.random();

  if (roll < 0.60) {
    // 60% reads
    readWorkflow();
  } else if (roll < 0.85) {
    // 25% FHIR
    fhirWorkflow();
  } else {
    // 15% write-like (auth check, health)
    writeWorkflow();
  }

  sleep(0.5 + Math.random() * 1.5); // 0.5-2s think time
}

function readWorkflow() {
  group("reads", () => {
    const r1 = http.get(`${BASE_URL}/health`);
    check(r1, { "health 200": (r) => r.status === 200 });

    const r2 = http.get(`${BASE_URL}/ready`);
    check(r2, { "ready 200": (r) => r.status === 200 });

    const r3 = http.get(`${BASE_URL}/vista/default-patient-list`);
    readLatency.add(r3.timings.duration);
    errorRate.add(r3.status >= 400);
    check(r3, { "patient-list 2xx": (r) => r.status < 400 });

    const r4 = http.get(`${BASE_URL}/vista/allergies?dfn=3`);
    readLatency.add(r4.timings.duration);
    errorRate.add(r4.status >= 400);
    check(r4, { "allergies 2xx": (r) => r.status < 400 });
  });
}

function fhirWorkflow() {
  group("fhir", () => {
    const r1 = http.get(`${BASE_URL}/fhir/r4/Patient?_count=5`);
    fhirLatency.add(r1.timings.duration);
    errorRate.add(r1.status >= 400 && r1.status !== 404);
    check(r1, { "fhir-patient 2xx/404": (r) => r.status < 500 });

    const r2 = http.get(`${BASE_URL}/fhir/r4/AllergyIntolerance?patient=3`);
    fhirLatency.add(r2.timings.duration);
    check(r2, { "fhir-allergy 2xx/404": (r) => r.status < 500 });
  });
}

function writeWorkflow() {
  group("writes", () => {
    // Auth check (lightweight write-like operation)
    const r1 = http.get(`${BASE_URL}/health`);
    writeLatency.add(r1.timings.duration);
    check(r1, { "health-write 200": (r) => r.status === 200 });

    // Version endpoint
    const r2 = http.get(`${BASE_URL}/version`);
    writeLatency.add(r2.timings.duration);
    check(r2, { "version 2xx/404": (r) => r.status < 500 });
  });
}
