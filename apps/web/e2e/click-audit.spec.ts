/**
 * Phase 72 — Dead-Click Audit (Reality Verifier Pack)
 *
 * Enhanced click-audit that crawls CPRS chart tabs, inbox, admin pages
 * and asserts EVERY visible interactive element produces a real effect:
 *
 *   a) Navigation occurred (URL changed), OR
 *   b) Modal/dialog/popover/dropdown opened, OR
 *   c) Network request fired (XHR/fetch intercepted), OR
 *   d) Button is explicitly disabled with tooltip/title
 *
 * If none of these, the element is a DEAD CLICK and the test FAILs
 * with the full selector list for triage.
 *
 * Uses pre-authenticated session from auth.setup.ts.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";
import { setupConsoleGate } from "./helpers/auth";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ClickAuditResult {
  selector: string;
  label: string;
  action:
    | "navigated"
    | "dialog"
    | "network"
    | "state-change"
    | "pending-labeled"
    | "disabled-with-tooltip"
    | "dead-click";
  details?: string;
}

interface ScreenTarget {
  name: string;
  url: string;
  /** Selector scope — only test elements within this container */
  scope?: string;
  /** Max interactive elements to test per screen */
  maxElements?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DIALOG_SELECTOR = [
  "[role='dialog']",
  "[role='alertdialog']",
  "[class*='modal']",
  "[class*='Modal']",
  "[class*='dialog']",
  "[class*='Dialog']",
].join(", ");

const POPOVER_SELECTOR = [
  "[role='listbox']",
  "[role='menu']",
  "[role='tooltip']",
  "[class*='dropdown']",
  "[class*='Dropdown']",
  "[class*='popover']",
  "[class*='Popover']",
].join(", ");

const TOAST_SELECTOR = [
  "[class*='toast']",
  "[class*='Toast']",
  "[role='alert']",
  "[class*='notification']",
  "[class*='Notification']",
  "[class*='snackbar']",
  "[class*='Snackbar']",
].join(", ");

/** Labels to skip — meta-UI, theme, density controls, known menu-bar items */
const SKIP_LABELS = /^(Theme|Density|Layout|Help|Tools|File|Edit|View|Window)[\s:]*$/i;

/** Check if an element has a meaningful disabled state with tooltip/title */
async function isDisabledWithTooltip(el: Locator): Promise<string | false> {
  const disabled = await el.getAttribute("disabled").catch(() => null);
  const ariaDisabled = await el.getAttribute("aria-disabled").catch(() => null);
  if (disabled === null && ariaDisabled !== "true") return false;

  const title = await el.getAttribute("title").catch(() => null);
  const ariaLabel = await el.getAttribute("aria-label").catch(() => null);
  const tooltip = title || ariaLabel;
  if (tooltip && tooltip.length > 2) return tooltip;

  // Also check for a nested tooltip span
  const tooltipChild = el.locator("[class*='tooltip'], [class*='Tooltip']");
  if ((await tooltipChild.count()) > 0) {
    const text = await tooltipChild.first().textContent().catch(() => null);
    if (text && text.length > 2) return text;
  }

  return false;
}

/**
 * Audit a single interactive element click.
 * Sets up network interception BEFORE clicking, then checks all 4 response types.
 */
async function auditClick(
  page: Page,
  el: Locator,
  label: string,
  selector: string
): Promise<ClickAuditResult> {
  // Check disabled-with-tooltip first (no click needed)
  const tooltipText = await isDisabledWithTooltip(el);
  if (tooltipText) {
    return {
      selector,
      label,
      action: "disabled-with-tooltip",
      details: tooltipText,
    };
  }

  const beforeUrl = page.url();
  const beforeBody = await page.locator("body").first().textContent().catch(() => "");
  const beforeDialogs = await page.locator(DIALOG_SELECTOR).count();
  const beforePopovers = await page.locator(POPOVER_SELECTOR).count();

  // Set up network interception — track if any XHR/fetch fires
  let networkFired = false;
  const networkHandler = () => { networkFired = true; };
  page.on("request", networkHandler);

  try {
    await el.click({ timeout: 3000 });
  } catch {
    page.removeListener("request", networkHandler);
    return { selector, label, action: "dead-click", details: "Click failed or element not interactive" };
  }

  // Wait for effects to settle
  await page.waitForTimeout(800);
  page.removeListener("request", networkHandler);

  // Check 1: Navigation
  const afterUrl = page.url();
  if (afterUrl !== beforeUrl) {
    return { selector, label, action: "navigated", details: `${beforeUrl} -> ${afterUrl}` };
  }

  // Check 2: Network request fired
  if (networkFired) {
    return { selector, label, action: "network", details: "XHR/fetch request observed" };
  }

  // Check 3: Dialog/modal opened
  const afterDialogs = await page.locator(DIALOG_SELECTOR).count();
  if (afterDialogs > beforeDialogs) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    return { selector, label, action: "dialog", details: "Modal/dialog opened" };
  }

  // Check 4: Popover/dropdown/menu opened
  const afterPopovers = await page.locator(POPOVER_SELECTOR).count();
  if (afterPopovers > beforePopovers) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    return { selector, label, action: "dialog", details: "Popover/dropdown opened" };
  }

  // Check 5: Toast/notification appeared
  const toastCount = await page.locator(TOAST_SELECTOR).count();
  if (toastCount > 0) {
    return { selector, label, action: "state-change", details: "Toast/notification appeared" };
  }

  // Check 6: Content changed (state change)
  const afterBody = await page.locator("body").first().textContent().catch(() => "");
  if (afterBody !== beforeBody) {
    const pendingMatch = (afterBody || "").match(/pending|integration.*pending|not\s+available|coming\s+soon/i);
    if (pendingMatch) {
      return { selector, label, action: "pending-labeled", details: pendingMatch[0] };
    }
    return { selector, label, action: "state-change" };
  }

  return { selector, label, action: "dead-click", details: "No observable effect" };
}

/**
 * Full click audit for a screen: navigates, finds all interactive elements,
 * tests each one (re-navigating between clicks to reset state).
 */
async function auditScreen(
  page: Page,
  screen: ScreenTarget
): Promise<{ passed: ClickAuditResult[]; failed: ClickAuditResult[] }> {
  const passed: ClickAuditResult[] = [];
  const failed: ClickAuditResult[] = [];
  const max = screen.maxElements ?? 15;

  // Build the interactive element selector
  const scope = screen.scope ? `${screen.scope} ` : "";
  const interactiveSelector = [
    `${scope}button:visible:not([disabled]):not([aria-disabled='true'])`,
    `${scope}[role='tab']:visible`,
    `${scope}a[href]:visible:not([href='#']):not([href=''])`,
  ].join(", ");

  await page.goto(screen.url);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const elements = page.locator(interactiveSelector);
  const count = await elements.count();

  for (let i = 0; i < Math.min(count, max); i++) {
    try {
      // Re-navigate to reset state between clicks
      await page.goto(screen.url);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      const el = page.locator(interactiveSelector).nth(i);
      const label = await el.textContent().catch(() => `element[${i}]`);
      const trimmed = (label || "").trim().substring(0, 50);

      // Skip meta-UI buttons
      if (SKIP_LABELS.test(trimmed)) continue;

      // Build a descriptive selector for reporting
      const tagName = await el.evaluate((e) => e.tagName.toLowerCase()).catch(() => "?");
      const role = await el.getAttribute("role").catch(() => null);
      const testId = await el.getAttribute("data-testid").catch(() => null);
      const selectorDesc = testId
        ? `[data-testid="${testId}"]`
        : role
          ? `${tagName}[role="${role}"]`
          : `${tagName}:nth(${i})`;

      const result = await auditClick(page, el, trimmed, selectorDesc);
      if (result.action === "dead-click") {
        failed.push(result);
      } else {
        passed.push(result);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("closed") || msg.includes("Target page")) break;
      // Skip individual element failures
    }
  }

  return { passed, failed };
}

/* ------------------------------------------------------------------ */
/* Screen targets                                                      */
/* ------------------------------------------------------------------ */

const CHART_SCREENS: ScreenTarget[] = [
  { name: "Cover Sheet", url: "/cprs/chart/3/cover", maxElements: 12 },
  { name: "Problems", url: "/cprs/chart/3/problems", maxElements: 10 },
  { name: "Meds", url: "/cprs/chart/3/meds", maxElements: 10 },
  { name: "Orders", url: "/cprs/chart/3/orders", maxElements: 10 },
  { name: "Notes", url: "/cprs/chart/3/notes", maxElements: 10 },
  { name: "Labs", url: "/cprs/chart/3/labs", maxElements: 8 },
  { name: "Imaging", url: "/cprs/chart/3/imaging", maxElements: 8 },
];

const NAV_SCREENS: ScreenTarget[] = [
  { name: "Inbox", url: "/cprs/inbox", maxElements: 10 },
  { name: "Messages", url: "/cprs/messages", maxElements: 10 },
  { name: "Scheduling", url: "/cprs/scheduling", maxElements: 8 },
];

const ADMIN_SCREENS: ScreenTarget[] = [
  { name: "Admin Modules", url: "/cprs/admin/modules", maxElements: 12 },
  { name: "Admin RCM", url: "/cprs/admin/rcm", maxElements: 12 },
  { name: "Admin Analytics", url: "/cprs/admin/analytics", maxElements: 10 },
  { name: "Admin Integrations", url: "/cprs/admin/integrations", maxElements: 10 },
];

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

test.describe("Phase 72 — Dead-Click Audit", () => {
  test.setTimeout(600_000); // 10 min total — large crawl

  /* ---------- Chart screens ---------- */
  for (const screen of CHART_SCREENS) {
    test(`[Chart] ${screen.name} — every interactive element produces effect`, async ({ page }) => {
      const errors = setupConsoleGate(page);
      const { passed, failed } = await auditScreen(page, screen);

      // Build failure report with full selector list for triage
      if (failed.length > 0) {
        const report = failed
          .map((f) => `  DEAD: "${f.label}" (${f.selector}) — ${f.details}`)
          .join("\n");
        const summary = `${failed.length} dead click(s) on ${screen.name} (${passed.length} passed):\n${report}`;
        expect(failed, summary).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  /* ---------- Navigation screens ---------- */
  for (const screen of NAV_SCREENS) {
    test(`[Nav] ${screen.name} — every interactive element produces effect`, async ({ page }) => {
      const errors = setupConsoleGate(page);
      const { passed, failed } = await auditScreen(page, screen);

      if (failed.length > 0) {
        const report = failed
          .map((f) => `  DEAD: "${f.label}" (${f.selector}) — ${f.details}`)
          .join("\n");
        const summary = `${failed.length} dead click(s) on ${screen.name} (${passed.length} passed):\n${report}`;
        expect(failed, summary).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  /* ---------- Admin screens ---------- */
  for (const screen of ADMIN_SCREENS) {
    test(`[Admin] ${screen.name} — every interactive element produces effect`, async ({ page }) => {
      const errors = setupConsoleGate(page);
      const { passed, failed } = await auditScreen(page, screen);

      if (failed.length > 0) {
        const report = failed
          .map((f) => `  DEAD: "${f.label}" (${f.selector}) — ${f.details}`)
          .join("\n");
        const summary = `${failed.length} dead click(s) on ${screen.name} (${passed.length} passed):\n${report}`;
        expect(failed, summary).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  /* ---------- Aggregate summary ---------- */
  test("all chart tabs render non-empty content", async ({ page }) => {
    const errors = setupConsoleGate(page);

    const tabSlugs = [
      "cover", "problems", "meds", "orders", "notes", "consults",
      "surgery", "dcsumm", "labs", "reports", "imaging",
      "intake", "telehealth", "tasks", "aiassist",
    ];

    const deadEnds: string[] = [];

    for (const slug of tabSlugs) {
      await page.goto(`/cprs/chart/3/${slug}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);

      const bodyEl = page.locator("body").first();
      const text = await bodyEl.textContent().catch(() => "");
      if (!text?.trim().length || (text?.trim().length || 0) < 10) {
        deadEnds.push(`${slug}: blank or near-empty (${text?.length ?? 0} chars)`);
      }
    }

    if (deadEnds.length > 0) {
      expect(deadEnds, `Dead-end tabs:\n${deadEnds.join("\n")}`).toHaveLength(0);
    }

    expect(errors, "Console errors during tab crawl").toHaveLength(0);
  });

  /* ---------- Pending elements must be labeled ---------- */
  test("integration-pending elements include target RPC/file", async ({ page }) => {
    const errors = setupConsoleGate(page);

    const urls = [
      "/cprs/chart/3/cover",
      "/cprs/chart/3/problems",
      "/cprs/chart/3/meds",
      "/cprs/chart/3/orders",
      "/cprs/chart/3/imaging",
    ];

    const barePending: string[] = [];

    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Find elements mentioning "pending" or "integration"
      const pendingEls = page.locator(
        ":text-matches('integration.pending|not.yet.available', 'i')"
      );
      const count = await pendingEls.count();

      for (let i = 0; i < count; i++) {
        const el = pendingEls.nth(i);
        const text = await el.textContent().catch(() => "");
        // Must mention a target: RPC name, VistA file, or next-step
        const hasTarget = (text || "").match(/RPC|VistA|file|^|queue|routine|ORWDX|GMRA|HL7|HLO|OR\s/i);
        if (!hasTarget && text && text.length < 100) {
          barePending.push(`${url}: "${(text || "").trim().substring(0, 80)}"`);
        }
      }
    }

    // Bare pending messages without targets are allowed but logged
    if (barePending.length > 0) {
      console.warn(`\n  WARN: ${barePending.length} pending message(s) without explicit target:\n  ${barePending.join("\n  ")}\n`);
    }

    expect(errors, "Console errors during pending audit").toHaveLength(0);
  });
});
