/**
 * Lago Billing Provider — OSS self-hosted adapter
 *
 * Phase 284 (Wave 10 P5)
 *
 * Communicates with Lago REST API (v1) for plan management, subscriptions,
 * usage metering, and invoicing. Zero npm dependencies — uses Node.js
 * fetch (global in Node 18+).
 *
 * Lago runs as a separate Docker container (AGPLv3). Our adapter communicates
 * via HTTP API only — no AGPLv3 copyleft triggered for Apache-2.0 codebase.
 *
 * Env vars:
 *   LAGO_API_URL      — e.g. http://lago:3000 (default)
 *   LAGO_API_KEY      — Lago API key
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
  Invoice,
  InvoiceLineItem,
  MeterEvent,
} from './types.js';

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
/* Mappers: Lago API → our domain types                                */
/* ------------------------------------------------------------------ */

function mapLagoPlan(lagoPlan: any): Plan {
  return {
    id: lagoPlan.lago_id || lagoPlan.code,
    name: lagoPlan.name || lagoPlan.code,
    tier: (lagoPlan.metadata?.tier as any) || 'custom',
    basePriceCents: lagoPlan.amount_cents ?? 0,
    includedPhysicians: parseInt(lagoPlan.metadata?.included_physicians || '0', 10),
    perPhysicianCents: parseInt(lagoPlan.metadata?.per_physician_cents || '0', 10),
    apiCallLimit: parseInt(lagoPlan.metadata?.api_call_limit || '0', 10),
    modulesIncluded: lagoPlan.metadata?.modules_included
      ? (lagoPlan.metadata.modules_included as string).split(',')
      : [],
    description: lagoPlan.description || '',
  };
}

function mapLagoSubscription(lagoSub: any): Subscription {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    pending: 'trialing',
    terminated: 'canceled',
  };
  return {
    id: lagoSub.lago_id || lagoSub.external_id,
    tenantId: lagoSub.external_customer_id,
    planId: lagoSub.plan_code,
    status: statusMap[lagoSub.status] || 'active',
    currentPeriodStart: lagoSub.started_at || new Date().toISOString(),
    currentPeriodEnd: lagoSub.ending_at || '',
    cancelAtPeriodEnd: lagoSub.canceled_at != null,
    createdAt: lagoSub.created_at || new Date().toISOString(),
    updatedAt: lagoSub.updated_at || new Date().toISOString(),
  };
}

function mapLagoInvoice(lagoInv: any): Invoice {
  const statusMap: Record<string, Invoice['status']> = {
    draft: 'draft',
    finalized: 'finalized',
    voided: 'void',
  };
  const lineItems: InvoiceLineItem[] = (lagoInv.fees || []).map((fee: any) => ({
    description: fee.item?.name || fee.description || 'Item',
    quantity: fee.units || 1,
    unitPriceCents: fee.amount_cents || 0,
    amountCents: fee.amount_cents || 0,
  }));

  return {
    id: lagoInv.lago_id,
    tenantId: lagoInv.customer?.external_id || '',
    subscriptionId: lagoInv.subscriptions?.[0]?.lago_id || '',
    status: statusMap[lagoInv.status] || 'draft',
    amountCents: lagoInv.total_amount_cents ?? 0,
    currency: lagoInv.currency || 'USD',
    periodStart: lagoInv.charges_from_datetime || '',
    periodEnd: lagoInv.charges_to_datetime || '',
    lineItems,
    issuedAt: lagoInv.issuing_date || '',
    dueAt: lagoInv.payment_due_date || '',
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
    } catch {
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
      // Customer may already exist — that's fine
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
    } catch {
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

  async cancelSubscription(tenantId: string, cancelAtPeriodEnd = true): Promise<Subscription> {
    const existing = await this.getSubscription(tenantId);
    if (!existing) throw new Error(`No subscription for tenant: ${tenantId}`);

    const resp = await lagoFetch(this.config, `/subscriptions/${existing.id}`, {
      method: 'DELETE',
    });
    const sub = mapLagoSubscription(resp.subscription);
    sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
    return sub;
  }

  /* ---- Metering ---- */
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
    // Lago doesn't have a direct usage summary endpoint — aggregate from events
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

  async getCurrentInvoice(tenantId: string): Promise<Invoice | null> {
    const invoices = await this.listInvoices(tenantId);
    const drafts = invoices.filter((i) => i.status === 'draft');
    return drafts.length > 0 ? drafts[0] : null;
  }

  /* ---- Health ---- */
  async healthCheck(): Promise<import('./types.js').BillingHealthStatus> {
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
