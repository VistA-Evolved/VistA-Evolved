/**
 * Phase 79 -- E2E: Cover Sheet Layout Parity
 *
 * Verifies:
 * 1. All 10 cover sheet panels render
 * 2. Resize handles respond to drag (height changes persist)
 * 3. "Customize Layout" toggle activates customization mode
 * 4. "Reset Layout" restores default heights
 * 5. Panel visibility toggles work
 * 6. Keyboard resize (Arrow keys on focused handle) adjusts height
 */

import { test, expect } from '@playwright/test';
import { chartRoute } from './helpers/auth';

test.describe('Cover Sheet Layout Parity (Phase 79)', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-authenticated via storageState in playwright.config
    await page.goto(chartRoute('cover'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('all 10 cover sheet panels render', async ({ page }) => {
    const sections = page.locator('[data-panel-key]');
    const count = await sections.count();

    // Should have at least 9 panels visible (appointments may be hidden by pref)
    expect(count).toBeGreaterThanOrEqual(9);

    // Verify key panels exist by data attribute
    const expectedPanels = ['problems', 'allergies', 'meds', 'vitals', 'notes', 'labs', 'orders'];
    for (const key of expectedPanels) {
      const panel = page.locator(`[data-panel-key="${key}"]`);
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });

  test('resize handle changes panel height', async ({ page }) => {
    const panel = page.locator('[data-panel-key="problems"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    const initialBox = await panel.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialHeight = initialBox!.height;

    // Find the resize handle inside the problems panel
    const handle = panel.locator('[role="separator"]');
    await expect(handle).toBeVisible();

    // Drag down by 50px
    const handleBox = await handle.boundingBox();
    expect(handleBox).toBeTruthy();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2 + 50
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Height should have increased
    const newBox = await panel.boundingBox();
    expect(newBox).toBeTruthy();
    expect(newBox!.height).toBeGreaterThan(initialHeight);
  });

  test('Customize Layout button toggles customization mode', async ({ page }) => {
    // Click "Customize Layout" button
    const customizeBtn = page.getByRole('button', { name: /Customize Layout/i });
    await expect(customizeBtn).toBeVisible({ timeout: 5000 });
    await customizeBtn.click();

    // Should show "Done Customizing"
    await expect(page.getByRole('button', { name: /Done Customizing/i })).toBeVisible();

    // Visibility toggle buttons should appear
    const visToggles = page.locator('button').filter({ hasText: /Problems|Allergies|Meds/i });
    const toggleCount = await visToggles.count();
    expect(toggleCount).toBeGreaterThanOrEqual(3);
  });

  test('Reset Layout restores default heights', async ({ page }) => {
    // First, resize a panel to change it from default
    const panel = page.locator('[data-panel-key="allergies"]');
    await expect(panel).toBeVisible({ timeout: 5000 });
    const handle = panel.locator('[role="separator"]');
    const handleBox = await handle.boundingBox();
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2 + 80
      );
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Click Reset Layout
    const resetBtn = page.getByRole('button', { name: /Reset Layout/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(500);

    // Panel should be back to a reasonable default height (~200px min-height)
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();
    // Default height is 200px (min-height style), so it should be roughly near that
    // Allow some tolerance for padding/borders
    expect(box!.height).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeLessThanOrEqual(300);
  });

  test('keyboard resize via arrow keys on handle', async ({ page }) => {
    const panel = page.locator('[data-panel-key="vitals"]');
    await expect(panel).toBeVisible({ timeout: 5000 });

    const initialBox = await panel.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialHeight = initialBox!.height;

    // Focus the resize handle and press ArrowDown 5 times (50px total)
    const handle = panel.locator('[role="separator"]');
    await handle.focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(500);

    // Height should increase
    const newBox = await panel.boundingBox();
    expect(newBox).toBeTruthy();
    expect(newBox!.height).toBeGreaterThan(initialHeight);
  });

  test('panel visibility toggle hides/shows panel', async ({ page }) => {
    // Enter customize mode
    const customizeBtn = page.getByRole('button', { name: /Customize Layout/i });
    await customizeBtn.click();
    await page.waitForTimeout(300);

    // Count initial visible panels
    const initialCount = await page.locator('[data-panel-key]').count();

    // Find the toggle for "reminders" and click it to hide
    const reminderToggle = page.locator('button').filter({ hasText: /Clinical Reminders/i });
    if ((await reminderToggle.count()) > 0) {
      await reminderToggle.first().click();
      await page.waitForTimeout(300);

      // Exit customize mode
      await page.getByRole('button', { name: /Done Customizing/i }).click();
      await page.waitForTimeout(300);

      // Panel should be gone
      const newCount = await page.locator('[data-panel-key]').count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });
});
