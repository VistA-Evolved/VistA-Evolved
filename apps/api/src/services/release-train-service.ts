/**
 * Release Train Governance Service (Phase 371 / W20-P2)
 *
 * Provides:
 * - Release calendar model (scheduled change windows)
 * - Change approval workflow (request -> approve/reject -> deploy)
 * - Canary deployment lifecycle (canary -> promote/rollback)
 * - Maintenance notification comms templates
 * - Rollback automation hooks
 *
 * All stores are in-memory with PG migration targets documented.
 */

import crypto from "node:crypto";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type ReleaseStatus =
  | "scheduled"
  | "pending_approval"
  | "approved"
  | "deploying_canary"
  | "canary_active"
  | "promoting"
  | "deployed"
  | "rolling_back"
  | "rolled_back"
  | "cancelled";

export type ApprovalDecision = "approved" | "rejected";

export type CommsChannel = "email" | "sms" | "in_app" | "webhook";

export interface ChangeWindow {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  /** Cron expression or ISO day-of-week + time range */
  schedule: string;
  /** Duration in minutes */
  durationMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseEvent {
  id: string;
  tenantId: string;
  version: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  changeWindowId: string | null;
  scheduledAt: string | null;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  deployedAt: string | null;
  rolledBackAt: string | null;
  rollbackReason: string | null;
  canaryPercent: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRecord {
  id: string;
  releaseId: string;
  tenantId: string;
  decision: ApprovalDecision;
  decidedBy: string;
  reason: string;
  decidedAt: string;
}

export interface CommsTemplate {
  id: string;
  tenantId: string;
  name: string;
  channel: CommsChannel;
  subject: string;
  body: string;
  /** Trigger: maintenance_start, maintenance_end, incident, rollback */
  trigger: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceNotification {
  id: string;
  tenantId: string;
  releaseId: string;
  templateId: string;
  channel: CommsChannel;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "failed" | "pending";
}

/* ================================================================== */
/* Stores                                                              */
/* ================================================================== */

const changeWindowStore = new Map<string, ChangeWindow>();
const releaseStore = new Map<string, ReleaseEvent>();
const approvalStore = new Map<string, ApprovalRecord>();
const commsTemplateStore = new Map<string, CommsTemplate>();
const notificationStore = new Map<string, MaintenanceNotification>();

const MAX_STORE_SIZE = 10_000;

function uid(): string {
  return crypto.randomBytes(12).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function boundedSet<T>(store: Map<string, T>, key: string, value: T): void {
  if (store.size >= MAX_STORE_SIZE) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, value);
}

/* ================================================================== */
/* Valid transitions                                                    */
/* ================================================================== */

const VALID_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  scheduled: ["pending_approval", "cancelled"],
  pending_approval: ["approved", "cancelled"],
  approved: ["deploying_canary", "deployed", "cancelled"],
  deploying_canary: ["canary_active", "rolling_back", "cancelled"],
  canary_active: ["promoting", "rolling_back"],
  promoting: ["deployed", "rolling_back"],
  deployed: [],
  rolling_back: ["rolled_back"],
  rolled_back: [],
  cancelled: [],
};

/* ================================================================== */
/* Change Windows                                                      */
/* ================================================================== */

export function createChangeWindow(
  tenantId: string,
  input: { name: string; description?: string; schedule: string; durationMinutes: number }
): ChangeWindow {
  const w: ChangeWindow = {
    id: uid(),
    tenantId,
    name: input.name,
    description: input.description || "",
    schedule: input.schedule,
    durationMinutes: input.durationMinutes,
    enabled: true,
    createdAt: now(),
    updatedAt: now(),
  };
  boundedSet(changeWindowStore, w.id, w);
  return w;
}

export function listChangeWindows(tenantId: string): ChangeWindow[] {
  return [...changeWindowStore.values()].filter((w) => w.tenantId === tenantId);
}

export function getChangeWindow(id: string): ChangeWindow | undefined {
  return changeWindowStore.get(id);
}

export function updateChangeWindow(
  id: string,
  patch: Partial<Pick<ChangeWindow, "name" | "description" | "schedule" | "durationMinutes" | "enabled">>
): ChangeWindow | undefined {
  const existing = changeWindowStore.get(id);
  if (!existing) return undefined;
  const updated: ChangeWindow = { ...existing, ...patch, updatedAt: now() };
  changeWindowStore.set(id, updated);
  return updated;
}

export function deleteChangeWindow(id: string): boolean {
  return changeWindowStore.delete(id);
}

/* ================================================================== */
/* Release Events                                                      */
/* ================================================================== */

export function scheduleRelease(
  tenantId: string,
  input: {
    version: string;
    title: string;
    description?: string;
    changeWindowId?: string;
    scheduledAt?: string;
    requestedBy: string;
    canaryPercent?: number;
    metadata?: Record<string, unknown>;
  }
): ReleaseEvent {
  const r: ReleaseEvent = {
    id: uid(),
    tenantId,
    version: input.version,
    title: input.title,
    description: input.description || "",
    status: "scheduled",
    changeWindowId: input.changeWindowId || null,
    scheduledAt: input.scheduledAt || null,
    requestedBy: input.requestedBy,
    approvedBy: null,
    approvedAt: null,
    deployedAt: null,
    rolledBackAt: null,
    rollbackReason: null,
    canaryPercent: input.canaryPercent ?? 10,
    metadata: input.metadata || {},
    createdAt: now(),
    updatedAt: now(),
  };
  boundedSet(releaseStore, r.id, r);
  return r;
}

export function listReleases(tenantId: string): ReleaseEvent[] {
  return [...releaseStore.values()].filter((r) => r.tenantId === tenantId);
}

export function getRelease(id: string): ReleaseEvent | undefined {
  return releaseStore.get(id);
}

function transitionRelease(id: string, target: ReleaseStatus, extra?: Partial<ReleaseEvent>): ReleaseEvent | null {
  const r = releaseStore.get(id);
  if (!r) return null;
  const allowed = VALID_TRANSITIONS[r.status];
  if (!allowed.includes(target)) return null;
  const updated: ReleaseEvent = { ...r, status: target, ...extra, updatedAt: now() };
  releaseStore.set(id, updated);
  return updated;
}

export function requestApproval(id: string): ReleaseEvent | null {
  return transitionRelease(id, "pending_approval");
}

export function approveRelease(id: string, approvedBy: string, reason: string): { release: ReleaseEvent; approval: ApprovalRecord } | null {
  const release = transitionRelease(id, "approved", { approvedBy, approvedAt: now() });
  if (!release) return null;
  const approval: ApprovalRecord = {
    id: uid(),
    releaseId: id,
    tenantId: release.tenantId,
    decision: "approved",
    decidedBy: approvedBy,
    reason,
    decidedAt: now(),
  };
  boundedSet(approvalStore, approval.id, approval);
  return { release, approval };
}

export function rejectRelease(id: string, rejectedBy: string, reason: string): { release: ReleaseEvent; approval: ApprovalRecord } | null {
  const release = transitionRelease(id, "cancelled");
  if (!release) return null;
  const approval: ApprovalRecord = {
    id: uid(),
    releaseId: id,
    tenantId: release.tenantId,
    decision: "rejected",
    decidedBy: rejectedBy,
    reason,
    decidedAt: now(),
  };
  boundedSet(approvalStore, approval.id, approval);
  return { release, approval };
}

export function deployCanary(id: string): ReleaseEvent | null {
  return transitionRelease(id, "deploying_canary");
}

export function activateCanary(id: string): ReleaseEvent | null {
  return transitionRelease(id, "canary_active");
}

export function promoteRelease(id: string): ReleaseEvent | null {
  return transitionRelease(id, "promoting");
}

export function completePromotion(id: string): ReleaseEvent | null {
  return transitionRelease(id, "deployed", { deployedAt: now() });
}

export function rollbackRelease(id: string, reason: string): ReleaseEvent | null {
  return transitionRelease(id, "rolling_back", { rollbackReason: reason });
}

export function completeRollback(id: string): ReleaseEvent | null {
  return transitionRelease(id, "rolled_back", { rolledBackAt: now() });
}

export function cancelRelease(id: string): ReleaseEvent | null {
  return transitionRelease(id, "cancelled");
}

export function getApprovals(releaseId: string): ApprovalRecord[] {
  return [...approvalStore.values()].filter((a) => a.releaseId === releaseId);
}

/* ================================================================== */
/* Comms Templates                                                     */
/* ================================================================== */

export function createCommsTemplate(
  tenantId: string,
  input: { name: string; channel: CommsChannel; subject: string; body: string; trigger: string }
): CommsTemplate {
  const t: CommsTemplate = {
    id: uid(),
    tenantId,
    name: input.name,
    channel: input.channel,
    subject: input.subject,
    body: input.body,
    trigger: input.trigger,
    enabled: true,
    createdAt: now(),
    updatedAt: now(),
  };
  boundedSet(commsTemplateStore, t.id, t);
  return t;
}

export function listCommsTemplates(tenantId: string): CommsTemplate[] {
  return [...commsTemplateStore.values()].filter((t) => t.tenantId === tenantId);
}

export function getCommsTemplate(id: string): CommsTemplate | undefined {
  return commsTemplateStore.get(id);
}

export function updateCommsTemplate(
  id: string,
  patch: Partial<Pick<CommsTemplate, "name" | "subject" | "body" | "trigger" | "enabled">>
): CommsTemplate | undefined {
  const existing = commsTemplateStore.get(id);
  if (!existing) return undefined;
  const updated: CommsTemplate = { ...existing, ...patch, updatedAt: now() };
  commsTemplateStore.set(id, updated);
  return updated;
}

export function deleteCommsTemplate(id: string): boolean {
  return commsTemplateStore.delete(id);
}

/* ================================================================== */
/* Maintenance Notifications                                           */
/* ================================================================== */

export function sendMaintenanceNotification(
  tenantId: string,
  releaseId: string,
  templateId: string
): MaintenanceNotification | null {
  const tmpl = commsTemplateStore.get(templateId);
  if (!tmpl || !tmpl.enabled) return null;
  const release = releaseStore.get(releaseId);
  if (!release) return null;

  // Interpolate template variables
  const body = tmpl.body
    .replace(/\{\{version\}\}/g, release.version)
    .replace(/\{\{title\}\}/g, release.title)
    .replace(/\{\{scheduledAt\}\}/g, release.scheduledAt || "TBD")
    .replace(/\{\{status\}\}/g, release.status);

  const subject = tmpl.subject
    .replace(/\{\{version\}\}/g, release.version)
    .replace(/\{\{title\}\}/g, release.title);

  const notif: MaintenanceNotification = {
    id: uid(),
    tenantId,
    releaseId,
    templateId,
    channel: tmpl.channel,
    subject,
    body,
    sentAt: now(),
    status: "sent", // In production, this would be async
  };
  boundedSet(notificationStore, notif.id, notif);
  return notif;
}

export function listNotifications(tenantId: string): MaintenanceNotification[] {
  return [...notificationStore.values()].filter((n) => n.tenantId === tenantId);
}

/* ================================================================== */
/* Simulation helper (for verification)                                */
/* ================================================================== */

export function simulateReleaseCycle(tenantId: string, requestedBy: string): {
  release: ReleaseEvent;
  approval: ApprovalRecord;
  notification: MaintenanceNotification | null;
  finalStatus: ReleaseStatus;
} {
  // 1. Create comms template
  const tmpl = createCommsTemplate(tenantId, {
    name: "Maintenance Notice",
    channel: "in_app",
    subject: "Maintenance: {{title}} v{{version}}",
    body: "Scheduled maintenance for {{title}} v{{version}} at {{scheduledAt}}. Status: {{status}}.",
    trigger: "maintenance_start",
  });

  // 2. Schedule release
  const release = scheduleRelease(tenantId, {
    version: "1.0.0-rc.1",
    title: "GA Release Candidate",
    description: "First GA release candidate",
    requestedBy,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    canaryPercent: 10,
  });

  // 3. Request approval
  requestApproval(release.id);

  // 4. Approve
  const result = approveRelease(release.id, requestedBy, "Approved for GA");
  if (!result) throw new Error("Approval failed");

  // 5. Send notification
  const notif = sendMaintenanceNotification(tenantId, release.id, tmpl.id);

  // 6. Deploy canary -> activate -> promote -> complete
  deployCanary(release.id);
  activateCanary(release.id);
  promoteRelease(release.id);
  completePromotion(release.id);

  const final = getRelease(release.id)!;
  return {
    release: final,
    approval: result.approval,
    notification: notif,
    finalStatus: final.status,
  };
}
