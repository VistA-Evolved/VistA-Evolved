/**
 * Phase 37 -- E2E: Console Error Gate.
 *
 * Navigates through all major routes and asserts zero unexpected console.error calls.
 * This catches runtime errors, unhandled promise rejections, and broken API calls.
 */

import { test, expect } from '@playwright/test';
import { chartRoute, setupConsoleGate } from './helpers/auth';

const ROUTES = [
  { path: '/cprs/login', requiresAuth: false, label: 'Login' },
  { path: '/cprs/patient-search', requiresAuth: true, label: 'Patient Search' },
  { path: chartRoute('cover'), requiresAuth: true, label: 'Cover Sheet' },
  { path: chartRoute('problems'), requiresAuth: true, label: 'Problems' },
  { path: chartRoute('meds'), requiresAuth: true, label: 'Medications' },
  { path: chartRoute('orders'), requiresAuth: true, label: 'Orders' },
  { path: chartRoute('notes'), requiresAuth: true, label: 'Notes' },
  { path: chartRoute('consults'), requiresAuth: true, label: 'Consults' },
  { path: chartRoute('labs'), requiresAuth: true, label: 'Labs' },
  { path: chartRoute('reports'), requiresAuth: true, label: 'Reports' },
  { path: chartRoute('imaging'), requiresAuth: true, label: 'Imaging' },
  { path: '/cprs/inbox', requiresAuth: true, label: 'Inbox' },
  { path: '/cprs/settings/preferences', requiresAuth: true, label: 'Preferences' },
  { path: '/cprs/admin/integrations', requiresAuth: true, label: 'Admin Integrations' },
  { path: '/cprs/admin/analytics', requiresAuth: true, label: 'Admin Analytics' },
  { path: '/cprs/admin/reports', requiresAuth: true, label: 'Admin Reports' },
];

test.describe('Console Error Gate', () => {
  test('login page has zero console errors', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto('/cprs/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(errors, 'Console errors on login page').toHaveLength(0);
  });

  test('all authenticated routes have zero console errors', async ({ page }) => {
    test.setTimeout(180_000); // 3 min for scanning all routes
    const errors = setupConsoleGate(page);
    // Session pre-loaded via auth.setup.ts (storageState)

    const authRoutes = ROUTES.filter((r) => r.requiresAuth);
    const routeErrors: Record<string, string[]> = {};

    for (const route of authRoutes) {
      errors.length = 0; // reset for each route
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      if (errors.length > 0) {
        routeErrors[route.label] = [...errors];
      }
    }

    // Report all route errors at once
    const failedRoutes = Object.entries(routeErrors);
    if (failedRoutes.length > 0) {
      const report = failedRoutes
        .map(([label, errs]) => `  ${label}: ${errs.join('; ')}`)
        .join('\n');
      expect.soft(failedRoutes, `Routes with console errors:\n${report}`).toHaveLength(0);
    }
  });
});
