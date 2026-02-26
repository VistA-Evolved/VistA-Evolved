/**
 * Intake OS - API Routes (Phase 28)
 *
 * Endpoints for intake session management, adaptive questioning,
 * clinician review, filing, and kiosk support.
 *
 * Auth: portal_session for patient routes, clinician session for review/file.
 * Kiosk routes use kiosk_device_token (stubbed for Phase 28).
 */

import type { FastifyInstance } from "fastify";
import {
  createSession,
  getSession,
  updateSessionStatus,
  updateSessionContext,
  listSessionsByPatient,
  listFilingQueue,
  appendEvent,
  saveSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  getEventsForSession,
  getIntakeStats,
  createKioskResumeToken,
  redeemKioskToken,
} from "./intake-store.js";
import { createNextQuestionProvider } from "./providers.js";
import { createSummaryProvider } from "./summary-provider.js";
import { getAllPacks, getPack, getPackCount } from "./pack-registry.js";
import type {
  QuestionnaireResponse,
  IntakeContext,
  IntakeSessionStatus,
} from "./types.js";

/* ------------------------------------------------------------------ */
/* Session resolver helpers                                             */
/* ------------------------------------------------------------------ */

type PortalSessionFn = (req: any) => { patientDfn: string; patientName: string } | null;
type ClinicianSessionFn = (req: any) => { duz: string; name: string } | null | Promise<{ duz: string; name: string } | null>;

let getPortalSessionFn: PortalSessionFn = () => null;
let getClinicianSessionFn: ClinicianSessionFn = () => null;

export function initIntakeRoutes(
  portalSessionFn: PortalSessionFn,
  clinicianSessionFn: ClinicianSessionFn
): void {
  getPortalSessionFn = portalSessionFn;
  getClinicianSessionFn = clinicianSessionFn;
}

function requirePortalSession(request: any, reply: any): { patientDfn: string; patientName: string } | null {
  const session = getPortalSessionFn(request);
  if (!session) {
    reply.code(401).send({ error: "Portal session required" });
    return null;
  }
  return session;
}

async function requireClinicianSession(request: any, reply: any): Promise<{ duz: string; name: string } | null> {
  const session = await getClinicianSessionFn(request);
  if (!session) {
    reply.code(401).send({ error: "Clinician session required" });
    return null;
  }
  return session;
}

/* ------------------------------------------------------------------ */
/* Route Plugin                                                         */
/* ------------------------------------------------------------------ */

export default async function intakeRoutes(server: FastifyInstance): Promise<void> {

  // =============================================
  // PATIENT / PORTAL ROUTES
  // =============================================

  /** Create new intake session */
  server.post("/intake/sessions", async (request, reply) => {
    const portal = requirePortalSession(request, reply);
    if (!portal) return;

    const body = (request.body as any) || {};
    const session = createSession({
      patientDfn: portal.patientDfn,
      appointmentId: body.appointmentId ?? null,
      subjectType: body.subjectType ?? "patient",
      proxyDfn: body.proxyDfn ?? null,
      language: body.language ?? "en",
      context: body.context ?? {},
      brainProvider: body.brainProvider,
    });

    return { ok: true, session };
  });

  /** Get session state + current QR snapshot */
  server.get("/intake/sessions/:id", async (request, reply) => {
    // Allow both portal and clinician sessions
    const portal = getPortalSessionFn(request);
    const clinician = await getClinicianSessionFn(request);
    if (!portal && !clinician) {
      return reply.code(401).send({ error: "Session required" });
    }

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }

    // Access check: portal users can only see their own sessions
    if (portal && session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const snapshot = getLatestSnapshot(id);
    const provider = createNextQuestionProvider(session.brainProvider);
    const qr: QuestionnaireResponse = snapshot?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [],
    };
    const progress = await provider.getNext(session, qr, session.context);

    return {
      ok: true,
      session,
      questionnaireResponse: qr,
      progress: progress.progress,
    };
  });

  /** SDC-like $next-question */
  server.post("/intake/sessions/:id/next-question", async (request, reply) => {
    const portal = requirePortalSession(request, reply);
    if (!portal) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const body = (request.body as any) || {};
    const qrSoFar: QuestionnaireResponse = body.questionnaireResponseSoFar ?? {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [],
    };

    // Update context if provided
    if (body.context) {
      updateSessionContext(id, body.context);
    }

    // Transition to in_progress if not started
    if (session.status === "not_started") {
      updateSessionStatus(id, "in_progress", portal.patientDfn, "patient");
    }

    const provider = createNextQuestionProvider(session.brainProvider);
    const result = await provider.getNext(session, qrSoFar, session.context);

    // Log the ask event
    if (result.nextItems.length > 0) {
      appendEvent({
        sessionId: id,
        type: "question.asked",
        actor: portal.patientDfn,
        actorType: "patient",
        payload: {
          itemCount: result.nextItems.length,
          linkIds: result.nextItems.map((i) => i.linkId),
        },
      });
    }

    return { ok: true, ...result };
  });

  /** Submit answers */
  server.post("/intake/sessions/:id/answers", async (request, reply) => {
    const portal = requirePortalSession(request, reply);
    if (!portal) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const body = (request.body as any) || {};
    const answers = body.answers ?? [];

    // Get current QR
    const existing = getLatestSnapshot(id);
    const qr: QuestionnaireResponse = existing?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [],
    };

    // Merge new answers into QR
    for (const ans of answers) {
      const linkId = ans.linkId;
      const existingItem = qr.item.find((i) => i.linkId === linkId);
      if (existingItem) {
        existingItem.answer = ans.answer;
        // Log edit
        appendEvent({
          sessionId: id,
          type: "answer.edited",
          actor: portal.patientDfn,
          actorType: "patient",
          payload: { linkId },
          questionId: linkId,
        });
      } else {
        qr.item.push({ linkId, text: ans.text, answer: ans.answer });
        appendEvent({
          sessionId: id,
          type: "question.answered",
          actor: portal.patientDfn,
          actorType: "patient",
          payload: { linkId },
          questionId: linkId,
        });
      }
    }

    // Save snapshot
    const snap = saveSnapshot(id, qr, portal.patientDfn);

    // Optionally get next questions
    let nextItems;
    if (body.saveAndContinue !== false) {
      const provider = createNextQuestionProvider(session.brainProvider);
      const next = await provider.getNext(session, qr, session.context);
      nextItems = next.nextItems;
    }

    return {
      ok: true,
      questionnaireResponse: qr,
      version: snap.version,
      nextItems,
    };
  });

  /** Save draft */
  server.post("/intake/sessions/:id/save", async (request, reply) => {
    const portal = requirePortalSession(request, reply);
    if (!portal) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    appendEvent({
      sessionId: id,
      type: "intake.save_draft",
      actor: portal.patientDfn,
      actorType: "patient",
      payload: {},
    });

    return { ok: true, message: "Draft saved" };
  });

  /** Submit completed intake */
  server.post("/intake/sessions/:id/submit", async (request, reply) => {
    const portal = requirePortalSession(request, reply);
    if (!portal) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    // Transition to submitted
    const ok = updateSessionStatus(id, "submitted", portal.patientDfn, "patient");
    if (!ok) {
      return reply.code(400).send({ error: "Cannot submit from current status" });
    }

    appendEvent({
      sessionId: id,
      type: "intake.submitted",
      actor: portal.patientDfn,
      actorType: "patient",
      payload: {},
    });

    // Generate summary
    const snap = getLatestSnapshot(id);
    const qr = snap?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse" as const,
      status: "completed" as const,
      item: [],
    };
    const summaryProvider = createSummaryProvider();
    const summary = await summaryProvider.generate(session, qr, session.context);

    appendEvent({
      sessionId: id,
      type: "summary.generated",
      actor: "system",
      actorType: "system",
      payload: { generatedBy: summary.generatedBy, redFlagCount: summary.sections.redFlags.length },
    });

    return { ok: true, session: getSession(id), summary };
  });

  /** List my sessions */
  server.get("/intake/sessions", async (request, reply) => {
    const portal = requirePortalSession(request, reply);
    if (!portal) return;

    const sessions = listSessionsByPatient(portal.patientDfn);
    return { ok: true, sessions };
  });

  // =============================================
  // CLINICIAN REVIEW ROUTES
  // =============================================

  /** List intakes for a specific patient (clinician view) */
  server.get("/intake/by-patient/:dfn", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { dfn } = request.params as { dfn: string };
    const sessions = listSessionsByPatient(dfn);
    return { ok: true, sessions };
  });

  /** Get intake for clinician review */
  server.get("/intake/sessions/:id/review", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }

    appendEvent({
      sessionId: id,
      type: "clinician.opened",
      actor: clinician.duz,
      actorType: "clinician",
      payload: { clinicianName: clinician.name },
    });

    const snap = getLatestSnapshot(id);
    const qr = snap?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse" as const,
      status: "in-progress" as const,
      item: [],
    };
    const summaryProvider = createSummaryProvider();
    const summary = await summaryProvider.generate(session, qr, session.context);
    const events = getEventsForSession(id);

    return { ok: true, session, summary, questionnaireResponse: qr, events };
  });

  /** Clinician edit/confirm */
  server.put("/intake/sessions/:id/review", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }

    const body = (request.body as any) || {};

    if (body.edits?.length) {
      // Apply clinician edits to QR
      const snap = getLatestSnapshot(id);
      const qr = snap?.questionnaireResponse ?? {
        resourceType: "QuestionnaireResponse" as const,
        status: "in-progress" as const,
        item: [],
      };

      for (const edit of body.edits) {
        const existing = qr.item.find((i) => i.linkId === edit.linkId);
        if (existing) {
          existing.answer = edit.answer;
        } else {
          qr.item.push({ linkId: edit.linkId, answer: edit.answer });
        }
        appendEvent({
          sessionId: id,
          type: "clinician.edited",
          actor: clinician.duz,
          actorType: "clinician",
          payload: { linkId: edit.linkId },
          questionId: edit.linkId,
        });
      }

      saveSnapshot(id, qr, clinician.duz);
    }

    if (body.reviewed) {
      updateSessionStatus(id, "clinician_reviewed", clinician.duz, "clinician");
      appendEvent({
        sessionId: id,
        type: "clinician.reviewed",
        actor: clinician.duz,
        actorType: "clinician",
        payload: { clinicianName: clinician.name },
      });
    }

    return { ok: true, session: getSession(id) };
  });

  /** File reviewed intake to VistA */
  server.post("/intake/sessions/:id/file", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }

    if (session.status !== "clinician_reviewed") {
      return reply.code(400).send({ error: "Session must be reviewed before filing" });
    }

    const body = (request.body as any) || {};

    // Filing is never automatic: clinician must explicitly trigger
    // For now, mark as filed_pending_integration since VistA RPCs
    // for intake-specific filing are not yet wired
    const newStatus: IntakeSessionStatus =
      body.targets?.length > 0 ? "filed_pending_integration" : "filed_pending_integration";

    updateSessionStatus(id, newStatus, clinician.duz, "clinician");

    appendEvent({
      sessionId: id,
      type: "clinician.filed",
      actor: clinician.duz,
      actorType: "clinician",
      payload: {
        clinicianName: clinician.name,
        targetCount: body.targets?.length ?? 0,
        noteText: body.noteText ? "[present]" : "[absent]",
      },
    });

    // In future: iterate targets, call VistA RPCs per vistaTarget mapping
    const filingResults = (body.targets ?? []).map((t: any) => ({
      questionLinkId: t.questionLinkId ?? "unknown",
      status: t.vistaTarget?.integrationStatus === "available" ? "pending" : "pending",
      message: "VistA filing integration pending",
    }));

    return { ok: true, session: getSession(id), filingResults };
  });

  /** Export draft note */
  server.post("/intake/sessions/:id/export", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }

    const snap = getLatestSnapshot(id);
    const qr = snap?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse" as const,
      status: "in-progress" as const,
      item: [],
    };
    const summaryProvider = createSummaryProvider();
    const summary = await summaryProvider.generate(session, qr, session.context);

    appendEvent({
      sessionId: id,
      type: "clinician.exported",
      actor: clinician.duz,
      actorType: "clinician",
      payload: { format: "text" },
    });

    return { ok: true, noteText: summary.draftNoteText, format: "text" };
  });

  /** Filing queue */
  server.get("/intake/filing-queue", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const queue = listFilingQueue();
    return { ok: true, sessions: queue };
  });

  // =============================================
  // KIOSK ROUTES
  // =============================================

  /** Start kiosk session */
  server.post("/kiosk/sessions", async (request, reply) => {
    // Kiosk auth is simplified: device token or open access
    // In production, require kiosk device registration
    const body = (request.body as any) || {};

    // Resume from token?
    if (body.resumeToken) {
      const sessionId = redeemKioskToken(body.resumeToken);
      if (sessionId) {
        const session = getSession(sessionId);
        if (session) {
          appendEvent({
            sessionId,
            type: "session.resumed",
            actor: session.patientDfn ?? "anonymous",
            actorType: "patient",
            payload: { via: "kiosk_resume_token" },
          });
          return { ok: true, session };
        }
      }
      return reply.code(400).send({ error: "Invalid or expired resume token" });
    }

    const session = createSession({
      patientDfn: body.patientDfn ?? null,
      appointmentId: body.appointmentId ?? null,
      subjectType: "patient",
      language: body.language ?? "en",
      context: body.context ?? {},
    });

    const resumeToken = createKioskResumeToken(session.id);

    return { ok: true, session, resumeToken: resumeToken.token };
  });

  /** Generate resume token for QR code */
  server.post("/kiosk/sessions/:id/resume-token", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Session not found" });
    }

    const token = createKioskResumeToken(id);
    return { ok: true, token: token.token, expiresAt: token.expiresAt };
  });

  // =============================================
  // PACK MANAGEMENT (read-only for now)
  // =============================================

  /** List packs */
  server.get("/intake/packs", async (request, reply) => {
    // Allow both portal and clinician
    const portal = getPortalSessionFn(request);
    const clinician = await getClinicianSessionFn(request);
    if (!portal && !clinician) {
      return reply.code(401).send({ error: "Session required" });
    }

    const packs = getAllPacks().map((p) => ({
      packId: p.packId,
      version: p.version,
      title: p.title,
      description: p.description,
      languages: p.languages,
      specialtyTags: p.specialtyTags,
      departmentTags: p.departmentTags,
      itemCount: p.items.length,
    }));

    return { ok: true, packs, count: packs.length };
  });

  /** Get pack detail */
  server.get("/intake/packs/:packId", async (request, reply) => {
    const portal = getPortalSessionFn(request);
    const clinician = await getClinicianSessionFn(request);
    if (!portal && !clinician) {
      return reply.code(401).send({ error: "Session required" });
    }

    const { packId } = request.params as { packId: string };
    const pack = getPack(packId);
    if (!pack) {
      return reply.code(404).send({ error: "Pack not found" });
    }

    return { ok: true, pack };
  });

  // =============================================
  // INTAKE STATS (admin)
  // =============================================

  server.get("/intake/stats", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    return { ok: true, stats: getIntakeStats(), packCount: getPackCount() };
  });

  // =============================================
  // EVENT LOG (clinician, for audit)
  // =============================================

  server.get("/intake/sessions/:id/events", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { id } = request.params as { id: string };
    const evts = getEventsForSession(id);
    return { ok: true, events: evts };
  });

  // =============================================
  // SNAPSHOT HISTORY (clinician, for audit)
  // =============================================

  server.get("/intake/sessions/:id/snapshots", async (request, reply) => {
    const clinician = await requireClinicianSession(request, reply);
    if (!clinician) return;

    const { id } = request.params as { id: string };
    const snaps = getSnapshotHistory(id);
    return { ok: true, snapshots: snaps.map((s) => ({ ...s, questionnaireResponse: undefined, contentHash: s.contentHash })) };
  });
}
