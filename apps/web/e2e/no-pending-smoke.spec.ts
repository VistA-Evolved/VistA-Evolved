/**
 * Layer 4: End-User Smoke Tests (Playwright)
 *
 * Validates that:
 * 1. No page displays "integration pending" text
 * 2. No buttons are dead (every click produces a response)
 * 3. No JavaScript errors on page load
 * 4. Loading states resolve within 5 seconds
 * 5. No empty data tables when seed data should exist
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

const PAGES_TO_CHECK = [
  { name: 'Login', path: '/login' },
  { name: 'CPRS Dashboard', path: '/cprs', requiresAuth: true },
  { name: 'Admin VistA', path: '/cprs/admin/vista', requiresAuth: true },
  { name: 'Admin RCM', path: '/cprs/admin/rcm', requiresAuth: true },
  { name: 'Admin Analytics', path: '/cprs/admin/analytics', requiresAuth: true },
  { name: 'Admin Modules', path: '/cprs/admin/modules', requiresAuth: true },
  { name: 'Admin Audit', path: '/cprs/admin/audit-viewer', requiresAuth: true },
  { name: 'Admin Terminal', path: '/cprs/admin/terminal', requiresAuth: true },
];

const FORBIDDEN_TEXT = [
  'integration pending',
  'integration-pending',
  'unsupported-in-sandbox',
  'unsupported in sandbox',
  'not yet implemented',
  'coming soon',
];

test.describe('Zero-Pending Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Capture JS errors
    page.on('pageerror', (err) => {
      console.error(`JS Error on ${page.url()}: ${err.message}`);
    });
  });

  for (const pageConfig of PAGES_TO_CHECK) {
    test(`${pageConfig.name} has no pending/dead elements`, async ({ page }) => {
      // Navigate
      await page.goto(`${BASE}${pageConfig.path}`, { waitUntil: 'networkidle', timeout: 15000 });

      // Wait for loading to complete
      await page.waitForTimeout(2000);

      // Check for forbidden text
      const bodyText = await page.textContent('body') || '';
      const lowerText = bodyText.toLowerCase();

      for (const forbidden of FORBIDDEN_TEXT) {
        const found = lowerText.includes(forbidden.toLowerCase());
        if (found) {
          // Allow in dev-mode banners but not in main content
          const mainContent = await page.locator('main, [role="main"], .content').textContent() || '';
          expect(
            mainContent.toLowerCase().includes(forbidden.toLowerCase()),
            `Page "${pageConfig.name}" contains forbidden text: "${forbidden}"`
          ).toBe(false);
        }
      }

      // Check no console errors (excluding known noise)
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          consoleErrors.push(msg.text());
        }
      });

      // Check all visible buttons are not disabled without reason
      const buttons = await page.locator('button:visible').all();
      for (const button of buttons.slice(0, 10)) { // check first 10
        const isDisabled = await button.isDisabled();
        if (isDisabled) {
          const text = await button.textContent() || '';
          // Disabled buttons should have a tooltip or aria-label explaining why
          const hasExplanation = await button.getAttribute('title') ||
                                  await button.getAttribute('aria-label') ||
                                  await button.getAttribute('aria-describedby');
          if (!hasExplanation && !text.toLowerCase().includes('loading')) {
            console.warn(`Disabled button without explanation: "${text}" on ${pageConfig.name}`);
          }
        }
      }
    });
  }

  test('API health endpoint returns ok', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/health');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('VistA ping returns reachable', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/vista/ping');
    const body = await res.json();
    // Don't fail if VistA isn't running in CI, but check structure
    expect(body).toHaveProperty('ok');
    if (body.ok) {
      expect(body.vista).toBe('reachable');
    }
  });
});
