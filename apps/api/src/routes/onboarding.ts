/**
 * Integration Onboarding Routes — Phase 325 (W14-P9)
 *
 * 16 REST endpoints for guided partner onboarding:
 *  - Templates: create, list, get
 *  - Sessions: start, get, list, advance step, pause, resume, abandon
 *  - Readiness: run check, get report
 *  - Stats: onboarding dashboard
 */

import { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  createTemplate,
  getTemplate,
  listTemplates,
  startOnboarding,
  getSessionForTenant,
  listSessions,
  advanceStepForTenant,
  pauseSessionForTenant,
  resumeSessionForTenant,
  abandonSessionForTenant,
  runReadinessCheckForTenant,
  getReadinessReportForTenant,
  getOnboardingStats,
  seedOnboardingTemplates,
} from '../services/integration-onboarding.js';

function requireTenantId(session: { tenantId?: string }, reply: any): string | null {
  if (typeof session.tenantId === 'string' && session.tenantId.trim().length > 0) {
    return session.tenantId.trim();
  }
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export default async function onboardingRoutes(server: FastifyInstance): Promise<void> {
  // Seed built-in templates on first load
  seedOnboardingTemplates();

  /* ── Template endpoints ──────────────────────────────────────── */

  server.post('/onboarding/templates', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const { name, description, integrationType, steps } = body;
    if (!name || !integrationType || !steps?.length) {
      return reply
        .code(400)
        .send({ ok: false, error: 'name, integrationType, and steps[] required' });
    }
    const template = createTemplate({
      name,
      description: description || '',
      integrationType,
      steps,
    });
    return reply.code(201).send({ ok: true, template });
  });

  server.get('/onboarding/templates', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { integrationType } = request.query as any;
    return { ok: true, templates: listTemplates(integrationType) };
  });

  server.get('/onboarding/templates/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const template = getTemplate(id);
    if (!template) return reply.code(404).send({ ok: false, error: 'template_not_found' });
    return { ok: true, template };
  });

  /* ── Session endpoints ───────────────────────────────────────── */

  server.post('/onboarding/sessions', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const { templateId, partnerId, partnerName, assignee, metadata } = body;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    if (!templateId || !partnerId || !partnerName) {
      return reply
        .code(400)
        .send({ ok: false, error: 'templateId, partnerId, and partnerName required' });
    }
    try {
      const session = startOnboarding({
        templateId,
        partnerId,
        partnerName,
        tenantId,
        assignee,
        metadata,
      });
      return reply.code(201).send({ ok: true, session });
    } catch (_err: any) {
      return reply.code(400).send({ ok: false, error: 'Onboarding session creation failed' });
    }
  });

  server.get('/onboarding/sessions', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const q = request.query as any;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    return {
      ok: true,
      sessions: listSessions({
        partnerId: q.partnerId,
        tenantId,
        status: q.status,
      }),
    };
  });

  server.get('/onboarding/sessions/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    const onboardingSession = getSessionForTenant(tenantId, id);
    if (!onboardingSession) return reply.code(404).send({ ok: false, error: 'session_not_found' });
    return { ok: true, session: onboardingSession };
  });

  server.post('/onboarding/sessions/:id/steps/:stepId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id, stepId } = request.params as any;
    const body = (request.body as any) || {};
    const { action, notes } = body;
    if (!action || !['start', 'complete', 'skip'].includes(action)) {
      return reply.code(400).send({ ok: false, error: 'action must be: start, complete, or skip' });
    }
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    const ok = advanceStepForTenant(tenantId, id, stepId, action, notes);
    if (!ok) {
      return reply
        .code(400)
        .send({ ok: false, error: 'step_advance_failed (check prerequisites/session status)' });
    }
    const onboardingSession = getSessionForTenant(tenantId, id);
    return { ok: true, session: onboardingSession };
  });

  server.post('/onboarding/sessions/:id/pause', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    if (!pauseSessionForTenant(tenantId, id)) {
      return reply.code(404).send({ ok: false, error: 'session_not_found_or_not_active' });
    }
    return { ok: true, status: 'paused' };
  });

  server.post('/onboarding/sessions/:id/resume', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    if (!resumeSessionForTenant(tenantId, id)) {
      return reply.code(404).send({ ok: false, error: 'session_not_found_or_not_paused' });
    }
    return { ok: true, status: 'active' };
  });

  server.post('/onboarding/sessions/:id/abandon', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    if (!abandonSessionForTenant(tenantId, id)) {
      return reply.code(404).send({ ok: false, error: 'session_not_found_or_already_completed' });
    }
    return { ok: true, status: 'abandoned' };
  });

  /* ── Readiness endpoints ─────────────────────────────────────── */

  server.post('/onboarding/sessions/:id/readiness', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    try {
      const tenantId = requireTenantId(session, reply);
      if (!tenantId) return;
      const report = runReadinessCheckForTenant(tenantId, id);
      return { ok: true, report };
    } catch (_err: any) {
      return reply.code(404).send({ ok: false, error: 'Readiness check failed' });
    }
  });

  server.get('/onboarding/sessions/:id/readiness', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    const report = getReadinessReportForTenant(tenantId, id);
    if (!report) return reply.code(404).send({ ok: false, error: 'no_readiness_report' });
    return { ok: true, report };
  });

  /* ── Stats ─────────────────────────────────────────────────────── */

  server.get('/onboarding/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(session, reply);
    if (!tenantId) return;
    return { ok: true, stats: getOnboardingStats(tenantId) };
  });
}
