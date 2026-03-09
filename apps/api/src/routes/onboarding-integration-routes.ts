/**
 * Onboarding Integration Routes -- Phase 262 (Wave 8 P6)
 *
 * REST endpoints for the integration onboarding wizard extension.
 * All routes under /admin/onboarding/integrations (admin-only via AUTH_RULES).
 */

import type { FastifyInstance } from 'fastify';
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
} from '../config/onboarding-integration-steps.js';

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export async function onboardingIntegrationRoutes(app: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any, explicitTenantId?: string): string | null {
    const requestTenantId = request?.tenantId || request?.session?.tenantId;
    if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
      return requestTenantId.trim();
    }
    const headerTenantId = request?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return explicitTenantId || headerTenant || null;
  }

  function requireTenantId(request: any, reply: any, explicitTenantId?: string): string | null {
    const tenantId = resolveTenantId(request, explicitTenantId);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function getScopedSession(id: string, tenantId: string) {
    return getIntegrationSession(id, tenantId) || null;
  }

  /* ---- List integration kinds ---- */
  app.get('/admin/onboarding/integrations/kinds', async () => {
    return { ok: true, kinds: listIntegrationKinds() };
  });

  /* ---- Step metadata ---- */
  app.get('/admin/onboarding/integrations/steps', async () => {
    return { ok: true, steps: INTEGRATION_STEP_META };
  });

  /* ---- Create integration session (linked to base onboarding) ---- */
  app.post('/admin/onboarding/integrations', async (request, reply) => {
    const body = (request.body as any) || {};
    const { onboardingSessionId } = body;
    const tenantId = requireTenantId(request, reply, body.tenantId);
    if (!tenantId) return;
    if (!onboardingSessionId) {
      return reply
        .code(400)
        .send({ ok: false, error: 'onboardingSessionId is required' });
    }

    // Check for existing session for this onboarding
    const existing = getIntegrationSessionByOnboarding(onboardingSessionId, tenantId);
    if (existing) {
      return { ok: true, session: existing, existing: true };
    }

    const session = createIntegrationSession(onboardingSessionId, tenantId);
    return reply.code(201).send({ ok: true, session });
  });

  /* ---- List integration sessions ---- */
  app.get('/admin/onboarding/integrations', async (request) => {
    const tenantId = resolveTenantId(request);
    if (!tenantId) {
      return { ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' };
    }
    const sessions = listIntegrationSessions(tenantId);
    return { ok: true, sessions };
  });

  /* ---- Get single session ---- */
  app.get('/admin/onboarding/integrations/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const session = getScopedSession(id, tenantId);
    if (!session) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }
    return { ok: true, session };
  });

  /* ---- Get session by onboarding ID ---- */
  app.get(
    '/admin/onboarding/integrations/by-onboarding/:onboardingSessionId',
    async (request, reply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { onboardingSessionId } = request.params as any;
      const session = getIntegrationSessionByOnboarding(onboardingSessionId, tenantId);
      if (!session) {
        return reply
          .code(404)
          .send({ ok: false, error: 'No integration session for this onboarding' });
      }
      return { ok: true, session };
    }
  );

  /* ---- Add/update endpoint ---- */
  app.post('/admin/onboarding/integrations/:id/endpoints', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { kind, label, host, port, tlsEnabled, options } = body;

    if (!kind || !label || !host) {
      return reply.code(400).send({ ok: false, error: 'kind, label, and host required' });
    }

    if (!getScopedSession(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }

    try {
      const session = upsertEndpoint(tenantId, id, {
        id: body.endpointId,
        kind,
        label,
        host,
        port,
        tlsEnabled,
        options: options || {},
      });

      if (!session) {
        return reply.code(404).send({ ok: false, error: 'Session not found' });
      }

      return { ok: true, session };
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to upsert endpoint',
      });
    }
  });

  /* ---- Remove endpoint ---- */
  app.delete('/admin/onboarding/integrations/:id/endpoints/:endpointId', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id, endpointId } = request.params as any;
    if (!getScopedSession(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }
    const session = removeEndpoint(tenantId, id, endpointId);
    if (!session) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }
    return { ok: true, session };
  });

  /* ---- Advance integration step ---- */
  app.post('/admin/onboarding/integrations/:id/advance', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!getScopedSession(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }
    try {
      const session = advanceIntegrationStep(tenantId, id, body.data);
      if (!session) {
        return reply.code(404).send({ ok: false, error: 'Session not found' });
      }
      return { ok: true, session };
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to advance step',
      });
    }
  });

  /* ---- Probe all endpoints ---- */
  app.post('/admin/onboarding/integrations/:id/probe', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    try {
      const session = getScopedSession(id, tenantId);
      if (!session) {
        return reply.code(404).send({ ok: false, error: 'Session not found' });
      }

      const probed = probeEndpoints(session);
      return { ok: true, session: probed };
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to probe endpoints',
      });
    }
  });

  /* ---- Run preflight ---- */
  app.post('/admin/onboarding/integrations/:id/preflight', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    try {
      const session = getScopedSession(id, tenantId);
      if (!session) {
        return reply.code(404).send({ ok: false, error: 'Session not found' });
      }

      const summary = runPreflight(session);
      return { ok: true, preflight: summary, session };
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to run preflight',
      });
    }
  });

  /* ---- Delete integration session ---- */
  app.delete('/admin/onboarding/integrations/:id', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    if (!getScopedSession(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }
    const deleted = deleteIntegrationSession(tenantId, id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: 'Session not found' });
    }
    return { ok: true, deleted: true };
  });
}
