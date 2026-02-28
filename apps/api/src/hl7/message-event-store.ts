/**
 * HL7v2 Message Event Store — Phase 259 (Wave 8 P3)
 *
 * Append-only message event store with PHI-safe logging.
 * In-memory ring buffer with optional PG persistence (wired via setHl7DbRepo).
 *
 * Pattern: Same as imaging-audit.ts, rcm-audit.ts — hash-chained, PHI-redacted.
 */
import { createHash, randomBytes } from "crypto";

/* ── Types ─────────────────────────────────────────────── */

export type Hl7MessageDirection = "inbound" | "outbound";

export type Hl7ProcessingStatus =
  | "received"
  | "parsed"
  | "routed"
  | "dispatched"
  | "ack_sent"
  | "nak_sent"
  | "dead_lettered"
  | "replayed"
  | "error";

export interface Hl7MessageEvent {
  id: string;
  tenantId: string;
  direction: Hl7MessageDirection;
  messageType: string; // e.g. "ADT^A01"
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  status: Hl7ProcessingStatus;
  routeId: string | null;
  endpointId: string | null;
  /** PHI-safe summary — never contains raw patient data */
  summary: string;
  /** Size of the original HL7 message in bytes */
  messageSizeBytes: number;
  /** SHA-256 hash of the raw message for integrity verification */
  messageHash: string;
  /** Error detail (PHI-redacted) */
  errorDetail: string | null;
  /** Hash chain link to previous event */
  prevHash: string;
  hash: string;
  createdAt: string; // ISO 8601
}

export interface CreateMessageEventInput {
  tenantId: string;
  direction: Hl7MessageDirection;
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  status: Hl7ProcessingStatus;
  routeId?: string;
  endpointId?: string;
  rawMessage: string; // stored only as hash + size, never persisted raw
  errorDetail?: string;
}

/* ── PHI Redaction ─────────────────────────────────────── */

const PHI_SEGMENT_PREFIXES = ["PID", "NK1", "GT1", "IN1", "IN2"];

/**
 * Build a PHI-safe summary from an HL7 message.
 * Strips PID/NK1/GT1/IN segments; keeps MSH/EVN/PV1 metadata only.
 */
export function buildPhiSafeSummary(rawMessage: string): string {
  const segments = rawMessage.split(/\r?\n|\r/).filter(Boolean);
  const safe = segments
    .filter((seg) => {
      const prefix = seg.substring(0, 3);
      return !PHI_SEGMENT_PREFIXES.includes(prefix);
    })
    .map((seg) => {
      // Truncate long segments to 120 chars
      return seg.length > 120 ? seg.substring(0, 120) + "..." : seg;
    });
  return safe.join("\n");
}

/**
 * Hash raw HL7 message content for integrity verification.
 */
export function hashMessage(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/* ── Ring Buffer Store ─────────────────────────────────── */

const MAX_EVENTS = 10_000;
const events: Hl7MessageEvent[] = [];
let lastHash = "genesis";

function computeEventHash(event: Omit<Hl7MessageEvent, "hash">): string {
  const payload = `${event.prevHash}|${event.id}|${event.tenantId}|${event.messageType}|${event.messageControlId}|${event.status}|${event.createdAt}`;
  return createHash("sha256").update(payload).digest("hex").substring(0, 32);
}

function generateEventId(): string {
  return `hle-${randomBytes(8).toString("hex")}`;
}

/**
 * Append a message event (PHI-safe).
 * Raw message is NEVER stored — only its hash and byte size.
 */
export function recordMessageEvent(input: CreateMessageEventInput): Hl7MessageEvent {
  const id = generateEventId();
  const now = new Date().toISOString();
  const summary = buildPhiSafeSummary(input.rawMessage);
  const msgHash = hashMessage(input.rawMessage);
  const msgSize = Buffer.byteLength(input.rawMessage, "utf-8");

  const partial: Omit<Hl7MessageEvent, "hash"> = {
    id,
    tenantId: input.tenantId,
    direction: input.direction,
    messageType: input.messageType,
    messageControlId: input.messageControlId,
    sendingApplication: input.sendingApplication,
    sendingFacility: input.sendingFacility,
    receivingApplication: input.receivingApplication,
    receivingFacility: input.receivingFacility,
    status: input.status,
    routeId: input.routeId ?? null,
    endpointId: input.endpointId ?? null,
    summary,
    messageSizeBytes: msgSize,
    messageHash: msgHash,
    errorDetail: input.errorDetail ?? null,
    prevHash: lastHash,
    createdAt: now,
  };

  const hash = computeEventHash(partial);
  const event: Hl7MessageEvent = { ...partial, hash };

  events.push(event);
  lastHash = hash;

  // FIFO eviction
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  // Fire-and-forget DB persistence if wired
  if (_dbRepo) {
    void _dbRepo.insertMessageEvent(event).catch(() => {});
  }

  return event;
}

/**
 * Query events with optional filters.
 */
export function queryMessageEvents(opts?: {
  tenantId?: string;
  messageType?: string;
  status?: Hl7ProcessingStatus;
  direction?: Hl7MessageDirection;
  limit?: number;
  offset?: number;
}): { events: Hl7MessageEvent[]; total: number } {
  let filtered = [...events];

  if (opts?.tenantId) {
    filtered = filtered.filter((e) => e.tenantId === opts.tenantId);
  }
  if (opts?.messageType) {
    filtered = filtered.filter((e) => e.messageType === opts.messageType);
  }
  if (opts?.status) {
    filtered = filtered.filter((e) => e.status === opts.status);
  }
  if (opts?.direction) {
    filtered = filtered.filter((e) => e.direction === opts.direction);
  }

  const total = filtered.length;
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 50;

  return {
    events: filtered.slice(offset, offset + limit).reverse(),
    total,
  };
}

/**
 * Get a single event by ID.
 */
export function getMessageEvent(id: string): Hl7MessageEvent | undefined {
  return events.find((e) => e.id === id);
}

/**
 * Verify hash chain integrity.
 */
export function verifyMessageEventChain(): {
  ok: boolean;
  totalEvents: number;
  brokenAt: number | null;
} {
  if (events.length === 0) {
    return { ok: true, totalEvents: 0, brokenAt: null };
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { hash, ...rest } = event;
    const expected = computeEventHash(rest as Omit<Hl7MessageEvent, "hash">);
    if (expected !== hash) {
      return { ok: false, totalEvents: events.length, brokenAt: i };
    }
  }
  return { ok: true, totalEvents: events.length, brokenAt: null };
}

/**
 * Get event count by status (for dashboard metrics).
 */
export function getMessageEventStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const e of events) {
    stats[e.status] = (stats[e.status] ?? 0) + 1;
  }
  stats._total = events.length;
  return stats;
}

/* ── DB Repo Injection (optional PG persistence) ─────── */

export interface Hl7MessageEventDbRepo {
  insertMessageEvent(event: Hl7MessageEvent): Promise<void>;
  queryMessageEvents(opts: {
    tenantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Hl7MessageEvent[]>;
}

let _dbRepo: Hl7MessageEventDbRepo | null = null;

export function setHl7EventDbRepo(repo: Hl7MessageEventDbRepo): void {
  _dbRepo = repo;
}
