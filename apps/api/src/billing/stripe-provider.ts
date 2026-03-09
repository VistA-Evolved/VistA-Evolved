import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  BillingProvider,
  Subscription,
  UsageEvent,
  Invoice,
} from './types.js';
import { log } from '../lib/logger.js';

/**
 * Stripe adapter for BillingProvider interface.
 * Requires STRIPE_SECRET_KEY env var to be set.
 *
 * Uses the Stripe REST API directly (no SDK dependency) to minimize
 * bundle size and avoid version pinning issues. When Stripe SDK is added
 * to dependencies, refactor to use the official client.
 */
export class StripeBillingProvider implements BillingProvider {
  name = 'stripe';
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor() {
    this.apiKey = process.env.STRIPE_SECRET_KEY ?? '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

    if (!this.apiKey) {
      log.warn('StripeBillingProvider: STRIPE_SECRET_KEY not set. Operations will fail.');
    }
  }

  private async stripeRequest(
    path: string,
    method: string = 'GET',
    body?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = new URLSearchParams(body).toString();
    }

    const res = await fetch(`${this.baseUrl}${path}`, options);
    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const errMsg = (json.error as Record<string, string>)?.message ?? `Stripe ${res.status}`;
      throw new Error(errMsg);
    }

    return json;
  }

  async createSubscription(tenantId: string, planId: string): Promise<Subscription> {
    const customer = await this.stripeRequest('/customers', 'POST', {
      'metadata[tenantId]': tenantId,
      'metadata[planId]': planId,
    });

    const customerId = customer.id as string;

    const sub = await this.stripeRequest('/subscriptions', 'POST', {
      customer: customerId,
      'items[0][price]': planId,
      trial_period_days: '30',
      'metadata[tenantId]': tenantId,
    });

    return this.mapSubscription(sub, tenantId, planId);
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    const customers = await this.stripeRequest(
      `/customers/search?query=metadata['tenantId']:'${encodeURIComponent(tenantId)}'&limit=1`,
    );
    const custData = (customers.data as Record<string, unknown>[]) ?? [];
    if (custData.length === 0) return null;

    const customerId = custData[0].id as string;
    const subs = await this.stripeRequest(
      `/subscriptions?customer=${customerId}&limit=1&status=all`,
    );
    const subData = (subs.data as Record<string, unknown>[]) ?? [];
    if (subData.length === 0) return null;

    return this.mapSubscription(subData[0], tenantId);
  }

  async cancelSubscription(tenantId: string): Promise<Subscription> {
    const existing = await this.getSubscription(tenantId);
    if (!existing?.externalId) throw new Error('No subscription found');

    const sub = await this.stripeRequest(
      `/subscriptions/${existing.externalId}`,
      'DELETE',
    );
    return this.mapSubscription(sub, tenantId);
  }

  async updateSubscription(tenantId: string, newPlanId: string): Promise<Subscription> {
    const existing = await this.getSubscription(tenantId);
    if (!existing?.externalId) throw new Error('No subscription found');

    const sub = await this.stripeRequest(
      `/subscriptions/${existing.externalId}`,
      'POST',
      { 'items[0][price]': newPlanId },
    );
    return this.mapSubscription(sub, tenantId, newPlanId);
  }

  async recordUsage(event: UsageEvent): Promise<{ ok: boolean }> {
    log.info('Stripe usage event recorded', {
      tenantId: event.tenantId,
      metric: event.metric,
      quantity: event.quantity,
    });
    return { ok: true };
  }

  async listInvoices(tenantId: string): Promise<Invoice[]> {
    const existing = await this.getSubscription(tenantId);
    if (!existing?.externalId) return [];

    const res = await this.stripeRequest(
      `/invoices?subscription=${existing.externalId}&limit=10`,
    );
    const data = (res.data as Record<string, unknown>[]) ?? [];
    return data.map(inv => this.mapInvoice(inv, tenantId));
  }

  async getUpcomingInvoice(tenantId: string): Promise<Invoice | null> {
    try {
      const existing = await this.getSubscription(tenantId);
      if (!existing?.externalId) return null;

      const inv = await this.stripeRequest(
        `/invoices/upcoming?subscription=${existing.externalId}`,
      );
      return this.mapInvoice(inv, tenantId);
    } catch {
      return null;
    }
  }

  async handleWebhook(payload: unknown, signature?: string): Promise<{ event: string; tenantId?: string }> {
    if (this.webhookSecret && signature) {
      this.verifyWebhookSignature(payload, signature);
    } else if (this.webhookSecret) {
      throw new Error('Missing Stripe-Signature header');
    } else {
      log.warn('Stripe webhook: STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
    }

    const body = payload as Record<string, unknown>;
    const eventType = body.type as string;
    const dataObj = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

    const directMeta = (dataObj?.metadata as Record<string, string>) ?? {};
    const subDetailsMeta =
      ((dataObj?.parent as Record<string, unknown>)?.subscription_details as Record<string, unknown>)?.metadata as Record<string, string> | undefined;
    const metadata = directMeta.tenantId ? directMeta : (subDetailsMeta ?? directMeta);

    return { event: eventType, tenantId: metadata.tenantId };
  }

  private verifyWebhookSignature(payload: unknown, signatureHeader: string): void {
    const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    const timestamp = parts['t'];
    const v1Signature = parts['v1'];
    if (!timestamp || !v1Signature) {
      throw new Error('Invalid Stripe-Signature header format');
    }

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadStr}`;
    const expectedSig = createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    const sigBuffer = Buffer.from(v1Signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new Error('Webhook signature verification failed');
    }

    const tolerance = 300;
    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (timestampAge > tolerance) {
      throw new Error('Webhook timestamp too old');
    }
  }

  private mapSubscription(raw: Record<string, unknown>, tenantId: string, planId?: string): Subscription {
    const items = (raw.items as Record<string, unknown>)?.data as Record<string, unknown>[] | undefined;
    const priceId = planId ?? (items?.[0]?.price as Record<string, unknown>)?.id as string ?? '';

    return {
      id: raw.id as string,
      tenantId,
      planId: priceId,
      status: this.mapStatus(raw.status as string),
      currentPeriodStart: new Date(((raw.current_period_start as number) ?? 0) * 1000).toISOString(),
      currentPeriodEnd: new Date(((raw.current_period_end as number) ?? 0) * 1000).toISOString(),
      trialEnd: raw.trial_end ? new Date((raw.trial_end as number) * 1000).toISOString() : undefined,
      cancelledAt: raw.canceled_at ? new Date((raw.canceled_at as number) * 1000).toISOString() : undefined,
      externalId: raw.id as string,
      createdAt: new Date(((raw.created as number) ?? 0) * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private mapStatus(stripeStatus: string): Subscription['status'] {
    const map: Record<string, Subscription['status']> = {
      trialing: 'trialing',
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'suspended',
    };
    return map[stripeStatus] ?? 'active';
  }

  private mapInvoice(raw: Record<string, unknown>, tenantId: string): Invoice {
    return {
      id: raw.id as string,
      tenantId,
      subscriptionId: (raw.subscription as string) ?? '',
      amountCents: (raw.amount_due as number) ?? 0,
      currency: (raw.currency as string) ?? 'usd',
      status: raw.paid ? 'paid' : 'open',
      periodStart: new Date(((raw.period_start as number) ?? 0) * 1000).toISOString(),
      periodEnd: new Date(((raw.period_end as number) ?? 0) * 1000).toISOString(),
      paidAt: raw.status_transitions
        ? new Date((((raw.status_transitions as Record<string, number>).paid_at) ?? 0) * 1000).toISOString()
        : undefined,
      externalUrl: raw.hosted_invoice_url as string | undefined,
    };
  }
}
