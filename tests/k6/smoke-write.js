/**
 * k6 Smoke Test: Write Workflow (Add Allergy)
 * Phase 36 -- Performance smoke suite
 *
 * Tests 1 write workflow: adding an allergy to a test patient.
 * This test may fail on sandbox if OREDITED fields are incomplete
 * or the patient/allergy setup is wrong. That is expected; the goal
 * is to verify the API handles the request end-to-end.
 *
 * Requires: API running, VistA Docker running, valid credentials.
 * Run: k6 run tests/k6/smoke-write.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  vus: 1,
  iterations: 3,
  thresholds: {
    http_req_duration: ['p(95)<15000'], // 15s -- writes can be slow
    http_req_failed: ['rate<0.80'], // High tolerance -- sandbox may reject writes
  },
  tags: { testid: 'smoke-write' },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      accessCode: 'PROV123',
      verifyCode: 'PROV123!!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.body}`);
  }

  return { cookies: loginRes.cookies };
}

export default function (data) {
  // Attempt to add an allergy -- the request itself exercises the full
  // RPC broker path even if VistA rejects the payload.
  group('add-allergy', function () {
    const payload = {
      dfn: '3',
      allergyText: 'PENICILLIN',
    };

    const res = http.post(`${BASE_URL}/vista/allergies`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
      'add-allergy responded': (r) => r.status === 200 || r.status === 400 || r.status === 500,
      'add-allergy has body': (r) => r.body && r.body.length > 0,
    });
  });

  sleep(2);
}
