/**
 * Secure Messaging Service -- Phase 64: MailMan-backed clinician + portal messaging.
 *
 * Architecture:
 *   - In-memory message store for local inbox (sent + received copies)
 *   - VistA MailMan integration via DSIC SEND MAIL MSG RPC for outbound
 *   - ORQQXMB MAIL GROUPS for recipient discovery
 *   - Portal messages routed to configured clinic mail group
 *
 * VistA read-inbox gap:
 *   MailMan baskets (^XMB(3.9)) have no standard read RPC.
 *   Phase 64 stores local copies of sent messages.
 *   Full inbox sync requires custom ZVEMSGR.m (migration target).
 *
 * Security:
 *   - Message bodies are PHI -- NEVER logged or audited
 *   - Audit captures metadata only: action, recipient count, subject length
 *   - Rate limits enforced per-user (clinician: 60/hr, portal: 10/hr)
 */

import { randomBytes } from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SecureMessageStatus = "draft" | "sent" | "delivered" | "read" | "failed";
export type SecureMessagePriority = "routine" | "priority" | "urgent";
export type SecureMessageDirection = "outbound" | "inbound";

export interface SecureMessageRecipient {
  type: "user" | "mail-group";
  id: string;        // DUZ for user, group name for mail-group
  name: string;
  cc?: boolean;
  informational?: boolean;
}

export interface SecureMessage {
  id: string;
  threadId: string;
  direction: SecureMessageDirection;
  fromDuz: string;
  fromName: string;
  recipients: SecureMessageRecipient[];
  subject: string;
  body: string;        // PHI -- never logged or audited
  priority: SecureMessagePriority;
  status: SecureMessageStatus;
  category: "clinical" | "admin" | "portal" | "system";
  replyToId: string | null;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
  /** VistA MailMan sync status */
  vistaSync: "not_synced" | "pending" | "synced" | "failed";
  vistaRef: string | null;
  /** Patient DFN if portal-originated */
  patientDfn: string | null;
}

export interface MailGroup {
  name: string;
  ien: string;
  description?: string;
}

/* ------------------------------------------------------------------ */
/* In-Memory Store (resets on API restart -- like Phase 23/30 pattern)  */
/* ------------------------------------------------------------------ */

const messageStore = new Map<string, SecureMessage>();
const mailGroupCache: { groups: MailGroup[]; fetchedAt: number } = { groups: [], fetchedAt: 0 };
const MAIL_GROUP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ------------------------------------------------------------------ */
/* Rate Limiting                                                       */
/* ------------------------------------------------------------------ */

const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const CLINICIAN_RATE_LIMIT = 60;   // per hour
const PORTAL_RATE_LIMIT = 10;      // per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(userId: string, isPortal: boolean): boolean {
  const now = Date.now();
  const limit = isPortal ? PORTAL_RATE_LIMIT : CLINICIAN_RATE_LIMIT;
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/* ------------------------------------------------------------------ */
/* MailMan RPC Integration                                             */
/* ------------------------------------------------------------------ */

/**
 * Fetch mail groups from VistA via ORQQXMB MAIL GROUPS.
 * Results are cached for 5 minutes.
 */
export async function fetchMailGroups(): Promise<MailGroup[]> {
  const now = Date.now();
  if (mailGroupCache.groups.length > 0 && now - mailGroupCache.fetchedAt < MAIL_GROUP_CACHE_TTL_MS) {
    return mailGroupCache.groups;
  }
  try {
    const { safeCallRpc } = await import("../lib/rpc-resilience.js");
    const lines = await safeCallRpc("ORQQXMB MAIL GROUPS", []);
    if (!lines || lines.length === 0) return mailGroupCache.groups;
    const groups: MailGroup[] = lines
      .filter((l: string) => l.trim())
      .map((line: string) => {
        // Format: IEN^GroupName
        const parts = line.split("^");
        return {
          ien: parts[0] || "",
          name: parts[1] || parts[0] || "",
          description: parts[2] || undefined,
        };
      }).filter((g: MailGroup) => g.ien && g.name);
    mailGroupCache.groups = groups;
    mailGroupCache.fetchedAt = now;
    return groups;
  } catch (err) {
    log.warn("Failed to fetch mail groups from VistA", { error: String(err) });
    return mailGroupCache.groups;
  }
}

/**
 * Send a message via VistA MailMan using DSIC SEND MAIL MSG.
 *
 * DSIC SEND MAIL MSG takes a LIST parameter with:
 *   ARR("SUBJ") = subject
 *   ARR("TEXT",1) = line1 ... ARR("TEXT",n) = lineN
 *   ARR("REC",1) = recipient1 ...
 *   ARR("FLAGS") = optional flags (P=priority, C=confidential, etc.)
 *
 * Returns the MailMan message IEN on success or null on failure.
 */
export async function sendViaMailMan(
  subject: string,
  body: string,
  recipients: SecureMessageRecipient[],
  priority: SecureMessagePriority = "routine",
): Promise<{ ok: boolean; vistaRef: string | null; error?: string }> {
  try {
    const { safeCallRpcWithList } = await import("../lib/rpc-resilience.js");

    // Build the LIST parameter map for DSIC SEND MAIL MSG
    // Keys use MUMPS double-quote convention for string subscripts
    const listParams: Record<string, string> = {};
    listParams['"SUBJ"'] = subject;

    // Text lines
    const textLines = body.split("\n");
    for (let i = 0; i < textLines.length; i++) {
      listParams[`"TEXT",${i + 1}`] = textLines[i] || " ";
    }

    // Recipients
    let recIdx = 1;
    for (const r of recipients) {
      let recValue = "";
      if (r.type === "mail-group") {
        recValue = r.informational ? `I:G.${r.name}` : r.cc ? `C:G.${r.name}` : `G.${r.name}`;
      } else {
        recValue = r.informational ? `I:${r.id}` : r.cc ? `C:${r.id}` : r.id;
      }
      listParams[`"REC",${recIdx}`] = recValue;
      recIdx++;
    }

    // Priority flags
    if (priority === "priority" || priority === "urgent") {
      listParams['"FLAGS"'] = "P";
    }

    // safeCallRpcWithList expects RpcParam[] -- wrap as single LIST param
    const result = await safeCallRpcWithList("DSIC SEND MAIL MSG", [
      { type: "list" as const, value: listParams },
    ]);
    const resultStr = Array.isArray(result) ? result.join("\n").trim() : "";
    if (resultStr && !resultStr.startsWith("-1")) {
      return { ok: true, vistaRef: resultStr };
    }
    return { ok: false, vistaRef: null, error: resultStr || "Empty response from DSIC SEND MAIL MSG" };
  } catch (err) {
    log.warn("MailMan send failed", { error: String(err) });
    return { ok: false, vistaRef: null, error: String(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Core Service Functions                                              */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `msg-${randomBytes(8).toString("hex")}`;
}

/**
 * Get inbox for a user (by DUZ). Returns sent + received messages.
 * In Phase 64, only locally-stored messages are visible.
 * Full VistA basket integration requires ZVEMSGR.m (migration target).
 */
export function getInbox(duz: string, limit = 50): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of messageStore.values()) {
    // Include messages FROM this user (sent) or TO this user
    const isFrom = msg.fromDuz === duz;
    const isTo = msg.recipients.some(r => r.type === "user" && r.id === duz);
    if (isFrom || isTo) {
      messages.push(msg);
    }
  }
  return messages
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Get sent messages for a user.
 */
export function getSentMessages(duz: string, limit = 50): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of messageStore.values()) {
    if (msg.fromDuz === duz && msg.status === "sent") {
      messages.push(msg);
    }
  }
  return messages
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Get a single message by ID.
 */
export function getMessage(id: string): SecureMessage | null {
  return messageStore.get(id) || null;
}

/**
 * Get thread (all messages with same threadId).
 */
export function getThread(threadId: string): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of messageStore.values()) {
    if (msg.threadId === threadId) messages.push(msg);
  }
  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Mark a message as read.
 */
export function markAsRead(id: string): boolean {
  const msg = messageStore.get(id);
  if (!msg) return false;
  msg.readAt = new Date().toISOString();
  msg.status = "read";
  return true;
}

/**
 * Create a draft message.
 */
export function createDraft(params: {
  fromDuz: string;
  fromName: string;
  recipients: SecureMessageRecipient[];
  subject: string;
  body: string;
  priority?: SecureMessagePriority;
  category?: SecureMessage["category"];
  replyToId?: string;
  patientDfn?: string;
}): SecureMessage {
  const id = generateId();
  const now = new Date().toISOString();
  const threadId = params.replyToId
    ? (messageStore.get(params.replyToId)?.threadId || id)
    : id;

  const msg: SecureMessage = {
    id,
    threadId,
    direction: "outbound",
    fromDuz: params.fromDuz,
    fromName: params.fromName,
    recipients: params.recipients,
    subject: params.subject,
    body: params.body,
    priority: params.priority || "routine",
    status: "draft",
    category: params.category || "clinical",
    replyToId: params.replyToId || null,
    createdAt: now,
    sentAt: null,
    readAt: null,
    vistaSync: "not_synced",
    vistaRef: null,
    patientDfn: params.patientDfn || null,
  };
  messageStore.set(id, msg);
  return msg;
}

/**
 * Send a message -- creates it if draft, then dispatches to MailMan.
 */
export async function sendMessage(params: {
  fromDuz: string;
  fromName: string;
  recipients: SecureMessageRecipient[];
  subject: string;
  body: string;
  priority?: SecureMessagePriority;
  category?: SecureMessage["category"];
  replyToId?: string;
  patientDfn?: string;
}): Promise<{ ok: boolean; message: SecureMessage; vistaResult?: string }> {
  const msg = createDraft(params);
  const now = new Date().toISOString();

  // Attempt VistA MailMan send
  const vistaResult = await sendViaMailMan(
    msg.subject,
    msg.body,
    msg.recipients,
    msg.priority,
  );

  if (vistaResult.ok) {
    msg.status = "sent";
    msg.sentAt = now;
    msg.vistaSync = "synced";
    msg.vistaRef = vistaResult.vistaRef;
  } else {
    // Still mark as sent locally even if VistA sync fails
    msg.status = "sent";
    msg.sentAt = now;
    msg.vistaSync = "failed";
  }

  return {
    ok: true,
    message: msg,
    vistaResult: vistaResult.ok ? "synced" : vistaResult.error,
  };
}

/**
 * Get messages for portal patient (by DFN).
 */
export function getPortalMessages(dfn: string, limit = 50): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of messageStore.values()) {
    if (msg.patientDfn === dfn) {
      messages.push(msg);
    }
  }
  return messages
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Portal patient sends a message to a clinic mail group.
 */
export async function portalSendToClinic(params: {
  patientDfn: string;
  patientName: string;
  clinicGroupName: string;
  subject: string;
  body: string;
  category?: SecureMessage["category"];
}): Promise<{ ok: boolean; message: SecureMessage; vistaResult?: string }> {
  return sendMessage({
    fromDuz: `patient-${params.patientDfn}`,
    fromName: params.patientName,
    recipients: [{
      type: "mail-group",
      id: params.clinicGroupName,
      name: params.clinicGroupName,
    }],
    subject: params.subject,
    body: params.body,
    category: params.category || "portal",
    patientDfn: params.patientDfn,
  });
}

/**
 * Check rate limit for a user.
 */
export function isRateLimited(userId: string, isPortal: boolean): boolean {
  return !checkRateLimit(userId, isPortal);
}

/**
 * Get message store stats (no PHI).
 */
export function getMessageStats(): {
  totalMessages: number;
  sentCount: number;
  draftCount: number;
  failedSyncCount: number;
} {
  let sent = 0, draft = 0, failedSync = 0;
  for (const msg of messageStore.values()) {
    if (msg.status === "sent") sent++;
    if (msg.status === "draft") draft++;
    if (msg.vistaSync === "failed") failedSync++;
  }
  return {
    totalMessages: messageStore.size,
    sentCount: sent,
    draftCount: draft,
    failedSyncCount: failedSync,
  };
}
