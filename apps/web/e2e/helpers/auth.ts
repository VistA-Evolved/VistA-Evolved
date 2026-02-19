/**
 * Phase 37 — Reusable auth helper for CPRS web e2e tests.
 *
 * Logs in via the API, stores the cookie, then navigates as authenticated user.
 * Uses env vars for credentials (never hard-coded outside this helper + login page placeholders).
 */

import { type Page, expect } from "@playwright/test";

const API_BASE = process.env.API_URL ?? "http://localhost:3001";

/** Authenticate via API and inject session cookie into the page context. */
export async function loginViaAPI(page: Page): Promise<void> {
  const accessCode = process.env.VISTA_ACCESS_CODE ?? "PROV123";
  const verifyCode = process.env.VISTA_VERIFY_CODE ?? "PROV123!!";

  // Call API login endpoint directly
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { accessCode, verifyCode },
  });
  expect(res.ok(), `Login failed: ${res.status()}`).toBeTruthy();
}

/** Login via the UI form (for testing the login flow itself). */
export async function loginViaUI(page: Page): Promise<void> {
  const accessCode = process.env.VISTA_ACCESS_CODE ?? "PROV123";
  const verifyCode = process.env.VISTA_VERIFY_CODE ?? "PROV123!!";

  await page.goto("/cprs/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  // Fill form
  const accessInput = page.locator("input[type='text']").first();
  const verifyInput = page.locator("input[type='password']").first();
  await accessInput.fill(accessCode);
  await verifyInput.fill(verifyCode);

  // Submit
  await page.locator("button[type='submit']").click();

  // Wait for redirect to patient search
  await page.waitForURL("**/cprs/patient-search**", { timeout: 20_000 });
  // Wait for session to be established (useSession needs to fetch /auth/session)
  await page.waitForTimeout(2000);
}

/** Select a patient by DFN and navigate to chart.
 * @param skipNav If true, expect the page is already on /cprs/patient-search (e.g. after loginViaUI).
 */
export async function selectPatient(page: Page, dfn = "3", skipNav = false): Promise<void> {
  if (!skipNav) {
    await page.goto("/cprs/patient-search");
  }
  await page.waitForLoadState("domcontentloaded");

  // Wait for the page to be ready — look for "Select a Patient" heading
  await page.locator("text=Select a Patient").waitFor({ timeout: 15_000 });

  // Search for patient (don't rely on default patient list being populated)
  const searchInput = page.locator("input[type='text']").first();
  await searchInput.fill("CARTER");
  await page.locator("button[type='submit']").click();

  // Wait for table results to appear
  const table = page.locator("table");
  await table.waitFor({ timeout: 20_000 });

  // Find row whose DFN cell matches exactly
  const row = page.locator(`table tbody tr`).filter({
    has: page.locator(`td:nth-child(2)`, { hasText: new RegExp(`^${dfn}$`) }),
  }).first();
  await row.waitFor({ timeout: 10_000 });
  await row.click();

  // Open chart
  await page.locator("button:has-text('Open Chart')").click();
  await page.waitForURL(`**/cprs/chart/${dfn}/**`, { timeout: 15_000 });
}

/** Collect console errors from a page. Returns array of error messages. */
export function setupConsoleGate(page: Page): string[] {
  const errors: string[] = [];
  // Known benign warnings to ignore
  const ALLOWLIST = [
    "Download the React DevTools",
    "A cookie associated with",
    "Third-party cookie will be blocked",
    "ResizeObserver loop",
    "Failed to load resource: net::ERR_CONNECTION_REFUSED", // API not reachable in some test envs
    "Failed to load resource: the server responded with a status of 4", // expected 4xx from auth/validation
    "Failed to load resource: the server responded with a status of 5", // API 500 from unimplemented/sandbox-limited endpoints
    "blocked by CORS policy", // transient during startup race
    "Hydration", // React hydration warnings in Next.js dev mode
    "Cannot update a component", // React state-update-after-unmount in dev mode
    "Warning:", // React dev warnings (useEffect, etc.)
    "Fast Refresh", // Next.js HMR messages
    "fetch failed", // intermittent fetch failures during page transitions
    "AbortError", // cancelled fetch requests during navigation
  ];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      const benign = ALLOWLIST.some((pattern) => text.includes(pattern));
      if (!benign) {
        errors.push(text);
      }
    }
  });

  return errors;
}
