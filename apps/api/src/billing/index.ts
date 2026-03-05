/**
 * Billing barrel export + initialization
 *
 * Phase 284 (Wave 10 P5)
 *
 * SAFETY: Mock billing provider is blocked in non-dev environments.
 * If PLATFORM_RUNTIME_MODE is rc/prod, or DEPLOYMENT_STAGE is demo/pilot/prod,
 * or NODE_ENV is production, BILLING_PROVIDER must be explicitly set to a
 * real provider (e.g. "lago"). The API will refuse to start otherwise.
 */

export * from './types.js';
export { MockBillingProvider, resetMockBillingStores } from './mock-provider.js';
export { LagoBillingProvider } from './lago-provider.js';
export {
  incrementMeter,
  getMeterSnapshot,
  flushMeters,
  startMeteringFlush,
  stopMeteringFlush,
  resetMeteringStore,
} from './metering.js';

import type { BillingProviderType } from './types.js';
import { setBillingProvider } from './types.js';
import { MockBillingProvider } from './mock-provider.js';
import { LagoBillingProvider } from './lago-provider.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Environment guard helpers                                           */
/* ------------------------------------------------------------------ */

/** Stages where mock billing is forbidden. */
const NON_DEV_STAGES = new Set(['demo', 'pilot', 'prod']);

/**
 * Determine whether the current environment forbids mock billing.
 *
 * Returns `true` when ANY of:
 *   - NODE_ENV === 'production'
 *   - PLATFORM_RUNTIME_MODE is 'rc' or 'prod'
 *   - DEPLOYMENT_STAGE is 'demo', 'pilot', or 'prod'
 */
export function isMockBillingForbidden(): boolean {
  if (process.env.NODE_ENV === 'production') return true;

  const runtimeMode = (process.env.PLATFORM_RUNTIME_MODE || '').toLowerCase().trim();
  if (runtimeMode === 'rc' || runtimeMode === 'prod') return true;

  const deployStage = (process.env.DEPLOYMENT_STAGE || '').toLowerCase().trim();
  if (NON_DEV_STAGES.has(deployStage)) return true;

  return false;
}

/**
 * Build a human-readable startup error for misconfigured billing.
 */
function buildBillingConfigError(reason: string): string {
  return [
    `\n========== BILLING MISCONFIGURATION ==========`,
    `ERROR: ${reason}`,
    ``,
    `In demo / pilot / production environments, BILLING_PROVIDER`,
    `must be explicitly set to a real provider (not "mock").`,
    ``,
    `Required env vars:`,
    `  BILLING_PROVIDER=lago          # or another real provider`,
    `  LAGO_API_URL=http://lago:3000  # Lago REST API endpoint`,
    `  LAGO_API_KEY=<your-api-key>    # Lago API key`,
    ``,
    `Detected environment:`,
    `  NODE_ENV              = ${process.env.NODE_ENV ?? '(unset)'}`,
    `  PLATFORM_RUNTIME_MODE = ${process.env.PLATFORM_RUNTIME_MODE ?? '(unset)'}`,
    `  DEPLOYMENT_STAGE      = ${process.env.DEPLOYMENT_STAGE ?? '(unset)'}`,
    `  BILLING_PROVIDER      = ${process.env.BILLING_PROVIDER ?? '(unset — defaults to mock)'}`,
    ``,
    `Example .env for demo/prod:`,
    `  BILLING_PROVIDER=lago`,
    `  LAGO_API_URL=http://lago:3000`,
    `  LAGO_API_KEY=your-lago-api-key`,
    `================================================\n`,
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Public init                                                         */
/* ------------------------------------------------------------------ */

/**
 * Initialize the billing provider based on BILLING_PROVIDER env var.
 * Call once at server startup.
 *
 * SAFETY:
 *   - In rc/prod/demo/pilot: refuses to start with mock provider.
 *   - In dev/test: allows mock but logs a loud warning.
 */
export function initBillingProvider(): void {
  const raw = (process.env.BILLING_PROVIDER || '').trim().toLowerCase();
  const providerType: BillingProviderType = raw === 'lago' ? 'lago' : 'mock';
  const explicitlySet = raw !== '';
  const forbidden = isMockBillingForbidden();

  /* ---- Fail-fast: mock in non-dev ---- */
  if (forbidden && providerType === 'mock') {
    const reason = !explicitlySet
      ? 'BILLING_PROVIDER is not set (defaults to "mock"), which is forbidden in this environment.'
      : 'BILLING_PROVIDER is set to "mock", which is forbidden in this environment.';
    const msg = buildBillingConfigError(reason);
    // Log AND throw — ensures visibility even if error handler swallows throw
    log.error(msg);
    throw new Error(msg);
  }

  /* ---- Instantiate provider ---- */
  switch (providerType) {
    case 'lago':
      setBillingProvider(new LagoBillingProvider());
      log.info('Billing provider initialized', { provider: 'lago' });
      break;
    case 'mock':
    default:
      setBillingProvider(new MockBillingProvider());
      log.warn(
        '\n' +
          '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
          '!! WARNING: Using MOCK billing provider.          !!\n' +
          '!! This is acceptable for development/test ONLY.  !!\n' +
          '!! Set BILLING_PROVIDER=lago for real billing.    !!\n' +
          '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'
      );
      break;
  }
}
