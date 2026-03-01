/**
 * Integration Onboarding Routes — Phase 325 (W14-P9)
 *
 * 16 REST endpoints for guided partner onboarding:
 *  - Templates: create, list, get
 *  - Sessions: start, get, list, advance step, pause, resume, abandon
 *  - Readiness: run check, get report
 *  - Stats: onboarding dashboard
 */

import { FastifyInstance } from "fastify";
import {
  createTemplate,
  getTemplate,
  listTemplates,
  startOnboarding,
  getSession,
  listSessions,
  advanceStep,
  pauseSession,
  resumeSession,
  abandonSession,
  runReadinessCheck,
  getReadinessReport,
  getOnboardingStats,
  seedOnboardingTemplates,
} from "../services/integration-onboarding.js";

export default async function onboardingRoutes(server: FastifyInstance): Promise<void> {
  // Seed built-in templates on first load
  seedOnboardingTemplates();

  /* ── Template endpoints ──────────────────────────────────────── */

  server.post("/onboarding/templates", async (request, reply) => {
    const body = (request.body as any) || {};
    const { name, description, integrationType, steps } = body;
    if (!name || !integrationType || !steps?.length) {
      return reply.code(400).send({ ok: false, error: "name, integrationType, and steps[] required" });
    }
    const template = createTemplate({ name, description: description || "", integrationType, steps });
    return reply.code(201).send({ ok: true, template });
  });

  server.get("/onboarding/templates", async (request) => {
    const { integrationType } = request.query as any;
    return { ok: true, templates: listTemplates(integrationType) };
  });

  server.get("/onboarding/templates/:id", async (request, reply) => {
    const { id } = request.params as any;
    const template = getTemplate(id);
    if (!template) return reply.code(404).send({ ok: false, error: "template_not_found" });
    return { ok: true, template };
  });

  /* ── Session endpoints ───────────────────────────────────────── */

  server.post("/onboarding/sessions", async (request, reply) => {
    const body = (request.body as any) || {};
    const { templateId, partnerId, partnerName, tenantId, assignee, metadata } = body;
    if (!templateId || !partnerId || !partnerName || !tenantId) {
      return reply.code(400).send({ ok: false, error: "templateId, partnerId, partnerName, tenantId required" });
    }
    try {
      const session = startOnboarding({ templateId, partnerId, partnerName, tenantId, assignee, metadata });
      return reply.code(201).send({ ok: true, session });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message });
    }
  });

  server.get("/onboarding/sessions", async (request) => {
    const q = request.query as any;
    return {
      ok: true,
      sessions: listSessions({ partnerId: q.partnerId, tenantId: q.tenantId, status: q.status }),
    };
  });

  server.get("/onboarding/sessions/:id", async (request, reply) => {
    const { id } = request.params as any;
    const session = getSession(id);
    if (!session) return reply.code(404).send({ ok: false, error: "session_not_found" });
    return { ok: true, session };
  });

  server.post("/onboarding/sessions/:id/steps/:stepId", async (request, reply) => {
    const { id, stepId } = request.params as any;
    const body = (request.body as any) || {};
    const { action, notes } = body;
    if (!action || !["start", "complete", "skip"].includes(action)) {
      return reply.code(400).send({ ok: false, error: "action must be: start, complete, or skip" });
    }
    const ok = advanceStep(id, stepId, action, notes);
    if (!ok) {
      return reply.code(400).send({ ok: false, error: "step_advance_failed (check prerequisites/session status)" });
    }
    const session = getSession(id);
    return { ok: true, session };
  });

  server.post("/onboarding/sessions/:id/pause", async (request, reply) => {
    const { id } = request.params as any;
    if (!pauseSession(id)) {
      return reply.code(404).send({ ok: false, error: "session_not_found_or_not_active" });
    }
    return { ok: true, status: "paused" };
  });

  server.post("/onboarding/sessions/:id/resume", async (request, reply) => {
    const { id } = request.params as any;
    if (!resumeSession(id)) {
      return reply.code(404).send({ ok: false, error: "session_not_found_or_not_paused" });
    }
    return { ok: true, status: "active" };
  });

  server.post("/onboarding/sessions/:id/abandon", async (request, reply) => {
    const { id } = request.params as any;
    if (!abandonSession(id)) {
      return reply.code(404).send({ ok: false, error: "session_not_found_or_already_completed" });
    }
    return { ok: true, status: "abandoned" };
  });

  /* ── Readiness endpoints ─────────────────────────────────────── */

  server.post("/onboarding/sessions/:id/readiness", async (request, reply) => {
    const { id } = request.params as any;
    try {
      const report = runReadinessCheck(id);
      return { ok: true, report };
    } catch (err: any) {
      return reply.code(404).send({ ok: false, error: err.message });
    }
  });

  server.get("/onboarding/sessions/:id/readiness", async (request, reply) => {
    const { id } = request.params as any;
    const report = getReadinessReport(id);
    if (!report) return reply.code(404).send({ ok: false, error: "no_readiness_report" });
    return { ok: true, report };
  });

  /* ── Stats ─────────────────────────────────────────────────────── */

  server.get("/onboarding/stats", async () => {
    return { ok: true, stats: getOnboardingStats() };
  });
}
