import type { BillingProvider } from './types.js';
import { MockBillingProvider, getPlans } from './mock-provider.js';
import { StripeBillingProvider } from './stripe-provider.js';
import { log } from '../lib/logger.js';
import { getRuntimeMode } from '../platform/runtime-mode.js';

let provider: BillingProvider | null = null;

/** True when mock billing is blocked (rc/prod modes). */
function blocksMockBilling(): boolean {
  const mode = getRuntimeMode();
  return mode === 'rc' || mode === 'prod';
}

export async function initBillingProvider(): Promise<BillingProvider> {
  const providerName = process.env.BILLING_PROVIDER ?? 'mock';

  // Block mock billing in rc/prod -- fail fast
  if (blocksMockBilling() && (providerName === 'mock' || !providerName)) {
    throw new Error(
      `PLATFORM_RUNTIME_MODE=${getRuntimeMode()} requires a real billing provider. ` +
        `Set BILLING_PROVIDER=stripe (with STRIPE_SECRET_KEY) or BILLING_PROVIDER=lago. ` +
        `Mock billing is only allowed in dev/test modes.`
    );
  }

  switch (providerName) {
    case 'stripe':
      if (!process.env.STRIPE_SECRET_KEY) {
        if (blocksMockBilling()) {
          throw new Error(
            'BILLING_PROVIDER=stripe but STRIPE_SECRET_KEY is not set. ' +
              'Cannot fall back to mock in rc/prod mode.'
          );
        }
        log.warn('BILLING_PROVIDER=stripe but STRIPE_SECRET_KEY not set; falling back to mock');
        provider = new MockBillingProvider();
      } else {
        provider = new StripeBillingProvider();
        log.info('Billing provider initialized: stripe');
      }
      break;
    case 'lago':
      try {
        const { LagoBillingProvider } = await import('./lago-provider.js');
        provider = new LagoBillingProvider();
        log.info('Billing provider initialized: lago');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (blocksMockBilling()) {
          throw new Error(`Failed to load Lago provider: ${msg}. Cannot fall back to mock in rc/prod mode.`);
        }
        log.warn(`Failed to load Lago provider: ${msg}; falling back to mock`);
        provider = new MockBillingProvider();
      }
      break;
    case 'mock':
    default:
      provider = new MockBillingProvider();
      log.info('Billing provider initialized: mock');
      break;
  }

  return provider;
}

export function getBillingProvider(): BillingProvider {
  if (!provider) {
    if (blocksMockBilling()) {
      throw new Error('Billing provider not initialized. Call initBillingProvider() at startup.');
    }
    provider = new MockBillingProvider();
  }
  return provider;
}

/**
 * Resolve a plan ID from an entity type.
 * When STRIPE_PRICE_<ENTITY> env vars are set, maps to Stripe price IDs.
 * Otherwise falls back to the mock plan catalog IDs.
 */
export function resolvePlanId(entityType: string): string {
  // Check for Stripe price ID env var overrides first
  const envKey = `STRIPE_PRICE_${entityType.toUpperCase()}`;
  const stripePrice = process.env[envKey];
  if (stripePrice) return stripePrice;

  // Fall back to mock plan mapping
  const ENTITY_PLAN_MAP: Record<string, string> = {
    SOLO_CLINIC: 'starter',
    GROUP_PRACTICE: 'professional',
    HOSPITAL: 'enterprise',
    HEALTH_SYSTEM: 'health-system',
    GOVERNMENT: 'enterprise',
    SPECIALTY_CENTER: 'specialty',
  };
  return ENTITY_PLAN_MAP[entityType] || 'starter';
}

export { getPlans };
export type {
  BillingProvider, SubscriptionPlan, Plan, Subscription, SubscriptionStatus,
  Invoice, InvoiceLineItem, UsageEvent, MeterEvent, MeteringRecord, UsageSummary,
} from './types.js';
