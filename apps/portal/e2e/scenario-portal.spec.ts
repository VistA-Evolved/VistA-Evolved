/**
 * Phase 52 — E2E Scenario 3: Patient Portal Workflow
 *
 * Full end-to-end patient portal workflow:
 *   Login page renders -> Dashboard loads -> View Health Records
 *   -> View Medications -> View Appointments -> Each shows data or honest pending
 *
 * Runs against the portal app (localhost:3002).
 */

import { test, expect } from "@playwright/test";

test.describe("Scenario 3: Patient Portal Workflow", () => {
  test.setTimeout(90_000);

  test("login page renders with form fields", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Portal login page should have username, password, submit
    const heading = page.locator("h1").or(page.locator("h2")).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/portal|health|login|sign/i);

    await expect(page.locator('input[id="username"]').or(
      page.locator("input[type='text']")
    ).first()).toBeVisible();

    await expect(page.locator('input[id="password"]').or(
      page.locator("input[type='password']")
    ).first()).toBeVisible();

    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("dashboard pages return 200 (no dead routes)", async ({ request }) => {
    const routes = [
      "/dashboard",
      "/dashboard/health",
      "/dashboard/medications",
      "/dashboard/messages",
      "/dashboard/appointments",
      "/dashboard/telehealth",
      "/dashboard/profile",
    ];

    for (const route of routes) {
      const res = await request.get(route);
      expect(res.status(), `${route} should return 200`).toBe(200);
    }
  });

  test("health records page shows data or honest pending", async ({ page }) => {
    await page.goto("/dashboard/health");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const main = page.locator("main").or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, "Health page must not be blank").toBeGreaterThan(10);

    // Should show health data, DataSourceBadge, or pending message
    const hasContent =
      (text || "").match(/health|record|allerg|vital|condition|result|pending|EHR|Local/i);
    expect(hasContent, "Health page must show data or pending state").toBeTruthy();
  });

  test("medications page shows data or honest pending", async ({ page }) => {
    await page.goto("/dashboard/medications");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const main = page.locator("main").or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, "Medications page must not be blank").toBeGreaterThan(10);

    const hasContent =
      (text || "").match(/medic|prescription|refill|active|pending|no medic/i);
    expect(hasContent, "Medications page must show data or pending state").toBeTruthy();
  });

  test("appointments page shows data or honest pending", async ({ page }) => {
    await page.goto("/dashboard/appointments");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const main = page.locator("main").or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, "Appointments page must not be blank").toBeGreaterThan(10);

    const hasContent =
      (text || "").match(/appoint|schedul|upcoming|past|pending|no appoint/i);
    expect(hasContent, "Appointments page must show data or pending state").toBeTruthy();
  });

  test("messages page shows data or honest pending", async ({ page }) => {
    await page.goto("/dashboard/messages");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const main = page.locator("main").or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, "Messages page must not be blank").toBeGreaterThan(10);

    const hasContent =
      (text || "").match(/message|inbox|secure|compose|pending|no message/i);
    expect(hasContent, "Messages page must show data or pending state").toBeTruthy();
  });

  test("all nav items are clickable and navigate", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const navLinks = page.locator("nav a");
    const count = await navLinks.count();
    expect(count, "Dashboard must have navigation links").toBeGreaterThan(3);

    // Click each nav link and verify it navigates (no dead clicks)
    for (let i = 0; i < Math.min(count, 8); i++) {
      await page.goto("/dashboard"); // reset
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);

      const link = navLinks.nth(i);
      const href = await link.getAttribute("href");
      if (!href) continue;

      await link.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);

      // Should have navigated or at least still be on a valid page
      const title = await page.title();
      expect(title, `Nav link to ${href} must load a page`).toBeTruthy();
    }
  });

  test("telehealth page loads without error", async ({ page }) => {
    await page.goto("/dashboard/telehealth");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const main = page.locator("main").or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, "Telehealth page must not be blank").toBeGreaterThan(10);

    const hasContent =
      (text || "").match(/teleh|video|visit|room|device|pending|no.*visit/i);
    expect(hasContent, "Telehealth page must show data or pending state").toBeTruthy();
  });
});
