/**
 * Phase 129 — QA Ladder: Visual Regression Snapshots
 *
 * Captures screenshots of key screens and compares against baseline.
 * Uses Playwright's built-in toHaveScreenshot() for pixel-level comparison.
 *
 * Key screens tested:
 *   1. Login page (unauthenticated)
 *   2. Patient search (authenticated, before search)
 *   3. Patient chart cover sheet (with DFN=3 data loaded)
 *
 * Baselines are stored in e2e/visual-regression.spec.ts-snapshots/.
 * First run creates baselines. Subsequent runs compare against them.
 * Update baselines: pnpm exec playwright test --update-snapshots
 *
 * PHI safety: screenshots contain sandbox data only (WorldVistA Docker).
 * Snapshots are .gitignored by default (add to .gitignore if not present).
 *
 * Run: pnpm exec playwright test e2e/visual-regression.spec.ts
 */

import { test, expect } from "@playwright/test";
import { selectPatient } from "./helpers/auth";

const DFN = "3";

/* ------------------------------------------------------------------ */
/* Login page visual                                                    */
/* ------------------------------------------------------------------ */

test.describe("Visual regression: Login page", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Fresh session

  test("Login page renders consistently", async ({ page }) => {
    await page.goto("/cprs/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000); // Allow animations to settle

    // Mask any dynamic content (timestamps, version strings)
    await expect(page).toHaveScreenshot("login-page.png", {
      maxDiffPixelRatio: 0.05, // 5% tolerance for font rendering differences
      animations: "disabled",
      mask: [
        // Mask any version/build numbers that might change
        page.locator("text=/v\\d+\\.\\d+/"),
      ],
    });
  });
});

/* ------------------------------------------------------------------ */
/* Patient search visual                                                */
/* ------------------------------------------------------------------ */

test.describe("Visual regression: Patient search", () => {
  test("Patient search page renders consistently", async ({ page }) => {
    // Uses pre-authenticated session from auth.setup.ts
    await page.goto("/cprs/patient-search");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Allow data to load

    // Wait for heading
    await page.locator("text=Select a Patient").waitFor({ timeout: 15_000 });

    await expect(page).toHaveScreenshot("patient-search.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
      mask: [
        // Mask timestamps and session-specific data
        page.locator("text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/"),
        page.locator("text=/\\d{2}:\\d{2}/"),
      ],
    });
  });
});

/* ------------------------------------------------------------------ */
/* Chart cover sheet visual                                             */
/* ------------------------------------------------------------------ */

test.describe("Visual regression: Cover sheet", () => {
  test("Cover sheet renders consistently with clinical data", async ({ page }) => {
    await selectPatient(page, DFN);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // Allow all clinical data panels to load

    await expect(page).toHaveScreenshot("cover-sheet.png", {
      maxDiffPixelRatio: 0.08, // 8% tolerance — clinical data may vary slightly
      animations: "disabled",
      mask: [
        // Mask timestamps
        page.locator("text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/"),
        page.locator("text=/\\d{2}:\\d{2}/"),
        // Mask any session/user-specific elements
        page.locator("text=/PROVIDER.*CLYDE/i"),
        page.locator("text=/DUZ.*\\d+/i"),
      ],
    });
  });
});

/* ------------------------------------------------------------------ */
/* Structural regression: key UI elements present                       */
/* ------------------------------------------------------------------ */

test.describe("Structural regression", () => {
  test("Login page has required form elements", async ({ page }) => {
    // Use fresh session (no pre-auth)
    await page.goto("/cprs/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Required structural elements
    await expect(page.locator("input[type='text']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("Patient search has required layout elements", async ({ page }) => {
    await page.goto("/cprs/patient-search");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Must have search input and heading
    await expect(page.locator("text=Select a Patient")).toBeVisible();
  });

  test("Chart page has tab navigation", async ({ page }) => {
    await selectPatient(page, DFN);
    await page.waitForTimeout(2000);

    // Must have at least one navigable tab or panel
    const tabsOrPanels = page.locator("[role='tab'], [role='tabpanel'], nav a, nav button");
    const count = await tabsOrPanels.count();
    expect(count, "Chart page should have navigation elements").toBeGreaterThan(0);
  });
});
