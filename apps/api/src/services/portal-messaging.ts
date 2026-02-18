/**
 * Portal Secure Messaging — Phase 27
 *
 * Threaded inbox + compose + drafts + sent.
 * In-memory store for dev mode. Production: VistA MailMan or TIU integration.
 *
 * VistA integration mapping (target):
 * - XMXAPI: Send message via MailMan
 * - XMXMSGS: List messages
 * - TIU DOCUMENTS BY CONTEXT: For clinical document-linked messages
 *
 * Attachments: stored in segregated in-memory buffer.
 * Production: encrypted filesystem or object storage.
 */

import { randomBytes } from "node:crypto";
import { portalAudit } from "./portal-audit.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type MessageCategory = "general" | "appointment" | "medication" | "test_result" | "education";
export type MessageStatus = "draft" | "sent" | "read" | "replied" | "archived";

export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  // In production, this would be a secure storage reference
  // For dev, we store base64 in memory (capped at 5MB per attachment)
  data: string; // base64
}

export interface PortalMessage {
  id: string;
  threadId: string;
  fromDfn: string;
  fromName: string;
  toDfn: string;        // "clinic" for patient→clinic, patient DFN for clinic→patient
  toName: string;
  subject: string;
  category: MessageCategory;
  body: string;
  status: MessageStatus;
  attachments: MessageAttachment[];
  createdAt: string;
  readAt: string | null;
  replyToId: string | null;
  /** VistA integration status */
  vistaSync: "not_synced" | "pending" | "synced" | "failed";
  vistaRef: string | null; // MailMan message IEN when synced
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const MAX_BODY_LENGTH = 10000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS_PER_MSG = 3;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/gif"]);

export const SLA_DISCLAIMER =
  "This messaging system is for non-urgent communication only. " +
  "If you have a medical emergency, call 911. " +
  "Messages are typically reviewed within 2 business days. " +
  "Response times may vary based on clinic staffing.";

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const messageStore = new Map<string, PortalMessage>();
let msgSeq = 0;

/* ------------------------------------------------------------------ */
/* CRUD                                                                 */
/* ------------------------------------------------------------------ */

export function createDraft(opts: {
  fromDfn: string;
  fromName: string;
  subject: string;
  category: MessageCategory;
  body: string;
  replyToId?: string;
}): PortalMessage {
  const id = `msg-${++msgSeq}-${randomBytes(4).toString("hex")}`;
  const threadId = opts.replyToId
    ? (messageStore.get(opts.replyToId)?.threadId || id)
    : id;

  const msg: PortalMessage = {
    id,
    threadId,
    fromDfn: opts.fromDfn,
    fromName: opts.fromName,
    toDfn: "clinic",
    toName: "Care Team",
    subject: opts.subject.slice(0, 200),
    category: opts.category,
    body: opts.body.slice(0, MAX_BODY_LENGTH),
    status: "draft",
    attachments: [],
    createdAt: new Date().toISOString(),
    readAt: null,
    replyToId: opts.replyToId || null,
    vistaSync: "not_synced",
    vistaRef: null,
  };

  messageStore.set(id, msg);
  portalAudit("portal.message.draft", "success", opts.fromDfn, {
    detail: { messageId: id, category: opts.category },
  });
  return msg;
}

export function sendMessage(messageId: string, senderDfn: string): PortalMessage | null {
  const msg = messageStore.get(messageId);
  if (!msg || msg.fromDfn !== senderDfn) return null;
  if (msg.status !== "draft") return null;

  msg.status = "sent";
  msg.vistaSync = "pending"; // Will attempt VistA MailMan sync when available

  portalAudit("portal.message.send", "success", senderDfn, {
    detail: { messageId, threadId: msg.threadId, category: msg.category },
  });
  return msg;
}

export function addAttachment(
  messageId: string,
  senderDfn: string,
  attachment: { filename: string; mimeType: string; data: string }
): { ok: boolean; error?: string; attachment?: MessageAttachment } {
  const msg = messageStore.get(messageId);
  if (!msg || msg.fromDfn !== senderDfn) return { ok: false, error: "Message not found" };
  if (msg.status !== "draft") return { ok: false, error: "Can only add attachments to drafts" };
  if (msg.attachments.length >= MAX_ATTACHMENTS_PER_MSG) {
    return { ok: false, error: `Maximum ${MAX_ATTACHMENTS_PER_MSG} attachments` };
  }
  if (!ALLOWED_MIME_TYPES.has(attachment.mimeType)) {
    return { ok: false, error: "File type not allowed. Accepted: PDF, JPEG, PNG, GIF" };
  }

  const dataBytes = Buffer.from(attachment.data, "base64").length;
  if (dataBytes > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: `Attachment exceeds ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB limit` };
  }

  const att: MessageAttachment = {
    id: `att-${randomBytes(4).toString("hex")}`,
    filename: attachment.filename.slice(0, 100),
    mimeType: attachment.mimeType,
    sizeBytes: dataBytes,
    data: attachment.data,
  };

  msg.attachments.push(att);
  return { ok: true, attachment: { ...att, data: "(stored)" } };
}

export function getInbox(patientDfn: string): PortalMessage[] {
  return [...messageStore.values()]
    .filter((m) => (m.toDfn === patientDfn || m.fromDfn === patientDfn) && m.status !== "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDrafts(patientDfn: string): PortalMessage[] {
  return [...messageStore.values()]
    .filter((m) => m.fromDfn === patientDfn && m.status === "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSent(patientDfn: string): PortalMessage[] {
  return [...messageStore.values()]
    .filter((m) => m.fromDfn === patientDfn && m.status !== "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getThread(threadId: string): PortalMessage[] {
  return [...messageStore.values()]
    .filter((m) => m.threadId === threadId && m.status !== "draft")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getMessage(messageId: string, viewerDfn: string): PortalMessage | null {
  const msg = messageStore.get(messageId);
  if (!msg) return null;
  if (msg.fromDfn !== viewerDfn && msg.toDfn !== viewerDfn) return null;

  if (msg.toDfn === viewerDfn && !msg.readAt) {
    msg.readAt = new Date().toISOString();
    msg.status = "read";
    portalAudit("portal.message.read", "success", viewerDfn, {
      detail: { messageId },
    });
  }

  // Strip attachment data from response
  return { ...msg, attachments: msg.attachments.map(a => ({ ...a, data: "(stored)" })) };
}

export function updateDraft(
  messageId: string,
  senderDfn: string,
  updates: Partial<Pick<PortalMessage, "subject" | "category" | "body">>
): PortalMessage | null {
  const msg = messageStore.get(messageId);
  if (!msg || msg.fromDfn !== senderDfn || msg.status !== "draft") return null;

  if (updates.subject) msg.subject = updates.subject.slice(0, 200);
  if (updates.category) msg.category = updates.category;
  if (updates.body) msg.body = updates.body.slice(0, MAX_BODY_LENGTH);

  return msg;
}

export function deleteDraft(messageId: string, senderDfn: string): boolean {
  const msg = messageStore.get(messageId);
  if (!msg || msg.fromDfn !== senderDfn || msg.status !== "draft") return false;
  messageStore.delete(messageId);
  return true;
}
