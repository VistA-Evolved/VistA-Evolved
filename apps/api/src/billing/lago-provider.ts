/**
 * Lago Billing Provider -- OSS self-hosted adapter
 *
 * Phase 284 (Wave 10 P5)
 *
 * Communicates with Lago REST API (v1) for plan management, subscriptions,
 * usage metering, and invoicing. Zero npm dependencies -- uses Node.js
 * fetch (global in Node 18+).
 *
 * Lago runs as a separate Docker container (AGPLv3). Our adapter communicates
 * via HTTP API only -- no AGPLv3 copyleft triggered for Apache-2.0 codebase.
 *
 * Env vars:
 *   LAGO_API_URL      -- e.g. http://lago:3000 (default)
 *   LAGO_API_KEY      -- Lago API key
 *
 * IMPORTANT: No PHI in any Lago request. Tenant ID is the billing dimension.
 */

import type {
  BillingProvider,
  Plan,
  Subscription,
  SubscriptionStatus,
  MeteringRecord,
  UsageSummary,
  UsageEvent,
  Invoice,
  MeterEvent,
} from './types.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

interface LagoConfig {
  apiUrl: string;
  apiKey: string;
}

function loadLagoConfig(): LagoConfig {
  const apiUrl = process.env.LAGO_API_URL || 'http://localhost:3000';
  const apiKey = process.env.LAGO_API_KEY || '';
  if (!apiKey) {
    throw new Error('LAGO_API_KEY env var is required for Lago billing provider');
  }
  return { apiUrl: apiUrl.replace(/\/$/, ''), apiKey };
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

async function lagoFetch(
  config: LagoConfig,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<any> {
  const url = `${config.apiUrl}/api/v1${path}`;
  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Lago API ${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`);
  }

  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return resp.json();
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Mappers: Lago API -> our domain types                                */
/* ------------------------------------------------------------------ */

function mapLagoPlan(lagoPlan: any): Plan {
  return {
    id: lagoPlan.lago_id || lagoPlan.code,
    name: lagoPlan.name || lagoPlan.code,
    entityType: (lagoPlan.metadata?.tier as string) || 'custom',
    priceMonthly: (lagoPlan.amount_cents ?? 0) / 100,
    currency: lagoPlan.currency || 'USD',
    features: lagoPlan.metadata?.modules_included
      ? (lagoPlan.metadata.modules_included as string).split(',')
      : [],
    maxProviders: parseInt(lagoPlan.metadata?.included_physicians || '0', 10),
    trialDays: parseInt(lagoPlan.metadata?.trial_days || '0', 10),
  };
}

function mapLagoSubscription(lagoSub: any): Subscription {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    pending: 'trialing',
    terminated: 'cancelled',
  };
  return {
    id: lagoSub.lago_id || lagoSub.external_id,
    tenantId: lagoSub.external_customer_id,
    planId: lagoSub.plan_code,
    status: statusMap[lagoSub.status] || 'active',
    currentPeriodStart: lagoSub.started_at || new Date().toISOString(),
    currentPeriodEnd: lagoSub.ending_at || '',
    cancelledAt: lagoSub.canceled_at || undefined,
    createdAt: lagoSub.created_at || new Date().toISOString(),
    updatedAt: lagoSub.updated_at || new Date().toISOString(),
  };
}

function mapLagoInvoice(lagoInv: any): Invoice {
  const statusMap: Record<string, Invoice['status']> = {
    draft: 'draft',
    finalized: 'open',
    voided: 'void',
  };

  return {
    id: lagoInv.lago_id,
    tenantId: lagoInv.customer?.external_id || '',
    subscriptionId: lagoInv.subscriptions?.[0]?.lago_id || '',
    status: statusMap[lagoInv.status] || 'draft',
    amountCents: lagoInv.total_amount_cents ?? 0,
    currency: lagoInv.currency || 'USD',
    periodStart: lagoInv.charges_from_datetime || '',
    periodEnd: lagoInv.charges_to_datetime || '',
    paidAt: lagoInv.payment_status === 'succeeded' ? lagoInv.updated_at : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Provider implementation                                             */
/* ------------------------------------------------------------------ */

export class LagoBillingProvider implements BillingProvider {
  readonly name = 'lago';
  private config: LagoConfig;

  constructor() {
    this.config = loadLagoConfig();
  }

  /* ---- Plans ---- */
  async listPlans(): Promise<Plan[]> {
    const resp = await lagoFetch(this.config, '/plans');
    return (resp?.plans || []).map(mapLagoPlan);
  }

  async getPlan(planId: string): Promise<Plan | null> {
    try {
      const resp = await lagoFetch(this.config, `/plans/${encodeURIComponent(planId)}`);
      return resp?.plan ? mapLagoPlan(resp.plan) : null;
    } catch (err) {
      log.debug('Lago getPlan failed', { planId, error: String(err) });
      return null;
    }
  }

  /* ---- Subscriptions ---- */
  async createSubscription(tenantId: string, planId: string): Promise<Subscription> {
    // Ensure Lago customer exists
    try {
      await lagoFetch(this.config, '/customers', {
        method: 'POST',
        body: {
          customer: {
            external_id: tenantId,
            name: `Tenant ${tenantId}`,
          },
        },
      });
    } catch {
      // Customer may already exist -- that's fine
    }

    const resp = await lagoFetch(this.config, '/subscriptions', {
      method: 'POST',
      body: {
        subscription: {
          external_customer_id: tenantId,
          plan_code: planId,
          external_id: `sub_${tenantId}_${Date.now()}`,
        },
      },
    });

    return mapLagoSubscription(resp.subscription);
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    try {
      const resp = await lagoFetch(
        this.config,
        `/subscriptions?external_customer_id=${encodeURIComponent(tenantId)}&status=active`
      );
      const subs = resp?.subscriptions || [];
      return subs.length > 0 ? mapLagoSubscription(subs[0]) : null;
    } catch (err) {
      log.debug('Lago getSubscription failed', { tenantId, error: String(err) });
      return null;
    }
  }

  async updateSubscription(tenantId: string, planId: string): Promise<Subscription> {
    const existing = await this.getSubscription(tenantId);
    if (!existing) {
      return this.createSubscription(tenantId, planId);
    }

    const resp = await lagoFetch(this.config, `/subscriptions/${existing.id}`, {
      method: 'PUT',
      body: {
        subscription: {
          plan_code: planId,
        },
      },
    });
    return mapLagoSubscription(resp.subscription);
  }

  async cancelSubscription(tenantId: string): Promise<Subscription> {
    const existing = await this.getSubscription(tenantId);
    if (!existing) throw new Error(`No subscription for tenant: ${tenantId}`);

    const resp = await lagoFetch(this.config, `/subscriptions/${existing.id}`, {
      method: 'DELETE',
    });
    return mapLagoSubscription(resp.subscription);
  }

  /* ---- Usage ---- */
  async recordUsage(event: UsageEvent): Promise<{ ok: boolean }> {
    await lagoFetch(this.config, '/events', {
      method: 'POST',
      body: {
        event: {
          transaction_id: event.idempotencyKey || `${event.tenantId}_${event.metric}_${Date.now()}`,
          external_customer_id: event.tenantId,
          code: event.metric,
          timestamp: Math.floor(new Date(event.timestamp).getTime() / 1000),
          properties: { quantity: event.quantity },
        },
      },
    });
    return { ok: true };
  }

  async reportUsage(record: MeteringRecord): Promise<void> {
    await lagoFetch(this.config, '/events', {
      method: 'POST',
      body: {
        event: {
          transaction_id: `${record.tenantId}_${record.event}_${Date.now()}`,
          external_customer_id: record.tenantId,
          code: record.event,
          timestamp: Math.floor(new Date(record.timestamp).getTime() / 1000),
          properties: {
            quantity: record.quantity,
            ...(record.metadata || {}),
          },
        },
      },
    });
  }

  async getUsageSummary(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<UsageSummary> {
    // Lago doesn't have a direct usage summary endpoint -- aggregate from events
    // For now, return empty counters (Lago handles aggregation internally for invoicing)
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
    return { tenantId, periodStart, periodEnd, counters };
  }

  /* ---- Invoices ---- */
  async listInvoices(tenantId: string): Promise<Invoice[]> {
    const resp = await lagoFetch(
      this.config,
      `/invoices?external_customer_id=${encodeURIComponent(tenantId)}`
    );
    return (resp?.invoices || []).map(mapLagoInvoice);
  }

  async getUpcomingInvoice(tenantId: string): Promise<Invoice | null> {
    const invoices = await this.listInvoices(tenantId);
    const drafts = invoices.filter((i) => i.status === 'draft');
    return drafts.length > 0 ? drafts[0] : null;
  }

  async handleWebhook(payload: unknown, _signature?: string): Promise<{ event: string; tenantId?: string }> {
    const body = payload as any;
    const eventType = body?.webhook_type || body?.event_type || 'unknown';
    const tenantId = body?.object?.external_customer_id
      || body?.invoice?.customer?.external_id
      || body?.subscription?.external_customer_id;
    return { event: `lago.${eventType}`, tenantId: tenantId || undefined };
  }

  /* ---- Health ---- */
  async healthCheck(): Promise<{ ok: boolean; provider: string; healthy: boolean; configuredForProduction: boolean; details: Record<string, unknown> }> {
    const hasApiKey = !!this.config.apiKey;
    const apiUrl = this.config.apiUrl;
    try {
      await lagoFetch(this.config, '/plans?per_page=1');
      return {
        ok: true,
        provider: 'lago',
        healthy: true,
        configuredForProduction: true,
        details: {
          apiUrl,
          apiKeyConfigured: hasApiKey,
          reachable: true,
        },
      };
    } catch (err: any) {
      return {
        ok: false,
        provider: 'lago',
        healthy: false,
        configuredForProduction: hasApiKey,
        details: {
          apiUrl,
          apiKeyConfigured: hasApiKey,
          reachable: false,
          error: (err.message || String(err)).slice(0, 200),
        },
      };
    }
  }
}
