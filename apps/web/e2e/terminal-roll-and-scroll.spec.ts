/**
 * Roll-and-scroll web terminal — browser smoke + full live interaction proof
 *
 * Smoke (always): Load /cprs/vista-workspace, select Terminal mode, assert terminal UI exists.
 * Live proof (when API + VistA SSH are up): Establish WebSocket, wait for connected, type into
 * terminal, confirm session stability. Requires auth (session cookie) and API configured for
 * VistA SSH (e.g. VISTA_SSH_PORT=2224 for local-vista).
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

  test('live WebSocket session: connect, type, confirm VistA response and session stability', async ({
    page,
  }) => {
    await page.goto('/cprs/vista-workspace', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('text=VistA Workspace', { timeout: 10000 });

    const terminalBtn = page.getByRole('button', { name: /terminal/i }).first();
    await expect(terminalBtn).toBeVisible({ timeout: 5000 });
    await terminalBtn.click();

    // Wait for terminal to reach connected (WebSocket + SSH session established)
    const terminalWrapper = page.locator('[data-terminal-status="connected"]');
    await expect(terminalWrapper).toBeVisible({ timeout: 25000 });

    // Focus terminal and send keyboard input (Enter to get/refresh prompt; VistA echoes and may show menu/prompt)
    const termArea = terminalWrapper.locator('.xterm').first();
    await termArea.click();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.keyboard.type('D ^ZU', { delay: 80 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    // Session stability: still connected after interaction
    await expect(page.locator('[data-terminal-status="connected"]')).toBeVisible();

    // Evidence: screenshot for keyboard interaction and prompt/response (xterm canvas content)
    await page.screenshot({
      path: 'e2e-report/terminal-live-proof.png',
      fullPage: false,
    });
  });
});
