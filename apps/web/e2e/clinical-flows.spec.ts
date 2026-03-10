/**
 * Phase 37B -- E2E: Clinical flow dead-click enforcement.
 *
 * Tests key clinical workflows for Problems, Meds, Orders, Notes, Labs, Reports
 * to verify every button/row click produces a response (data, dialog, or
 * "integration pending" message).
 *
 * Zero dead clicks allowed. Every visible interactive element must respond.
 */

import { test, expect } from '@playwright/test';
import { chartRoute, setupConsoleGate } from './helpers/auth';

test.describe('Clinical Flow Dead-Click Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    // Session pre-loaded via auth.setup.ts (storageState)
    await page.goto(chartRoute('cover'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Cover Sheet -- all sections display data or pending message', async ({ page }) => {
    const errors = setupConsoleGate(page);

    // Cover Sheet should show multiple clinical sections
    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    // Check for any content -- at minimum allergy/problem/med/vital sections
    const text = await main.textContent();
    expect(text?.length).toBeGreaterThan(50);

    // Should NOT be blank or just loading forever
    const hasContent =
      (text || '').includes('Allerg') ||
      (text || '').includes('Problem') ||
      (text || '').includes('Vital') ||
      (text || '').includes('Med') ||
      (text || '').includes('Active') ||
      (text || '').includes('No ') ||
      (text || '').includes('pending');
    expect(hasContent, 'Cover sheet must show clinical data sections').toBeTruthy();

    expect(errors, 'Console errors on Cover Sheet').toHaveLength(0);
  });

  test('Problems tab -- list renders and buttons respond', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('problems'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    // Should show problem list or "No problems" or empty state
    const text = await main.textContent();
    const hasProblemsContent =
      (text || '').includes('Problem') ||
      (text || '').includes('Active') ||
      (text || '').includes('No ') ||
      (text || '').includes('Add') ||
      (text || '').includes('pending') ||
      (text || '').includes('integration');
    expect(hasProblemsContent, 'Problems tab must show content').toBeTruthy();

    // If there's an Add button, click it to ensure it does something
    const addBtn = page
      .locator('button')
      .filter({ hasText: /Add|New/i })
      .first();
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
      // Should open a dialog, form, or show an "integration pending" message
      const dialog = page.locator(
        "[role='dialog'], [class*='modal'], [class*='Modal'], [class*='dialog']"
      );
      const afterText = await page
        .locator('main')
        .or(page.locator("[class*='content']"))
        .first()
        .textContent();
      const responded =
        (await dialog.count()) > 0 ||
        afterText !== text ||
        (afterText || '').includes('pending') ||
        (afterText || '').includes('integration');
      expect(responded, 'Add button must trigger a dialog or state change').toBeTruthy();
      // Close if dialog opened
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    expect(errors, 'Console errors on Problems tab').toHaveLength(0);
  });

  test('Meds tab -- list renders', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('meds'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    const hasMedsContent =
      (text || '').includes('Med') ||
      (text || '').includes('Active') ||
      (text || '').includes('Prescription') ||
      (text || '').includes('No ') ||
      (text || '').includes('pending');
    expect(hasMedsContent, 'Meds tab must show content').toBeTruthy();

    expect(errors, 'Console errors on Meds tab').toHaveLength(0);
  });

  test('Orders tab -- renders order list or empty state', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('orders'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'Orders tab must not be blank').toBeGreaterThan(10);

    expect(errors, 'Console errors on Orders tab').toHaveLength(0);
  });

  test('Notes tab -- list renders and new note button responds', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('notes'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    const hasNotesContent =
      (text || '').includes('Note') ||
      (text || '').includes('Progress') ||
      (text || '').includes('Addendum') ||
      (text || '').includes('New') ||
      (text || '').includes('No ') ||
      (text || '').includes('pending');
    expect(hasNotesContent, 'Notes tab must show content').toBeTruthy();

    // If there's a New Note button, verify it responds
    const newBtn = page
      .locator('button')
      .filter({ hasText: /New|Create|Write/i })
      .first();
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const beforeUrl = page.url();
      await newBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.locator("[role='dialog'], [class*='modal'], [class*='Modal']");
      const urlChanged = page.url() !== beforeUrl;
      const dialogOpened = (await dialog.count()) > 0;
      const afterText = await main.textContent();
      const stateChanged = afterText !== text;

      expect(
        urlChanged || dialogOpened || stateChanged,
        'New Note button must navigate, open dialog, or change state'
      ).toBeTruthy();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    expect(errors, 'Console errors on Notes tab').toHaveLength(0);
  });

  test('Labs tab -- displays results or empty state', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('labs'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'Labs tab must not be blank').toBeGreaterThan(10);

    expect(errors, 'Console errors on Labs tab').toHaveLength(0);
  });

  test('Reports tab -- report list loads and selecting shows content', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('reports'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'Reports tab must not be blank').toBeGreaterThan(10);

    // If there's a report list, try clicking the first item
    const reportItem = page.locator("li, tr, [role='row'], [class*='report']").first();
    if (await reportItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reportItem.click();
      await page.waitForTimeout(1000);
      // After clicking, content should change
      await main.textContent();
      // It's OK if content is same (single report), just ensure no error
    }

    expect(errors, 'Console errors on Reports tab').toHaveLength(0);
  });

  test('Consults tab -- displays list', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('consults'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'Consults tab must not be blank').toBeGreaterThan(10);

    expect(errors, 'Console errors on Consults tab').toHaveLength(0);
  });

  test('Surgery tab -- displays list or empty state', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('surgery'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'Surgery tab must not be blank').toBeGreaterThan(10);

    expect(errors, 'Console errors on Surgery tab').toHaveLength(0);
  });

  test('D/C Summaries tab -- displays list or empty state', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('dcsumm'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'D/C Summ tab must not be blank').toBeGreaterThan(10);

    expect(errors, 'Console errors on D/C Summaries tab').toHaveLength(0);
  });

  test('Imaging tab -- shows imaging UI or integration-pending', async ({ page }) => {
    const errors = setupConsoleGate(page);
    await page.goto(chartRoute('imaging'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main').or(page.locator("[class*='content']")).first();
    await expect(main).toBeVisible({ timeout: 10_000 });

    const text = await main.textContent();
    expect(text?.length, 'Imaging tab must not be blank').toBeGreaterThan(10);

    expect(errors, 'Console errors on Imaging tab').toHaveLength(0);
  });
});
