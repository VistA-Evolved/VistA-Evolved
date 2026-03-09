import type { BillingProvider } from './types.js';
import { MockBillingProvider, getPlans } from './mock-provider.js';
import { StripeBillingProvider } from './stripe-provider.js';
import { log } from '../lib/logger.js';

let provider: BillingProvider | null = null;

export async function initBillingProvider(): Promise<BillingProvider> {
  const providerName = process.env.BILLING_PROVIDER ?? 'mock';

  switch (providerName) {
    case 'stripe':
      if (!process.env.STRIPE_SECRET_KEY) {
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
    provider = new MockBillingProvider();
  }
  return provider;
}

export { getPlans };
export type {
  BillingProvider, SubscriptionPlan, Plan, Subscription, SubscriptionStatus,
  Invoice, InvoiceLineItem, UsageEvent, MeterEvent, MeteringRecord, UsageSummary,
} from './types.js';
