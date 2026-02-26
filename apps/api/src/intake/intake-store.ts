/**
 * Intake OS - Session & Event Store (Phase 28)
 *
 * In-memory stores for intake sessions, events, and QR snapshots.
 * Production: migrate to VistA TIU + external DB.
 *
 * VistA migration path:
 * 1. Sessions -> TIU Document stub (unsigned, class=INTAKE)
 * 2. Events -> Append to TIU addendum or custom VistA file
 * 3. QR snapshots -> TIU supplemental data or FHIR server
 * 4. Filing results -> Standard VistA RPCs per vistaTarget mapping
 */

import { randomBytes, createHash } from "node:crypto";
import type {
  IntakeSession,
  IntakeEvent,
  IntakeEventType,
  ActorType,
  QRSnapshot,
  QuestionnaireResponse,
  IntakeSessionStatus,
  IntakeContext,
  SubjectType,
  BrainProvider,
  KioskResumeToken,
} from "./types.js";

/* ------------------------------------------------------------------ */
/* Stores                                                               */
/* ------------------------------------------------------------------ */

const sessions = new Map<string, IntakeSession>();
const events: IntakeEvent[] = [];
const snapshots = new Map<string, QRSnapshot[]>(); // sessionId -> snapshots
const kioskTokens = new Map<string, KioskResumeToken>();

/* Phase 146: DB repo wiring */
let intakeDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initIntakeStoreRepo(repo: typeof intakeDbRepo): void { intakeDbRepo = repo; }

const MAX_SESSIONS = 10_000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h default
const KIOSK_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function genId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function hashQR(qr: QuestionnaireResponse): string {
  return createHash("sha256").update(JSON.stringify(qr)).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Valid status transitions                                             */
/* ------------------------------------------------------------------ */

const VALID_TRANSITIONS: Record<IntakeSessionStatus, IntakeSessionStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["submitted", "abandoned", "expired"],
  submitted: ["clinician_reviewed"],
  clinician_reviewed: ["filed", "filed_pending_integration"],
  filed: [],
  filed_pending_integration: ["filed"],
  expired: [],
  abandoned: [],
};

export function canTransition(from: IntakeSessionStatus, to: IntakeSessionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ------------------------------------------------------------------ */
/* Session CRUD                                                         */
/* ------------------------------------------------------------------ */

export function createSession(opts: {
  patientDfn: string | null;
  appointmentId?: string | null;
  subjectType: SubjectType;
  proxyDfn?: string | null;
  language?: string;
  context?: IntakeContext;
  brainProvider?: BrainProvider;
}): IntakeSession {
  if (sessions.size >= MAX_SESSIONS) {
    // Evict oldest expired/abandoned sessions
    for (const [id, s] of sessions) {
      if (s.status === "expired" || s.status === "abandoned") {
        sessions.delete(id);
      }
      if (sessions.size < MAX_SESSIONS * 0.8) break;
    }
  }

  const session: IntakeSession = {
    id: genId(),
    patientDfn: opts.patientDfn,
    appointmentId: opts.appointmentId ?? null,
    subjectType: opts.subjectType,
    proxyDfn: opts.proxyDfn ?? null,
    language: opts.language ?? "en",
    context: opts.context ?? {},
    status: "not_started",
    brainProvider: opts.brainProvider ?? (process.env.INTAKE_BRAIN_PROVIDER as BrainProvider) ?? "rules",
    questionnaireResponseVersion: 0,
    createdAt: now(),
    updatedAt: now(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  sessions.set(session.id, session);

  // Phase 146: Write-through to PG
  intakeDbRepo?.upsert({ id: session.id, tenantId: (session as any).tenantId ?? 'default', patientDfn: (session as any).patientDfn ?? '', status: session.status, data: JSON.stringify(session), createdAt: session.createdAt, updatedAt: (session as any).updatedAt ?? session.createdAt }).catch(() => {});

  appendEvent({
    sessionId: session.id,
    type: "session.created",
    actor: opts.patientDfn ?? "anonymous",
    actorType: opts.subjectType === "proxy" ? "proxy" : "patient",
    payload: {
      appointmentId: opts.appointmentId,
      language: session.language,
      brainProvider: session.brainProvider,
    },
  });

  return session;
}

export function getSession(id: string): IntakeSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  // Check expiry
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    if (canTransition(session.status, "expired")) {
      session.status = "expired";
      session.updatedAt = now();
      appendEvent({
        sessionId: id,
        type: "session.expired",
        actor: "system",
        actorType: "system",
        payload: {},
      });
    }
  }

  return session;
}

export function updateSessionStatus(id: string, newStatus: IntakeSessionStatus, actor: string, actorType: ActorType): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  if (!canTransition(session.status, newStatus)) return false;

  session.status = newStatus;
  session.updatedAt = now();
  return true;
}

export function updateSessionContext(id: string, context: Partial<IntakeContext>): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  session.context = { ...session.context, ...context };
  session.updatedAt = now();
  return true;
}

export function listSessionsByPatient(patientDfn: string): IntakeSession[] {
  const result: IntakeSession[] = [];
  for (const s of sessions.values()) {
    if (s.patientDfn === patientDfn) result.push(s);
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listSessionsByStatus(status: IntakeSessionStatus): IntakeSession[] {
  const result: IntakeSession[] = [];
  for (const s of sessions.values()) {
    if (s.status === status) result.push(s);
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listFilingQueue(): IntakeSession[] {
  return [
    ...listSessionsByStatus("clinician_reviewed"),
    ...listSessionsByStatus("submitted"),
  ];
}

/* ------------------------------------------------------------------ */
/* Event Log                                                            */
/* ------------------------------------------------------------------ */

export function appendEvent(opts: {
  sessionId: string;
  type: IntakeEventType;
  actor: string;
  actorType: ActorType;
  payload: Record<string, unknown>;
  questionId?: string;
  answerId?: string;
}): IntakeEvent {
  const event: IntakeEvent = {
    id: genId(),
    sessionId: opts.sessionId,
    timestamp: now(),
    type: opts.type,
    actor: opts.actor,
    actorType: opts.actorType,
    payload: opts.payload,
    questionId: opts.questionId,
    answerId: opts.answerId,
  };
  events.push(event);

  // Trim old events (keep last 100k)
  if (events.length > 100_000) {
    events.splice(0, events.length - 80_000);
  }

  return event;
}

export function getEventsForSession(sessionId: string): IntakeEvent[] {
  return events.filter((e) => e.sessionId === sessionId);
}

/* ------------------------------------------------------------------ */
/* QR Snapshots                                                         */
/* ------------------------------------------------------------------ */

export function saveSnapshot(
  sessionId: string,
  qr: QuestionnaireResponse,
  createdBy: string
): QRSnapshot {
  const session = sessions.get(sessionId);
  const version = session ? session.questionnaireResponseVersion + 1 : 1;

  const snap: QRSnapshot = {
    id: genId(),
    sessionId,
    version,
    contentHash: hashQR(qr),
    questionnaireResponse: qr,
    createdAt: now(),
    createdBy,
  };

  const list = snapshots.get(sessionId) ?? [];
  list.push(snap);
  snapshots.set(sessionId, list);

  if (session) {
    session.questionnaireResponseVersion = version;
    session.updatedAt = now();
  }

  return snap;
}

export function getLatestSnapshot(sessionId: string): QRSnapshot | undefined {
  const list = snapshots.get(sessionId);
  if (!list || list.length === 0) return undefined;
  return list[list.length - 1];
}

export function getSnapshotHistory(sessionId: string): QRSnapshot[] {
  return snapshots.get(sessionId) ?? [];
}

/* ------------------------------------------------------------------ */
/* Kiosk Resume Tokens                                                  */
/* ------------------------------------------------------------------ */

export function createKioskResumeToken(sessionId: string): KioskResumeToken {
  const token: KioskResumeToken = {
    token: randomBytes(32).toString("hex"),
    sessionId,
    expiresAt: new Date(Date.now() + KIOSK_TOKEN_TTL_MS).toISOString(),
    used: false,
  };
  kioskTokens.set(token.token, token);
  return token;
}

export function redeemKioskToken(tokenStr: string): string | null {
  const token = kioskTokens.get(tokenStr);
  if (!token) return null;
  if (token.used) return null;
  if (new Date(token.expiresAt) < new Date()) {
    kioskTokens.delete(tokenStr);
    return null;
  }
  token.used = true;
  return token.sessionId;
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

export function getIntakeStats(): {
  totalSessions: number;
  byStatus: Record<string, number>;
  totalEvents: number;
  totalSnapshots: number;
} {
  const byStatus: Record<string, number> = {};
  for (const s of sessions.values()) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }
  let totalSnaps = 0;
  for (const list of snapshots.values()) totalSnaps += list.length;

  return {
    totalSessions: sessions.size,
    byStatus,
    totalEvents: events.length,
    totalSnapshots: totalSnaps,
  };
}
