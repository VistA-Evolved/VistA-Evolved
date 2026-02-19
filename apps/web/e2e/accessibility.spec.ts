/**
 * Phase 37 — Accessibility smoke tests with axe-core.
 *
 * Tests key pages against WCAG 2.1 AA rules:
 * - Login page
 * - Patient search
 * - Chart/Cover Sheet (CPRS main shell)
 *
 * Fails on critical/serious violations. Minor/moderate are logged and documented.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Run axe on the current page and return violations grouped by impact. */
async function runAxe(page: import("@playwright/test").Page, pageName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("[aria-hidden='true']") // skip intentionally hidden elements
    .analyze();

  return results;
}

test.describe("Accessibility Smoke Tests", () => {
  test("login page passes critical a11y checks", async ({ page }) => {
    await page.goto("/cprs/login");
    await page.waitForLoadState("domcontentloaded");

    const results = await runAxe(page, "login");

    // Filter to critical and serious only
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (critical.length > 0) {
      const report = critical
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
        )
        .join("\n");
      expect.soft(critical, `Login page a11y critical/serious violations:\n${report}`).toHaveLength(0);
    }

    // Log all violations for reference (including minor/moderate)
    if (results.violations.length > 0) {
      console.log(
        `[a11y] Login page: ${results.violations.length} total violations (${critical.length} critical/serious)`
      );
    }
  });

  test("patient search passes critical a11y checks", async ({ page }) => {
    // Session pre-loaded via auth.setup.ts

    await page.goto("/cprs/patient-search");
    await page.waitForLoadState("domcontentloaded");

    const results = await runAxe(page, "patient-search");

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (critical.length > 0) {
      const report = critical
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
        )
        .join("\n");
      expect.soft(critical, `Patient search a11y critical/serious violations:\n${report}`).toHaveLength(0);
    }
  });

  test("CPRS chart shell passes critical a11y checks", async ({ page }) => {
    // Session pre-loaded via auth.setup.ts
    await page.goto("/cprs/chart/3/cover");
    await page.waitForLoadState("domcontentloaded");

    const results = await runAxe(page, "chart-cover");

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (critical.length > 0) {
      const report = critical
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
        )
        .join("\n");
      expect.soft(critical, `Chart shell a11y critical/serious violations:\n${report}`).toHaveLength(0);
    }
  });
});
