/**
 * Onboarding Integration Routes -- Phase 262 (Wave 8 P6)
 *
 * REST endpoints for the integration onboarding wizard extension.
 * All routes under /admin/onboarding/integrations (admin-only via AUTH_RULES).
 */

import type { FastifyInstance } from "fastify";
import {
  createIntegrationSession,
  getIntegrationSession,
  getIntegrationSessionByOnboarding,
  listIntegrationSessions,
  upsertEndpoint,
  removeEndpoint,
  advanceIntegrationStep,
  probeEndpoints,
  runPreflight,
  deleteIntegrationSession,
  listIntegrationKinds,
  INTEGRATION_STEP_META,
} from "../config/onboarding-integration-steps.js";

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export async function onboardingIntegrationRoutes(
  app: FastifyInstance,
): Promise<void> {
  /* ---- List integration kinds ---- */
  app.get("/admin/onboarding/integrations/kinds", async () => {
    return { ok: true, kinds: listIntegrationKinds() };
  });

  /* ---- Step metadata ---- */
  app.get("/admin/onboarding/integrations/steps", async () => {
    return { ok: true, steps: INTEGRATION_STEP_META };
  });

  /* ---- Create integration session (linked to base onboarding) ---- */
  app.post("/admin/onboarding/integrations", async (request, reply) => {
    const body = (request.body as any) || {};
    const { onboardingSessionId, tenantId } = body;
    if (!onboardingSessionId || !tenantId) {
      return reply
        .code(400)
        .send({ ok: false, error: "onboardingSessionId and tenantId required" });
    }

    // Check for existing session for this onboarding
    const existing = getIntegrationSessionByOnboarding(onboardingSessionId);
    if (existing) {
      return { ok: true, session: existing, existing: true };
    }

    const session = createIntegrationSession(onboardingSessionId, tenantId);
    return reply.code(201).send({ ok: true, session });
  });

  /* ---- List integration sessions ---- */
  app.get("/admin/onboarding/integrations", async (request) => {
    const query = request.query as any;
    const sessions = listIntegrationSessions(query.tenantId);
    return { ok: true, sessions };
  });

  /* ---- Get single session ---- */
  app.get(
    "/admin/onboarding/integrations/:id",
    async (request, reply) => {
      const { id } = request.params as any;
      const session = getIntegrationSession(id);
      if (!session) {
        return reply.code(404).send({ ok: false, error: "Session not found" });
      }
      return { ok: true, session };
    },
  );

  /* ---- Get session by onboarding ID ---- */
  app.get(
    "/admin/onboarding/integrations/by-onboarding/:onboardingSessionId",
    async (request, reply) => {
      const { onboardingSessionId } = request.params as any;
      const session = getIntegrationSessionByOnboarding(onboardingSessionId);
      if (!session) {
        return reply
          .code(404)
          .send({ ok: false, error: "No integration session for this onboarding" });
      }
      return { ok: true, session };
    },
  );

  /* ---- Add/update endpoint ---- */
  app.post(
    "/admin/onboarding/integrations/:id/endpoints",
    async (request, reply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const { kind, label, host, port, tlsEnabled, options } = body;

      if (!kind || !label || !host) {
        return reply
          .code(400)
          .send({ ok: false, error: "kind, label, and host required" });
      }

      try {
        const session = upsertEndpoint(id, {
          id: body.endpointId,
          kind,
          label,
          host,
          port,
          tlsEnabled,
          options: options || {},
        });

        if (!session) {
          return reply.code(404).send({ ok: false, error: "Session not found" });
        }

        return { ok: true, session };
      } catch (err: unknown) {
        return reply.code(500).send({
          ok: false,
          error: "Failed to upsert endpoint",
        });
      }
    },
  );

  /* ---- Remove endpoint ---- */
  app.delete(
    "/admin/onboarding/integrations/:id/endpoints/:endpointId",
    async (request, reply) => {
      const { id, endpointId } = request.params as any;
      const session = removeEndpoint(id, endpointId);
      if (!session) {
        return reply.code(404).send({ ok: false, error: "Session not found" });
      }
      return { ok: true, session };
    },
  );

  /* ---- Advance integration step ---- */
  app.post(
    "/admin/onboarding/integrations/:id/advance",
    async (request, reply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      try {
        const session = advanceIntegrationStep(id, body.data);
        if (!session) {
          return reply.code(404).send({ ok: false, error: "Session not found" });
        }
        return { ok: true, session };
      } catch (err: unknown) {
        return reply.code(500).send({
          ok: false,
          error: "Failed to advance step",
        });
      }
    },
  );

  /* ---- Probe all endpoints ---- */
  app.post(
    "/admin/onboarding/integrations/:id/probe",
    async (request, reply) => {
      const { id } = request.params as any;
      try {
        const session = getIntegrationSession(id);
        if (!session) {
          return reply.code(404).send({ ok: false, error: "Session not found" });
        }

        const probed = probeEndpoints(session);
        return { ok: true, session: probed };
      } catch (err: unknown) {
        return reply.code(500).send({
          ok: false,
          error: "Failed to probe endpoints",
        });
      }
    },
  );

  /* ---- Run preflight ---- */
  app.post(
    "/admin/onboarding/integrations/:id/preflight",
    async (request, reply) => {
      const { id } = request.params as any;
      try {
        const session = getIntegrationSession(id);
        if (!session) {
          return reply.code(404).send({ ok: false, error: "Session not found" });
        }

        const summary = runPreflight(session);
        return { ok: true, preflight: summary, session };
      } catch (err: unknown) {
        return reply.code(500).send({
          ok: false,
          error: "Failed to run preflight",
        });
      }
    },
  );

  /* ---- Delete integration session ---- */
  app.delete(
    "/admin/onboarding/integrations/:id",
    async (request, reply) => {
      const { id } = request.params as any;
      const deleted = deleteIntegrationSession(id);
      if (!deleted) {
        return reply.code(404).send({ ok: false, error: "Session not found" });
      }
      return { ok: true, deleted: true };
    },
  );
}
