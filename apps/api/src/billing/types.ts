/**
 * SaaS Billing / Metering — Provider-Agnostic Interface
 *
 * Phase 284 (Wave 10 P5)
 *
 * Defines the contract that all billing adapters must implement.
 * Default: MockBillingProvider (dev/test)
 * OSS production: LagoBillingProvider (self-hosted Lago)
 * Swap-ready for Stripe, Kill Bill, or custom.
 *
 * IMPORTANT: Billing data must NOT contain patient information.
 * Tenant ID is the billing dimension — not patients, not users.
 */

/* ------------------------------------------------------------------ */
/* Plan & Subscription domain                                          */
/* ------------------------------------------------------------------ */

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

export interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  /** Monthly base price in cents (USD) */
  basePriceCents: number;
  /** Max physicians included in base price */
  includedPhysicians: number;
  /** Per-physician overage price in cents */
  perPhysicianCents: number;
  /** Max API calls per month (0 = unlimited) */
  apiCallLimit: number;
  /** Whether the plan includes modules beyond base */
  modulesIncluded: string[];
  description: string;
}

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'suspended'
  | 'canceled'
  | 'unpaid';

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string; // ISO 8601
  currentPeriodEnd: string; // ISO 8601
  cancelAtPeriodEnd: boolean;
  trialEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Metering domain                                                     */
/* ------------------------------------------------------------------ */

export type MeterEvent =
  | 'api_call'
  | 'rpc_call'
  | 'physician_active'
  | 'patient_record_access'
  | 'storage_mb'
  | 'fhir_request'
  | 'hl7_message'
  | 'report_generated';

export interface MeteringRecord {
  tenantId: string;
  event: MeterEvent;
  quantity: number;
  timestamp: string; // ISO 8601
  metadata?: Record<string, string>;
}

export interface UsageSummary {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  counters: Record<MeterEvent, number>;
}

/* ------------------------------------------------------------------ */
/* Invoice domain                                                      */
/* ------------------------------------------------------------------ */

export type InvoiceStatus = 'draft' | 'finalized' | 'paid' | 'void' | 'past_due';

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  status: InvoiceStatus;
  amountCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  lineItems: InvoiceLineItem[];
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

/* ------------------------------------------------------------------ */
/* Webhook domain                                                      */
/* ------------------------------------------------------------------ */

export type BillingWebhookEvent =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'invoice.finalized'
  | 'invoice.paid'
  | 'invoice.past_due'
  | 'payment.failed'
  | 'usage.threshold_reached';

export interface BillingWebhookPayload {
  event: BillingWebhookEvent;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Provider interface                                                   */
/* ------------------------------------------------------------------ */

export interface BillingProvider {
  readonly name: string;

  /* ---- Plans ---- */
  listPlans(): Promise<Plan[]>;
  getPlan(planId: string): Promise<Plan | null>;

  /* ---- Subscriptions ---- */
  createSubscription(tenantId: string, planId: string): Promise<Subscription>;
  getSubscription(tenantId: string): Promise<Subscription | null>;
  updateSubscription(tenantId: string, planId: string): Promise<Subscription>;
  cancelSubscription(tenantId: string, cancelAtPeriodEnd?: boolean): Promise<Subscription>;

  /* ---- Metering ---- */
  reportUsage(record: MeteringRecord): Promise<void>;
  getUsageSummary(tenantId: string, periodStart: string, periodEnd: string): Promise<UsageSummary>;

  /* ---- Invoices ---- */
  listInvoices(tenantId: string): Promise<Invoice[]>;
  getCurrentInvoice(tenantId: string): Promise<Invoice | null>;

  /* ---- Health ---- */
  healthCheck(): Promise<{ ok: boolean; provider: string; details?: string }>;
}

/* ------------------------------------------------------------------ */
/* Provider registry                                                    */
/* ------------------------------------------------------------------ */

export type BillingProviderType = 'mock' | 'lago';

let activeProvider: BillingProvider | null = null;

export function setBillingProvider(provider: BillingProvider): void {
  activeProvider = provider;
}

export function getBillingProvider(): BillingProvider {
  if (!activeProvider) {
    throw new Error('Billing provider not initialized. Call setBillingProvider() at startup.');
  }
  return activeProvider;
}
