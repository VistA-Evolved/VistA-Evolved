/**
 * k6 Smoke Test: FHIR R4 Endpoints
 * Wave 2 Q190 -- FHIR performance smoke
 *
 * Tests FHIR Patient, AllergyIntolerance, and Encounter read workflows.
 * Requires: API running, VistA Docker running, valid session.
 * Run: k6 run tests/k6/smoke-fhir.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    fhir_smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.20'],
  },
  tags: { testid: 'smoke-fhir' },
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
  // Propagate session cookies from setup() into this VU's cookie jar
  const jar = http.cookieJar();
  if (data && data.cookies) {
    for (const [name, values] of Object.entries(data.cookies)) {
      if (Array.isArray(values) && values.length > 0) {
        jar.set(BASE_URL, name, values[0].value || values[0]);
      }
    }
  }

  const params = { tags: { name: '' } };

  // 1. FHIR CapabilityStatement (metadata -- public, no auth)
  group('fhir-metadata', function () {
    params.tags.name = 'fhir-metadata';
    const res = http.get(`${BASE_URL}/fhir/metadata`, params);
    check(res, {
      'metadata 200': (r) => r.status === 200,
      'metadata is CapabilityStatement': (r) => {
        try {
          return r.json('resourceType') === 'CapabilityStatement';
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(0.3);

  // 2. FHIR Patient search
  group('fhir-patient-search', function () {
    params.tags.name = 'fhir-patient-search';
    const res = http.get(`${BASE_URL}/fhir/Patient?name=ZZ`, params);
    check(res, {
      'patient-search 200': (r) => r.status === 200,
      'patient-search is Bundle': (r) => {
        try {
          return r.json('resourceType') === 'Bundle';
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(0.3);

  // 3. FHIR Patient read (DFN 3 -- common sandbox patient)
  group('fhir-patient-read', function () {
    params.tags.name = 'fhir-patient-read';
    const res = http.get(`${BASE_URL}/fhir/Patient/3`, params);
    check(res, {
      'patient-read 200 or 404': (r) => r.status === 200 || r.status === 404,
      'patient-read is Patient': (r) => {
        if (r.status !== 200) return true; // skip body check on 404
        try {
          return r.json('resourceType') === 'Patient';
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(0.3);

  // 4. FHIR AllergyIntolerance search
  group('fhir-allergy-search', function () {
    params.tags.name = 'fhir-allergy-search';
    const res = http.get(`${BASE_URL}/fhir/AllergyIntolerance?patient=3`, params);
    check(res, {
      'allergy-search 200': (r) => r.status === 200,
      'allergy-search is Bundle': (r) => {
        try {
          return r.json('resourceType') === 'Bundle';
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(0.3);

  // 5. FHIR Encounter search
  group('fhir-encounter-search', function () {
    params.tags.name = 'fhir-encounter-search';
    const res = http.get(`${BASE_URL}/fhir/Encounter?patient=3`, params);
    check(res, {
      'encounter-search 200': (r) => r.status === 200,
      'encounter-search is Bundle': (r) => {
        try {
          return r.json('resourceType') === 'Bundle';
        } catch (e) {
          return false;
        }
      },
    });
  });

  sleep(0.5);
}
