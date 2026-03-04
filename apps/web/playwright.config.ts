import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 37 — Playwright config for apps/web (CPRS Web Replica).
 *
 * Expects:
 *   - API running on http://localhost:3001 (with VistA Docker)
 *   - Web app running on http://localhost:3000
 *
 * Run:  pnpm exec playwright test
 * UI:   pnpm exec playwright test --ui
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1, // serial — shared auth state
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e-results.json' }],
    ['html', { open: 'never', outputFolder: 'e2e-report' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [
    // Auth setup: logs in once, saves session cookie
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Login flow tests need fresh sessions (no pre-auth)
    {
      name: 'login-flow',
      testMatch: /login-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // All other tests use pre-authenticated session
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /login-flow\.spec\.ts/],
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      port: 3000,
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
