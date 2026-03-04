/**
 * k6 Production Load Test: Spike
 * Phase 289 -- Production-Scale Load Test Campaign
 *
 * Simulates sudden traffic spike (shift change, emergency event).
 * Ramp: 10 -> 100 VU (30s) -> hold (1 min) -> 10 VU (30s) -> hold (1 min)
 *
 * Validates: system recovery after spike, no cascading failures.
 *
 * Run: k6 run tests/k6/prod-spike.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

const spikeLatency = new Trend('spike_latency', true);
const spikeErrors = new Rate('spike_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // baseline
    { duration: '30s', target: 100 }, // spike up
    { duration: '1m', target: 100 }, // hold at spike
    { duration: '30s', target: 10 }, // spike down
    { duration: '1m', target: 10 }, // recovery
    { duration: '30s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
    spike_latency: ['p(50)<500', 'p(95)<3000'],
    spike_error_rate: ['rate<0.05'],
  },
  tags: { testid: 'prod-spike', campaign: 'phase289' },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      accessCode: __ENV.ACCESS_CODE || 'PROV123',
      verifyCode: __ENV.VERIFY_CODE || 'PROV123!!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, { 'login 200': (r) => r.status === 200 });
  return {};
}

export default function () {
  // 80% reads, 20% auth during spike (read-heavy)
  const roll = Math.random();

  if (roll < 0.8) {
    group('spike-reads', () => {
      const r1 = http.get(`${BASE_URL}/health`);
      spikeLatency.add(r1.timings.duration);
      spikeErrors.add(r1.status >= 400);
      check(r1, { 'health ok': (r) => r.status === 200 });

      const r2 = http.get(`${BASE_URL}/ready`);
      spikeLatency.add(r2.timings.duration);
      spikeErrors.add(r2.status >= 400);
      check(r2, { 'ready ok': (r) => r.status === 200 });

      const r3 = http.get(`${BASE_URL}/vista/default-patient-list`);
      spikeLatency.add(r3.timings.duration);
      spikeErrors.add(r3.status >= 400);
      check(r3, { 'patients 2xx': (r) => r.status < 400 });
    });
  } else {
    group('spike-auth', () => {
      const r1 = http.get(`${BASE_URL}/health`);
      spikeLatency.add(r1.timings.duration);
      spikeErrors.add(r1.status >= 400);
      check(r1, { 'health ok': (r) => r.status === 200 });
    });
  }

  sleep(0.2 + Math.random() * 0.8); // fast think time during spike
}
