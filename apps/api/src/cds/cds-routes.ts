/**
 * Phase 395 (W22-P7): CDS Hooks + SMART Launch -- REST Routes
 *
 * CDS Hooks (HL7 CDS Hooks 1.0 spec):
 *   GET  /cds/services                     -- Discovery endpoint
 *   POST /cds/services                     -- Register a CDS service (admin)
 *   DELETE /cds/services/:id               -- Unregister service (admin)
 *   POST /cds/services/:id                 -- Invoke hook on a service
 *   POST /cds/feedback                     -- Submit card feedback
 *   GET  /cds/invocations                  -- Invocation log
 *
 * CDS Rules:
 *   GET  /cds/rules                        -- List rules
 *   POST /cds/rules                        -- Create rule (admin)
 *   GET  /cds/rules/:id                    -- Get single rule
 *   PUT  /cds/rules/:id                    -- Update rule (admin)
 *   DELETE /cds/rules/:id                  -- Delete rule (admin)
 *
 * CQF Ruler:
 *   GET  /cds/cqf/config                   -- Get CQF Ruler config
 *   PUT  /cds/cqf/config                   -- Update CQF Ruler config (admin)
 *
 * SMART on FHIR:
 *   GET  /cds/smart/apps                   -- List SMART apps
 *   POST /cds/smart/apps                   -- Register SMART app (admin)
 *   GET  /cds/smart/apps/:id               -- Get SMART app
 *   PUT  /cds/smart/apps/:id               -- Update SMART app (admin)
 *   DELETE /cds/smart/apps/:id             -- Delete SMART app (admin)
 *   POST /cds/smart/launch                 -- Create launch context
 *   GET  /cds/smart/launch/:token          -- Resolve launch context
 *   POST /cds/smart/launch/:token/consume  -- Consume launch context
 *
 * Dashboard:
 *   GET  /cds/dashboard                    -- CDS dashboard stats
 *   GET  /cds/feedback-log                 -- Feedback log
 *
 * Auth: session-based; admin for service/rule/app management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import {
  listCdsServices,
  getCdsService,
  registerCdsService,
  unregisterCdsService,
  listCdsRules,
  getCdsRule,
  createCdsRule,
  updateCdsRule,
  deleteCdsRule,
  invokeHook,
  getCqfRulerConfig,
  setCqfRulerConfig,
  listSmartApps,
  getSmartApp,
  createSmartApp,
  updateSmartApp,
  deleteSmartApp,
  createLaunchContext,
  resolveLaunchContext,
  consumeLaunchContext,
  getCdsDashboardStats,
  logFeedback,
  getFeedbackLog,
  getInvocationLog,
} from "./cds-store.js";

export default async function cdsHooksRoutes(server: FastifyInstance) {
  // ---- CDS Services (Discovery) ----

  server.get("/cds/services", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const services = listCdsServices();
    return { ok: true, services };
  });

  server.post("/cds/services", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { id, hook, title, description, prefetch, useCqfRuler } = body;
    if (!id || !hook || !title) {
      return reply.code(400).send({ ok: false, error: "id, hook, and title required" });
    }
    const svc = registerCdsService({ id, hook, title, description: description || "", prefetch, useCqfRuler });
    return reply.code(201).send({ ok: true, service: svc });
  });

  server.delete("/cds/services/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const deleted = unregisterCdsService(id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: "Service not found" });
    }
    return { ok: true };
  });

  // ---- CDS Hook Invocation ----

  server.post("/cds/services/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { hookInstance, hook, context, prefetch, fhirServer, fhirAuthorization } = body;
    if (!hookInstance || !hook) {
      return reply.code(400).send({ ok: false, error: "hookInstance and hook required" });
    }
    const response = await invokeHook(
      id,
      { hookInstance, hook, context: context || {}, prefetch, fhirServer, fhirAuthorization },
      session.tenantId,
      session.duz
    );
    return response;
  });

  // ---- CDS Feedback ----

  server.post("/cds/feedback", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { card, outcome, overrideReason } = body;
    if (!card || !outcome) {
      return reply.code(400).send({ ok: false, error: "card and outcome required" });
    }
    logFeedback(
      { card, outcome, overrideReason, outcomeTimestamp: new Date().toISOString() },
      session.duz,
      session.tenantId
    );
    return { ok: true };
  });

  server.get("/cds/invocations", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { limit } = request.query as { limit?: string };
    const log = getInvocationLog(limit ? parseInt(limit, 10) : 100);
    return { ok: true, invocations: log };
  });

  // ---- CDS Rules ----

  server.get("/cds/rules", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const rules = listCdsRules(session.tenantId);
    return { ok: true, rules };
  });

  server.post("/cds/rules", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { name, description, hook, priority, conditions, cardTemplate, enabled, engine, cqlLibraryName, cqlLibraryVersion, contentPackId } = body;
    if (!name || !hook || !conditions || !cardTemplate) {
      return reply.code(400).send({ ok: false, error: "name, hook, conditions, and cardTemplate required" });
    }
    try {
      const rule = createCdsRule({
        tenantId: session.tenantId,
        name,
        description: description || "",
        hook,
        priority: priority ?? 100,
        conditions,
        cardTemplate,
        enabled: enabled !== false,
        engine: engine || "native",
        cqlLibraryName: cqlLibraryName || null,
        cqlLibraryVersion: cqlLibraryVersion || null,
        contentPackId: contentPackId || null,
      });
      return reply.code(201).send({ ok: true, rule });
    } catch (err: any) {
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/cds/rules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rule = getCdsRule(id);
    if (!rule) {
      return reply.code(404).send({ ok: false, error: "Rule not found" });
    }
    return { ok: true, rule };
  });

  server.put("/cds/rules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateCdsRule(id, body);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: "Rule not found" });
    }
    return { ok: true, rule: updated };
  });

  server.delete("/cds/rules/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const deleted = deleteCdsRule(id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: "Rule not found" });
    }
    return { ok: true };
  });

  // ---- CQF Ruler Config ----

  server.get("/cds/cqf/config", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    return { ok: true, config: getCqfRulerConfig() };
  });

  server.put("/cds/cqf/config", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const body = (request.body as any) || {};
    setCqfRulerConfig(body);
    return { ok: true, config: getCqfRulerConfig() };
  });

  // ---- SMART Apps ----

  server.get("/cds/smart/apps", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const apps = listSmartApps(session.tenantId);
    return { ok: true, apps };
  });

  server.post("/cds/smart/apps", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { name, description, launchUrl, scopes, iconUrl, allowedHooks, enabled } = body;
    if (!name || !launchUrl) {
      return reply.code(400).send({ ok: false, error: "name and launchUrl required" });
    }
    try {
      const app = createSmartApp({
        tenantId: session.tenantId,
        name,
        description: description || "",
        launchUrl,
        scopes: scopes || ["launch", "patient/Patient.read"],
        iconUrl: iconUrl || null,
        allowedHooks: allowedHooks || [],
        enabled: enabled !== false,
      });
      return reply.code(201).send({ ok: true, app });
    } catch (err: any) {
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/cds/smart/apps/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const app = getSmartApp(id);
    if (!app) {
      return reply.code(404).send({ ok: false, error: "SMART app not found" });
    }
    return { ok: true, app };
  });

  server.put("/cds/smart/apps/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateSmartApp(id, body);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: "SMART app not found" });
    }
    return { ok: true, app: updated };
  });

  server.delete("/cds/smart/apps/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const deleted = deleteSmartApp(id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: "SMART app not found" });
    }
    return { ok: true };
  });

  // ---- SMART Launch ----

  server.post("/cds/smart/launch", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { appId, patientDfn, encounterIen, intent } = body;
    if (!appId || !patientDfn) {
      return reply.code(400).send({ ok: false, error: "appId and patientDfn required" });
    }
    const app = getSmartApp(appId);
    if (!app) {
      return reply.code(404).send({ ok: false, error: "SMART app not found" });
    }
    if (!app.enabled) {
      return reply.code(403).send({ ok: false, error: "SMART app is disabled" });
    }
    const fhirServerUrl = process.env.FHIR_SERVER_URL || "http://localhost:3001/fhir";
    const ctx = createLaunchContext({
      patientDfn,
      encounterIen: encounterIen || null,
      userDuz: session.duz,
      fhirServerUrl,
      intent: intent || null,
    });
    const launchUrl = `${app.launchUrl}?iss=${encodeURIComponent(fhirServerUrl)}&launch=${ctx.launch}`;
    return reply.code(201).send({ ok: true, launchContext: ctx, launchUrl });
  });

  server.get("/cds/smart/launch/:token", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { token } = request.params as { token: string };
    const ctx = resolveLaunchContext(token);
    if (!ctx) {
      return reply.code(404).send({ ok: false, error: "Launch context not found or expired" });
    }
    return { ok: true, launchContext: ctx };
  });

  server.post("/cds/smart/launch/:token/consume", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { token } = request.params as { token: string };
    const ctx = consumeLaunchContext(token);
    if (!ctx) {
      return reply.code(404).send({ ok: false, error: "Launch context not found or expired" });
    }
    return { ok: true, launchContext: ctx };
  });

  // ---- Dashboard ----

  server.get("/cds/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const stats = getCdsDashboardStats(session.tenantId);
    return { ok: true, stats };
  });

  server.get("/cds/feedback-log", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { limit } = request.query as { limit?: string };
    const log = getFeedbackLog(limit ? parseInt(limit, 10) : 100);
    return { ok: true, feedback: log };
  });
}
