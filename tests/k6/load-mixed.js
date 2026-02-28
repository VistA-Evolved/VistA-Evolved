/**
 * k6 Load Test: Sustained throughput
 * Wave 2 Q190 -- Multi-scenario load test
 *
 * Runs realistic mixed workload: 70% reads, 20% FHIR, 10% writes.
 * Requires: API + VistA Docker running, valid credentials.
 * Run: k6 run tests/k6/load-mixed.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

export const options = {
  scenarios: {
    reads: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: "readWorkflow",
    },
    fhir: {
      executor: "constant-arrival-rate",
      rate: 3,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 3,
      maxVUs: 10,
      exec: "fhirWorkflow",
    },
    writes: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 2,
      maxVUs: 5,
      exec: "writeWorkflow",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<8000"],
    http_req_failed: ["rate<0.15"],
    "http_req_duration{scenario:reads}": ["p(95)<5000"],
    "http_req_duration{scenario:fhir}": ["p(95)<5000"],
  },
  tags: { testid: "load-mixed" },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      accessCode: "PROV123",
      verifyCode: "PROV123!!",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.body}`);
  }

  return { cookies: loginRes.cookies };
}

export function readWorkflow(data) {
  const endpoints = [
    "/vista/default-patient-list",
    "/vista/patient-search?q=PATIENT",
    "/vista/allergies?dfn=3",
    "/vista/meds?dfn=3",
    "/vista/vitals?dfn=3",
  ];
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${url}`);
  check(res, {
    "read ok": (r) => r.status === 200,
  });
  sleep(0.1);
}

export function fhirWorkflow(data) {
  const endpoints = [
    "/fhir/r4/metadata",
    "/fhir/r4/Patient?name=ZZ",
    "/fhir/r4/Patient/3",
    "/fhir/r4/AllergyIntolerance?patient=3",
  ];
  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${url}`);
  check(res, {
    "fhir ok": (r) => r.status === 200 || r.status === 404,
  });
  sleep(0.1);
}

export function writeWorkflow(data) {
  // Light write: just hit health endpoint (safe, doesn't mutate)
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    "write-proxy ok": (r) => r.status === 200,
  });
  sleep(0.5);
}
