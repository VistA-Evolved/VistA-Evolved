/**
 * Billing persistence -- PG-backed repository for subscriptions, customers, and invoices.
 *
 * Phase D (SaaS Billing Wiring)
 *
 * All billing state is written to PG for durability across API restarts.
 * The billing provider (Stripe/mock) is the external source of truth;
 * this repo is the local mirror used for fast reads and webhook processing.
 */

import { randomUUID } from 'node:crypto';
import { isPgConfigured, getPgPool } from '../platform/pg/pg-db.js';
import type { Subscription, Invoice } from './types.js';

/* ------------------------------------------------------------------ */
/* Customer                                                            */
/* ------------------------------------------------------------------ */

export interface BillingCustomerRow {
  id: string;
  tenantId: string;
  externalCustomerId: string | null;
  provider: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function upsertCustomer(
  tenantId: string,
  provider: string,
  externalCustomerId?: string,
  email?: string,
): Promise<BillingCustomerRow> {
  if (!isPgConfigured()) {
    return { id: randomUUID(), tenantId, externalCustomerId: externalCustomerId ?? null, provider, email: email ?? null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  const pool = getPgPool();
  const id = randomUUID();
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO billing_customer (id, tenant_id, external_customer_id, provider, email, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (tenant_id) DO UPDATE SET
       external_customer_id = COALESCE(EXCLUDED.external_customer_id, billing_customer.external_customer_id),
       provider = EXCLUDED.provider,
       email = COALESCE(EXCLUDED.email, billing_customer.email),
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [id, tenantId, externalCustomerId ?? null, provider, email ?? null, now],
  );
  const r = result.rows[0];
  return {
    id: r.id,
    tenantId: r.tenant_id,
    externalCustomerId: r.external_customer_id,
    provider: r.provider,
    email: r.email,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getCustomerByTenant(tenantId: string): Promise<BillingCustomerRow | null> {
  if (!isPgConfigured()) return null;
  const pool = getPgPool();
  const result = await pool.query('SELECT * FROM billing_customer WHERE tenant_id = $1', [tenantId]);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    tenantId: r.tenant_id,
    externalCustomerId: r.external_customer_id,
    provider: r.provider,
    email: r.email,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getCustomerByExternalId(externalId: string): Promise<BillingCustomerRow | null> {
  if (!isPgConfigured()) return null;
  const pool = getPgPool();
  const result = await pool.query('SELECT * FROM billing_customer WHERE external_customer_id = $1', [externalId]);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    tenantId: r.tenant_id,
    externalCustomerId: r.external_customer_id,
    provider: r.provider,
    email: r.email,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Subscription                                                        */
/* ------------------------------------------------------------------ */

export interface BillingSubscriptionRow {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: string;
  externalSubscriptionId: string | null;
  provider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function upsertSubscription(
  tenantId: string,
  customerId: string,
  sub: Subscription,
  provider: string,
): Promise<BillingSubscriptionRow> {
  if (!isPgConfigured()) {
    return {
      id: sub.id, tenantId, customerId, planId: sub.planId, status: sub.status,
      externalSubscriptionId: sub.externalId ?? null, provider,
      currentPeriodStart: sub.currentPeriodStart, currentPeriodEnd: sub.currentPeriodEnd,
      trialEnd: sub.trialEnd ?? null, cancelledAt: sub.cancelledAt ?? null,
      createdAt: sub.createdAt, updatedAt: sub.updatedAt,
    };
  }
  const pool = getPgPool();
  const id = sub.id || randomUUID();
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO billing_subscription (id, tenant_id, customer_id, plan_id, status, external_subscription_id, provider,
       current_period_start, current_period_end, trial_end, cancelled_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (tenant_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       status = EXCLUDED.status,
       external_subscription_id = COALESCE(EXCLUDED.external_subscription_id, billing_subscription.external_subscription_id),
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       trial_end = EXCLUDED.trial_end,
       cancelled_at = EXCLUDED.cancelled_at,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [id, tenantId, customerId, sub.planId, sub.status, sub.externalId ?? null, provider,
     sub.currentPeriodStart, sub.currentPeriodEnd, sub.trialEnd ?? null, sub.cancelledAt ?? null,
     now, now],
  );
  const r = result.rows[0];
  return mapSubRow(r);
}

export async function getSubscriptionByTenant(tenantId: string): Promise<BillingSubscriptionRow | null> {
  if (!isPgConfigured()) return null;
  const pool = getPgPool();
  const result = await pool.query(
    'SELECT * FROM billing_subscription WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
    [tenantId],
  );
  if (result.rows.length === 0) return null;
  return mapSubRow(result.rows[0]);
}

export async function getSubscriptionByExternalId(externalId: string): Promise<BillingSubscriptionRow | null> {
  if (!isPgConfigured()) return null;
  const pool = getPgPool();
  const result = await pool.query(
    'SELECT * FROM billing_subscription WHERE external_subscription_id = $1',
    [externalId],
  );
  if (result.rows.length === 0) return null;
  return mapSubRow(result.rows[0]);
}

export async function updateSubscriptionStatus(
  tenantId: string,
  status: string,
  cancelledAt?: string,
): Promise<void> {
  if (!isPgConfigured()) return;
  const pool = getPgPool();
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE billing_subscription SET status=$1, cancelled_at=$2, updated_at=$3 WHERE tenant_id=$4`,
    [status, cancelledAt ?? null, now, tenantId],
  );
}

function mapSubRow(r: any): BillingSubscriptionRow {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    customerId: r.customer_id,
    planId: r.plan_id,
    status: r.status,
    externalSubscriptionId: r.external_subscription_id,
    provider: r.provider,
    currentPeriodStart: r.current_period_start,
    currentPeriodEnd: r.current_period_end,
    trialEnd: r.trial_end,
    cancelledAt: r.cancelled_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Invoice                                                             */
/* ------------------------------------------------------------------ */

export async function upsertInvoice(
  tenantId: string,
  subscriptionId: string,
  inv: Invoice,
): Promise<void> {
  if (!isPgConfigured()) return;
  const pool = getPgPool();
  const id = inv.id || randomUUID();
  await pool.query(
    `INSERT INTO billing_invoice (id, tenant_id, subscription_id, external_invoice_id, amount_cents, currency, status,
       period_start, period_end, paid_at, external_url, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       paid_at = EXCLUDED.paid_at`,
    [id, tenantId, subscriptionId, inv.id, inv.amountCents, inv.currency, inv.status,
     inv.periodStart, inv.periodEnd, inv.paidAt ?? null, inv.externalUrl ?? null,
     new Date().toISOString()],
  );
}

export async function listInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
  if (!isPgConfigured()) return [];
  const pool = getPgPool();
  const result = await pool.query(
    'SELECT * FROM billing_invoice WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
    [tenantId],
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    subscriptionId: r.subscription_id,
    amountCents: r.amount_cents,
    currency: r.currency,
    status: r.status,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    paidAt: r.paid_at,
    externalUrl: r.external_url,
  }));
}
