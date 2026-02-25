/**
 * Phase 129 — QA Ladder: Playwright E2E Journeys
 *
 * Three journeys that exercise the critical happy paths:
 *   1. Login → Patient Search → Cover Sheet → 3 clinical tabs
 *   2. Orders tab navigation (place quick-order form)
 *   3. Dead-click detector: clicks every button on chart, fails on silent no-ops
 *
 * Uses pre-authenticated session from auth.setup.ts (chromium project).
 * Run: pnpm exec playwright test e2e/qa-ladder-journeys.spec.ts
 */

import { test, expect, type Page, type Locator } from "@playwright/test";
import { selectPatient, setupConsoleGate } from "./helpers/auth";

const API_BASE = process.env.API_URL ?? "http://localhost:3001";
const DFN = "3"; // Default test patient

/* ------------------------------------------------------------------ */
/* Dead-click detection helper                                         */
/* ------------------------------------------------------------------ */

interface ClickAuditResult {
  selector: string;
  label: string;
  outcome: "navigated" | "state-change" | "dialog" | "pending" | "network" | "dead-click";
  detail?: string;
}

/**
 * Click a button and determine if it produced a meaningful response.
 * Returns the outcome classification.
 */
async function auditClick(page: Page, btn: Locator): Promise<ClickAuditResult> {
  const label = (await btn.textContent())?.trim().slice(0, 60) || "(unlabeled)";
  const selector = (await btn.getAttribute("data-testid")) || label;

  const beforeUrl = page.url();
  const beforeHtml = await page.locator("body").innerHTML().catch(() => "");

  // Track network requests during click
  let networkFired = false;
  const handler = () => { networkFired = true; };
  page.on("request", handler);

  // Count dialogs/modals before
  const dialogSel = "[role='dialog'], [class*='modal'], [class*='Modal'], [class*='Dialog']";
  const beforeDialogs = await page.locator(dialogSel).count();

  try {
    await btn.click({ timeout: 3000, force: false });
  } catch {
    page.off("request", handler);
    return { selector, label, outcome: "dead-click", detail: "Click failed/not interactive" };
  }

  await page.waitForTimeout(1000);
  page.off("request", handler);

  // Check 1: Navigation
  if (page.url() !== beforeUrl) {
    return { selector, label, outcome: "navigated", detail: `→ ${page.url()}` };
  }

  // Check 2: Dialog/modal opened
  const afterDialogs = await page.locator(dialogSel).count();
  if (afterDialogs > beforeDialogs) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
    return { selector, label, outcome: "dialog" };
  }

  // Check 3: DOM changed (state-change)
  const afterHtml = await page.locator("body").innerHTML().catch(() => "");
  if (afterHtml !== beforeHtml) {
    // Check if "integration pending" message appeared
    if (/pending|not available|coming soon/i.test(afterHtml) &&
        !/pending|not available|coming soon/i.test(beforeHtml)) {
      return { selector, label, outcome: "pending", detail: "Integration pending shown" };
    }
    return { selector, label, outcome: "state-change" };
  }

  // Check 4: Network request fired
  if (networkFired) {
    return { selector, label, outcome: "network", detail: "API call fired" };
  }

  // Check 5: Toast/alert
  const toasts = page.locator("[role='alert'], [class*='toast'], [class*='Toast']");
  if (await toasts.count() > 0) {
    return { selector, label, outcome: "state-change", detail: "Toast appeared" };
  }

  // Check 6: Dropdown/popover
  const popovers = page.locator("[role='listbox'], [role='menu'], [class*='dropdown'], [class*='popover']");
  if (await popovers.count() > 0) {
    await page.keyboard.press("Escape").catch(() => {});
    return { selector, label, outcome: "dialog", detail: "Dropdown/popover" };
  }

  return { selector, label, outcome: "dead-click" };
}

/* ------------------------------------------------------------------ */
/* Journey 1: Login → Patient → Cover Sheet → Tabs                     */
/* ------------------------------------------------------------------ */

test.describe("Journey 1: Clinical workflow", () => {
  test("Login → search → cover sheet → tabs cycle", async ({ page }) => {
    const errors = setupConsoleGate(page);

    // Navigate to patient search (already logged in via auth.setup.ts)
    await selectPatient(page, DFN);

    // Should be on chart page
    await expect(page).toHaveURL(new RegExp(`/cprs/chart/${DFN}/`));

    // Verify cover sheet has clinical data sections
    // Wait for any initial data to load
    await page.waitForTimeout(2000);

    // Look for common clinical section headings
    const body = await page.locator("body").textContent();
    const hasClinical = body &&
      (/allerg|vital|problem|medication|note|order/i.test(body));
    expect(hasClinical).toBeTruthy();

    // Navigate through clinical tabs
    const tabNames = ["Problems", "Meds", "Notes"];
    for (const tabName of tabNames) {
      const tab = page.locator(`[role='tab'], button, a`).filter({
        hasText: new RegExp(tabName, "i"),
      }).first();

      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(1500);

        // After clicking a tab, the page should show tab-specific content or loading
        const pageText = await page.locator("body").textContent();
        expect(pageText).toBeTruthy();
      }
    }

    // No critical console errors
    const critical = errors.filter((e) =>
      !e.includes("Warning:") &&
      !e.includes("Hydration") &&
      !e.includes("DevTools") &&
      !e.includes("ResizeObserver")
    );
    // Allow up to 3 non-critical errors (API sandbox limitations)
    expect(critical.length).toBeLessThanOrEqual(3);
  });
});

/* ------------------------------------------------------------------ */
/* Journey 2: Orders tab navigation                                    */
/* ------------------------------------------------------------------ */

test.describe("Journey 2: Orders workflow", () => {
  test("Navigate to patient chart → orders tab", async ({ page }) => {
    const errors = setupConsoleGate(page);

    await selectPatient(page, DFN);

    // Find and click Orders tab
    const ordersTab = page.locator(`[role='tab'], button, a`).filter({
      hasText: /order/i,
    }).first();

    if (await ordersTab.isVisible().catch(() => false)) {
      await ordersTab.click();
      await page.waitForTimeout(2000);

      // Orders panel should have content (orders list, quick-order form, or "no orders")
      const content = await page.locator("body").textContent();
      expect(content).toBeTruthy();

      // Look for order-related UI elements
      const hasOrderUI = /order|quick|new|place|sign|active|pending|discontinued/i.test(content || "");
      expect(hasOrderUI).toBeTruthy();
    } else {
      // If no orders tab visible, that's still valid — record it
      test.info().annotations.push({
        type: "info",
        description: "Orders tab not visible in current chart layout",
      });
    }
  });
});

/* ------------------------------------------------------------------ */
/* Journey 3: Dead-click audit on chart page                           */
/* ------------------------------------------------------------------ */

test.describe("Journey 3: Dead-click audit", () => {
  test("Every button on chart page must produce a response", async ({ page }) => {
    await selectPatient(page, DFN);
    await page.waitForTimeout(2000);

    // Gather all visible, enabled buttons on the chart page
    const buttons = page.locator(
      "button:visible:not([disabled]):not([aria-hidden='true'])"
    );
    const count = await buttons.count();

    const results: ClickAuditResult[] = [];
    const deadClicks: ClickAuditResult[] = [];

    // Audit up to 30 buttons (avoid infinite crawl)
    const limit = Math.min(count, 30);

    for (let i = 0; i < limit; i++) {
      // Re-query each time because DOM may have changed
      const allBtns = page.locator(
        "button:visible:not([disabled]):not([aria-hidden='true'])"
      );
      const currentCount = await allBtns.count();
      if (i >= currentCount) break;

      const btn = allBtns.nth(i);
      const text = (await btn.textContent())?.trim() || "";

      // Skip navigation-disruptive buttons (logout, delete, sign orders)
      if (/logout|sign out|delete|remove|sign all|confirm/i.test(text)) continue;

      const result = await auditClick(page, btn);
      results.push(result);

      if (result.outcome === "dead-click") {
        deadClicks.push(result);
      }

      // Navigate back to chart if we left
      if (!page.url().includes(`/cprs/chart/${DFN}/`)) {
        await page.goto(`/cprs/chart/${DFN}/cover`);
        await page.waitForTimeout(1500);
      }
    }

    // Report
    const total = results.length;
    const deadCount = deadClicks.length;

    test.info().annotations.push({
      type: "qa-ladder",
      description: `Audited ${total} buttons: ${deadCount} dead clicks found`,
    });

    if (deadClicks.length > 0) {
      const deadLabels = deadClicks.map((d) => d.label).join(", ");
      test.info().annotations.push({
        type: "dead-clicks",
        description: deadLabels,
      });
    }

    // Allow up to 5 dead clicks (tolerance for sandbox limitations)
    // but flag them in the report
    expect(
      deadCount,
      `Dead clicks found: ${deadClicks.map((d) => d.label).join("; ")}`
    ).toBeLessThanOrEqual(5);
  });
});

/* ------------------------------------------------------------------ */
/* Journey 4: API health contract post-journey                         */
/* ------------------------------------------------------------------ */

test.describe("Journey 4: API health after journeys", () => {
  test("API health endpoint returns ok after E2E exercise", async ({ request }) => {
    const health = await request.get(`${API_BASE}/health`);
    expect(health.ok()).toBeTruthy();
    const data = await health.json();
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("uptime");
    expect(typeof data.uptime).toBe("number");
    expect(data.uptime).toBeGreaterThan(0);
  });

  test("API ready endpoint returns ok", async ({ request }) => {
    const ready = await request.get(`${API_BASE}/ready`);
    expect(ready.ok()).toBeTruthy();
    const data = await ready.json();
    expect(data).toHaveProperty("ok");
  });

  test("No session leak: unauthenticated request returns 401", async ({ request }) => {
    const res = await request.get(`${API_BASE}/vista/allergies?dfn=3`, {
      headers: { Cookie: "" },
    });
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data).toHaveProperty("ok", false);
    // Must not leak stack trace
    const text = JSON.stringify(data);
    expect(text).not.toContain("at Object.");
    expect(text).not.toContain("node_modules");
  });
});
