/**
 * Clinical Journey Evidence Spec -- Phase 252
 *
 * Captures evidence artifacts (screenshots, network logs) for each
 * clinical journey defined in journey-config.ts.
 *
 * Designed for pilot go-live readiness verification:
 * - Each step produces a named screenshot
 * - Console errors are tracked
 * - Network requests are captured (via NetworkEvidence)
 *
 * Run: npx playwright test clinical-journey-evidence.spec.ts
 */

import { test, expect } from '@playwright/test';
import { loginViaUI, setupConsoleGate } from './helpers/auth';
import { NetworkEvidence } from './helpers/network-evidence';
import { CHART_REVIEW_JOURNEY, ADMIN_POSTURE_JOURNEY } from './helpers/journey-config';
import type { JourneyStep } from './helpers/journey-config';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

/**
 * Execute a journey step and capture evidence
 */
async function executeStep(page: any, step: JourneyStep, journeyId: string, stepIndex: number) {
  if (step.route) {
    await page.goto(step.route, { waitUntil: 'domcontentloaded' });
    // Give the page time to render
    await page.waitForTimeout(1500);
  }

  if (step.screenshot) {
    await page.screenshot({
      path: `e2e-evidence/${journeyId}-${String(stepIndex).padStart(2, '0')}-${step.name}.png`,
      fullPage: true,
    });
  }

  // Verify expectations
  if (step.expectText) {
    const bodyText = await page.textContent('body');
    if (step.expectText instanceof RegExp) {
      expect(bodyText || '').toMatch(step.expectText);
    } else {
      expect(bodyText || '').toContain(step.expectText);
    }
  }

  if (step.expectSelector) {
    await expect(page.locator(step.expectSelector).first()).toBeVisible({
      timeout: 10_000,
    });
  }
}

// --- Chart Review Journey ---
test.describe('Journey: Clinician Chart Review', () => {
  test('login -> patient selection -> chart tabs', async ({ page }) => {
    const errors = setupConsoleGate(page);
    const evidence = new NetworkEvidence(page);
    evidence.start();

    const journey = CHART_REVIEW_JOURNEY;

    // Step 0: Login page
    await executeStep(page, journey.steps[0], journey.id, 0);

    // Step 1: Login
    await loginViaUI(page);
    await page.waitForTimeout(1000);
    if (journey.steps[1].screenshot) {
      await page.screenshot({
        path: `e2e-evidence/${journey.id}-01-${journey.steps[1].name}.png`,
        fullPage: true,
      });
    }

    // Steps 2+: Navigate through chart tabs
    for (let i = 2; i < journey.steps.length; i++) {
      await executeStep(page, journey.steps[i], journey.id, i);
    }

    // Save network evidence
    await evidence.flush(`e2e-evidence/${journey.id}-network.json`);

    // Console error gate (allow benign warnings)
    const realErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning:') && !e.includes('favicon')
    );
    expect(realErrors.length).toBeLessThanOrEqual(2);
  });
});

// --- Admin Posture Journey ---
test.describe('Journey: Admin Posture Check', () => {
  test('admin landing -> integrations -> analytics', async ({ page }) => {
    const errors = setupConsoleGate(page);
    const journey = ADMIN_POSTURE_JOURNEY;

    // Login first
    await page.goto('/');
    await loginViaUI(page);
    await page.waitForTimeout(1000);

    for (let i = 0; i < journey.steps.length; i++) {
      await executeStep(page, journey.steps[i], journey.id, i);
    }

    const realErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning:') && !e.includes('favicon')
    );
    expect(realErrors.length).toBeLessThanOrEqual(2);
  });
});

// --- FHIR API Smoke Journey ---
test.describe('Journey: FHIR R4 Endpoint Smoke', () => {
  test('metadata returns CapabilityStatement', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/fhir/metadata`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.resourceType).toBe('CapabilityStatement');
    expect(body.fhirVersion).toBe('4.0.1');
    expect(body.status).toBe('active');
    expect(body.rest).toBeDefined();
    expect(body.rest.length).toBeGreaterThanOrEqual(1);

    // Verify all 7 resource types declared
    const types = body.rest[0].resource.map((r: any) => r.type);
    for (const rt of [
      'Patient',
      'AllergyIntolerance',
      'Condition',
      'Observation',
      'MedicationRequest',
      'DocumentReference',
      'Encounter',
    ]) {
      expect(types).toContain(rt);
    }
  });

  test('SMART discovery returns valid config', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/.well-known/smart-configuration`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.authorization_endpoint).toBeDefined();
    expect(body.token_endpoint).toBeDefined();
    expect(body.capabilities).toBeDefined();
  });

  test('health/ready/version are accessible', async ({ request }) => {
    for (const path of ['/health', '/ready', '/version']) {
      const resp = await request.get(`${API_BASE}${path}`);
      expect(resp.status()).toBe(200);
    }
  });

  test('unauthenticated clinical endpoints return 401', async ({ request }) => {
    const clinicalPaths = [
      '/vista/patient-search?term=A',
      '/vista/allergies?dfn=46',
      '/vista/vitals?dfn=46',
      '/vista/problems?dfn=46',
      '/vista/medications?dfn=46',
      '/vista/notes?dfn=46',
    ];
    for (const p of clinicalPaths) {
      const resp = await request.get(`${API_BASE}${p}`);
      expect(resp.status()).toBe(401);
    }
  });
});
