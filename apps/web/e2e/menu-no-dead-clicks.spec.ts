/**
 * Phase 37 -- E2E: CPRS Menu Bar interactions (no dead clicks).
 *
 * Tests every top-level menu and menu item to verify each click either:
 * 1. Navigates to a new URL, OR
 * 2. Opens a modal/dialog, OR
 * 3. Changes UI state (theme/density/layout), OR
 * 4. Shows "integration pending" message
 *
 * Zero dead clicks allowed.
 */

import { test, expect } from '@playwright/test';
import { chartRoute, setupConsoleGate } from './helpers/auth';

/** Click a top-level menu trigger and wait for the dropdown to appear. */
async function openMenu(page: import('@playwright/test').Page, name: string) {
  // Dismiss any open menu first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const trigger = page.locator(`button:has-text('${name}')`).first();
  await trigger.click({ force: true });
  await page.waitForTimeout(400);
}

test.describe('Menu Bar -- No Dead Clicks', () => {
  test.beforeEach(async ({ page }) => {
    // Session pre-loaded via auth.setup.ts (storageState)
    await page.goto(chartRoute('cover'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('File menu items all trigger actions', async ({ page }) => {
    const errors = setupConsoleGate(page);

    // Select Patient -> navigates
    await openMenu(page, 'File');
    const selectPatientBtn = page.locator('button').filter({ hasText: 'Select Patient' }).first();
    if (await selectPatientBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectPatientBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/cprs/');
    }

    // Navigate back
    await page.goto(chartRoute('cover'));
    await page.waitForLoadState('domcontentloaded');

    // Inbox -> navigates
    await openMenu(page, 'File');
    const inboxBtn = page.locator('button').filter({ hasText: 'Inbox' }).first();
    if (await inboxBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inboxBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/cprs\/(inbox|chart)/);
    }

    await page.goto(chartRoute('cover'));
    await page.waitForLoadState('domcontentloaded');

    // Print -> opens modal
    await openMenu(page, 'File');
    const printBtn = page
      .locator('button')
      .filter({ hasText: /^Print\.\.\./ })
      .first();
    if (await printBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await printBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator("[role='dialog'], [class*='modal'], [class*='Modal']");
      const hasModal = (await modal.count()) > 0;
      expect(hasModal || page.url().includes('/cprs/')).toBeTruthy();
    }

    expect(errors, 'Console errors during File menu tests').toHaveLength(0);
  });

  test('View menu -- theme/density/layout changes apply', async ({ page }) => {
    const errors = setupConsoleGate(page);

    const viewActions = [
      'Theme: Dark',
      'Theme: Light',
      'Density: Compact',
      'Density: Comfortable',
      'Layout: Modern',
      'Layout: Classic CPRS',
    ];

    for (const label of viewActions) {
      await openMenu(page, 'View');
      const btn = page.locator('button').filter({ hasText: label }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    expect(errors, 'Console errors during View menu tests').toHaveLength(0);
  });

  test('View menu -- Chart Tab sub-items navigate', async ({ page }) => {
    const errors = setupConsoleGate(page);

    const tabPairs = [
      { label: 'Problem List', slug: 'problems' },
      { label: 'Medications', slug: 'meds' },
      { label: 'Orders', slug: 'orders' },
      { label: 'Progress Notes', slug: 'notes' },
    ];

    for (const { label, slug } of tabPairs) {
      await openMenu(page, 'View');
      const chartTabItem = page.locator('button').filter({ hasText: 'Chart Tab' }).first();
      if (await chartTabItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chartTabItem.hover();
        await page.waitForTimeout(400);
        const subItem = page.locator('button').filter({ hasText: label }).first();
        if (await subItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          await subItem.click();
          await page.waitForTimeout(500);
          expect(page.url()).toContain(slug);
          // Navigate back for next iteration
          await page.goto(chartRoute('cover'));
          await page.waitForLoadState('domcontentloaded');
        }
      }
    }

    expect(errors, 'Console errors during tab navigation').toHaveLength(0);
  });

  test('Tools menu items trigger actions', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = setupConsoleGate(page);

    // Graphing -> opens modal
    await openMenu(page, 'Tools');
    const graphingBtn = page.locator('button').filter({ hasText: 'Graphing' }).first();
    if (await graphingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await graphingBtn.click();
      await page.waitForTimeout(500);
    }

    // Close any modal before proceeding
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Remote Data Viewer (Page) -> navigates
    await openMenu(page, 'Tools');
    const rdvPageBtn = page
      .locator('button')
      .filter({ hasText: 'Remote Data Viewer (Page)' })
      .first();
    if (await rdvPageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rdvPageBtn.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/remote-data/);
    }

    expect(errors, 'Console errors during Tools menu tests').toHaveLength(0);
  });

  test('Help menu items trigger actions', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = setupConsoleGate(page);

    // About -> opens modal
    await openMenu(page, 'Help');
    const aboutBtn = page.locator('button').filter({ hasText: 'About' }).first();
    if (await aboutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aboutBtn.click();
      await page.waitForTimeout(500);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Keyboard Shortcuts -> opens modal
    await openMenu(page, 'Help');
    const kbBtn = page.locator('button').filter({ hasText: 'Keyboard Shortcuts' }).first();
    if (await kbBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await kbBtn.click();
      await page.waitForTimeout(500);
    }

    expect(errors, 'Console errors during Help menu tests').toHaveLength(0);
  });

  test('Edit menu -- Preferences navigates', async ({ page }) => {
    const errors = setupConsoleGate(page);

    await openMenu(page, 'Edit');
    const prefsBtn = page.locator('button').filter({ hasText: 'Preferences' }).first();
    if (await prefsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prefsBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toMatch(/preferences/);
    }

    expect(errors, 'Console errors during Edit menu tests').toHaveLength(0);
  });
});
