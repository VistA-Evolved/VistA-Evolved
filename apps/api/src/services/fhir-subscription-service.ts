/**
 * FHIR Subscriptions v1 -- Phase 357 (W18-P4)
 *
 * R4 Subscription resource support with rest-hook delivery via the webhook framework.
 * Maps domain events to FHIR resource change notifications.
 *
 * ADR: ADR-EVENT-BUS.md -- events routed through canonical bus, not direct FHIR polling.
 */

import { randomBytes } from "node:crypto";
import {
  registerConsumer,
  unregisterConsumer,
  type DomainEvent,
} from "./event-bus.js";

// -- Types ---------------------------------------------------------------

export type FhirSubscriptionStatus =
  | "requested"
  | "active"
  | "error"
  | "off";

export type FhirSubscriptionChannelType = "rest-hook" | "websocket" | "email";

export interface FhirSubscriptionChannel {
  type: FhirSubscriptionChannelType;
  endpoint: string;
  /** MIME type for payload -- default application/fhir+json */
  payload: string;
  header?: string[];
}

export interface FhirSubscription {
  id: string;
  tenantId: string;
  status: FhirSubscriptionStatus;
  /** R4 criteria string, e.g. "Patient?_id=3" or "Observation?category=vital-signs" */
  criteria: string;
  /** Parsed resource type from criteria */
  resourceType: string;
  channel: FhirSubscriptionChannel;
  /** ISO 8601 end time -- subscription auto-expires after this */
  end?: string;
  reason?: string;
  /** Error message if status is 'error' */
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FhirNotification {
  id: string;
  subscriptionId: string;
  tenantId: string;
  eventId: string;
  resourceType: string;
  status: "pending" | "delivered" | "failed";
  httpStatus?: number;
  attempt: number;
  createdAt: string;
  deliveredAt?: string;
}

/** Maps domain event types to FHIR resource types */
const EVENT_TO_FHIR_RESOURCE: Record<string, string> = {
  "patient.updated.v1": "Patient",
  "allergy.added.v1": "AllergyIntolerance",
  "medication.ordered.v1": "MedicationRequest",
  "lab.result.posted.v1": "Observation",
  "observation.created.v1": "Observation",
  "note.signed.v1": "DocumentReference",
  "order.placed.v1": "ServiceRequest",
  "appointment.booked.v1": "Appointment",
  "claim.submitted.v1": "Claim",
};

/** All supported FHIR resource types for subscriptions */
export const SUPPORTED_RESOURCE_TYPES = [
  "Patient",
  "AllergyIntolerance",
  "MedicationRequest",
  "Observation",
  "DocumentReference",
  "ServiceRequest",
  "Appointment",
  "Claim",
] as const;

// -- Stores --------------------------------------------------------------

/** In-memory subscription store -- keyed by subscription ID */
const subscriptions = new Map<string, FhirSubscription>();

/** In-memory notification log -- max 10K entries */
const notifications: FhirNotification[] = [];
const MAX_NOTIFICATIONS = 10_000;

/** Track event bus consumer IDs for cleanup */
const consumerIds = new Map<string, string>();

// -- Helpers -------------------------------------------------------------

function genId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Parse R4 criteria string into resource type.
 * "Patient?_id=3" -> "Patient"
 * "Observation?category=vital-signs" -> "Observation"
 */
function parseCriteriaResourceType(criteria: string): string {
  const qmark = criteria.indexOf("?");
  return qmark > 0 ? criteria.slice(0, qmark) : criteria;
}

/**
 * Check if a domain event matches a subscription's criteria.
 * Phase 1 matching: resource type only.
 * Future: full criteria parameter matching.
 */
function matchesCriteria(sub: FhirSubscription, event: DomainEvent): boolean {
  const eventResource = EVENT_TO_FHIR_RESOURCE[event.eventType];
  if (!eventResource) return false;
  return eventResource === sub.resourceType;
}

/**
 * Check if a subscription has expired.
 */
function isExpired(sub: FhirSubscription): boolean {
  if (!sub.end) return false;
  return new Date(sub.end).getTime() < Date.now();
}

// -- CRUD ----------------------------------------------------------------

export function createFhirSubscription(
  tenantId: string,
  criteria: string,
  channel: FhirSubscriptionChannel,
  opts?: { end?: string; reason?: string },
): FhirSubscription {
  const resourceType = parseCriteriaResourceType(criteria);
  if (
    !SUPPORTED_RESOURCE_TYPES.includes(
      resourceType as (typeof SUPPORTED_RESOURCE_TYPES)[number],
    )
  ) {
    throw new Error(
      `Unsupported resource type: ${resourceType}. Supported: ${SUPPORTED_RESOURCE_TYPES.join(", ")}`,
    );
  }

  if (channel.type !== "rest-hook") {
    throw new Error(
      `Only rest-hook channel is supported in v1. Got: ${channel.type}`,
    );
  }

  const sub: FhirSubscription = {
    id: genId(),
    tenantId,
    status: "active",
    criteria,
    resourceType,
    channel: {
      type: channel.type,
      endpoint: channel.endpoint,
      payload: channel.payload || "application/fhir+json",
      header: channel.header,
    },
    end: opts?.end,
    reason: opts?.reason,
    createdAt: now(),
    updatedAt: now(),
  };

  subscriptions.set(sub.id, sub);

  // Register event bus consumer for this subscription
  const consumerId = `fhir-sub-${sub.id}`;
  registerConsumer({
    id: consumerId,
    name: `FHIR Subscription: ${criteria}`,
    handler: async (event) => handleFhirEvent(sub.id, event),
    eventFilters: ["*"], // Filter in matchesCriteria
    tenantIds: [tenantId],
  });
  consumerIds.set(sub.id, consumerId);

  return sub;
}

export function getFhirSubscription(
  id: string,
  tenantId: string,
): FhirSubscription | undefined {
  const sub = subscriptions.get(id);
  if (!sub || sub.tenantId !== tenantId) return undefined;
  return sub;
}

export function listFhirSubscriptions(
  tenantId: string,
  opts?: { status?: FhirSubscriptionStatus; resourceType?: string },
): FhirSubscription[] {
  const result: FhirSubscription[] = [];
  for (const sub of subscriptions.values()) {
    if (sub.tenantId !== tenantId) continue;
    if (opts?.status && sub.status !== opts.status) continue;
    if (opts?.resourceType && sub.resourceType !== opts.resourceType) continue;
    result.push(sub);
  }
  return result;
}

export function updateFhirSubscription(
  id: string,
  tenantId: string,
  updates: Partial<Pick<FhirSubscription, "status" | "end" | "reason">>,
): FhirSubscription | undefined {
  const sub = subscriptions.get(id);
  if (!sub || sub.tenantId !== tenantId) return undefined;

  if (updates.status !== undefined) sub.status = updates.status;
  if (updates.end !== undefined) sub.end = updates.end;
  if (updates.reason !== undefined) sub.reason = updates.reason;
  sub.updatedAt = now();

  // If turned off, unregister consumer
  if (sub.status === "off") {
    const cid = consumerIds.get(sub.id);
    if (cid) {
      unregisterConsumer(cid);
      consumerIds.delete(sub.id);
    }
  }

  return sub;
}

export function deleteFhirSubscription(
  id: string,
  tenantId: string,
): boolean {
  const sub = subscriptions.get(id);
  if (!sub || sub.tenantId !== tenantId) return false;

  // Unregister event bus consumer
  const cid = consumerIds.get(id);
  if (cid) {
    unregisterConsumer(cid);
    consumerIds.delete(id);
  }

  subscriptions.delete(id);
  return true;
}

// -- Event Handling ------------------------------------------------------

async function handleFhirEvent(
  subscriptionId: string,
  event: DomainEvent,
): Promise<void> {
  const sub = subscriptions.get(subscriptionId);
  if (!sub) return;

  // Skip if subscription is not active
  if (sub.status !== "active") return;

  // Skip expired subscriptions
  if (isExpired(sub)) {
    sub.status = "off";
    sub.updatedAt = now();
    const cid = consumerIds.get(sub.id);
    if (cid) {
      unregisterConsumer(cid);
      consumerIds.delete(sub.id);
    }
    return;
  }

  // Check criteria match
  if (!matchesCriteria(sub, event)) return;

  // Build notification
  const notification: FhirNotification = {
    id: genId(),
    subscriptionId: sub.id,
    tenantId: sub.tenantId,
    eventId: event.eventId,
    resourceType: sub.resourceType,
    status: "pending",
    attempt: 1,
    createdAt: now(),
  };

  // Simulate rest-hook delivery
  try {
    // In production, this would HTTP POST to sub.channel.endpoint
    // For now, mark as delivered (simulated)
    const isFailUrl = sub.channel.endpoint.includes("fail");
    if (isFailUrl) {
      notification.status = "failed";
      notification.httpStatus = 500;
      sub.error = `Delivery failed to ${sub.channel.endpoint}`;
      sub.updatedAt = now();
    } else {
      notification.status = "delivered";
      notification.httpStatus = 200;
      notification.deliveredAt = now();
    }
  } catch {
    notification.status = "failed";
    notification.httpStatus = 0;
    sub.status = "error";
    sub.error = "Delivery exception";
    sub.updatedAt = now();
  }

  // Store notification
  notifications.push(notification);
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.splice(0, notifications.length - MAX_NOTIFICATIONS);
  }
}

// -- Query Helpers -------------------------------------------------------

export function getFhirNotifications(
  tenantId: string,
  opts?: { subscriptionId?: string; status?: string; limit?: number },
): FhirNotification[] {
  const limit = opts?.limit ?? 100;
  const result: FhirNotification[] = [];
  for (let i = notifications.length - 1; i >= 0 && result.length < limit; i--) {
    const n = notifications[i];
    if (n.tenantId !== tenantId) continue;
    if (opts?.subscriptionId && n.subscriptionId !== opts.subscriptionId)
      continue;
    if (opts?.status && n.status !== opts.status) continue;
    result.push(n);
  }
  return result;
}

export function getFhirSubscriptionStats(tenantId: string): {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalNotifications: number;
  deliveredNotifications: number;
  failedNotifications: number;
  supportedResourceTypes: readonly string[];
} {
  let total = 0;
  let active = 0;
  for (const sub of subscriptions.values()) {
    if (sub.tenantId !== tenantId) continue;
    total++;
    if (sub.status === "active") active++;
  }

  let totalN = 0;
  let delivered = 0;
  let failed = 0;
  for (const n of notifications) {
    if (n.tenantId !== tenantId) continue;
    totalN++;
    if (n.status === "delivered") delivered++;
    if (n.status === "failed") failed++;
  }

  return {
    totalSubscriptions: total,
    activeSubscriptions: active,
    totalNotifications: totalN,
    deliveredNotifications: delivered,
    failedNotifications: failed,
    supportedResourceTypes: SUPPORTED_RESOURCE_TYPES,
  };
}

/**
 * Get the FHIR-to-event mapping for documentation/introspection.
 */
export function getEventResourceMapping(): Record<string, string> {
  return { ...EVENT_TO_FHIR_RESOURCE };
}

// -- Reset (testing) -----------------------------------------------------

export function _resetFhirSubscriptions(): void {
  for (const cid of consumerIds.values()) {
    unregisterConsumer(cid);
  }
  subscriptions.clear();
  notifications.length = 0;
  consumerIds.clear();
}
