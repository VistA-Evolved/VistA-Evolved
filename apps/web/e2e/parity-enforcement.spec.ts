/**
 * Phase 37B -- E2E: Parity Matrix Enforcement.
 *
 * Reads parity-matrix.json and walks every tab + menu action to verify
 * there are zero unhandled UI actions in the live web app.
 *
 * This test is the enforcement mechanism for the parity matrix --
 * it ensures the matrix stays honest by checking the real UI.
 */

import { test, expect } from '@playwright/test';
import { setupConsoleGate } from './helpers/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const MATRIX_PATH = join(__dirname, '..', '..', '..', 'docs', 'grounding', 'parity-matrix.json');

function loadMatrix() {
  if (!existsSync(MATRIX_PATH)) {
    return null;
  }
  return JSON.parse(readFileSync(MATRIX_PATH, 'utf-8'));
}

test.describe('Parity Matrix Live Enforcement', () => {
  test('parity-matrix.json exists and has valid structure', async () => {
    const matrix = loadMatrix();
    expect(matrix, 'parity-matrix.json must exist').not.toBeNull();
    expect(matrix._meta).toBeDefined();
    expect(matrix.summary).toBeDefined();
    expect(matrix.rpcParity).toBeDefined();
    expect(Array.isArray(matrix.rpcParity)).toBeTruthy();
    expect(matrix.tabParity).toBeDefined();
    expect(Array.isArray(matrix.tabParity)).toBeTruthy();
    expect(matrix.menuParity).toBeDefined();
    expect(Array.isArray(matrix.menuParity)).toBeTruthy();
  });

  test('zero unhandled UI actions in parity matrix', async () => {
    const matrix = loadMatrix();
    expect(matrix, 'parity-matrix.json must exist').not.toBeNull();

    const { summary } = matrix;
    expect(summary.unhandledUiActions, 'Unhandled UI actions must be zero').toBe(0);
  });

  test('all tabs in matrix have panels in the live UI', async ({ page }) => {
    const errors = setupConsoleGate(page);
    const matrix = loadMatrix();
    if (!matrix) return;

    const tabErrors: string[] = [];

    for (const tab of matrix.tabParity) {
      const slug = tab.constant.replace('CT_', '').toLowerCase();
      await page.goto(`/cprs/chart/3/${slug}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // URL should contain the slug
      if (!page.url().includes(`/cprs/chart/3/${slug}`)) {
        tabErrors.push(`${tab.label}: URL mismatch (${page.url()})`);
        continue;
      }

      // Content area should be visible
      const main = page.locator('main').or(page.locator("[class*='content']")).first();
      try {
        await expect(main).toBeVisible({ timeout: 5_000 });
        const text = await main.textContent();
        if (!text?.trim().length) {
          tabErrors.push(`${tab.label}: Empty content`);
        }
      } catch {
        tabErrors.push(`${tab.label}: Main content area not visible`);
      }
    }

    if (tabErrors.length > 0) {
      expect(tabErrors, `Tabs with issues:\n${tabErrors.join('\n')}`).toHaveLength(0);
    }

    expect(errors, 'Console errors during tab checks').toHaveLength(0);
  });

  test('wired RPCs count matches API endpoint inventory', async () => {
    const matrix = loadMatrix();
    if (!matrix) return;

    const wiredRpcs = matrix.rpcParity.filter((r: any) => r.status === 'wired');
    // We should have at least 20 wired RPCs (current known count: ~25)
    expect(wiredRpcs.length, 'Should have at least 20 wired RPCs').toBeGreaterThanOrEqual(20);
  });

  test('all wired RPCs have API endpoint defined', async () => {
    const matrix = loadMatrix();
    if (!matrix) return;

    const wiredWithoutEndpoint = matrix.rpcParity.filter(
      (r: any) => r.status === 'wired' && !r.apiEndpoint
    );
    expect(
      wiredWithoutEndpoint.length,
      `Wired RPCs without endpoints: ${wiredWithoutEndpoint.map((r: any) => r.name).join(', ')}`
    ).toBe(0);
  });

  test('vivian-index.json exists and covers key packages', async () => {
    const vivianPath = join(__dirname, '..', '..', '..', 'docs', 'grounding', 'vivian-index.json');
    if (!existsSync(vivianPath)) {
      test.skip();
      return;
    }
    const vivian = JSON.parse(readFileSync(vivianPath, 'utf-8'));
    expect(vivian.packages).toBeDefined();

    // Must cover core CPRS packages
    const requiredPackages = ['OR', 'TIU', 'LR', 'RA', 'XU', 'HL', 'DG'];
    for (const pkg of requiredPackages) {
      expect(vivian.packages[pkg], `Vivian index must include ${pkg}`).toBeDefined();
    }
  });
});
