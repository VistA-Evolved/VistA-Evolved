/**
 * Dead-Click Crawler — Automated Dead Click Detection
 *
 * Phase 96B: QA/Audit OS v1.1
 *
 * Crawls all admin pages and clicks every visible interactive element,
 * detecting dead clicks: element appears clickable but produces no
 * navigation, network request, or DOM change.
 *
 * Requires:
 *   - API running on localhost:3001
 *   - Web app running on localhost:3000
 *   - Pre-authenticated session (depends on setup project)
 */

import { test, expect, Page } from "@playwright/test";

const API = process.env.API_URL || "http://localhost:3001";

/** Pages to crawl for dead clicks */
const CRAWL_PAGES = [
  "/cprs/admin/modules",
  "/cprs/admin/payer-db",
  "/cprs/admin/rcm",
  "/cprs/admin/analytics",
  "/cprs/admin/audit-viewer",
  "/cprs/admin/payer-registry",
  "/cprs/admin/reports",
];

interface DeadClickReport {
  page: string;
  selector: string;
  text: string;
  elementType: string;
  hasOnClick: boolean;
  producedEffect: boolean;
  visuallyDisabled: boolean;
}

/**
 * Check if an element is interactive but produces no effect when clicked.
 */
async function findDeadClicks(page: Page, url: string): Promise<DeadClickReport[]> {
  const deadClicks: DeadClickReport[] = [];

  // Navigate to the page
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  } catch {
    // Page may not exist or may timeout — skip
    return [];
  }

  // Find all interactive elements
  const interactiveSelectors = [
    "button:not([disabled])",
    "a[href]",
    "[role='button']",
    "[role='tab']",
    "input[type='submit']",
    "input[type='button']",
  ];

  for (const selector of interactiveSelectors) {
    const elements = await page.locator(selector).all();

    for (const el of elements) {
      try {
        const isVisible = await el.isVisible();
        if (!isVisible) continue;

        const text = (await el.textContent())?.trim().slice(0, 80) || "";
        const tagName = await el.evaluate((e) => e.tagName.toLowerCase());
        const type = await el.evaluate((e) => (e as HTMLInputElement).type || "");
        const elementType = type ? `${tagName}[${type}]` : tagName;

        // Check if element has onclick handler
        const hasOnClick = await el.evaluate((e) => {
          return !!(
            (e as any).onclick ||
            e.getAttribute("onclick") ||
            (e.tagName === "A" && e.getAttribute("href"))
          );
        });

        // Check if visually styled as disabled
        const visuallyDisabled = await el.evaluate((e) => {
          const styles = window.getComputedStyle(e);
          return (
            styles.opacity === "0.5" ||
            styles.pointerEvents === "none" ||
            e.getAttribute("aria-disabled") === "true" ||
            e.classList.contains("disabled")
          );
        });

        if (visuallyDisabled) continue; // Skip visually disabled elements

        // Track network requests during click
        const requestsBefore = new Set<string>();
        const requestHandler = (req: any) => requestsBefore.add(req.url());
        page.on("request", requestHandler);

        // Snapshot DOM before click
        const domBefore = await page.evaluate(() => document.body.innerHTML.length);

        // Click the element
        try {
          await el.click({ timeout: 2000, force: false });
          await page.waitForTimeout(500); // Wait for effects
        } catch {
          // Click failed (element disappeared, navigation, etc.) — not a dead click
          page.off("request", requestHandler);
          continue;
        }

        page.off("request", requestHandler);

        // Check for effects
        const domAfter = await page.evaluate(() => document.body.innerHTML.length);
        const domChanged = Math.abs(domAfter - domBefore) > 10;
        const networkActivity = requestsBefore.size > 0;
        const producedEffect = domChanged || networkActivity;

        // If no effect, this is a potential dead click
        if (!producedEffect && tagName !== "a") {
          deadClicks.push({
            page: url,
            selector: `${selector} >> text="${text.slice(0, 30)}"`,
            text,
            elementType,
            hasOnClick,
            producedEffect: false,
            visuallyDisabled: false,
          });
        }
      } catch {
        // Element may have been removed during interaction — skip
        continue;
      }
    }
  }

  return deadClicks;
}

test.describe("Dead-Click Crawler", () => {
  test.setTimeout(120_000); // Crawling takes time

  test("crawl admin pages for dead clicks", async ({ page }) => {
    const allDeadClicks: DeadClickReport[] = [];

    for (const pageUrl of CRAWL_PAGES) {
      const deadClicks = await findDeadClicks(page, pageUrl);
      allDeadClicks.push(...deadClicks);
    }

    // Report dead clicks to QA API (if available)
    try {
      await page.request.post(`${API}/qa/dead-clicks`, {
        data: { entries: allDeadClicks },
      });
    } catch {
      // QA routes may not be enabled — that's OK
    }

    // Allow up to 3 dead clicks (some UI elements may be legitimately
    // non-functional in test mode). Adjust threshold as needed.
    const threshold = Number(process.env.DEAD_CLICK_THRESHOLD || 3);
    if (allDeadClicks.length > threshold) {
      console.error("Dead clicks found:");
      for (const dc of allDeadClicks) {
        console.error(`  ${dc.page} :: ${dc.elementType} "${dc.text}"`);
      }
    }
    expect(allDeadClicks.length).toBeLessThanOrEqual(threshold);
  });
});
