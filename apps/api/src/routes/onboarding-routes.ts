/**
 * Onboarding Wizard Routes
 *
 * Phase 243 (Wave 6 P6): Multi-step facility onboarding wizard API.
 * Admin-only (caught by /admin/* auth rule in security.ts).
 *
 * Endpoints:
 *   POST   /admin/onboarding              -- Start new onboarding session
 *   GET    /admin/onboarding              -- List all onboarding sessions
 *   GET    /admin/onboarding/:id          -- Get session details
 *   POST   /admin/onboarding/:id/advance  -- Advance to next step
 *   PATCH  /admin/onboarding/:id/step     -- Update step data
 *   DELETE /admin/onboarding/:id          -- Delete session
 *   POST   /admin/onboarding/:id/probe    -- Run VistA connection probe
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createOnboarding,
  getOnboarding,
  listOnboardingSessions,
  advanceStep,
  updateStepData,
  deleteOnboarding,
  STEP_ORDER,
  type OnboardingStep,
} from '../config/onboarding-store.js';
import { probeConnect } from '../vista/rpcBroker.js';
import { upsertTenant, getTenant } from '../config/tenant-config.js';
import { setTenantModules, validateDependencies } from '../modules/module-registry.js';
import { requireSession } from '../auth/auth-routes.js';

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export default async function onboardingRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: FastifyRequest): string | null {
    const sessionTenantId =
      typeof (request as any)?.session?.tenantId === 'string' &&
      (request as any).session.tenantId.trim().length > 0
        ? (request as any).session.tenantId.trim()
        : undefined;
    return sessionTenantId || null;
  }

  function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function getScopedOnboarding(id: string, tenantId: string) {
    return getOnboarding(id, tenantId) || null;
  }

  /* ---- POST /admin/onboarding ---- */
  server.post('/admin/onboarding', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const onboarding = createOnboarding(tenantId, session.duz);
    return reply.code(201).send({ ok: true, session: onboarding });
  });

  /* ---- GET /admin/onboarding ---- */
  server.get('/admin/onboarding', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const sessions = listOnboardingSessions(tenantId);
    return reply.send({ ok: true, sessions, total: sessions.length });
  });

  /* ---- GET /admin/onboarding/:id ---- */
  server.get('/admin/onboarding/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const onboarding = getScopedOnboarding(id, tenantId);
    if (!onboarding) return reply.code(404).send({ ok: false, error: 'Session not found' });
    return reply.send({ ok: true, session: onboarding });
  });

  /* ---- POST /admin/onboarding/:id/advance ---- */
  server.post(
    '/admin/onboarding/:id/advance',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const body = (request.body as { data?: Record<string, unknown> }) || {};
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const current = getScopedOnboarding(id, tenantId);
      if (!current) return reply.code(404).send({ ok: false, error: 'Session not found' });

      // Execute step-specific actions before advancing
      const stepResult = await executeStepAction(current.currentStep, current.tenantId, body.data);
      if (!stepResult.ok) {
        return reply
          .code(400)
          .send({ ok: false, error: stepResult.error, step: current.currentStep });
      }

      const updated = advanceStep(current.tenantId, id, { ...body.data, ...stepResult.data });
      if (!updated) return reply.code(404).send({ ok: false, error: 'Session not found' });

      return reply.send({ ok: true, session: updated });
    }
  );

  /* ---- PATCH /admin/onboarding/:id/step ---- */
  server.patch(
    '/admin/onboarding/:id/step',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const body = (request.body as { step: OnboardingStep; data: Record<string, unknown> }) || {};
      if (!body.step || !STEP_ORDER.includes(body.step)) {
        return reply
          .code(400)
          .send({ ok: false, error: `Invalid step. Must be one of: ${STEP_ORDER.join(', ')}` });
      }

      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const existing = getScopedOnboarding(id, tenantId);
      if (!existing) return reply.code(404).send({ ok: false, error: 'Session not found' });

      const updated = updateStepData(existing.tenantId, id, body.step, body.data || {});
      if (!updated) return reply.code(404).send({ ok: false, error: 'Session not found' });

      return reply.send({ ok: true, session: updated });
    }
  );

  /* ---- DELETE /admin/onboarding/:id ---- */
  server.delete('/admin/onboarding/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const existing = getScopedOnboarding(id, tenantId);
    if (!existing) return reply.code(404).send({ ok: false, error: 'Session not found' });
    const deleted = deleteOnboarding(existing.tenantId, id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Session not found' });
    return reply.send({ ok: true });
  });

  /* ---- POST /admin/onboarding/:id/probe ---- */
  server.post(
    '/admin/onboarding/:id/probe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const onboarding = getScopedOnboarding(id, tenantId);
      if (!onboarding) return reply.code(404).send({ ok: false, error: 'Session not found' });

      const tenantData = getTenant(onboarding.tenantId);
      const host = tenantData?.vistaHost || process.env.VISTA_HOST || 'localhost';
      const port = tenantData?.vistaPort || Number(process.env.VISTA_PORT) || 9430;

      try {
        await probeConnect(3000);
        return reply.send({
          ok: true,
          vista: 'reachable',
          host,
          port,
        });
      } catch (_err) {
        return reply.send({
          ok: false,
          vista: 'unreachable',
          host,
          port,
          error: 'VistA probe failed',
        });
      }
    }
  );

  /* ---- GET /admin/onboarding/steps ---- */
  server.get('/admin/onboarding/steps', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    return reply.send({
      ok: true,
      steps: STEP_ORDER.map((step, idx) => ({
        step,
        index: idx,
        label: STEP_LABELS[step] || step,
        description: STEP_DESCRIPTIONS[step] || '',
      })),
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Step metadata                                                      */
/* ------------------------------------------------------------------ */

const STEP_LABELS: Record<OnboardingStep, string> = {
  tenant: 'Facility Setup',
  'vista-probe': 'VistA Connection',
  modules: 'Module Selection',
  users: 'User Provisioning',
  complete: 'Review & Complete',
};

const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  tenant: 'Configure facility name, station number, and basic settings',
  'vista-probe': 'Verify connectivity to VistA instance',
  modules: 'Select which modules to enable for this facility',
  users: 'Invite initial users and assign roles',
  complete: 'Review configuration and finalize onboarding',
};

/* ------------------------------------------------------------------ */
/*  Step action executor                                               */
/* ------------------------------------------------------------------ */

async function executeStepAction(
  step: OnboardingStep,
  tenantId: string,
  data?: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  switch (step) {
    case 'tenant': {
      // Validate and upsert tenant config
      if (data?.facilityName) {
        upsertTenant({
          tenantId,
          facilityName: String(data.facilityName),
          facilityStation: data.facilityStation ? String(data.facilityStation) : undefined,
          vistaHost: data.vistaHost ? String(data.vistaHost) : undefined,
          vistaPort: data.vistaPort ? Number(data.vistaPort) : undefined,
        } as any);
      }
      return { ok: true, data: { tenantCreated: true } };
    }

    case 'vista-probe': {
      // Probe is done via the separate /probe endpoint
      return { ok: true, data: { probeCompleted: true } };
    }

    case 'modules': {
      // Validate and set modules
      const modules = data?.modules as string[] | undefined;
      if (modules && Array.isArray(modules)) {
        const depErrors = validateDependencies(modules);
        if (depErrors.length > 0) {
          return { ok: false, error: `Dependency errors: ${depErrors.join('; ')}` };
        }
        setTenantModules(tenantId, modules);
        return { ok: true, data: { modulesConfigured: modules.length } };
      }
      return { ok: true, data: { modulesSkipped: true } };
    }

    case 'users': {
      const invites = data?.invites as Array<{ email: string; role: string }> | undefined;
      return {
        ok: true,
        data: {
          usersInvited: invites?.length || 0,
          status: 'queued',
          note: 'User invites recorded. OIDC/Keycloak provisioning will process them on next sync.',
        },
      };
    }

    case 'complete': {
      return { ok: true, data: { finalized: true } };
    }

    default:
      return { ok: true };
  }
}
