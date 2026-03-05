/**
 * Mock Billing Provider — dev/test default
 *
 * Phase 284 (Wave 10 P5)
 *
 * Returns canned responses for all billing operations.
 * No external dependencies. No PHI.
 * Set BILLING_PROVIDER=mock (or leave unset) to use.
 */

import type {
  BillingProvider,
  Plan,
  Subscription,
  SubscriptionStatus,
  MeteringRecord,
  UsageSummary,
  Invoice,
  MeterEvent,
} from './types.js';

/* ------------------------------------------------------------------ */
/* Built-in plans                                                      */
/* ------------------------------------------------------------------ */

const MOCK_PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Community (Free)',
    tier: 'free',
    basePriceCents: 0,
    includedPhysicians: 2,
    perPhysicianCents: 0,
    apiCallLimit: 10_000,
    modulesIncluded: ['kernel', 'clinical'],
    description: 'Free tier for small practices and evaluation.',
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    tier: 'starter',
    basePriceCents: 29900, // $299/mo
    includedPhysicians: 5,
    perPhysicianCents: 4900, // $49/physician
    apiCallLimit: 100_000,
    modulesIncluded: ['kernel', 'clinical', 'portal', 'scheduling'],
    description: 'Small practice plan with patient portal.',
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    tier: 'professional',
    basePriceCents: 99900, // $999/mo
    includedPhysicians: 25,
    perPhysicianCents: 3900, // $39/physician
    apiCallLimit: 1_000_000,
    modulesIncluded: ['kernel', 'clinical', 'portal', 'scheduling', 'imaging', 'rcm', 'telehealth'],
    description: 'Mid-size practice with imaging and billing.',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    basePriceCents: 499900, // $4,999/mo
    includedPhysicians: 100,
    perPhysicianCents: 2900, // $29/physician
    apiCallLimit: 0, // unlimited
    modulesIncluded: [
      'kernel',
      'clinical',
      'portal',
      'scheduling',
      'imaging',
      'rcm',
      'telehealth',
      'analytics',
      'interop',
      'ai',
      'iam',
    ],
    description: 'Full suite for hospitals and health systems.',
  },
];

/* ------------------------------------------------------------------ */
/* In-memory stores                                                    */
/* ------------------------------------------------------------------ */

const subscriptions = new Map<string, Subscription>();
const usageCounters = new Map<string, Map<MeterEvent, number>>();

function now(): string {
  return new Date().toISOString();
}

function periodEnd(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Provider implementation                                             */
/* ------------------------------------------------------------------ */

export class MockBillingProvider implements BillingProvider {
  readonly name = 'mock';

  async listPlans(): Promise<Plan[]> {
    return [...MOCK_PLANS];
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return MOCK_PLANS.find((p) => p.id === planId) ?? null;
  }

  async createSubscription(tenantId: string, planId: string): Promise<Subscription> {
    const plan = MOCK_PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error(`Unknown plan: ${planId}`);

    const sub: Subscription = {
      id: `sub_mock_${tenantId}_${Date.now()}`,
      tenantId,
      planId,
      status: 'active',
      currentPeriodStart: now(),
      currentPeriodEnd: periodEnd(),
      cancelAtPeriodEnd: false,
      createdAt: now(),
      updatedAt: now(),
    };
    subscriptions.set(tenantId, sub);
    return sub;
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return subscriptions.get(tenantId) ?? null;
  }

  async updateSubscription(tenantId: string, planId: string): Promise<Subscription> {
    const existing = subscriptions.get(tenantId);
    if (!existing) {
      return this.createSubscription(tenantId, planId);
    }
    const updated: Subscription = {
      ...existing,
      planId,
      updatedAt: now(),
    };
    subscriptions.set(tenantId, updated);
    return updated;
  }

  async cancelSubscription(tenantId: string, cancelAtPeriodEnd = true): Promise<Subscription> {
    const existing = subscriptions.get(tenantId);
    if (!existing) throw new Error(`No subscription for tenant: ${tenantId}`);
    const updated: Subscription = {
      ...existing,
      status: cancelAtPeriodEnd ? existing.status : ('canceled' as SubscriptionStatus),
      cancelAtPeriodEnd,
      updatedAt: now(),
    };
    subscriptions.set(tenantId, updated);
    return updated;
  }

  async reportUsage(record: MeteringRecord): Promise<void> {
    let tenantCounters = usageCounters.get(record.tenantId);
    if (!tenantCounters) {
      tenantCounters = new Map();
      usageCounters.set(record.tenantId, tenantCounters);
    }
    const current = tenantCounters.get(record.event) ?? 0;
    tenantCounters.set(record.event, current + record.quantity);
  }

  async getUsageSummary(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<UsageSummary> {
    const tenantCounters = usageCounters.get(tenantId);
    const counters: Record<MeterEvent, number> = {
      api_call: 0,
      rpc_call: 0,
      physician_active: 0,
      patient_record_access: 0,
      storage_mb: 0,
      fhir_request: 0,
      hl7_message: 0,
      report_generated: 0,
    };
    if (tenantCounters) {
      for (const [event, count] of tenantCounters) {
        counters[event] = count;
      }
    }
    return { tenantId, periodStart, periodEnd, counters };
  }

  async listInvoices(_tenantId: string): Promise<Invoice[]> {
    // Mock returns empty — no invoices generated in dev
    return [];
  }

  async getCurrentInvoice(_tenantId: string): Promise<Invoice | null> {
    return null;
  }

  async healthCheck(): Promise<import('./types.js').BillingHealthStatus> {
    return {
      ok: true,
      provider: 'mock',
      healthy: true,
      configuredForProduction: false,
      details: {
        warning: 'Mock billing provider is active. NOT suitable for demo/pilot/production.',
        hint: 'Set BILLING_PROVIDER=lago and configure LAGO_API_URL + LAGO_API_KEY for real billing.',
      },
    };
  }
}

/**
 * Reset mock stores — for testing only.
 */
export function resetMockBillingStores(): void {
  subscriptions.clear();
  usageCounters.clear();
}
