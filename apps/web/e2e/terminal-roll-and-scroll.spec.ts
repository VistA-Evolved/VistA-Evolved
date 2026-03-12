/**
 * Roll-and-scroll web terminal — browser smoke
 *
 * Verifies:
 * - Terminal route loads (/cprs/vista-workspace)
 * - Terminal mode can be selected
 * - Terminal component mounts and shows connection status (Connected / Connecting / Disconnected)
 *
 * Does NOT require VistA SSH to be up; we only assert the page and terminal UI exist.
 * For full proof (real session), run manual steps in docs/canonical/terminal/web-terminal-verification.md
 */

import { test, expect } from '@playwright/test';

test.describe('Roll-and-scroll terminal (vista-workspace)', () => {
  test('vista-workspace loads and Terminal mode shows terminal UI', async ({ page }) => {
    await page.goto('/cprs/vista-workspace', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for sidebar and mode buttons
    await page.waitForSelector('text=VistA Workspace', { timeout: 10000 });

    // Click Terminal mode (button or tab that switches to terminal)
    const terminalBtn = page.getByRole('button', { name: /terminal/i }).first();
    await expect(terminalBtn).toBeVisible({ timeout: 5000 });
    await terminalBtn.click();

    // Terminal component should mount: either "VistA Terminal" label or status (Connected/Connecting/Disconnected)
    await expect(
      page.locator('text=VistA Terminal').or(page.locator('text=/Connected|Connecting|Disconnected/'))
    ).toBeVisible({ timeout: 15000 });
  });
});
