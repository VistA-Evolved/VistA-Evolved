/**
 * k6 Smoke Test: Login Flow
 * Phase 36 -- Performance smoke suite
 *
 * Tests the authentication flow under light load.
 * Run: k6 run tests/k6/smoke-login.js
 */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

export const options = {
  vus: 2,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 95th percentile under 5s (VistA RPC auth is slow)
    http_req_failed: ["rate<0.10"],    // Less than 10% failure rate
  },
  tags: { testid: "smoke-login" },
};

export default function () {
  // 1. Health check (unauthenticated)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health status 200": (r) => r.status === 200,
    "health ok": (r) => r.json("ok") === true,
    "health has version": (r) => typeof r.json("version") === "string",
    "health has X-Request-Id": (r) => r.headers["X-Request-Id"] !== undefined,
  });

  // 2. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      accessCode: "PROV123",
      verifyCode: "PROV123!!",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(loginRes, {
    "login status 200": (r) => r.status === 200,
    "login ok": (r) => r.json("ok") === true,
    "login has session": (r) => r.json("session") !== null,
    "login has duz": (r) => r.json("session.duz") === "87",
  });

  // Extract session cookie for authenticated requests
  const jar = http.cookieJar();

  // 3. Session check
  const sessionRes = http.get(`${BASE_URL}/auth/session`);
  check(sessionRes, {
    "session status 200": (r) => r.status === 200,
    "session authenticated": (r) => r.json("authenticated") === true,
  });

  // 4. Logout
  const logoutRes = http.post(`${BASE_URL}/auth/logout`, null);
  check(logoutRes, {
    "logout status 200": (r) => r.status === 200,
    "logout ok": (r) => r.json("ok") === true,
  });

  // 5. Verify session invalid after logout
  const postLogoutRes = http.get(`${BASE_URL}/auth/session`);
  check(postLogoutRes, {
    "post-logout not authenticated": (r) => r.json("authenticated") === false,
  });

  sleep(1);
}
