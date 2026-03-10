/**
 * Webhook Service -- Phase 356
 *
 * HMAC-SHA256 signed webhook delivery with retries, backoff, DLQ.
 * Integrates with the event bus (Phase 355) as a consumer.
 *
 * Security per ADR-WEBHOOK-SECURITY.md:
 * - X-VE-Signature-256: HMAC-SHA256(secret, timestamp.nonce.body)
 * - X-VE-Timestamp: Unix seconds
 * - X-VE-Nonce: UUID v4
 * - Replay protection: 300s window
 */

import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";
import { registerConsumer, type DomainEvent } from "./event-bus.js";

// --- Types -----------------------------------------------

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  /** Secret for HMAC signing -- never log this */
  secret: string;
  /** Event type filters (supports '*' wildcard) */
  eventFilters: string[];
  enabled: boolean;
  retryPolicy: RetryPolicy;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface RetryPolicy {
  maxRetries: number;
  /** Backoff delays in milliseconds */
  backoffMs: number[];
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  tenantId: string;
  url: string;
  status: "pending" | "delivered" | "failed" | "dlq";
  httpStatus?: number;
  attempt: number;
  maxAttempts: number;
  signature: string;
  deliveredAt?: string;
  error?: string;
  createdAt: string;
}

export interface WebhookSignature {
  signature: string;
  timestamp: number;
  nonce: string;
}

// --- Default Retry Policy --------------------------------

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: [5_000, 30_000, 120_000], // 5s, 30s, 2min
};

// --- Stores ----------------------------------------------

const subscriptions: Map<string, WebhookSubscription> = new Map();
const deliveries: WebhookDelivery[] = [];
const webhookDlq: WebhookDelivery[] = [];

const MAX_SUBSCRIPTIONS = 5_000;
const MAX_DELIVERIES = 10_000;
const MAX_DLQ = 5_000;

// --- HMAC Signing ----------------------------------------

/**
 * Generate HMAC-SHA256 signature per ADR-WEBHOOK-SECURITY.md
 * Format: HMAC-SHA256(secret, "${timestamp}.${nonce}.${body}")
 */
export function signWebhookPayload(
  secret: string,
  body: string,
  timestamp?: number,
  nonce?: string,
): WebhookSignature {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const n = nonce ?? randomUUID();
  const data = `${ts}.${n}.${body}`;
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  return { signature, timestamp: ts, nonce: n };
}

/**
 * Verify an HMAC signature (for receivers).
 * Returns true if signature matches and timestamp is within the replay window.
 */
export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string,
  timestamp: number,
  nonce: string,
  replayWindowSec: number = 300,
): { valid: boolean; error?: string } {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > replayWindowSec) {
    return { valid: false, error: "Timestamp outside replay window" };
  }
  const expected = signWebhookPayload(secret, body, timestamp, nonce);
  // Constant-time comparison
  const a = Buffer.from(expected.signature, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return { valid: false, error: "Signature length mismatch" };
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? { valid: true } : { valid: false, error: "Signature mismatch" };
}

// --- Subscription CRUD -----------------------------------

export function createSubscription(
  tenantId: string,
  data: {
    name: string;
    url: string;
    eventFilters: string[];
    retryPolicy?: RetryPolicy;
    metadata?: Record<string, unknown>;
  },
): WebhookSubscription {
  const sub: WebhookSubscription = {
    id: randomUUID(),
    tenantId,
    name: data.name,
    url: data.url,
    secret: randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""),
    eventFilters: data.eventFilters,
    enabled: true,
    retryPolicy: data.retryPolicy || DEFAULT_RETRY_POLICY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: data.metadata || {},
  };
  subscriptions.set(sub.id, sub);
  while (subscriptions.size > MAX_SUBSCRIPTIONS) {
    const oldest = subscriptions.keys().next().value as string;
    subscriptions.delete(oldest);
  }
  // Register as event bus consumer
  registerWebhookConsumer(sub);
  return sub;
}

export function getSubscription(id: string): WebhookSubscription | undefined {
  return subscriptions.get(id);
}

export function listSubscriptions(tenantId: string): WebhookSubscription[] {
  return Array.from(subscriptions.values())
    .filter((s) => s.tenantId === tenantId)
    .map((s) => ({ ...s, secret: "***REDACTED***" })); // Never expose secret in list
}

export function updateSubscription(
  tenantId: string,
  id: string,
  updates: Partial<Pick<WebhookSubscription, "name" | "url" | "eventFilters" | "enabled" | "retryPolicy" | "metadata">>,
): WebhookSubscription | null {
  const sub = subscriptions.get(id);
  if (!sub || sub.tenantId !== tenantId) return null;
  const updated = { ...sub, ...updates, updatedAt: new Date().toISOString() };
  subscriptions.set(id, updated);
  return updated;
}

export function deleteSubscription(tenantId: string, id: string): boolean {
  const sub = subscriptions.get(id);
  if (!sub || sub.tenantId !== tenantId) return false;
  return subscriptions.delete(id);
}

// --- Delivery --------------------------------------------

/**
 * Deliver an event to a webhook subscription.
 * In real production, this would make an HTTP POST. In the sandbox,
 * we record the delivery attempt and simulate success/failure.
 */
async function deliverWebhook(sub: WebhookSubscription, event: DomainEvent): Promise<void> {
  const body = JSON.stringify({
    eventId: event.eventId,
    eventType: event.eventType,
    version: event.version,
    tenantId: event.tenantId,
    subjectRefHash: event.subjectRefHash,
    occurredAt: event.occurredAt,
    payload: event.payload,
    source: event.source,
  });

  const sig = signWebhookPayload(sub.secret, body);

  const delivery: WebhookDelivery = {
    id: randomUUID(),
    subscriptionId: sub.id,
    eventId: event.eventId,
    tenantId: sub.tenantId,
    url: sub.url,
    status: "pending",
    attempt: 1,
    maxAttempts: sub.retryPolicy.maxRetries + 1,
    signature: sig.signature,
    createdAt: new Date().toISOString(),
  };

  // Simulate delivery (in production, this would be fetch())
  // For sandbox: if URL contains "fail", simulate failure
  const simulateFailure = sub.url.includes("fail");

  if (!simulateFailure) {
    delivery.status = "delivered";
    delivery.httpStatus = 200;
    delivery.deliveredAt = new Date().toISOString();
  } else {
    // Simulate retries with backoff
    let succeeded = false;
    for (let i = 0; i < sub.retryPolicy.maxRetries && !succeeded; i++) {
      delivery.attempt = i + 2;
      // In real implementation: await sleep(backoffMs[i]); then retry
      // For sandbox: just record the attempts
    }
    if (!succeeded) {
      delivery.status = "dlq";
      delivery.error = "All retry attempts failed (simulated)";
      webhookDlq.push({ ...delivery });
      if (webhookDlq.length > MAX_DLQ) webhookDlq.splice(0, webhookDlq.length - MAX_DLQ);
    }
  }

  deliveries.push(delivery);
  if (deliveries.length > MAX_DELIVERIES) deliveries.splice(0, deliveries.length - MAX_DELIVERIES);
}

/**
 * Register a webhook subscription as an event bus consumer.
 */
function registerWebhookConsumer(sub: WebhookSubscription): void {
  registerConsumer({
    id: `webhook-${sub.id}`,
    name: `Webhook: ${sub.name}`,
    eventFilters: sub.eventFilters,
    tenantIds: [sub.tenantId],
    handler: async (event: DomainEvent) => {
      if (!sub.enabled) return;
      await deliverWebhook(sub, event);
    },
  });
}

// --- Test Webhook ----------------------------------------

/**
 * Send a test event to a webhook subscription to verify delivery.
 */
export async function testWebhook(subscriptionId: string, tenantId?: string): Promise<{
  ok: boolean;
  delivery?: WebhookDelivery;
  error?: string;
}> {
  const sub = subscriptions.get(subscriptionId);
  if (!sub || (tenantId && sub.tenantId !== tenantId)) {
    return { ok: false, error: "Subscription not found" };
  }

  const testEvent: DomainEvent = {
    eventId: randomUUID(),
    eventType: "webhook.test.v1",
    version: 1,
    tenantId: sub.tenantId,
    subjectRefHash: "test",
    occurredAt: new Date().toISOString(),
    payload: { test: true, message: "Webhook test delivery" },
    source: "webhook-service",
  };

  await deliverWebhook(sub, testEvent);

  const lastDelivery = deliveries[deliveries.length - 1];
  return {
    ok: lastDelivery?.status === "delivered",
    delivery: lastDelivery,
  };
}

// --- Query -----------------------------------------------

export function getWebhookDeliveries(opts?: {
  subscriptionId?: string;
  tenantId?: string;
  status?: string;
  limit?: number;
}): WebhookDelivery[] {
  let result = [...deliveries];
  if (opts?.subscriptionId) result = result.filter((d) => d.subscriptionId === opts.subscriptionId);
  if (opts?.tenantId) result = result.filter((d) => d.tenantId === opts.tenantId);
  if (opts?.status) result = result.filter((d) => d.status === opts.status);
  result = result.reverse();
  if (opts?.limit) result = result.slice(0, opts.limit);
  return result;
}

export function getWebhookDlq(tenantId?: string, limit?: number): WebhookDelivery[] {
  let result = [...webhookDlq];
  if (tenantId) result = result.filter((d) => d.tenantId === tenantId);
  result = result.reverse();
  if (limit) result = result.slice(0, limit);
  return result;
}

export function getWebhookStats(tenantId?: string): {
  subscriptionCount: number;
  deliveryCount: number;
  dlqCount: number;
} {
  const subscriptionCount = tenantId
    ? Array.from(subscriptions.values()).filter((sub) => sub.tenantId === tenantId).length
    : subscriptions.size;
  const deliveryCount = tenantId
    ? deliveries.filter((delivery) => delivery.tenantId === tenantId).length
    : deliveries.length;
  const dlqCount = tenantId
    ? webhookDlq.filter((delivery) => delivery.tenantId === tenantId).length
    : webhookDlq.length;
  return {
    subscriptionCount,
    deliveryCount,
    dlqCount,
  };
}

// --- Reset (testing) -------------------------------------

export function _resetWebhookService(): void {
  subscriptions.clear();
  deliveries.length = 0;
  webhookDlq.length = 0;
}
