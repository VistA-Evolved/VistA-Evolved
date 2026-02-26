/**
 * Intake Brain Routes (Phase 143)
 *
 * API endpoints for the brain plugin system:
 *   - GET  /intake/providers          — list available brain providers
 *   - GET  /intake/providers/health   — health check all providers
 *   - POST /intake/sessions/:id/brain/start     — start brain session
 *   - POST /intake/sessions/:id/brain/next      — brain-driven next question
 *   - POST /intake/sessions/:id/brain/submit    — brain-driven answer submit
 *   - POST /intake/sessions/:id/brain/summary   — brain-driven summary
 *   - POST /intake/sessions/:id/tiu-draft       — generate TIU draft note
 *   - GET  /intake/brain/audit                  — brain decision audit log
 *   - GET  /intake/brain/audit/stats            — brain audit statistics
 */

import type { FastifyInstance } from "fastify";
import {
  resolveBrainPlugin,
  listBrainPlugins,
  checkAllBrainHealth,
  logBrainDecision,
  getBrainDecisionAudit,
  getBrainAuditStats,
  hashForAudit,
} from "./brain/index.js";
import type { BrainSessionState } from "./brain/types.js";
import {
  getSession,
  getLatestSnapshot,
  appendEvent,
  saveSnapshot,
  updateSessionStatus,
} from "./intake-store.js";
import type { QuestionnaireResponse } from "./types.js";

/* ------------------------------------------------------------------ */
/* Session + brain state storage (in-memory)                            */
/* ------------------------------------------------------------------ */

/** Per-session brain state: maps sessionId -> BrainSessionState */
const brainStates = new Map<string, BrainSessionState>();

/* ------------------------------------------------------------------ */
/* Session resolver helpers (same pattern as intake-routes)              */
/* ------------------------------------------------------------------ */

type PortalSessionFn = (req: any) => { patientDfn: string; patientName: string } | null;
type ClinicianSessionFn = (req: any) => { duz: string; name: string } | null | Promise<{ duz: string; name: string } | null>;

let getPortalSessionFn: PortalSessionFn = () => null;
let getClinicianSessionFn: ClinicianSessionFn = () => null;

export function initBrainRoutes(
  portalSessionFn: PortalSessionFn,
  clinicianSessionFn: ClinicianSessionFn
): void {
  getPortalSessionFn = portalSessionFn;
  getClinicianSessionFn = clinicianSessionFn;
}

/* ------------------------------------------------------------------ */
/* Route Plugin                                                         */
/* ------------------------------------------------------------------ */

export default async function intakeBrainRoutes(server: FastifyInstance): Promise<void> {

  // =============================================
  // PROVIDER MANAGEMENT (session required)
  // =============================================

  /** List available brain providers */
  server.get("/intake/providers", async (request, reply) => {
    const portal = getPortalSessionFn(request);
    const clinician = await getClinicianSessionFn(request);
    if (!portal && !clinician) {
      return reply.code(401).send({ error: "Session required" });
    }

    const providers = listBrainPlugins();
    return { ok: true, providers };
  });

  /** Health check all brain providers */
  server.get("/intake/providers/health", async (request, reply) => {
    const clinician = await getClinicianSessionFn(request);
    if (!clinician) {
      return reply.code(401).send({ error: "Clinician session required" });
    }

    const health = await checkAllBrainHealth();
    return { ok: true, health };
  });

  // =============================================
  // BRAIN SESSION LIFECYCLE (portal)
  // =============================================

  /** Start a brain session for an intake session */
  server.post("/intake/sessions/:id/brain/start", async (request, reply) => {
    const portal = getPortalSessionFn(request);
    if (!portal) {
      return reply.code(401).send({ error: "Portal session required" });
    }

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    const body = (request.body as any) || {};
    const requestedProvider = body.providerId ?? session.brainProvider ?? "rules_engine";
    const { plugin, fellBack, originalId } = resolveBrainPlugin(requestedProvider);

    const startTime = Date.now();
    const brainState = await plugin.startSession(session, session.context);
    const latencyMs = Date.now() - startTime;

    brainStates.set(id, brainState);

    // Audit
    logBrainDecision({
      sessionId: id,
      providerId: plugin.id,
      providerFamily: plugin.family,
      decisionType: "start_session",
      inputHash: hashForAudit({ sessionId: id, context: session.context }),
      outputHash: hashForAudit(brainState),
      usedLlm: false,
      phiRedacted: false,
      latencyMs,
      fellBackToRules: fellBack,
      safetyWarnings: [],
    });

    appendEvent({
      sessionId: id,
      type: "session.created",
      actor: portal.patientDfn,
      actorType: "patient",
      payload: {
        brainProvider: plugin.id,
        fellBack,
        originalProvider: originalId,
      },
    });

    return {
      ok: true,
      providerId: plugin.id,
      providerName: plugin.name,
      fellBack,
      brainState: {
        turnsCompleted: brainState.turnsCompleted,
        estimatedTurnsRemaining: brainState.estimatedTurnsRemaining,
        activeComplaintClusters: brainState.activeComplaintClusters,
      },
    };
  });

  /** Brain-driven next question */
  server.post("/intake/sessions/:id/brain/next", async (request, reply) => {
    const portal = getPortalSessionFn(request);
    if (!portal) {
      return reply.code(401).send({ error: "Portal session required" });
    }

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    // Get or create brain state
    let brainState = brainStates.get(id);
    const requestedProvider = session.brainProvider ?? "rules_engine";
    const { plugin, fellBack } = resolveBrainPlugin(requestedProvider);

    if (!brainState) {
      brainState = await plugin.startSession(session, session.context);
      brainStates.set(id, brainState);
    }

    const body = (request.body as any) || {};
    const qrSoFar: QuestionnaireResponse = body.questionnaireResponseSoFar ?? {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [],
    };

    // Transition to in_progress if needed
    if (session.status === "not_started") {
      updateSessionStatus(id, "in_progress", portal.patientDfn, "patient");
    }

    const startTime = Date.now();
    const result = await plugin.nextQuestion(session, qrSoFar, session.context, brainState);
    const latencyMs = Date.now() - startTime;

    // Update stored brain state
    brainStates.set(id, result.brainState);

    // Audit
    logBrainDecision({
      sessionId: id,
      providerId: plugin.id,
      providerFamily: plugin.family,
      decisionType: "next_question",
      inputHash: hashForAudit({ qrItemCount: qrSoFar.item.length }),
      outputHash: hashForAudit({ nextItemCount: result.nextItems.length, isComplete: result.isComplete }),
      usedLlm: result.usedLlm,
      phiRedacted: false,
      latencyMs,
      fellBackToRules: fellBack,
      safetyWarnings: [],
    });

    if (result.nextItems.length > 0) {
      appendEvent({
        sessionId: id,
        type: "question.asked",
        actor: portal.patientDfn,
        actorType: "patient",
        payload: {
          brainProvider: plugin.id,
          itemCount: result.nextItems.length,
          usedLlm: result.usedLlm,
          linkIds: result.nextItems.map((i) => i.linkId),
        },
      });
    }

    return {
      ok: true,
      ...result,
      brainState: {
        turnsCompleted: result.brainState.turnsCompleted,
        estimatedTurnsRemaining: result.brainState.estimatedTurnsRemaining,
        activeComplaintClusters: result.brainState.activeComplaintClusters,
      },
    };
  });

  /** Brain-driven answer submission */
  server.post("/intake/sessions/:id/brain/submit", async (request, reply) => {
    const portal = getPortalSessionFn(request);
    if (!portal) {
      return reply.code(401).send({ error: "Portal session required" });
    }

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }
    if (session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    let brainState = brainStates.get(id);
    const requestedProvider = session.brainProvider ?? "rules_engine";
    const { plugin, fellBack } = resolveBrainPlugin(requestedProvider);

    if (!brainState) {
      brainState = await plugin.startSession(session, session.context);
      brainStates.set(id, brainState);
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

    // Merge answers
    for (const ans of answers) {
      const existingItem = qr.item.find((i: any) => i.linkId === ans.linkId);
      if (existingItem) {
        existingItem.answer = ans.answer;
      } else {
        qr.item.push({ linkId: ans.linkId, text: ans.text, answer: ans.answer });
      }
    }

    // Save snapshot
    saveSnapshot(id, qr, portal.patientDfn);

    // Process through brain
    const startTime = Date.now();
    const result = await plugin.submitAnswer(session, qr, answers, session.context, brainState);
    const latencyMs = Date.now() - startTime;

    brainStates.set(id, result.brainState);

    // Audit
    logBrainDecision({
      sessionId: id,
      providerId: plugin.id,
      providerFamily: plugin.family,
      decisionType: "submit_answer",
      inputHash: hashForAudit({ answerCount: answers.length }),
      outputHash: hashForAudit({ followUpCount: result.followUpItems.length, redFlagCount: result.newRedFlags.length }),
      usedLlm: false,
      phiRedacted: false,
      latencyMs,
      fellBackToRules: fellBack,
      safetyWarnings: result.newRedFlags.map((rf) => `[${rf.severity}] ${rf.flag}`),
    });

    for (const ans of answers) {
      appendEvent({
        sessionId: id,
        type: "question.answered",
        actor: portal.patientDfn,
        actorType: "patient",
        payload: { linkId: ans.linkId, brainProvider: plugin.id },
        questionId: ans.linkId,
      });
    }

    return {
      ok: true,
      questionnaireResponse: qr,
      followUpItems: result.followUpItems,
      newRedFlags: result.newRedFlags,
      clusterUpdates: result.clusterUpdates,
      brainState: {
        turnsCompleted: result.brainState.turnsCompleted,
        estimatedTurnsRemaining: result.brainState.estimatedTurnsRemaining,
        activeComplaintClusters: result.brainState.activeComplaintClusters,
      },
    };
  });

  /** Brain-driven summary generation */
  server.post("/intake/sessions/:id/brain/summary", async (request, reply) => {
    // Allow both portal and clinician
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

    // Access check
    if (portal && session.patientDfn !== portal.patientDfn) {
      return reply.code(403).send({ error: "Access denied" });
    }

    let brainState = brainStates.get(id);
    const requestedProvider = session.brainProvider ?? "rules_engine";
    const { plugin, fellBack } = resolveBrainPlugin(requestedProvider);

    if (!brainState) {
      brainState = await plugin.startSession(session, session.context);
    }

    const snap = getLatestSnapshot(id);
    const qr: QuestionnaireResponse = snap?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      item: [],
    };

    const startTime = Date.now();
    const summary = await plugin.finalizeSummary(session, qr, session.context, brainState);
    const latencyMs = Date.now() - startTime;

    // Audit
    logBrainDecision({
      sessionId: id,
      providerId: plugin.id,
      providerFamily: plugin.family,
      decisionType: "finalize_summary",
      inputHash: hashForAudit({ qrItemCount: qr.item.length }),
      outputHash: hashForAudit({ citationCount: summary.citations.length, tiuReady: summary.tiuReady }),
      usedLlm: summary.generatedBy === "llm_constrained",
      phiRedacted: false,
      latencyMs,
      fellBackToRules: fellBack,
      safetyWarnings: summary.governance.containsDiagnosis
        ? ["Summary contained diagnosis -- blocked"]
        : [],
    });

    appendEvent({
      sessionId: id,
      type: "summary.generated",
      actor: portal?.patientDfn ?? clinician?.duz ?? "system",
      actorType: portal ? "patient" : "clinician",
      payload: {
        brainProvider: plugin.id,
        generatedBy: summary.generatedBy,
        tiuReady: summary.tiuReady,
        citationCount: summary.citations.length,
        redFlagCount: summary.sections.redFlags.length,
      },
    });

    return {
      ok: true,
      summary,
      governance: summary.governance,
    };
  });

  // =============================================
  // TIU DRAFT NOTE EXPORT
  // =============================================

  /** Generate TIU-ready draft note for VistA filing */
  server.post("/intake/sessions/:id/tiu-draft", async (request, reply) => {
    const clinician = await getClinicianSessionFn(request);
    if (!clinician) {
      return reply.code(401).send({ error: "Clinician session required" });
    }

    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) {
      return reply.code(404).send({ error: "Intake session not found" });
    }

    let brainState = brainStates.get(id);
    const requestedProvider = session.brainProvider ?? "rules_engine";
    const { plugin } = resolveBrainPlugin(requestedProvider);

    if (!brainState) {
      brainState = await plugin.startSession(session, session.context);
    }

    const snap = getLatestSnapshot(id);
    const qr: QuestionnaireResponse = snap?.questionnaireResponse ?? {
      resourceType: "QuestionnaireResponse",
      status: "completed",
      item: [],
    };

    const summary = await plugin.finalizeSummary(session, qr, session.context, brainState);

    // Build TIU-ready note structure
    const tiuDraft = {
      noteTitle: summary.tiuNoteTitle,
      noteText: summary.draftNoteText,
      tiuReady: summary.tiuReady,
      patientDfn: session.patientDfn,
      authorDuz: clinician.duz,
      authorName: clinician.name,
      sessionId: session.id,
      generatedAt: new Date().toISOString(),
      generatedBy: summary.generatedBy,
      providerId: summary.providerId,
      governance: summary.governance,
      sections: {
        hpi: summary.sections.hpiNarrative,
        rosCount: summary.sections.reviewOfSystems.filter((r) => r.status !== "not_asked").length,
        redFlagCount: summary.sections.redFlags.length,
        citationCount: summary.citations.length,
      },
      vistaIntegration: {
        status: "draft_ready",
        targetRpcs: ["TIU CREATE RECORD", "TIU SET DOCUMENT TEXT"],
        requiresSignature: true,
        note: "Draft note requires clinician review and electronic signature before filing to VistA",
      },
    };

    appendEvent({
      sessionId: id,
      type: "clinician.exported",
      actor: clinician.duz,
      actorType: "clinician",
      payload: {
        format: "tiu-draft",
        brainProvider: summary.providerId,
        tiuReady: summary.tiuReady,
      },
    });

    return { ok: true, tiuDraft };
  });

  // =============================================
  // BRAIN AUDIT (clinician / admin)
  // =============================================

  /** Get brain decision audit log */
  server.get("/intake/brain/audit", async (request, reply) => {
    const clinician = await getClinicianSessionFn(request);
    if (!clinician) {
      return reply.code(401).send({ error: "Clinician session required" });
    }

    const query = request.query as any;
    const audit = getBrainDecisionAudit({
      sessionId: query.sessionId,
      providerId: query.providerId,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
    });

    return { ok: true, audit, count: audit.length };
  });

  /** Brain audit statistics */
  server.get("/intake/brain/audit/stats", async (request, reply) => {
    const clinician = await getClinicianSessionFn(request);
    if (!clinician) {
      return reply.code(401).send({ error: "Clinician session required" });
    }

    return { ok: true, stats: getBrainAuditStats() };
  });
}
