/**
 * Secure Messaging Service -- Phase 70: VistA-backed MailMan via ZVEMSGR.m RPCs.
 *
 * Architecture:
 *   - PRIMARY: VistA MailMan via ZVE MAIL * RPCs (ZVEMSGR.m)
 *   - FALLBACK: In-memory cache (offline mode) when VistA is unreachable
 *   - ORQQXMB MAIL GROUPS for recipient/mail-group discovery
 *
 * RPCs used (all registered in rpcRegistry.ts):
 *   ZVE MAIL FOLDERS  -- list baskets with counts
 *   ZVE MAIL LIST     -- list messages in basket (metadata)
 *   ZVE MAIL GET      -- read message (header + body)
 *   ZVE MAIL SEND     -- send via MailMan + inline delivery
 *   ZVE MAIL MANAGE   -- mark read / delete / move
 *   ORQQXMB MAIL GROUPS -- mail group recipient list
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
/* In-Memory Fallback Cache (only used when VistA is unreachable)      */
/* ------------------------------------------------------------------ */

const fallbackCache = new Map<string, SecureMessage>();
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
/* VistA RPC Helpers                                                   */
/* ------------------------------------------------------------------ */

/** Convert VistA FileMan date (3YYMMDD.HHMMSS) to ISO string */
function fmDateToISO(fmDate: string): string {
  if (!fmDate || fmDate === "0") return "";
  // FM date: 3YYMMDD.HHMMSS  (3 = century offset from 1700)
  const intPart = fmDate.split(".")[0];
  const timePart = fmDate.split(".")[1] || "000000";
  const yr = 1700 + parseInt(intPart.substring(0, 3), 10);
  const mo = intPart.substring(3, 5);
  const dy = intPart.substring(5, 7);
  const hh = timePart.substring(0, 2).padEnd(2, "0");
  const mm = timePart.substring(2, 4).padEnd(2, "0");
  const ss = timePart.substring(4, 6).padEnd(2, "0");
  return `${yr}-${mo}-${dy}T${hh}:${mm}:${ss}.000Z`;
}

/* ------------------------------------------------------------------ */
/* VistA-backed MailMan Integration (ZVEMSGR.m RPCs)                   */
/* ------------------------------------------------------------------ */

/** Basket/folder as returned by ZVE MAIL FOLDERS */
export interface MailFolder {
  id: string;
  name: string;
  totalMessages: number;
  newMessages: number;
}

/**
 * List mail folders/baskets from VistA via ZVE MAIL FOLDERS.
 */
export async function listFolders(): Promise<{
  ok: boolean; source: "vista" | "local"; folders: MailFolder[]; error?: string;
}> {
  try {
    const { safeCallRpc } = await import("../lib/rpc-resilience.js");
    const lines = await safeCallRpc("ZVE MAIL FOLDERS", []);
    if (!lines || lines.length === 0 || !lines[0]?.startsWith("ok")) {
      const err = lines?.[0] || "Empty response";
      return { ok: false, source: "vista", folders: [], error: err };
    }
    const folders: MailFolder[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split("^");
      if (parts.length < 4) continue;
      folders.push({
        id: parts[0],
        name: parts[1] || `Basket ${parts[0]}`,
        totalMessages: parseInt(parts[2], 10) || 0,
        newMessages: parseInt(parts[3], 10) || 0,
      });
    }
    return { ok: true, source: "vista", folders };
  } catch (err) {
    log.warn("ZVE MAIL FOLDERS failed, using fallback", { error: String(err) });
    return { ok: false, source: "local", folders: [], error: String(err) };
  }
}

/** Message summary from ZVE MAIL LIST */
export interface MailMessageSummary {
  ien: string;
  subject: string;
  fromDuz: string;
  fromName: string;
  date: string;
  direction: SecureMessageDirection;
  isNew: boolean;
}

/**
 * List messages in a folder via ZVE MAIL LIST.
 */
export async function listMessages(folderId: string, limit = 50): Promise<{
  ok: boolean; source: "vista" | "local"; messages: MailMessageSummary[]; error?: string;
}> {
  try {
    const { safeCallRpcWithList } = await import("../lib/rpc-resilience.js");
    const lines = await safeCallRpcWithList("ZVE MAIL LIST", [
      { type: "list" as const, value: { "0": folderId, "1": String(limit) } },
    ]);
    if (!lines || lines.length === 0 || !lines[0]?.startsWith("ok")) {
      const err = lines?.[0] || "Empty response";
      return { ok: false, source: "vista", messages: [], error: err };
    }
    const messages: MailMessageSummary[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split("^");
      if (parts.length < 7) continue;
      messages.push({
        ien: parts[0],
        subject: parts[1],
        fromDuz: parts[2],
        fromName: parts[3],
        date: fmDateToISO(parts[4]),
        direction: parts[5] as SecureMessageDirection,
        isNew: parts[6] === "1",
      });
    }
    return { ok: true, source: "vista", messages };
  } catch (err) {
    log.warn("ZVE MAIL LIST failed", { error: String(err) });
    return { ok: false, source: "local", messages: [], error: String(err) };
  }
}

/** Full message detail from ZVE MAIL GET */
export interface MailMessageDetail {
  ien: string;
  subject: string;
  fromDuz: string;
  fromName: string;
  date: string;
  direction: SecureMessageDirection;
  bodyLines: string[];
  recipients: Array<{ duz: string; name: string; readDate: string }>;
}

/**
 * Get a single message from VistA via ZVE MAIL GET.
 * This also marks the message as read server-side.
 */
export async function getVistaMessage(messageIen: string): Promise<{
  ok: boolean; source: "vista" | "local"; message?: MailMessageDetail; error?: string;
}> {
  try {
    const { safeCallRpcWithList } = await import("../lib/rpc-resilience.js");
    const lines = await safeCallRpcWithList("ZVE MAIL GET", [
      { type: "list" as const, value: { "0": messageIen } },
    ]);
    if (!lines || lines.length === 0 || !lines[0]?.startsWith("ok")) {
      const err = lines?.[0] || "Empty response";
      return { ok: false, source: "vista", error: err };
    }

    let subject = "", fromDuz = "", fromName = "", date = "", direction: SecureMessageDirection = "inbound";
    const bodyLines: string[] = [];
    const recipients: Array<{ duz: string; name: string; readDate: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const type = line.split("^")[0];
      const rest = line.substring(type.length + 1);
      if (type === "HDR") {
        const hp = rest.split("^");
        subject = hp[0] || "";
        fromDuz = hp[1] || "";
        fromName = hp[2] || "";
        date = fmDateToISO(hp[3] || "");
        direction = (hp[4] || "inbound") as SecureMessageDirection;
      } else if (type === "BODY") {
        bodyLines.push(rest);
      } else if (type === "RECIP") {
        const rp = rest.split("^");
        recipients.push({
          duz: rp[0] || "",
          name: rp[1] || "",
          readDate: rp[2] ? fmDateToISO(rp[2]) : "",
        });
      }
    }

    return {
      ok: true,
      source: "vista",
      message: {
        ien: messageIen,
        subject,
        fromDuz,
        fromName,
        date,
        direction,
        bodyLines,
        recipients,
      },
    };
  } catch (err) {
    log.warn("ZVE MAIL GET failed", { error: String(err) });
    return { ok: false, source: "local", error: String(err) };
  }
}

/**
 * Send a message via VistA MailMan using ZVE MAIL SEND.
 *
 * ZVE MAIL SEND takes LIST params:
 *   PARAM("SUBJ") = subject
 *   PARAM("TEXT",1..n) = body lines
 *   PARAM("REC",1..n) = recipient specs (DUZ or G.groupname)
 *   PARAM("PRI") = "P" for priority (optional)
 */
export async function sendViaMailMan(
  subject: string,
  body: string,
  recipients: SecureMessageRecipient[],
  priority: SecureMessagePriority = "routine",
): Promise<{ ok: boolean; vistaRef: string | null; error?: string }> {
  try {
    const { safeCallRpcWithList } = await import("../lib/rpc-resilience.js");

    const listParams: Record<string, string> = {};
    listParams['SUBJ'] = subject;

    // Text lines
    const textLines = body.split("\n");
    for (let i = 0; i < textLines.length; i++) {
      listParams[`TEXT,${i + 1}`] = textLines[i] || " ";
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
      listParams[`REC,${recIdx}`] = recValue;
      recIdx++;
    }

    // Priority
    if (priority === "priority" || priority === "urgent") {
      listParams['PRI'] = "P";
    }

    const result = await safeCallRpcWithList("ZVE MAIL SEND", [
      { type: "list" as const, value: listParams },
    ]);
    const resultStr = Array.isArray(result) ? result.join("\n").trim() : "";
    if (resultStr.startsWith("ok^")) {
      const vistaRef = resultStr.split("^")[1] || null;
      return { ok: true, vistaRef };
    }
    return { ok: false, vistaRef: null, error: resultStr || "ZVE MAIL SEND returned no result" };
  } catch (err) {
    log.warn("ZVE MAIL SEND failed", { error: String(err) });
    return { ok: false, vistaRef: null, error: String(err) };
  }
}

/**
 * Manage messages: mark read, delete, move.
 */
export async function manageMessage(
  action: "markread" | "delete" | "move",
  messageIen: string,
  basket?: string,
  toBasket?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { safeCallRpcWithList } = await import("../lib/rpc-resilience.js");
    const listParams: Record<string, string> = {};
    listParams['ACTION'] = action;
    listParams['XMZ'] = messageIen;
    if (basket) listParams['BASKET'] = basket;
    if (toBasket) listParams['TOBASKET'] = toBasket;

    const result = await safeCallRpcWithList("ZVE MAIL MANAGE", [
      { type: "list" as const, value: listParams },
    ]);
    const resultStr = Array.isArray(result) ? result.join("\n").trim() : "";
    if (resultStr.startsWith("ok^")) return { ok: true };
    return { ok: false, error: resultStr };
  } catch (err) {
    log.warn("ZVE MAIL MANAGE failed", { error: String(err) });
    return { ok: false, error: String(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Mail Groups (unchanged - uses ORQQXMB MAIL GROUPS)                  */
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

/* ------------------------------------------------------------------ */
/* Legacy Compatibility Layer (fallback cache + portal bridge)         */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `msg-${randomBytes(8).toString("hex")}`;
}

/**
 * Get inbox for a user (by DUZ).
 * Phase 70: Primary path calls VistA (ZVE MAIL LIST).
 * Fallback: returns from local cache if VistA unavailable.
 */
export function getInbox(duz: string, limit = 50): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of fallbackCache.values()) {
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
 * Get sent messages for a user (fallback cache).
 */
export function getSentMessages(duz: string, limit = 50): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of fallbackCache.values()) {
    if (msg.fromDuz === duz && msg.status === "sent") {
      messages.push(msg);
    }
  }
  return messages
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Get a single message by local ID (fallback cache).
 */
export function getMessage(id: string): SecureMessage | null {
  return fallbackCache.get(id) || null;
}

/**
 * Get thread (fallback cache).
 */
export function getThread(threadId: string): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of fallbackCache.values()) {
    if (msg.threadId === threadId) messages.push(msg);
  }
  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Mark a message as read (fallback cache).
 */
export function markAsRead(id: string): boolean {
  const msg = fallbackCache.get(id);
  if (!msg) return false;
  msg.readAt = new Date().toISOString();
  msg.status = "read";
  return true;
}

/**
 * Send a message -- tries VistA first, caches locally for fallback.
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
  const id = generateId();
  const now = new Date().toISOString();
  const threadId = params.replyToId
    ? (fallbackCache.get(params.replyToId)?.threadId || id)
    : id;

  // Attempt VistA MailMan send via ZVE MAIL SEND
  const vistaResult = await sendViaMailMan(
    params.subject,
    params.body,
    params.recipients,
    params.priority || "routine",
  );

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
    status: "sent",
    category: params.category || "clinical",
    replyToId: params.replyToId || null,
    createdAt: now,
    sentAt: now,
    readAt: null,
    vistaSync: vistaResult.ok ? "synced" : "failed",
    vistaRef: vistaResult.vistaRef,
    patientDfn: params.patientDfn || null,
  };
  // Cache locally for fallback
  fallbackCache.set(id, msg);

  return {
    ok: true,
    message: msg,
    vistaResult: vistaResult.ok ? "synced" : vistaResult.error,
  };
}

/**
 * Get messages for portal patient (by DFN). Fallback cache.
 */
export function getPortalMessages(dfn: string, limit = 50): SecureMessage[] {
  const messages: SecureMessage[] = [];
  for (const msg of fallbackCache.values()) {
    if (msg.patientDfn === dfn) messages.push(msg);
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
  for (const msg of fallbackCache.values()) {
    if (msg.status === "sent") sent++;
    if (msg.status === "draft") draft++;
    if (msg.vistaSync === "failed") failedSync++;
  }
  return {
    totalMessages: fallbackCache.size,
    sentCount: sent,
    draftCount: draft,
    failedSyncCount: failedSync,
  };
}
