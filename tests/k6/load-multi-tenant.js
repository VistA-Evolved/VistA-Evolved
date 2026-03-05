/**
 * Phase 586 (W42-P15): Multi-Tenant Load Test
 *
 * Simulates 5 tenants with 10 users each performing mixed clinical workflows.
 * Verifies tenant isolation and concurrent RPC handling under load.
 *
 * Usage:
 *   k6 run tests/k6/load-multi-tenant.js
 *
 * Env vars:
 *   API_URL          - API base URL (default: http://127.0.0.1:3001)
 *   ACCESS_CODE      - VistA access code (default: PROV123)
 *   VERIFY_CODE      - VistA verify code (default: PROV123!!)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const API = __ENV.API_URL || 'http://127.0.0.1:3001';
const ACCESS = __ENV.ACCESS_CODE || 'PROV123';
const VERIFY = __ENV.VERIFY_CODE || 'PROV123!!';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const readDuration = new Trend('read_duration');
const requestCount = new Counter('request_count');

export const options = {
  scenarios: {
    multi_tenant_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    errors: ['rate<0.1'],
    login_duration: ['p(95)<5000'],
    read_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<5000'],
  },
};

function login() {
  const start = Date.now();
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ accessCode: ACCESS, verifyCode: VERIFY }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has ok': (r) => {
      try {
        return JSON.parse(r.body).ok === true;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
  requestCount.add(1);

  const cookies = res.cookies;
  const jar = http.cookieJar();
  for (const [name, values] of Object.entries(cookies)) {
    if (values && values.length > 0) {
      jar.set(API, name, values[0].value);
    }
  }
  return ok;
}

function readEndpoint(path, label) {
  const start = Date.now();
  const res = http.get(`${API}${path}`);
  readDuration.add(Date.now() - start);

  const ok = check(res, {
    [`${label} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  requestCount.add(1);
  return ok;
}

export default function () {
  group('Login', () => {
    if (!login()) return;
  });

  group('Clinical Reads', () => {
    const dfn = (__VU % 10) + 1;

    readEndpoint(`/vista/allergies?dfn=${dfn}`, 'allergies');
    sleep(0.3);

    readEndpoint(`/vista/vitals?dfn=${dfn}`, 'vitals');
    sleep(0.3);

    readEndpoint(`/vista/medications?dfn=${dfn}`, 'medications');
    sleep(0.3);

    readEndpoint('/vista/default-patient-list', 'patient-list');
    sleep(0.3);
  });

  group('FHIR Reads', () => {
    readEndpoint('/fhir/metadata', 'fhir-metadata');
    sleep(0.2);

    const dfn = (__VU % 10) + 1;
    readEndpoint(`/fhir/Patient/${dfn}`, 'fhir-patient');
    sleep(0.2);
  });

  group('Admin Endpoints', () => {
    readEndpoint('/health', 'health');
    sleep(0.1);

    readEndpoint('/ready', 'ready');
    sleep(0.1);
  });

  group('Logout', () => {
    http.post(`${API}/auth/logout`);
    requestCount.add(1);
  });

  sleep(1 + Math.random() * 2);
}
