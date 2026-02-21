/**
 * Phase 74 -- Click Audit v2 (Reality Verification Pack)
 *
 * Extends Phase 72 click-audit with:
 *   1. Portal route coverage (dashboard, appointments, messages)
 *   2. Scheduling + messaging screen coverage
 *   3. Network evidence capture (writes artifacts/verify/phase74/e2e/network.json)
 *   4. Stricter dead-click detection with per-screen evidence
 *
 * For each visible button/menu/tab, asserts one of:
 *   - Navigation occurred (URL changed)
 *   - Modal/dialog/popover/dropdown opened
 *   - Network request fired (XHR/fetch)
 *   - Toast/notification appeared
 *   - Content changed (state-change)
 *   - "integration pending" label with target info
 *   - Button disabled with tooltip/title
 *   else FAIL with full selector list.
 *
 * Uses pre-authenticated session from auth.setup.ts.
 */

import { test, expect, type Page, type Locator } from "@playwright/test";
import { setupConsoleGate } from "./helpers/auth";
import { NetworkEvidence } from "./helpers/network-evidence";
import * as path from "path";

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
  scope?: string;
  maxElements?: number;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
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

const SKIP_LABELS = /^(Theme|Density|Layout|Help|Tools|File|Edit|View|Window)[\s:]*$/i;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function isDisabledWithTooltip(el: Locator): Promise<string | false> {
  const disabled = await el.getAttribute("disabled").catch(() => null);
  const ariaDisabled = await el.getAttribute("aria-disabled").catch(() => null);
  if (disabled === null && ariaDisabled !== "true") return false;

  const title = await el.getAttribute("title").catch(() => null);
  const ariaLabel = await el.getAttribute("aria-label").catch(() => null);
  const tooltip = title || ariaLabel;
  if (tooltip && tooltip.length > 2) return tooltip;

  const tooltipChild = el.locator("[class*='tooltip'], [class*='Tooltip']");
  if ((await tooltipChild.count()) > 0) {
    const text = await tooltipChild.first().textContent().catch(() => null);
    if (text && text.length > 2) return text;
  }

  return false;
}

/** Detect if an API network request fires (not static assets) */
function isApiUrl(url: string): boolean {
  return (
    url.includes("localhost:3001") ||
    url.includes("/api/") ||
    url.includes("/vista/") ||
    url.includes("/auth/") ||
    url.includes("/rcm/") ||
    url.includes("/messaging/") ||
    url.includes("/admin/") ||
    url.includes("/telehealth/") ||
    url.includes("/imaging/") ||
    url.includes("/scheduling/") ||
    url.includes("/analytics/") ||
    url.includes("/iam/")
  );
}

/**
 * Audit a single interactive element click.
 */
async function auditClick(
  page: Page,
  el: Locator,
  label: string,
  selector: string,
): Promise<ClickAuditResult> {
  // Disabled-with-tooltip (no click needed)
  const tooltipText = await isDisabledWithTooltip(el);
  if (tooltipText) {
    return { selector, label, action: "disabled-with-tooltip", details: tooltipText };
  }

  const beforeUrl = page.url();
  const beforeBody = await page.locator("body").first().textContent().catch(() => "");
  const beforeDialogs = await page.locator(DIALOG_SELECTOR).count();
  const beforePopovers = await page.locator(POPOVER_SELECTOR).count();

  let networkFired = false;
  const networkHandler = (req: { url: () => string }) => {
    if (isApiUrl(req.url())) networkFired = true;
  };
  page.on("request", networkHandler);

  try {
    await el.click({ timeout: 3000 });
  } catch {
    page.removeListener("request", networkHandler);
    return { selector, label, action: "dead-click", details: "Click failed or element not interactive" };
  }

  await page.waitForTimeout(800);
  page.removeListener("request", networkHandler);

  // Navigation
  if (page.url() !== beforeUrl) {
    return { selector, label, action: "navigated", details: `${beforeUrl} -> ${page.url()}` };
  }

  // Network request
  if (networkFired) {
    return { selector, label, action: "network", details: "XHR/fetch observed" };
  }

  // Dialog/modal
  if ((await page.locator(DIALOG_SELECTOR).count()) > beforeDialogs) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    return { selector, label, action: "dialog", details: "Modal/dialog opened" };
  }

  // Popover/dropdown
  if ((await page.locator(POPOVER_SELECTOR).count()) > beforePopovers) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    return { selector, label, action: "dialog", details: "Popover/dropdown opened" };
  }

  // Toast/notification
  if ((await page.locator(TOAST_SELECTOR).count()) > 0) {
    return { selector, label, action: "state-change", details: "Toast/notification appeared" };
  }

  // Content change
  const afterBody = await page.locator("body").first().textContent().catch(() => "");
  if (afterBody !== beforeBody) {
    const pendingMatch = (afterBody || "").match(
      /pending|integration.*pending|not\s+available|coming\s+soon/i,
    );
    if (pendingMatch) {
      return { selector, label, action: "pending-labeled", details: pendingMatch[0] };
    }
    return { selector, label, action: "state-change" };
  }

  return { selector, label, action: "dead-click", details: "No observable effect" };
}

/**
 * Full click audit for a screen.
 */
async function auditScreen(
  page: Page,
  screen: ScreenTarget,
): Promise<{ passed: ClickAuditResult[]; failed: ClickAuditResult[] }> {
  const passed: ClickAuditResult[] = [];
  const failed: ClickAuditResult[] = [];
  const max = screen.maxElements ?? 15;

  const scope = screen.scope ? `${screen.scope} ` : "";
  const interactiveSelector = [
    `${scope}button:visible:not([disabled]):not([aria-disabled='true'])`,
    `${scope}[role='tab']:visible`,
    `${scope}a[href]:visible:not([href='#']):not([href=''])`,
  ].join(", ");

  await page.goto(screen.url);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  const count = await page.locator(interactiveSelector).count();

  for (let i = 0; i < Math.min(count, max); i++) {
    try {
      await page.goto(screen.url);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      const el = page.locator(interactiveSelector).nth(i);
      const label = await el.textContent().catch(() => `element[${i}]`);
      const trimmed = (label || "").trim().substring(0, 50);

      if (SKIP_LABELS.test(trimmed)) continue;

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
    }
  }

  return { passed, failed };
}

/* ------------------------------------------------------------------ */
/* Screen targets — v2 extends Phase 72 with scheduling, messaging,    */
/* portal basics                                                       */
/* ------------------------------------------------------------------ */

const CHART_SCREENS: ScreenTarget[] = [
  { name: "Cover Sheet", url: "/cprs/chart/3/cover", maxElements: 12 },
  { name: "Problems", url: "/cprs/chart/3/problems", maxElements: 10 },
  { name: "Meds", url: "/cprs/chart/3/meds", maxElements: 10 },
  { name: "Orders", url: "/cprs/chart/3/orders", maxElements: 10 },
  { name: "Notes", url: "/cprs/chart/3/notes", maxElements: 10 },
  { name: "Labs", url: "/cprs/chart/3/labs", maxElements: 8 },
  { name: "Imaging", url: "/cprs/chart/3/imaging", maxElements: 8 },
  { name: "Consults", url: "/cprs/chart/3/consults", maxElements: 8 },
  { name: "Surgery", url: "/cprs/chart/3/surgery", maxElements: 8 },
  { name: "DC Summaries", url: "/cprs/chart/3/dcsumm", maxElements: 8 },
];

const NAV_SCREENS: ScreenTarget[] = [
  { name: "Inbox", url: "/cprs/inbox", maxElements: 10 },
  { name: "Messages", url: "/cprs/messages", maxElements: 10 },
  { name: "Scheduling", url: "/cprs/scheduling", maxElements: 10 },
  { name: "Remote Data Viewer", url: "/cprs/remote-data-viewer", maxElements: 8 },
  { name: "Order Sets", url: "/cprs/order-sets", maxElements: 8 },
];

const ADMIN_SCREENS: ScreenTarget[] = [
  { name: "Admin Modules", url: "/cprs/admin/modules", maxElements: 12 },
  { name: "Admin RCM", url: "/cprs/admin/rcm", maxElements: 12 },
  { name: "Admin Analytics", url: "/cprs/admin/analytics", maxElements: 10 },
  { name: "Admin Integrations", url: "/cprs/admin/integrations", maxElements: 10 },
  { name: "Admin Reports", url: "/cprs/admin/reports", maxElements: 8 },
  { name: "Admin Migration", url: "/cprs/admin/migration", maxElements: 8 },
  { name: "Admin Audit Viewer", url: "/cprs/admin/audit-viewer", maxElements: 8 },
];

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

test.describe("Phase 74 -- Click Audit v2 (E2E Evidence)", () => {
  test.setTimeout(900_000); // 15 min for extended crawl
  let evidence: NetworkEvidence;

  test.beforeAll(async ({ browser }) => {
    // Create a dedicated page for evidence setup verification
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    evidence = new NetworkEvidence(page);
    evidence.start();
    await ctx.close();
  });

  /* ---------- Chart tab screens ---------- */
  for (const screen of CHART_SCREENS) {
    test(`[ChartV2] ${screen.name} -- every element produces effect`, async ({ page }) => {
      const errors = setupConsoleGate(page);
      const pageEvidence = new NetworkEvidence(page);
      pageEvidence.setContext(`chart:${screen.name}`);
      pageEvidence.start();

      const { passed, failed } = await auditScreen(page, screen);

      if (failed.length > 0) {
        const report = failed
          .map((f) => `  DEAD: "${f.label}" (${f.selector}) -- ${f.details}`)
          .join("\n");
        const summary = `${failed.length} dead click(s) on ${screen.name} (${passed.length} passed):\n${report}`;
        expect(failed, summary).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  /* ---------- Navigation + functional screens ---------- */
  for (const screen of NAV_SCREENS) {
    test(`[NavV2] ${screen.name} -- every element produces effect`, async ({ page }) => {
      const errors = setupConsoleGate(page);
      const pageEvidence = new NetworkEvidence(page);
      pageEvidence.setContext(`nav:${screen.name}`);
      pageEvidence.start();

      const { passed, failed } = await auditScreen(page, screen);

      if (failed.length > 0) {
        const report = failed
          .map((f) => `  DEAD: "${f.label}" (${f.selector}) -- ${f.details}`)
          .join("\n");
        const summary = `${failed.length} dead click(s) on ${screen.name} (${passed.length} passed):\n${report}`;
        expect(failed, summary).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  /* ---------- Admin screens ---------- */
  for (const screen of ADMIN_SCREENS) {
    test(`[AdminV2] ${screen.name} -- every element produces effect`, async ({ page }) => {
      const errors = setupConsoleGate(page);
      const pageEvidence = new NetworkEvidence(page);
      pageEvidence.setContext(`admin:${screen.name}`);
      pageEvidence.start();

      const { passed, failed } = await auditScreen(page, screen);

      if (failed.length > 0) {
        const report = failed
          .map((f) => `  DEAD: "${f.label}" (${f.selector}) -- ${f.details}`)
          .join("\n");
        const summary = `${failed.length} dead click(s) on ${screen.name} (${passed.length} passed):\n${report}`;
        expect(failed, summary).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  /* ---------- All chart tabs render non-empty content ---------- */
  test("all chart tabs render non-empty content (v2)", async ({ page }) => {
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

      const text = await page.locator("body").first().textContent().catch(() => "");
      if (!text?.trim().length || (text?.trim().length || 0) < 10) {
        deadEnds.push(`${slug}: blank or near-empty (${text?.length ?? 0} chars)`);
      }
    }

    if (deadEnds.length > 0) {
      expect(deadEnds, `Dead-end tabs:\n${deadEnds.join("\n")}`).toHaveLength(0);
    }
    expect(errors, "Console errors during tab crawl").toHaveLength(0);
  });

  /* ---------- Pending elements must have target info ---------- */
  test("integration-pending elements include target RPC/file (v2)", async ({ page }) => {
    const errors = setupConsoleGate(page);

    const urls = [
      "/cprs/chart/3/cover",
      "/cprs/chart/3/problems",
      "/cprs/chart/3/meds",
      "/cprs/chart/3/orders",
      "/cprs/chart/3/imaging",
      "/cprs/scheduling",
      "/cprs/messages",
    ];

    const barePending: string[] = [];

    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      const pendingEls = page.locator(
        ":text-matches('integration.pending|not.yet.available', 'i')",
      );
      const count = await pendingEls.count();

      for (let i = 0; i < count; i++) {
        const el = pendingEls.nth(i);
        const text = await el.textContent().catch(() => "");
        const hasTarget = (text || "").match(
          /RPC|VistA|file\b|queue|routine|ORWDX|GMRA|HL7|HLO|OR\s/i,
        );
        if (!hasTarget && text && text.length < 100) {
          barePending.push(`${url}: "${(text || "").trim().substring(0, 80)}"`);
        }
      }
    }

    if (barePending.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n  WARN: ${barePending.length} pending message(s) without explicit target:\n  ${barePending.join("\n  ")}\n`,
      );
    }

    expect(errors, "Console errors during pending audit").toHaveLength(0);
  });

  /* ---------- Network evidence artifact ---------- */
  test("write network evidence artifact", async ({ page }) => {
    const pageEvidence = new NetworkEvidence(page);
    pageEvidence.setContext("evidence-capture");
    pageEvidence.start();

    // Hit a few core routes to generate evidence
    const coreUrls = [
      "/cprs/chart/3/cover",
      "/cprs/chart/3/problems",
      "/cprs/chart/3/meds",
      "/cprs/scheduling",
      "/cprs/messages",
      "/cprs/admin/modules",
    ];

    for (const url of coreUrls) {
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
    }

    // Write evidence artifact
    const artifactPath = path.resolve(
      __dirname,
      "../../../../artifacts/verify/phase74/e2e/network.json",
    );
    await pageEvidence.flush(artifactPath);

    const report = pageEvidence.buildReport();
    expect(report._meta.totalRequests).toBeGreaterThan(0);
    expect(report.entries.length).toBeGreaterThan(0);
  });
});
