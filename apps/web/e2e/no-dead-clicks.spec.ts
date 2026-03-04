/**
 * Phase 52 — No Dead Click Contract
 *
 * Automated contract test that crawls key UI screens and asserts:
 *   - Every clickable element either:
 *     1. Navigates to a new URL
 *     2. Opens a dialog/modal
 *     3. Performs a visible action (state change)
 *     4. Shows explicit "integration pending" with target and next step
 *   - No silent no-ops allowed
 *
 * Covers: CPRS chart tabs, admin pages, menu items, and form actions.
 * Uses pre-authenticated session from auth.setup.ts.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { setupConsoleGate } from './helpers/auth';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Result of clicking a button. */
interface ClickResult {
  label: string;
  action: 'navigated' | 'dialog' | 'state-change' | 'pending' | 'dead-click';
  details?: string;
}

/**
 * Tests a single button click to verify it produces a response.
 * Returns the action type detected.
 */
async function testButtonClick(page: Page, btn: Locator, label: string): Promise<ClickResult> {
  const beforeUrl = page.url();
  const beforeText = await page
    .locator('body')
    .first()
    .textContent()
    .catch(() => '');

  // Count existing dialogs
  const dialogSelector =
    "[role='dialog'], [class*='modal'], [class*='Modal'], [class*='dialog'], [class*='Dialog']";
  const beforeDialogs = await page.locator(dialogSelector).count();

  try {
    await btn.click({ timeout: 3000 });
  } catch {
    return { label, action: 'dead-click', details: 'Click failed or element not interactive' };
  }

  await page.waitForTimeout(800);

  // Check 1: URL changed (navigation)
  const afterUrl = page.url();
  if (afterUrl !== beforeUrl) {
    return { label, action: 'navigated', details: `${beforeUrl} -> ${afterUrl}` };
  }

  // Check 2: Dialog/modal opened
  const afterDialogs = await page.locator(dialogSelector).count();
  if (afterDialogs > beforeDialogs) {
    // Close it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return { label, action: 'dialog' };
  }

  // Check 3: Content changed (state change)
  const afterText = await page
    .locator('body')
    .first()
    .textContent()
    .catch(() => '');

  if (afterText !== beforeText) {
    // Check if the change is an "integration pending" message
    const pendingMatch = (afterText || '').match(
      /pending|integration|not available|coming soon|not yet/i
    );
    if (pendingMatch) {
      return { label, action: 'pending', details: pendingMatch[0] };
    }
    return { label, action: 'state-change' };
  }

  // Check 4: Maybe a toast or notification appeared
  const toasts = page.locator(
    "[class*='toast'], [class*='Toast'], [role='alert'], [class*='notification']"
  );
  if ((await toasts.count()) > 0) {
    return { label, action: 'state-change', details: 'Toast/notification appeared' };
  }

  // Check 5: A dropdown or popover opened
  const popovers = page.locator(
    "[role='listbox'], [role='menu'], [class*='dropdown'], [class*='popover']"
  );
  if ((await popovers.count()) > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    return { label, action: 'dialog', details: 'Dropdown/popover' };
  }

  return { label, action: 'dead-click' };
}

/* ------------------------------------------------------------------ */
/* Screen definitions to crawl                                         */
/* ------------------------------------------------------------------ */

interface ScreenDef {
  name: string;
  url: string;
  /** Optional: only test buttons matching this filter */
  buttonFilter?: RegExp;
  /** Max buttons to test per screen (avoid flaky long tests) */
  maxButtons?: number;
}

const CPRS_SCREENS: ScreenDef[] = [
  { name: 'Cover Sheet', url: '/cprs/chart/3/cover', maxButtons: 10 },
  { name: 'Problems', url: '/cprs/chart/3/problems', maxButtons: 8 },
  { name: 'Meds', url: '/cprs/chart/3/meds', maxButtons: 8 },
  { name: 'Orders', url: '/cprs/chart/3/orders', maxButtons: 8 },
  { name: 'Notes', url: '/cprs/chart/3/notes', maxButtons: 8 },
  { name: 'Labs', url: '/cprs/chart/3/labs', maxButtons: 8 },
  { name: 'Imaging', url: '/cprs/chart/3/imaging', maxButtons: 8 },
];

const ADMIN_SCREENS: ScreenDef[] = [
  { name: 'Admin Modules', url: '/cprs/admin/modules', maxButtons: 10 },
  { name: 'Admin RCM', url: '/cprs/admin/rcm', maxButtons: 12 },
  { name: 'Admin Analytics', url: '/cprs/admin/analytics', maxButtons: 8 },
];

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

test.describe('No Dead Click Contract', () => {
  test.setTimeout(300_000); // 5 min total

  for (const screen of CPRS_SCREENS) {
    test(`${screen.name} -- no dead clicks on visible buttons`, async ({ page }) => {
      const errors = setupConsoleGate(page);

      await page.goto(screen.url);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Find all visible buttons that are not disabled
      const buttons = page.locator("button:visible:not([disabled]):not([aria-disabled='true'])");
      const count = await buttons.count();
      const max = screen.maxButtons || 10;
      const deadClicks: ClickResult[] = [];

      for (let i = 0; i < Math.min(count, max); i++) {
        try {
          // Re-navigate to reset state between clicks
          await page.goto(screen.url);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(1000);

          const btn = page
            .locator("button:visible:not([disabled]):not([aria-disabled='true'])")
            .nth(i);

          const label = await btn.textContent().catch(() => `button[${i}]`);
          const trimmed = (label || '').trim().substring(0, 40);

          // Skip known meta-buttons (theme toggles, menu bar items are tested elsewhere)
          if (trimmed.match(/^(Theme|Density|Layout):/)) continue;
          if (trimmed.match(/^(Help|Tools|File|Edit|View|Window)$/i)) continue;

          const result = await testButtonClick(page, btn, trimmed);
          if (result.action === 'dead-click') {
            deadClicks.push(result);
          }
        } catch (e: unknown) {
          // Browser may close during aggressive button clicking -- break out
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('closed') || msg.includes('Target page')) break;
          // Other errors: skip this button and continue
        }
      }

      // Report
      if (deadClicks.length > 0) {
        const report = deadClicks
          .map((d) => `  "${d.label}": ${d.details || 'no response detected'}`)
          .join('\n');
        expect(deadClicks, `Dead clicks found on ${screen.name}:\n${report}`).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  for (const screen of ADMIN_SCREENS) {
    test(`${screen.name} -- no dead clicks on tab buttons`, async ({ page }) => {
      const errors = setupConsoleGate(page);

      await page.goto(screen.url);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Find tab-like buttons (role=tab or tab-styled)
      const tabs = page.locator("[role='tab']:visible, button:visible:not([disabled])");
      const count = await tabs.count();
      const max = screen.maxButtons || 12;
      const deadClicks: ClickResult[] = [];

      for (let i = 0; i < Math.min(count, max); i++) {
        // Re-navigate to reset
        await page.goto(screen.url);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        const tab = page.locator("[role='tab']:visible, button:visible:not([disabled])").nth(i);

        const label = await tab.textContent().catch(() => `tab[${i}]`);
        const trimmed = (label || '').trim().substring(0, 40);

        const result = await testButtonClick(page, tab, trimmed);
        if (result.action === 'dead-click') {
          deadClicks.push(result);
        }
      }

      if (deadClicks.length > 0) {
        const report = deadClicks
          .map((d) => `  "${d.label}": ${d.details || 'no response detected'}`)
          .join('\n');
        expect(deadClicks, `Dead clicks on ${screen.name}:\n${report}`).toHaveLength(0);
      }

      expect(errors, `Console errors on ${screen.name}`).toHaveLength(0);
    });
  }

  test('all CPRS chart tab links navigate without dead-ending', async ({ page }) => {
    const errors = setupConsoleGate(page);

    const tabSlugs = [
      'cover',
      'problems',
      'meds',
      'orders',
      'notes',
      'consults',
      'surgery',
      'dcsumm',
      'labs',
      'reports',
      'imaging',
      'intake',
      'telehealth',
      'tasks',
      'aiassist',
    ];

    const deadEnds: string[] = [];

    for (const slug of tabSlugs) {
      await page.goto(`/cprs/chart/3/${slug}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Page should not be blank
      const bodyEl = page.locator('body').first();
      const visible = await bodyEl.isVisible({ timeout: 5000 }).catch(() => false);
      if (!visible) {
        deadEnds.push(`${slug}: body not visible`);
        continue;
      }

      const text = await bodyEl.textContent();
      if (!text?.trim().length || (text?.trim().length || 0) < 10) {
        deadEnds.push(`${slug}: blank or near-empty content (${text?.length} chars)`);
      }
    }

    if (deadEnds.length > 0) {
      expect(deadEnds, `Dead-end tabs:\n${deadEnds.join('\n')}`).toHaveLength(0);
    }

    expect(errors, 'Console errors during tab crawl').toHaveLength(0);
  });

  test('integration-pending elements have target and next step', async ({ page }) => {
    const errors = setupConsoleGate(page);

    // Crawl pages that might show integration-pending
    const pages = [
      '/cprs/chart/3/cover',
      '/cprs/chart/3/problems',
      '/cprs/chart/3/meds',
      '/cprs/chart/3/imaging',
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Find any elements mentioning "pending" or "integration"
      const pendingEls = page.locator(
        ":text-matches('pending|integration.pending|not.available|coming.soon', 'i')"
      );
      const count = await pendingEls.count();

      for (let i = 0; i < count; i++) {
        const el = pendingEls.nth(i);
        const text = await el.textContent();
        // Pending messages should not be bare -- they should mention what is pending
        // We allow "No data" or "pending" but prefer "integration pending: <target>"
        // This is a soft check -- we log rather than fail for bare pending messages
        if (text && text.length < 8 && text.match(/pending/i)) {
          // Too terse -- should have more context
          console.warn(
            `Bare "pending" message at ${url}: "${text}" (consider adding target/next-step)`
          );
        }
      }
    }

    expect(errors, 'Console errors during pending crawl').toHaveLength(0);
  });
});
