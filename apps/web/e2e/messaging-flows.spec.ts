/**
 * Phase 64 -- E2E: Secure Messaging flow verification.
 *
 * Tests clinician messaging inbox, compose, send, and portal posture.
 * Every click must produce a network request or visible state change.
 * No dead clicks. No fake success.
 */

import { test, expect } from '@playwright/test';

test.describe('Secure Messaging — Clinician Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Session pre-loaded via auth.setup.ts (storageState)
    await page.goto('/cprs/messages');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Inbox tab renders and fetches /messaging/inbox', async ({ page }) => {
    // Inbox tab should be active by default
    const inboxBtn = page.locator('button', { hasText: /inbox/i }).first();
    await expect(inboxBtn).toBeVisible({ timeout: 10_000 });

    // Wait for the fetch to /messaging/inbox
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/messaging/inbox') && r.status() === 200, {
        timeout: 10_000,
      }),
      inboxBtn.click(),
    ]);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('messages');
  });

  test('Compose tab renders form with subject + body + recipients', async ({ page }) => {
    const composeBtn = page.locator('button', { hasText: /compose/i }).first();
    await expect(composeBtn).toBeVisible();
    await composeBtn.click();

    // Subject input
    const subjectInput = page
      .locator("input[placeholder*='Subject'], input[id*='subject']")
      .first();
    await expect(subjectInput).toBeVisible({ timeout: 5_000 });

    // Body textarea
    const bodyInput = page.locator('textarea').first();
    await expect(bodyInput).toBeVisible();

    // Send button
    const sendBtn = page.locator('button', { hasText: /send/i }).first();
    await expect(sendBtn).toBeVisible();
  });

  test('Compose + Send → POST /messaging/compose fires + success UI shown', async ({ page }) => {
    const composeBtn = page.locator('button', { hasText: /compose/i }).first();
    await composeBtn.click();

    // Fill form
    const subjectInput = page
      .locator("input[placeholder*='Subject'], input[id*='subject']")
      .first();
    await subjectInput.fill('Test Message from E2E');

    const bodyInput = page.locator('textarea').first();
    await bodyInput.fill('This is a test message body from Playwright E2E.');

    // Fill recipient (mail group or DUZ)
    const recipientInput = page
      .locator("input[placeholder*='mail group'], input[placeholder*='DUZ']")
      .first();
    if (await recipientInput.isVisible()) {
      await recipientInput.fill('87');
    }

    const sendBtn = page.locator('button', { hasText: /send/i }).first();

    // Intercept the network request
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/messaging/compose') && r.request().method() === 'POST',
        { timeout: 10_000 }
      ),
      sendBtn.click(),
    ]);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBeTruthy();
    expect(body.message.status).toBe('sent');

    // Success indication should appear
    const successText = page.locator('text=/sent|success|synced/i').first();
    await expect(successText).toBeVisible({ timeout: 5_000 });
  });

  test('Sent tab fetches /messaging/sent after composing', async ({ page }) => {
    const sentBtn = page.locator('button', { hasText: /sent/i }).first();
    await expect(sentBtn).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/messaging/sent') && r.status() === 200, {
        timeout: 10_000,
      }),
      sentBtn.click(),
    ]);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('messages');
  });

  test('Mail groups fetch fires on compose tab', async ({ page }) => {
    const composeBtn = page.locator('button', { hasText: /compose/i }).first();

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/messaging/mail-groups'), { timeout: 10_000 }),
      composeBtn.click(),
    ]);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('groups');
  });
});

test.describe('Secure Messaging — Portal Posture', () => {
  test('Portal send → POST /messaging/portal/send or pending with target RPCs', async ({
    page,
  }) => {
    // Navigate to portal messages page
    await page.goto('http://localhost:3002/dashboard/messages');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Check if compose form is visible
    const subjectInput = page
      .locator("input[placeholder*='subject'], input[placeholder*='Subject']")
      .first();
    const bodyInput = page
      .locator("textarea[placeholder*='message'], textarea[placeholder*='Message']")
      .first();

    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Portal test message');
      await bodyInput.fill('Test from portal E2E');

      const sendBtn = page.locator('button', { hasText: /send/i }).first();
      await sendBtn.click();

      // Should get either a success or a pending response with target RPCs
      await page.waitForTimeout(2000);
      const text = await page.textContent('body');
      const hasSendResult =
        (text || '').includes('sent') ||
        (text || '').includes('Sent') ||
        (text || '').includes('pending') ||
        (text || '').includes('integration') ||
        (text || '').includes('DSIC SEND MAIL MSG');
      expect(hasSendResult).toBe(true);
    }
  });
});

test.describe('Secure Messaging — Negative Tests', () => {
  test('POST /messaging/compose with missing fields → 400, not ok:true', async ({ request }) => {
    // Missing subject
    const res1 = await request.post('/messaging/compose', {
      data: { body: 'test', recipients: [{ type: 'user', id: '87', name: 'Test' }] },
    });
    expect(res1.status()).toBe(400);
    const body1 = await res1.json();
    expect(body1.ok).toBe(false);

    // Missing body
    const res2 = await request.post('/messaging/compose', {
      data: { subject: 'test', recipients: [{ type: 'user', id: '87', name: 'Test' }] },
    });
    expect(res2.status()).toBe(400);
    const body2 = await res2.json();
    expect(body2.ok).toBe(false);

    // Missing recipients
    const res3 = await request.post('/messaging/compose', {
      data: { subject: 'test', body: 'test' },
    });
    expect(res3.status()).toBe(400);
    const body3 = await res3.json();
    expect(body3.ok).toBe(false);
  });

  test('POST /messaging/compose with short subject → 400', async ({ request }) => {
    const res = await request.post('/messaging/compose', {
      data: { subject: 'ab', body: 'test', recipients: [{ type: 'user', id: '87', name: 'Test' }] },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('3-65');
  });
});
