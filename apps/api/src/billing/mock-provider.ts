import { randomUUID } from 'node:crypto';
import type {
  BillingProvider,
  Subscription,
  SubscriptionPlan,
  UsageEvent,
  Invoice,
} from './types.js';

const PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    entityType: 'SOLO_CLINIC',
    priceMonthly: 99,
    currency: 'USD',
    features: ['Clinical workflows', 'Scheduling', 'Patient portal', 'Analytics'],
    maxProviders: 10,
    trialDays: 30,
  },
  {
    id: 'professional',
    name: 'Professional',
    entityType: 'MULTI_CLINIC',
    priceMonthly: 499,
    currency: 'USD',
    features: ['Everything in Starter', 'RCM', 'FHIR interop', 'Telehealth', 'AI intake'],
    maxProviders: 100,
    trialDays: 30,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    entityType: 'HOSPITAL',
    priceMonthly: 2000,
    currency: 'USD',
    features: ['Everything in Professional', 'Imaging', 'Multi-department', 'IAM', 'Custom FHIR'],
    maxProviders: 1000,
    trialDays: 30,
  },
  {
    id: 'health-system',
    name: 'Health System',
    entityType: 'HEALTH_SYSTEM',
    priceMonthly: 5000,
    currency: 'USD',
    features: ['Everything in Enterprise', 'Multi-facility', 'HIE', 'Custom integrations', 'SLA'],
    maxProviders: 10000,
    trialDays: 30,
  },
  {
    id: 'specialty',
    name: 'Specialty Center',
    entityType: 'SPECIALTY_CENTER',
    priceMonthly: 399,
    currency: 'USD',
    features: ['Clinical workflows', 'Scheduling', 'Imaging', 'RCM', 'Portal', 'Analytics'],
    maxProviders: 100,
    trialDays: 30,
  },
];

export function getPlans(): SubscriptionPlan[] {
  return PLANS;
}

export class MockBillingProvider implements BillingProvider {
  name = 'mock';

  private subscriptions = new Map<string, Subscription>();
  private usageEvents: UsageEvent[] = [];

  async createSubscription(tenantId: string, planId: string): Promise<Subscription> {
    const plan = PLANS.find(p => p.id === planId) ?? PLANS[0];
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now() + plan.trialDays * 86400_000).toISOString();
    const periodEnd = trialEnd;

    const sub: Subscription = {
      id: `sub_mock_${randomUUID().slice(0, 8)}`,
      tenantId,
      planId: plan.id,
      status: 'trialing',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(tenantId, sub);
    return sub;
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subscriptions.get(tenantId) ?? null;
  }

  async cancelSubscription(tenantId: string): Promise<Subscription> {
    const sub = this.subscriptions.get(tenantId);
    if (!sub) throw new Error(`No subscription for tenant ${tenantId}`);
    sub.status = 'cancelled';
    sub.cancelledAt = new Date().toISOString();
    sub.updatedAt = sub.cancelledAt;
    return sub;
  }

  async updateSubscription(tenantId: string, newPlanId: string): Promise<Subscription> {
    const sub = this.subscriptions.get(tenantId);
    if (!sub) throw new Error(`No subscription for tenant ${tenantId}`);
    sub.planId = newPlanId;
    sub.updatedAt = new Date().toISOString();
    return sub;
  }

  async recordUsage(event: UsageEvent): Promise<{ ok: boolean }> {
    this.usageEvents.push(event);
    return { ok: true };
  }

  async listInvoices(tenantId: string): Promise<Invoice[]> {
    const sub = this.subscriptions.get(tenantId);
    if (!sub) return [];
    return [
      {
        id: `inv_mock_${randomUUID().slice(0, 8)}`,
        tenantId,
        subscriptionId: sub.id,
        amountCents: (PLANS.find(p => p.id === sub.planId)?.priceMonthly ?? 0) * 100,
        currency: 'USD',
        status: sub.status === 'trialing' ? 'draft' : 'paid',
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
      },
    ];
  }

  async getUpcomingInvoice(tenantId: string): Promise<Invoice | null> {
    const invoices = await this.listInvoices(tenantId);
    return invoices[0] ?? null;
  }

  async handleWebhook(payload: unknown): Promise<{ event: string; tenantId?: string }> {
    const body = payload as Record<string, unknown>;
    return { event: (body?.event as string) ?? 'mock.event', tenantId: body?.tenantId as string };
  }
}
