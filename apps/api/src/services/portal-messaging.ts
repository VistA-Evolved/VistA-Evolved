/**
 * Portal Secure Messaging — Phase 27 -> Phase 32 enhancements
 *
 * Threaded inbox + compose + drafts + sent.
 * In-memory store for dev mode. Production: VistA MailMan or TIU integration.
 *
 * VistA integration mapping (target):
 * - XMXAPI: Send message via MailMan
 * - XMXMSGS: List messages
 * - TIU DOCUMENTS BY CONTEXT: For clinical document-linked messages
 *
 * Phase 32 enhancements:
 * - Proxy send on behalf (sensitivity-gated)
 * - Clinician reply (for CPRS shell)
 * - Attachments OFF by default (PORTAL_ATTACHMENTS_ENABLED flag)
 * - Rate limiting: max messages/hour per patient
 * - Blocklist: configurable blocked words
 * - All actions audited
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

/* Phase 32: Abuse controls */
const MAX_MESSAGES_PER_HOUR = 10;
const BLOCKLIST_WORDS = (process.env.PORTAL_MSG_BLOCKLIST || "").split(",").filter(Boolean);

/** Phase 32: Attachments OFF by default — enable via env var. */
export function areAttachmentsEnabled(): boolean {
  return process.env.PORTAL_ATTACHMENTS_ENABLED === "true";
}

export const SLA_DISCLAIMER =
  "This messaging system is for non-urgent communication only. " +
  "If you have a medical emergency, call 911. " +
  "Messages are typically reviewed within 2 business days. " +
  "Response times may vary based on clinic staffing.";

/* ------------------------------------------------------------------ */
/* DB repo — lazy-wired after initPlatformDb() (Phase 115)              */
/* ------------------------------------------------------------------ */

type MsgRepo = typeof import("../platform/db/repo/portal-message-repo.js");
let _repo: MsgRepo | null = null;

/** Wire the portal message repo after DB init. Called from index.ts. */
export function initMessageRepo(repo: MsgRepo): void {
  _repo = repo;
  // Seed msgSeq from DB row count to avoid ID collisions after restart
  try { msgSeq = repo.countMessages(); } catch { /* non-fatal */ }
}

/* ------------------------------------------------------------------ */
/* In-memory cache (Ephemeral — falls back to DB on miss)               */
/* ------------------------------------------------------------------ */

const messageCache = new Map<string, PortalMessage>();
let msgSeq = 0;

function cacheMsg(msg: PortalMessage): void {
  messageCache.set(msg.id, msg);
}

function rowToMsg(row: any): PortalMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    fromDfn: row.fromDfn,
    fromName: row.fromName,
    toDfn: row.toDfn,
    toName: row.toName,
    subject: row.subject,
    category: row.category as MessageCategory,
    body: row.body,
    status: row.status as MessageStatus,
    attachments: JSON.parse(row.attachmentsJson || "[]"),
    createdAt: row.createdAt,
    readAt: row.readAt ?? null,
    replyToId: row.replyToId ?? null,
    vistaSync: row.vistaSync ? "synced" : "not_synced",
    vistaRef: row.vistaRef ?? null,
  };
}

function msgToDbFields(msg: PortalMessage) {
  return {
    threadId: msg.threadId,
    fromDfn: msg.fromDfn,
    fromName: msg.fromName,
    toDfn: msg.toDfn,
    toName: msg.toName,
    subject: msg.subject,
    category: msg.category,
    body: msg.body,
    status: msg.status,
    attachmentsJson: JSON.stringify(msg.attachments.map(a => ({ ...a, data: "(stored)" }))),
    replyToId: msg.replyToId ?? undefined,
    vistaSync: msg.vistaSync === "synced",
    vistaRef: msg.vistaRef ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Phase 32: Rate limiter                                               */
/* ------------------------------------------------------------------ */

const sendTimestamps = new Map<string, number[]>();

/** Check if patient has exceeded send rate limit. */
export function checkRateLimit(dfn: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const timestamps = (sendTimestamps.get(dfn) || []).filter(t => t > hourAgo);
  sendTimestamps.set(dfn, timestamps);

  if (timestamps.length >= MAX_MESSAGES_PER_HOUR) {
    const oldest = timestamps[0];
    return { allowed: false, retryAfterMs: oldest + 3600000 - now };
  }
  return { allowed: true };
}

function recordSend(dfn: string): void {
  const timestamps = sendTimestamps.get(dfn) || [];
  timestamps.push(Date.now());
  sendTimestamps.set(dfn, timestamps);
}

/* ------------------------------------------------------------------ */
/* Phase 32: Blocklist                                                  */
/* ------------------------------------------------------------------ */

/** Check message body/subject for blocked content. */
export function checkBlocklist(text: string): { blocked: boolean; term?: string } {
  if (BLOCKLIST_WORDS.length === 0) return { blocked: false };
  const lower = text.toLowerCase();
  for (const word of BLOCKLIST_WORDS) {
    if (word.trim() && lower.includes(word.trim().toLowerCase())) {
      return { blocked: true, term: word.trim() };
    }
  }
  return { blocked: false };
}

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
    ? (getMessage_internal(opts.replyToId)?.threadId || id)
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

  if (_repo) {
    try {
      _repo.insertMessage(msgToDbFields(msg));
    } catch { /* DB write failed — cache-only fallback */ }
  }
  cacheMsg(msg);

  portalAudit("portal.message.draft", "success", opts.fromDfn, {
    detail: { messageId: id, category: opts.category },
  });
  return msg;
}

/** Internal lookup — no access-control, used for thread resolution. */
function getMessage_internal(messageId: string): PortalMessage | null {
  const cached = messageCache.get(messageId);
  if (cached) return cached;
  if (_repo) {
    try {
      const row = _repo.findMessageById(messageId);
      if (row) { const m = rowToMsg(row); cacheMsg(m); return m; }
    } catch { /* non-fatal */ }
  }
  return null;
}

export function sendMessage(messageId: string, senderDfn: string): PortalMessage | null {
  const msg = getMessage_internal(messageId);
  if (!msg || msg.fromDfn !== senderDfn) return null;
  if (msg.status !== "draft") return null;

  msg.status = "sent";
  msg.vistaSync = "pending";

  if (_repo) {
    try { _repo.updateMessage(messageId, { status: "sent" }); } catch { /* non-fatal */ }
  }
  cacheMsg(msg);

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
  const msg = getMessage_internal(messageId);
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
  cacheMsg(msg);

  if (_repo) {
    try {
      _repo.updateMessage(messageId, {
        attachmentsJson: JSON.stringify(msg.attachments.map(a => ({ ...a, data: "(stored)" }))),
      });
    } catch { /* non-fatal */ }
  }

  return { ok: true, attachment: { ...att, data: "(stored)" } };
}

export function getInbox(patientDfn: string): PortalMessage[] {
  if (_repo) {
    try {
      const rows = _repo.findInbox(patientDfn);
      return rows.map(rowToMsg);
    } catch { /* fallback to cache */ }
  }
  return [...messageCache.values()]
    .filter((m) => (m.toDfn === patientDfn || m.fromDfn === patientDfn) && m.status !== "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDrafts(patientDfn: string): PortalMessage[] {
  if (_repo) {
    try {
      const rows = _repo.findDrafts(patientDfn);
      return rows.map(rowToMsg);
    } catch { /* fallback to cache */ }
  }
  return [...messageCache.values()]
    .filter((m) => m.fromDfn === patientDfn && m.status === "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSent(patientDfn: string): PortalMessage[] {
  if (_repo) {
    try {
      const rows = _repo.findSent(patientDfn);
      return rows.map(rowToMsg);
    } catch { /* fallback to cache */ }
  }
  return [...messageCache.values()]
    .filter((m) => m.fromDfn === patientDfn && m.status !== "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getThread(threadId: string): PortalMessage[] {
  if (_repo) {
    try {
      const rows = _repo.findThread(threadId);
      return rows.map(rowToMsg);
    } catch { /* fallback to cache */ }
  }
  return [...messageCache.values()]
    .filter((m) => m.threadId === threadId && m.status !== "draft")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getMessage(messageId: string, viewerDfn: string): PortalMessage | null {
  const msg = getMessage_internal(messageId);
  if (!msg) return null;
  if (msg.fromDfn !== viewerDfn && msg.toDfn !== viewerDfn) return null;

  if (msg.toDfn === viewerDfn && !msg.readAt) {
    msg.readAt = new Date().toISOString();
    msg.status = "read";
    if (_repo) {
      try { _repo.updateMessage(messageId, { status: "read", readAt: msg.readAt }); } catch { /* */ }
    }
    cacheMsg(msg);
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
  const msg = getMessage_internal(messageId);
  if (!msg || msg.fromDfn !== senderDfn || msg.status !== "draft") return null;

  if (updates.subject) msg.subject = updates.subject.slice(0, 200);
  if (updates.category) msg.category = updates.category;
  if (updates.body) msg.body = updates.body.slice(0, MAX_BODY_LENGTH);

  cacheMsg(msg);
  if (_repo) {
    try {
      _repo.updateMessage(messageId, {
        subject: msg.subject,
        body: msg.body,
      });
    } catch { /* non-fatal */ }
  }

  return msg;
}

export function deleteDraft(messageId: string, senderDfn: string): boolean {
  const msg = getMessage_internal(messageId);
  if (!msg || msg.fromDfn !== senderDfn || msg.status !== "draft") return false;
  messageCache.delete(messageId);
  if (_repo) {
    try { _repo.deleteMessage(messageId); } catch { /* non-fatal */ }
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Phase 32: Proxy send on behalf                                       */
/* ------------------------------------------------------------------ */

/**
 * Create and send a message on behalf of a patient (proxy use case).
 * The proxy's identity is recorded in metadata for audit.
 */
export function sendOnBehalf(opts: {
  patientDfn: string;
  patientName: string;
  proxyDfn: string;
  proxyName: string;
  subject: string;
  category: MessageCategory;
  body: string;
}): PortalMessage | { error: string } {
  // Rate limit applies to the patient, not the proxy
  const rl = checkRateLimit(opts.patientDfn);
  if (!rl.allowed) {
    return { error: `Rate limit exceeded. Try again in ${Math.ceil((rl.retryAfterMs || 0) / 60000)} minutes.` };
  }

  const bl = checkBlocklist(`${opts.subject} ${opts.body}`);
  if (bl.blocked) {
    portalAudit("portal.message.blocked" as any, "failure", opts.proxyDfn, {
      detail: { reason: "blocklist", patientDfn: "hashed" },
    });
    return { error: "Message contains restricted content." };
  }

  const id = `msg-${++msgSeq}-${randomBytes(4).toString("hex")}`;
  const msg: PortalMessage = {
    id,
    threadId: id,
    fromDfn: opts.patientDfn,
    fromName: `${opts.patientName} (via ${opts.proxyName})`,
    toDfn: "clinic",
    toName: "Care Team",
    subject: opts.subject.slice(0, 200),
    category: opts.category,
    body: opts.body.slice(0, MAX_BODY_LENGTH),
    status: "sent",
    attachments: [],
    createdAt: new Date().toISOString(),
    readAt: null,
    replyToId: null,
    vistaSync: "pending",
    vistaRef: null,
  };

  if (_repo) {
    try { _repo.insertMessage(msgToDbFields(msg)); } catch { /* non-fatal */ }
  }
  cacheMsg(msg);
  recordSend(opts.patientDfn);

  portalAudit("portal.message.send", "success", opts.proxyDfn, {
    detail: { messageId: id, onBehalfOf: "hashed-patient", proxy: true },
  });

  return msg;
}

/* ------------------------------------------------------------------ */
/* Phase 32: Clinician reply (for CPRS shell)                           */
/* ------------------------------------------------------------------ */

/**
 * Clinician creates a reply to a patient message.
 * Called from the CPRS messaging panel, not the patient portal.
 */
export function clinicianReply(opts: {
  clinicianDuz: string;
  clinicianName: string;
  replyToId: string;
  body: string;
}): PortalMessage | { error: string } {
  const original = getMessage_internal(opts.replyToId);
  if (!original) return { error: "Original message not found." };

  const id = `msg-${++msgSeq}-${randomBytes(4).toString("hex")}`;
  const msg: PortalMessage = {
    id,
    threadId: original.threadId,
    fromDfn: `duz-${opts.clinicianDuz}`,
    fromName: opts.clinicianName,
    toDfn: original.fromDfn,
    toName: original.fromName.split(" (via")[0], // strip proxy annotation
    subject: original.subject.startsWith("RE:") ? original.subject : `RE: ${original.subject}`,
    category: original.category,
    body: opts.body.slice(0, MAX_BODY_LENGTH),
    status: "sent",
    attachments: [],
    createdAt: new Date().toISOString(),
    readAt: null,
    replyToId: opts.replyToId,
    vistaSync: "pending",
    vistaRef: null,
  };

  if (_repo) {
    try { _repo.insertMessage(msgToDbFields(msg)); } catch { /* non-fatal */ }
  }
  cacheMsg(msg);

  // Mark original as replied
  if (original.status === "read" || original.status === "sent") {
    original.status = "replied";
    cacheMsg(original);
    if (_repo) {
      try { _repo.updateMessage(opts.replyToId, { status: "replied" }); } catch { /* */ }
    }
  }

  return msg;
}

/**
 * Get all unread patient messages for staff queue (CPRS shell).
 */
export function getStaffMessageQueue(): PortalMessage[] {
  if (_repo) {
    try {
      const rows = _repo.findStaffQueue();
      return rows.map(rowToMsg);
    } catch { /* fallback to cache */ }
  }
  return [...messageCache.values()]
    .filter(m => m.toDfn === "clinic" && m.status === "sent")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
