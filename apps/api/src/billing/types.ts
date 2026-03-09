export interface SubscriptionPlan {
  id: string;
  name: string;
  entityType: string;
  priceMonthly: number;
  currency: string;
  features: string[];
  maxProviders: number;
  trialDays: number;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled';

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelledAt?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  tenantId: string;
  metric: string;
  quantity: number;
  timestamp: string;
  idempotencyKey?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  externalUrl?: string;
}

export type Plan = SubscriptionPlan;

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
  timestamp: string;
}

export interface UsageSummary {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  counters: Record<MeterEvent, number>;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
}

export interface BillingProvider {
  name: string;

  createSubscription(tenantId: string, planId: string): Promise<Subscription>;
  getSubscription(tenantId: string): Promise<Subscription | null>;
  cancelSubscription(tenantId: string): Promise<Subscription>;
  updateSubscription(tenantId: string, newPlanId: string): Promise<Subscription>;

  recordUsage(event: UsageEvent): Promise<{ ok: boolean }>;
  reportUsage?(record: MeteringRecord): Promise<void>;
  getUsageSummary?(tenantId: string, periodStart: string, periodEnd: string): Promise<UsageSummary>;

  listInvoices(tenantId: string): Promise<Invoice[]>;
  getUpcomingInvoice(tenantId: string): Promise<Invoice | null>;

  handleWebhook(payload: unknown, signature?: string): Promise<{ event: string; tenantId?: string }>;
}
