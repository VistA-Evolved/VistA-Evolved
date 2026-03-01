/**
 * Patient Communications Service — Phase 351
 *
 * PHI-safe notification provider abstraction with consent management.
 * No PHI in notification payloads unless tenant explicitly enables +
 * PATIENT_COMMS_PHI_ENABLED env var is set.
 *
 * ADR: docs/decisions/ADR-PATIENT-NOTIFICATIONS.md
 */

import { randomUUID, createHash } from "node:crypto";

// ─── Types ───────────────────────────────────────────────

export type NotificationChannel = "email" | "sms" | "push" | "portal_inbox" | "voice";
export type NotificationStatus = "queued" | "sent" | "delivered" | "failed" | "bounced";
export type ConsentStatus = "granted" | "denied" | "pending" | "revoked";
export type NotificationCategory =
  | "appointment_reminder"
  | "lab_result_ready"
  | "prescription_ready"
  | "message_received"
  | "billing_statement"
  | "care_plan_update"
  | "telehealth_link"
  | "general"
  | "emergency"
  | "custom";

export interface NotificationProvider {
  id: string;
  name: string;
  channels: NotificationChannel[];
  send(notification: NotificationPayload): Promise<NotificationResult>;
  getStatus?(externalId: string): Promise<NotificationStatus>;
}

export interface NotificationPayload {
  id: string;
  tenantId: string;
  channel: NotificationChannel;
  recipientId: string;
  recipientContact: string;
  category: NotificationCategory;
  templateId: string;
  templateParams: Record<string, string>;
  locale: string;
  metadata: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  externalId: string | null;
  status: NotificationStatus;
  error: string | null;
}

export interface PatientConsent {
  id: string;
  tenantId: string;
  patientDfnHash: string;
  channel: NotificationChannel;
  category: NotificationCategory | "*";
  status: ConsentStatus;
  grantedAt: string | null;
  revokedAt: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  tenantId: string;
  patientDfnHash: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  templateId: string;
  status: NotificationStatus;
  externalId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  locale: string;
  subject: string;
  body: string;
  containsPhi: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── PHI Safety ──────────────────────────────────────────

const PHI_ENABLED = process.env.PATIENT_COMMS_PHI_ENABLED === "true";

export function hashPatientDfn(dfn: string): string {
  return createHash("sha256").update(`patient-comms:${dfn}`).digest("hex").slice(0, 16);
}

export function isPhiAllowed(): boolean {
  return PHI_ENABLED;
}

// ─── Stores ──────────────────────────────────────────────

const providerRegistry = new Map<string, NotificationProvider>();
const consentStore = new Map<string, PatientConsent>();
const notificationLog: NotificationRecord[] = [];
const MAX_NOTIFICATION_LOG_SIZE = 50_000;
const templateStore = new Map<string, NotificationTemplate>();

// ─── Provider Registry ───────────────────────────────────

function pushNotificationRecord(record: NotificationRecord): void {
  notificationLog.push(record);
  if (notificationLog.length > MAX_NOTIFICATION_LOG_SIZE) {
    notificationLog.splice(0, notificationLog.length - MAX_NOTIFICATION_LOG_SIZE);
  }
}

export function registerProvider(provider: NotificationProvider): void {
  providerRegistry.set(provider.id, provider);
}

export function getProvider(id: string): NotificationProvider | undefined {
  return providerRegistry.get(id);
}

export function listProviders(): NotificationProvider[] {
  return Array.from(providerRegistry.values());
}

// ─── Stub Provider (always registered) ───────────────────

const stubProvider: NotificationProvider = {
  id: "stub",
  name: "Stub Provider (dev/test)",
  channels: ["email", "sms", "push", "portal_inbox", "voice"],
  async send(notification: NotificationPayload): Promise<NotificationResult> {
    return {
      success: true,
      externalId: `stub-${notification.id}`,
      status: "sent",
      error: null,
    };
  },
  async getStatus(_externalId: string): Promise<NotificationStatus> {
    return "delivered";
  },
};

// Auto-register stub
registerProvider(stubProvider);

// ─── Consent Management ──────────────────────────────────

export function setConsent(
  tenantId: string,
  patientDfn: string,
  channel: NotificationChannel,
  category: NotificationCategory | "*",
  status: ConsentStatus,
  locale?: string,
): PatientConsent {
  const dfnHash = hashPatientDfn(patientDfn);
  const now = new Date().toISOString();

  // Check for existing consent for this patient+channel+category
  const existingKey = Array.from(consentStore.entries()).find(
    ([, c]) =>
      c.tenantId === tenantId &&
      c.patientDfnHash === dfnHash &&
      c.channel === channel &&
      c.category === category,
  );

  if (existingKey) {
    const existing = existingKey[1];
    existing.status = status;
    existing.updatedAt = now;
    if (status === "granted") existing.grantedAt = now;
    if (status === "revoked") existing.revokedAt = now;
    return existing;
  }

  const consent: PatientConsent = {
    id: randomUUID(),
    tenantId,
    patientDfnHash: dfnHash,
    channel,
    category,
    status,
    grantedAt: status === "granted" ? now : null,
    revokedAt: null,
    locale: locale || "en",
    createdAt: now,
    updatedAt: now,
  };
  consentStore.set(consent.id, consent);
  return consent;
}

export function getConsent(
  tenantId: string,
  patientDfn: string,
  channel: NotificationChannel,
  category: NotificationCategory,
): PatientConsent | undefined {
  const dfnHash = hashPatientDfn(patientDfn);
  // Check specific category first, then wildcard
  const specific = Array.from(consentStore.values()).find(
    (c) =>
      c.tenantId === tenantId &&
      c.patientDfnHash === dfnHash &&
      c.channel === channel &&
      c.category === category &&
      c.status === "granted",
  );
  if (specific) return specific;

  return Array.from(consentStore.values()).find(
    (c) =>
      c.tenantId === tenantId &&
      c.patientDfnHash === dfnHash &&
      c.channel === channel &&
      c.category === "*" &&
      c.status === "granted",
  );
}

export function listConsents(tenantId: string, patientDfn: string): PatientConsent[] {
  const dfnHash = hashPatientDfn(patientDfn);
  return Array.from(consentStore.values()).filter(
    (c) => c.tenantId === tenantId && c.patientDfnHash === dfnHash,
  );
}

export function hasConsent(
  tenantId: string,
  patientDfn: string,
  channel: NotificationChannel,
  category: NotificationCategory,
): boolean {
  return !!getConsent(tenantId, patientDfn, channel, category);
}

// ─── Template Management ─────────────────────────────────

export function createTemplate(
  tenantId: string,
  input: Omit<NotificationTemplate, "id" | "tenantId" | "createdAt" | "updatedAt">,
): NotificationTemplate {
  const now = new Date().toISOString();
  const t: NotificationTemplate = {
    id: randomUUID(),
    tenantId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  // Block PHI templates unless explicitly enabled
  if (t.containsPhi && !PHI_ENABLED) {
    t.containsPhi = false;
    t.body = "[PHI content blocked - PATIENT_COMMS_PHI_ENABLED not set]";
  }

  templateStore.set(t.id, t);
  return t;
}

export function getTemplate(id: string): NotificationTemplate | undefined {
  return templateStore.get(id);
}

export function listTemplates(
  tenantId: string,
  category?: NotificationCategory,
  locale?: string,
): NotificationTemplate[] {
  return Array.from(templateStore.values()).filter(
    (t) =>
      t.tenantId === tenantId &&
      (!category || t.category === category) &&
      (!locale || t.locale === locale),
  );
}

// ─── Send Notification ───────────────────────────────────

export interface SendRequest {
  tenantId: string;
  patientDfn: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  templateId: string;
  templateParams: Record<string, string>;
  locale?: string;
  recipientContact: string;
  providerId?: string;
}

export async function sendNotification(
  request: SendRequest,
): Promise<{ sent: boolean; record: NotificationRecord; reason?: string }> {
  const dfnHash = hashPatientDfn(request.patientDfn);
  const now = new Date().toISOString();

  // Check consent
  if (!hasConsent(request.tenantId, request.patientDfn, request.channel, request.category)) {
    const record: NotificationRecord = {
      id: randomUUID(),
      tenantId: request.tenantId,
      patientDfnHash: dfnHash,
      channel: request.channel,
      category: request.category,
      templateId: request.templateId,
      status: "failed",
      externalId: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: "No consent granted",
      createdAt: now,
    };
    pushNotificationRecord(record);
    return { sent: false, record, reason: "No consent granted" };
  }

  // Check PHI template safety
  const template = templateStore.get(request.templateId);
  if (template?.containsPhi && !PHI_ENABLED) {
    const record: NotificationRecord = {
      id: randomUUID(),
      tenantId: request.tenantId,
      patientDfnHash: dfnHash,
      channel: request.channel,
      category: request.category,
      templateId: request.templateId,
      status: "failed",
      externalId: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: "PHI content blocked",
      createdAt: now,
    };
    pushNotificationRecord(record);
    return { sent: false, record, reason: "PHI content blocked" };
  }

  // Resolve provider
  const providerId = request.providerId || "stub";
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    const record: NotificationRecord = {
      id: randomUUID(),
      tenantId: request.tenantId,
      patientDfnHash: dfnHash,
      channel: request.channel,
      category: request.category,
      templateId: request.templateId,
      status: "failed",
      externalId: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: `Provider '${providerId}' not found`,
      createdAt: now,
    };
    pushNotificationRecord(record);
    return { sent: false, record, reason: `Provider '${providerId}' not found` };
  }

  // Send
  const payload: NotificationPayload = {
    id: randomUUID(),
    tenantId: request.tenantId,
    channel: request.channel,
    recipientId: dfnHash,
    recipientContact: request.recipientContact,
    category: request.category,
    templateId: request.templateId,
    templateParams: request.templateParams,
    locale: request.locale || "en",
    metadata: {},
  };

  try {
    const result = await provider.send(payload);
    const record: NotificationRecord = {
      id: payload.id,
      tenantId: request.tenantId,
      patientDfnHash: dfnHash,
      channel: request.channel,
      category: request.category,
      templateId: request.templateId,
      status: result.status,
      externalId: result.externalId,
      sentAt: result.success ? now : null,
      deliveredAt: null,
      failureReason: result.error,
      createdAt: now,
    };
    pushNotificationRecord(record);
    return { sent: result.success, record };
  } catch (err: any) {
    const record: NotificationRecord = {
      id: payload.id,
      tenantId: request.tenantId,
      patientDfnHash: dfnHash,
      channel: request.channel,
      category: request.category,
      templateId: request.templateId,
      status: "failed",
      externalId: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: err?.message || "Unknown error",
      createdAt: now,
    };
    pushNotificationRecord(record);
    return { sent: false, record, reason: err?.message };
  }
}

// ─── Notification Log ────────────────────────────────────

export function getNotificationLog(
  tenantId: string,
  patientDfn?: string,
  limit?: number,
): NotificationRecord[] {
  let records = notificationLog.filter((r) => r.tenantId === tenantId);
  if (patientDfn) {
    const dfnHash = hashPatientDfn(patientDfn);
    records = records.filter((r) => r.patientDfnHash === dfnHash);
  }
  return records.slice(-(limit || 100));
}

// ─── Store Reset ─────────────────────────────────────────

export function _resetCommsStores(): void {
  consentStore.clear();
  notificationLog.length = 0;
  templateStore.clear();
  // Re-register stub
  providerRegistry.clear();
  registerProvider(stubProvider);
}
