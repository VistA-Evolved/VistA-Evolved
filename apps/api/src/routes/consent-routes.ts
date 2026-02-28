/**
 * Consent Routes — Phase 312
 *
 * Patient consent management endpoints. Session-authenticated.
 * PHI (patientDfn) is never included in audit logs.
 */

import type { FastifyInstance } from "fastify";
import {
  CONSENT_CATEGORIES,
  type ConsentCategory,
  createConsentRecord,
  getConsentRecords,
  getActiveConsent,
  revokeConsent,
  checkConsentCompliance,
  getConsentProfile,
  listConsentProfiles,
} from "../services/consent-engine.js";

export async function consentRoutes(app: FastifyInstance): Promise<void> {
  // GET /consent/profiles — list available regulatory consent profiles
  app.get("/consent/profiles", async () => {
    const names = listConsentProfiles();
    const profiles = names.map((name) => ({
      framework: name,
      profile: getConsentProfile(name),
    }));
    return { ok: true, profiles };
  });

  // GET /consent/categories — list consent categories
  app.get("/consent/categories", async () => {
    return { ok: true, categories: [...CONSENT_CATEGORIES] };
  });

  // GET /consent/patient — get consent records for a patient
  app.get("/consent/patient", async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { tenantId, dfn } = query;

    if (!tenantId || !dfn) {
      return reply.code(400).send({ ok: false, error: "tenantId and dfn required" });
    }

    const records = getConsentRecords(tenantId, dfn);
    return { ok: true, records, total: records.length };
  });

  // GET /consent/check — check consent compliance for a patient
  app.get("/consent/check", async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { tenantId, dfn, framework } = query;

    if (!tenantId || !dfn || !framework) {
      return reply.code(400).send({ ok: false, error: "tenantId, dfn, and framework required" });
    }

    const profile = getConsentProfile(framework);
    if (!profile) {
      return reply.code(404).send({ ok: false, error: `Unknown framework: ${framework}` });
    }

    const result = checkConsentCompliance(tenantId, dfn, profile);
    return { ok: true, ...result };
  });

  // POST /consent/grant — grant consent for a category
  app.post("/consent/grant", async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const {
      tenantId,
      patientDfn,
      category,
      grantedBy,
      regulatoryBasis,
      expiresAt,
      evidence,
      version,
    } = body as Record<string, string>;

    if (!tenantId || !patientDfn || !category || !grantedBy) {
      return reply.code(400).send({
        ok: false,
        error: "tenantId, patientDfn, category, grantedBy required",
      });
    }

    if (!CONSENT_CATEGORIES.includes(category as ConsentCategory)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid category. Valid: ${CONSENT_CATEGORIES.join(", ")}`,
      });
    }

    const record = createConsentRecord({
      tenantId,
      patientDfn,
      category: category as ConsentCategory,
      status: "granted",
      granularity: "category",
      grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      regulatoryBasis: regulatoryBasis || "",
      version: parseInt(version || "1", 10),
      evidence: evidence as string | undefined,
    });

    return { ok: true, consent: record };
  });

  // POST /consent/revoke — revoke a consent
  app.post("/consent/revoke", async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { consentId, revokedBy, reason } = body as Record<string, string>;

    if (!consentId || !revokedBy || !reason) {
      return reply.code(400).send({
        ok: false,
        error: "consentId, revokedBy, reason required",
      });
    }

    const revoked = revokeConsent(consentId, revokedBy, reason);
    if (!revoked) {
      return reply.code(404).send({
        ok: false,
        error: "Consent not found or not in granted status",
      });
    }

    return { ok: true, consent: revoked };
  });

  // GET /consent/active — get active consent for a specific category
  app.get("/consent/active", async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { tenantId, dfn, category } = query;

    if (!tenantId || !dfn || !category) {
      return reply.code(400).send({ ok: false, error: "tenantId, dfn, category required" });
    }

    if (!CONSENT_CATEGORIES.includes(category as ConsentCategory)) {
      return reply.code(400).send({ ok: false, error: "Invalid category" });
    }

    const active = getActiveConsent(tenantId, dfn, category as ConsentCategory);
    return {
      ok: true,
      hasActiveConsent: !!active,
      consent: active || null,
    };
  });
}
