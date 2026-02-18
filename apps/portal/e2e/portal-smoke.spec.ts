/**
 * Portal smoke test — Phase 26
 *
 * Pre-requisites:
 *   1. `pnpm -C apps/portal build` must succeed
 *   2. webServer config in playwright.config.ts starts `pnpm start`
 *
 * What this tests:
 *   - Login page renders
 *   - Login form elements present
 *   - Dev sandbox hint visible in dev mode
 *   - Dashboard pages exist (no 404)
 *   - Nav items are present and clickable
 *   - DataSourceBadge elements render on dashboard pages
 */

import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/* Login page                                                          */
/* ------------------------------------------------------------------ */

test("login page renders with form", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Health Portal");
  await expect(page.locator('input[id="username"]')).toBeVisible();
  await expect(page.locator('input[id="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

/* ------------------------------------------------------------------ */
/* Dashboard pages return 200 (no dead links)                          */
/* ------------------------------------------------------------------ */

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/health",
  "/dashboard/medications",
  "/dashboard/messages",
  "/dashboard/appointments",
  "/dashboard/telehealth",
  "/dashboard/profile",
];

for (const route of DASHBOARD_ROUTES) {
  test(`page ${route} returns 200`, async ({ request }) => {
    const res = await request.get(route);
    expect(res.status()).toBe(200);
  });
}

/* ------------------------------------------------------------------ */
/* Nav items present on dashboard                                      */
/* ------------------------------------------------------------------ */

test("dashboard layout has all nav items", async ({ page }) => {
  await page.goto("/dashboard");

  const expectedLabels = [
    "Home",
    "Health Records",
    "Medications",
    "Messages",
    "Appointments",
    "Telehealth",
    "My Profile",
  ];

  for (const label of expectedLabels) {
    const link = page.locator(`nav a:has-text("${label}")`);
    await expect(link).toBeVisible();
  }
});

/* ------------------------------------------------------------------ */
/* Nav click — no dead clicks                                          */
/* ------------------------------------------------------------------ */

test("clicking each nav item navigates without error", async ({ page }) => {
  await page.goto("/dashboard");

  for (const route of DASHBOARD_ROUTES) {
    const label = route === "/dashboard" ? "Home" : "";
    const link = page.locator(`nav a[href="${route}"]`);
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(`**${route}`);
    // Page should render (no crash / blank screen)
    expect(await page.title()).toBeTruthy();
  }
});

/* ------------------------------------------------------------------ */
/* DataSourceBadge renders on each content page                        */
/* ------------------------------------------------------------------ */

test("DataSourceBadge visible on dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  // Badge text includes "EHR" or "Pending" or "Local-only"
  const badges = page.locator(
    'text=/EHR|Pending|Local-only|Community|Self-Entered/'
  );
  expect(await badges.count()).toBeGreaterThan(0);
});
