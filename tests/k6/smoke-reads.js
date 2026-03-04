/**
 * k6 Smoke Test: Read-Only Clinical Workflows
 * Phase 36 -- Performance smoke suite
 *
 * Tests 5 read-only workflows that hit VistA RPCs.
 * Requires: API running, VistA Docker running, valid credentials.
 * Run: k6 run tests/k6/smoke-reads.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95th percentile under 10s (VistA RPCs can be slow)
    http_req_failed: ['rate<0.20'], // Tolerate some failures (sandbox limitations)
  },
  tags: { testid: 'smoke-reads' },
};

export function setup() {
  // Login once to get session cookie
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
  // 1. Patient Search (query param: ?q=<search>)
  group('patient-search', function () {
    const res = http.get(`${BASE_URL}/vista/patient-search?q=ZZ`);
    check(res, {
      'patient-search 200': (r) => r.status === 200,
      'patient-search ok': (r) => r.json('ok') === true,
      'patient-search has results': (r) => {
        const results = r.json('results');
        return Array.isArray(results);
      },
    });
  });

  // 2. Default Patient List
  group('default-patient-list', function () {
    const res = http.get(`${BASE_URL}/vista/default-patient-list`);
    check(res, {
      'patient-list 200': (r) => r.status === 200,
      'patient-list ok': (r) => r.json('ok') === true,
    });
  });

  // 3. Patient Demographics (query param: ?dfn=3 -- ZZ PATIENT,TEST THREE)
  group('demographics', function () {
    const res = http.get(`${BASE_URL}/vista/patient-demographics?dfn=3`);
    check(res, {
      'demographics 200': (r) => r.status === 200,
      'demographics ok': (r) => r.json('ok') === true,
    });
  });

  // 4. Allergies (query param: ?dfn=3)
  group('allergies', function () {
    const res = http.get(`${BASE_URL}/vista/allergies?dfn=3`);
    check(res, {
      'allergies 200': (r) => r.status === 200,
      'allergies ok': (r) => r.json('ok') === true,
    });
  });

  // 5. Vitals (query param: ?dfn=3)
  group('vitals', function () {
    const res = http.get(`${BASE_URL}/vista/vitals?dfn=3`);
    check(res, {
      'vitals 200': (r) => r.status === 200,
      'vitals ok': (r) => r.json('ok') === true,
    });
  });

  sleep(1);
}
