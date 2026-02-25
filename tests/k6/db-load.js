/**
 * k6 Load Test: Platform DB Endpoints (Payer Registry)
 * Phase 103 -- DB Performance Posture
 *
 * Tests payer-db endpoints under basic concurrency to verify
 * the API + DB layer doesn't degrade under load.
 *
 * Requires: API running on port 3001, valid credentials.
 * Run: k6 run tests/k6/db-load.js
 *
 * Thresholds:
 *   - p(95) < 500ms for reads
 *   - p(95) < 1000ms for writes
 *   - Error rate < 5%
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

// Custom metrics
const readLatency = new Trend("db_read_latency", true);
const writeLatency = new Trend("db_write_latency", true);
const idempotencyHits = new Counter("idempotency_cache_hits");

export const options = {
  scenarios: {
    // Ramp up to 10 VUs over 10s, hold for 20s, ramp down
    load_test: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "20s", target: 10 },
        { duration: "5s", target: 0 },
      ],
    },
  },
  thresholds: {
    db_read_latency: ["p(95)<500"],
    db_write_latency: ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
  tags: { testid: "db-load" },
};

export function setup() {
  // Login once to get session cookie
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

  // Phase 132: Extract CSRF token from JSON response body (synchronizer token)
  let csrfToken = "";
  try {
    const body = loginRes.json();
    if (body && body.csrfToken) {
      csrfToken = body.csrfToken;
    }
  } catch {
    // Fallback: try fetching from dedicated endpoint
    const csrfRes = http.get(`${BASE_URL}/auth/csrf-token`);
    try {
      const csrfBody = csrfRes.json();
      if (csrfBody && csrfBody.csrfToken) csrfToken = csrfBody.csrfToken;
    } catch { /* no CSRF available */ }
  }

  return { csrfToken };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (data.csrfToken) {
    headers["x-csrf-token"] = data.csrfToken;
  }

  // 1. List payers (read, paginated)
  group("list-payers", function () {
    const res = http.get(`${BASE_URL}/admin/payer-db/payers?limit=10&offset=0`);
    readLatency.add(res.timings.duration);
    check(res, {
      "list-payers 200": (r) => r.status === 200,
      "list-payers has data": (r) => {
        try { return r.json("ok") === true; } catch { return false; }
      },
    });
  });

  // 2. Backend info (read, lightweight)
  group("backend-info", function () {
    const res = http.get(`${BASE_URL}/admin/payer-db/backend`);
    readLatency.add(res.timings.duration);
    check(res, {
      "backend 200": (r) => r.status === 200,
    });
  });

  // 3. Stats (read, aggregation)
  group("payer-stats", function () {
    const res = http.get(`${BASE_URL}/admin/payer-db/payers/stats`);
    readLatency.add(res.timings.duration);
    check(res, {
      "stats 200": (r) => r.status === 200,
    });
  });

  // 4. Payer detail (read, single record)
  group("payer-detail", function () {
    const res = http.get(`${BASE_URL}/admin/payer-db/payers/US-BCBS`);
    readLatency.add(res.timings.duration);
    check(res, {
      "detail 200 or 404": (r) => r.status === 200 || r.status === 404,
    });
  });

  // 5. Audit trail (read, time-ordered)
  group("audit-list", function () {
    const res = http.get(`${BASE_URL}/admin/payer-db/audit?limit=20`);
    readLatency.add(res.timings.duration);
    check(res, {
      "audit 200": (r) => r.status === 200,
    });
  });

  // 6. Idempotent write test (uses same key = should hit cache on repeat)
  group("idempotent-write", function () {
    const vuId = __VU || 0;
    const iterKey = `k6-load-vu${vuId}-iter${__ITER}`;

    // First request with idempotency key
    const res1 = http.patch(
      `${BASE_URL}/admin/payer-db/payers/AU-MEDICARE`,
      JSON.stringify({ category: "k6-load-test", reason: "k6 load test" }),
      {
        headers: {
          ...headers,
          "Idempotency-Key": iterKey,
        },
      }
    );
    writeLatency.add(res1.timings.duration);
    check(res1, {
      "write 200": (r) => r.status === 200,
    });

    // Second request with SAME key = should replay
    const res2 = http.patch(
      `${BASE_URL}/admin/payer-db/payers/AU-MEDICARE`,
      JSON.stringify({ category: "k6-load-test", reason: "k6 load test" }),
      {
        headers: {
          ...headers,
          "Idempotency-Key": iterKey,
        },
      }
    );
    if (res2.headers && res2.headers["Idempotency-Replayed"] === "true") {
      idempotencyHits.add(1);
    }
    check(res2, {
      "idempotent replay 200": (r) => r.status === 200,
    });
  });

  sleep(0.5);
}
