/**
 * Phase 37 — E2E: Every CPRS tab loads with non-empty content.
 *
 * Navigates through all 15 chart tabs for patient DFN=3 and verifies:
 * 1. Tab navigates successfully (URL changes)
 * 2. Main content area is non-empty
 * 3. No console errors
 *
 * Uses a single test with one login to avoid API rate-limiting.
 */

import { test, expect } from "@playwright/test";
import { setupConsoleGate } from "./helpers/auth";

const TABS = [
  { slug: "cover", label: "Cover Sheet" },
  { slug: "problems", label: "Problems" },
  { slug: "meds", label: "Medications" },
  { slug: "orders", label: "Orders" },
  { slug: "notes", label: "Notes" },
  { slug: "consults", label: "Consults" },
  { slug: "surgery", label: "Surgery" },
  { slug: "dcsumm", label: "DC Summaries" },
  { slug: "labs", label: "Labs" },
  { slug: "reports", label: "Reports" },
  { slug: "imaging", label: "Imaging" },
  { slug: "intake", label: "Intake" },
  { slug: "telehealth", label: "Telehealth" },
  { slug: "tasks", label: "Tasks" },
  { slug: "aiassist", label: "AI Assist" },
];

test.describe("CPRS Tab Loading", () => {
  test("all 15 tabs load with non-empty content", async ({ page }) => {
    test.setTimeout(180_000); // 3 min for 15 tabs
    // Session pre-loaded via auth.setup.ts (storageState)
    const errors = setupConsoleGate(page);
    const tabErrors: Record<string, string> = {};

    for (const tab of TABS) {
      errors.length = 0; // reset per tab
      await page.goto(`/cprs/chart/3/${tab.slug}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      // URL should match
      const url = page.url();
      if (!url.includes(`/cprs/chart/3/${tab.slug}`)) {
        tabErrors[tab.slug] = `URL mismatch: ${url}`;
        continue;
      }

      // Content area should exist and not be empty
      const main = page.locator("main").or(page.locator("[class*='content']")).first();
      try {
        await expect(main).toBeVisible({ timeout: 10_000 });
        const text = await main.textContent();
        if (!text?.trim().length) {
          tabErrors[tab.slug] = "Empty content";
        }
      } catch {
        tabErrors[tab.slug] = "Main content area not visible";
      }

      if (errors.length > 0) {
        tabErrors[tab.slug] = `Console errors: ${errors.join("; ")}`;
      }
    }

    // Report all tab errors at once
    const failed = Object.entries(tabErrors);
    if (failed.length > 0) {
      const report = failed.map(([slug, err]) => `  ${slug}: ${err}`).join("\n");
      expect(failed, `Tabs with errors:\n${report}`).toHaveLength(0);
    }
  });
});
