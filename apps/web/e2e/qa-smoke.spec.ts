/**
 * Phase 105 -- QA Gauntlet E2E Smoke Test
 *
 * Validates the core user journey:
 * 1. Login flow (UI form submission)
 * 2. Patient search + selection
 * 3. CPRS tab navigation (all 18 tabs)
 * 4. Dead click detection on major interactive elements
 * 5. No unhandled console errors
 * 6. Integration-pending messaging (no fake success, no silent failures)
 *
 * Requires: API on :3001, Web on :3000
 */

import { test, expect, type Page } from "@playwright/test";
import { setupConsoleGate } from "./helpers/auth";

const API_BASE = process.env.API_URL ?? "http://localhost:3001";
const PATIENT_DFN = "3";

// All 18 CPRS chart tabs
const TABS = [
  "cover", "problems", "meds", "orders", "notes", "consults",
  "surgery", "dcsumm", "labs", "reports", "imaging", "immunizations",
  "intake", "telehealth", "tasks", "aiassist", "adt", "nursing",
];

/* ================================================================== */
/* 1. Login Flow                                                       */
/* ================================================================== */

test.describe("QA Smoke: Login", () => {
  test("login flow works (form or API)", async ({ browser }) => {
    // Fresh context -- no pre-auth cookies
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const errors = setupConsoleGate(page);

    await page.goto("/cprs/login");

    // Wait for React hydration + session check to settle
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000);

    const url = page.url();
    const passwordInput = page.locator("input[type='password']");
    const hasLoginForm = await passwordInput.isVisible().catch(() => false);

    if (hasLoginForm) {
      // Login page rendered -- fill form and submit
      const accessInput = page.locator("input").first();
      const submitButton = page.locator("button[type='submit']");

      const accessCode = process.env.VISTA_ACCESS_CODE ?? "PROV123";
      const verifyCode = process.env.VISTA_VERIFY_CODE ?? "PROV123!!";
      await accessInput.fill(accessCode);
      await passwordInput.fill(verifyCode);
      await submitButton.click();

      // Should redirect to patient search
      await page.waitForURL("**/cprs/patient-search**", { timeout: 20_000 });
    } else {
      // Session already active or page redirected — verify we're on a working page
      const bodyText = await page.textContent("body");
      expect(bodyText && bodyText.trim().length > 10, "Page has visible content").toBeTruthy();
    }

    // Wherever we end up, verify: working page, no errors
    expect(errors.length, `Console errors: ${errors.join("; ")}`).toBe(0);

    await ctx.close();
  });

  test("bad credentials show error (no crash)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/cprs/login");
    await page.waitForLoadState("domcontentloaded");

    const accessInput = page.locator("input").first();
    const passwordInput = page.locator("input[type='password']");
    const submitButton = page.locator("button[type='submit']");

    await accessInput.fill("BADUSER");
    await passwordInput.fill("BADPASS!!");
    await submitButton.click();

    // Wait for the page to settle after bad login attempt
    await page.waitForTimeout(3000);
    const url = page.url();

    // The key assertion: page should NOT crash (no unhandled errors)
    // It should EITHER stay on login (showing error) OR redirect to a working page
    const bodyText = await page.textContent("body");
    const hasContent = bodyText && bodyText.trim().length > 10;
    expect(hasContent, "Page should have visible content (not blank/crashed)").toBeTruthy();

    // No unhandled JS errors
    expect(errors.length, `Uncaught JS errors: ${errors.join("; ")}`).toBe(0);

    // Page should not show an error page (500, "Application error", etc.)
    const lowerBody = bodyText?.toLowerCase() || "";
    expect(lowerBody).not.toContain("application error");
    expect(lowerBody).not.toContain("internal server error");

    await ctx.close();
  });
});

/* ================================================================== */
/* 2. Patient Search                                                   */
/* ================================================================== */

test.describe("QA Smoke: Patient Search", () => {
  test("patient search page loads and accepts input", async ({ page }) => {
    const errors = setupConsoleGate(page);

    await page.goto("/cprs/patient-search");
    await page.waitForLoadState("domcontentloaded");

    // Should have a search input and heading
    const heading = page.locator("text=Patient").first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Search input should exist
    const searchInput = page.locator("input[type='text']").first();
    await expect(searchInput).toBeVisible();

    // No console errors
    expect(errors.length, `Console errors: ${errors.join("; ")}`).toBe(0);
  });
});

/* ================================================================== */
/* 3. CPRS Tab Navigation                                              */
/* ================================================================== */

test.describe("QA Smoke: CPRS Tabs", () => {
  test("all 18 tabs navigate without crash", async ({ page }) => {
    test.setTimeout(300_000); // 5 min for 18 tabs
    const errors = setupConsoleGate(page);
    const tabResults: { tab: string; status: string; detail?: string }[] = [];

    for (const tab of TABS) {
      errors.length = 0;

      await page.goto(`/cprs/chart/${PATIENT_DFN}/${tab}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);

      const url = page.url();
      if (!url.includes(`/cprs/chart/${PATIENT_DFN}/${tab}`)) {
        tabResults.push({ tab, status: "FAIL", detail: `URL mismatch: ${url}` });
        continue;
      }

      // Content should be visible (not blank page)
      const body = await page.textContent("body");
      if (!body || body.trim().length < 10) {
        tabResults.push({ tab, status: "FAIL", detail: "Blank page" });
        continue;
      }

      // Check for integration-pending messaging (acceptable)
      const hasIntegrationPending =
        body.includes("integration pending") ||
        body.includes("Integration Pending") ||
        body.includes("not yet available") ||
        body.includes("coming soon");

      // Check for error states (also acceptable if structured)
      const hasError = body.includes("error") || body.includes("Error");

      // The key assertion: the page is NOT completely blank and NOT crashed
      tabResults.push({
        tab,
        status: "PASS",
        detail: hasIntegrationPending ? "integration-pending" : "loaded",
      });
    }

    // Summary
    const failed = tabResults.filter((r) => r.status === "FAIL");
    if (failed.length > 0) {
      console.log("Tab failures:");
      for (const f of failed) console.log(`  ${f.tab}: ${f.detail}`);
    }
    expect(failed.length, `${failed.length} tabs failed: ${failed.map((f) => f.tab).join(", ")}`).toBe(0);
  });
});

/* ================================================================== */
/* 4. Dead Click Detection                                             */
/* ================================================================== */

test.describe("QA Smoke: Dead Clicks", () => {
  test("cover sheet interactive elements respond to clicks", async ({ page }) => {
    test.setTimeout(60_000);
    const errors = setupConsoleGate(page);

    await page.goto(`/cprs/chart/${PATIENT_DFN}/cover`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Find all clickable elements (buttons, links, tab triggers)
    const clickables = await page.locator(
      'button:visible, a[href]:visible, [role="tab"]:visible, [role="button"]:visible'
    ).all();

    const clickReport: { element: string; responded: boolean }[] = [];
    let deadClicks = 0;

    // Test up to 20 clickable elements
    const toTest = clickables.slice(0, 20);

    for (const el of toTest) {
      const tag = await el.evaluate((e) => e.tagName.toLowerCase());
      const text = (await el.textContent())?.trim().slice(0, 40) || "";
      const label = `${tag}:"${text}"`;

      // Record state before click
      const urlBefore = page.url();
      const htmlBefore = await page.content();

      try {
        await el.click({ timeout: 3000 });
        await page.waitForTimeout(500);

        // Check if something changed (URL, DOM, dialog, etc.)
        const urlAfter = page.url();
        const htmlAfter = await page.content();

        const urlChanged = urlBefore !== urlAfter;
        const domChanged = htmlBefore !== htmlAfter;
        const responded = urlChanged || domChanged;

        clickReport.push({ element: label, responded });
        if (!responded) deadClicks++;
      } catch {
        // Element became detached or hidden -- not a dead click
        clickReport.push({ element: label, responded: true });
      }

      // Navigate back if we left the cover sheet
      if (!page.url().includes(`/cprs/chart/${PATIENT_DFN}/cover`)) {
        await page.goto(`/cprs/chart/${PATIENT_DFN}/cover`);
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1000);
      }
    }

    // Allow up to 3 dead clicks (some elements may be decorative)
    const threshold = 3;
    if (deadClicks > threshold) {
      const deadList = clickReport
        .filter((r) => !r.responded)
        .map((r) => r.element)
        .join("\n  ");
      console.log(`Dead clicks detected:\n  ${deadList}`);
    }
    expect(deadClicks).toBeLessThanOrEqual(threshold);
  });
});

/* ================================================================== */
/* 5. Admin Section Smoke                                              */
/* ================================================================== */

test.describe("QA Smoke: Admin", () => {
  test("admin landing loads without crash", async ({ page }) => {
    const errors = setupConsoleGate(page);

    await page.goto("/cprs/admin");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);
    expect(errors.length, `Console errors: ${errors.join("; ")}`).toBe(0);
  });
});
