/**
 * Phase 37 — Playwright auth setup: logs in once, saves storage state.
 *
 * All other test projects depend on this and reuse the session cookie.
 */

import { test as setup, expect } from '@playwright/test';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';
const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate via API', async ({ page }) => {
  const accessCode = process.env.VISTA_ACCESS_CODE ?? 'PROV123';
  const verifyCode = process.env.VISTA_VERIFY_CODE ?? 'PROV123!!';

  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { accessCode, verifyCode },
  });
  expect(res.ok(), `Login failed: ${res.status()}`).toBeTruthy();

  // Save storage state (cookies) for all other tests to reuse
  await page.context().storageState({ path: AUTH_FILE });
});
