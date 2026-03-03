/**
 * Phase 405 (W23-P7): Consent + Purpose of Use — Routes
 * Phase 494 (W34-P4): Auto-resolve pack granularity for directive creation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import {
  createDirective, getDirective, listDirectives, updateDirective, revokeDirective,
  evaluateConsent, logDisclosure, listDisclosures,
  getConsentDashboardStats,
} from "./consent-store.js";
import { getEffectivePolicy } from "../middleware/country-policy-hook.js";

export default async function consentPouRoutes(server: FastifyInstance): Promise<void> {

  // ─── Consent Directives ────────────────────────────────────

  server.get("/consent-pou/directives", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, directives: listDirectives(session.tenantId, { patientDfn: qs.patientDfn, status: qs.status, scope: qs.scope }) };
  });

  server.get("/consent-pou/directives/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getDirective(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, directive: rec };
  });

  server.post("/consent-pou/directives", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    // Phase 494: resolve pack granularity + framework for directive metadata
    const policy = getEffectivePolicy(request);
    const packGranularity = policy.pack?.regulatoryProfile?.consentGranularity || "category";
    const packFramework = policy.pack?.regulatoryProfile?.framework || "HIPAA";
    try {
      const rec = createDirective({
        tenantId: session.tenantId,
        status: body.status || "draft",
        scope: body.scope || "patient-privacy",
        patientDfn: body.patientDfn || "",
        patientDisplay: body.patientDisplay,
        dateTime: body.dateTime || new Date().toISOString(),
        grantor: body.grantor || { name: session.userName || "Unknown", role: "patient" },
        grantee: body.grantee,
        policyUri: body.policyUri || packFramework,
        provisions: body.provisions || [],
        verificationDate: body.verificationDate,
        verifiedBy: body.verifiedBy,
        metadata: {
          ...body.metadata,
          countryPackId: policy.countryPackId,
          packGranularity,
          packFramework,
        },
      });
      return reply.code(201).send({ ok: true, directive: rec });
    } catch (err: any) {
      log.error("Consent directive creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(400).send({ ok: false, error: "Create failed" });
    }
  });

  server.put("/consent-pou/directives/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updateDirective(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, directive: rec };
  });

  server.post("/consent-pou/directives/:id/revoke", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = revokeDirective(id, session.duz || "unknown");
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found or already revoked" });
    return { ok: true, directive: rec };
  });

  // ─── POU Enforcement ──────────────────────────────────────

  server.post("/consent-pou/evaluate", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    const result = evaluateConsent(
      session.tenantId,
      body.patientDfn || "",
      body.purposeOfUse || "TREAT",
      session.duz || "unknown",
    );

    // Auto-log the disclosure decision
    logDisclosure({
      tenantId: session.tenantId,
      consentId: result.matchedDirectiveId,
      patientDfn: body.patientDfn || "",
      purposeOfUse: body.purposeOfUse || "TREAT",
      actorDuz: session.duz || "unknown",
      actorDisplay: session.userName,
      recipientOrg: body.recipientOrg,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      decision: result.decision,
      reason: result.reason,
    });

    return { ok: true, evaluation: result };
  });

  // ─── Disclosure Log ────────────────────────────────────────

  server.get("/consent-pou/disclosures", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, disclosures: listDisclosures(session.tenantId, {
      patientDfn: qs.patientDfn,
      purposeOfUse: qs.purposeOfUse,
      limit: Number(qs.limit) || 200,
    }) };
  });

  // ─── Dashboard ─────────────────────────────────────────────

  server.get("/consent-pou/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getConsentDashboardStats(session.tenantId) };
  });
}
