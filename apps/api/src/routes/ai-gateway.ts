/**
 * AI Gateway — REST Routes (Phase 33)
 *
 * Endpoints:
 *   POST /ai/request           — Submit an AI request (governed pipeline)
 *   POST /ai/confirm/:id       — Clinician confirms/rejects an AI draft
 *   GET  /ai/models            — List registered models
 *   GET  /ai/prompts           — List registered prompt templates
 *   GET  /ai/audit             — Query AI audit log (admin)
 *   GET  /ai/audit/stats       — Aggregate AI audit stats (admin)
 *   GET  /ai/policy            — Get current facility AI policy
 *   PUT  /ai/policy            — Update facility AI policy (admin)
 *   GET  /ai/health            — Gateway health check
 *
 * Portal-facing endpoints (patient/proxy):
 *   POST /ai/portal/education  — Lab education (patient-safe)
 *   POST /ai/portal/search     — Portal navigation search
 */

import type { FastifyInstance } from 'fastify';
import { processAiRequest } from '../ai/ai-gateway.js';
import { listModels } from '../ai/model-registry.js';
import { listPrompts } from '../ai/prompt-registry.js';
import { queryAiAudit, getAiAuditStats, recordConfirmation } from '../ai/ai-audit.js';
import { getFacilityPolicy, updateFacilityPolicy } from '../ai/safety-layer.js';
import { listProviders } from '../ai/providers/index.js';
import type { AIUseCase, AIActorRole } from '../ai/types.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Session helpers — reuse existing patterns                            */
/* ------------------------------------------------------------------ */

let requireSessionFn: ((req: any, reply: any) => any) | null = null;
let getPortalSessionFn: ((req: any) => any) | null = null;

/** Wire session resolvers at startup. */
export function initAiRoutes(
  requireSession: (req: any, reply: any) => any,
  getPortalSession: (req: any) => any
): void {
  requireSessionFn = requireSession;
  getPortalSessionFn = getPortalSession;
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function aiGatewayRoutes(server: FastifyInstance): Promise<void> {
  /* ================================================================ */
  /* POST /ai/request — Main governed AI request                      */
  /* ================================================================ */
  server.post('/ai/request', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const { useCase, promptId, variables, patientDfn, maxTokens, preferredModelId } = body;

    if (!useCase || !promptId) {
      return reply.code(400).send({ error: 'useCase and promptId are required' });
    }

    const result = await processAiRequest({
      useCase: useCase as AIUseCase,
      promptId,
      variables: variables || {},
      patientDfn: patientDfn || null,
      actor: {
        id: session.duz,
        role: 'clinician' as AIActorRole,
        name: session.userName,
      },
      preferredModelId,
      maxTokens,
    });

    if (!result.ok) {
      return reply.code(422).send({
        error: result.error,
        auditEventId: result.auditEventId,
      });
    }

    return reply.send({
      ok: true,
      response: result.response,
      auditEventId: result.auditEventId,
    });
  });

  /* ================================================================ */
  /* POST /ai/confirm/:id — Clinician confirm/reject AI draft         */
  /* ================================================================ */
  server.post('/ai/confirm/:id', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { confirmed } = body;

    if (typeof confirmed !== 'boolean') {
      return reply.code(400).send({ error: 'confirmed (boolean) is required' });
    }

    const result = recordConfirmation(id, confirmed);
    if (!result.ok) {
      return reply.code(404).send({ error: result.error });
    }

    log.info('AI draft confirmation recorded', {
      auditEventId: id,
      confirmed,
      clinicianDuz: session.duz,
    });

    return reply.send({ ok: true });
  });

  /* ================================================================ */
  /* GET /ai/models — List registered models                          */
  /* ================================================================ */
  server.get('/ai/models', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    return reply.send({ ok: true, models: listModels() });
  });

  /* ================================================================ */
  /* GET /ai/prompts — List registered prompt templates                */
  /* ================================================================ */
  server.get('/ai/prompts', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    return reply.send({ ok: true, prompts: listPrompts() });
  });

  /* ================================================================ */
  /* GET /ai/audit — Query AI audit log (admin)                       */
  /* ================================================================ */
  server.get('/ai/audit', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    // Admin role check
    if (session.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin role required for audit access' });
    }

    const query = request.query as any;
    const events = queryAiAudit({
      useCase: query.useCase,
      outcome: query.outcome,
      actorRole: query.actorRole,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    return reply.send({ ok: true, events });
  });

  /* ================================================================ */
  /* GET /ai/audit/stats — Aggregate AI audit stats (admin)           */
  /* ================================================================ */
  server.get('/ai/audit/stats', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    if (session.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin role required' });
    }

    return reply.send({ ok: true, stats: getAiAuditStats() });
  });

  /* ================================================================ */
  /* GET /ai/policy — Get facility AI policy                          */
  /* ================================================================ */
  server.get('/ai/policy', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    return reply.send({ ok: true, policy: getFacilityPolicy() });
  });

  /* ================================================================ */
  /* PUT /ai/policy — Update facility AI policy (admin)               */
  /* ================================================================ */
  server.put('/ai/policy', async (request, reply) => {
    if (!requireSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const session = await requireSessionFn(request, reply);
    if (!session) return;

    if (session.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin role required' });
    }

    const body = (request.body as any) || {};
    const updated = updateFacilityPolicy(body);

    log.info('AI facility policy updated', {
      updatedBy: session.duz,
      aiEnabled: updated.aiEnabled,
    });

    return reply.send({ ok: true, policy: updated });
  });

  /* ================================================================ */
  /* GET /ai/health — Gateway health check                            */
  /* ================================================================ */
  server.get('/ai/health', async (_request, reply) => {
    const providers = listProviders();
    const healthResults = await Promise.all(
      providers.map(async (p) => {
        const h = await p.healthCheck();
        return { providerId: p.id, ...h };
      })
    );

    const allHealthy = healthResults.every((h) => h.ok);
    const policy = getFacilityPolicy();

    return reply.send({
      ok: true,
      gateway: {
        enabled: policy.aiEnabled,
        modelsRegistered: listModels().length,
        promptsRegistered: listPrompts().length,
        providersHealthy: allHealthy,
        providers: healthResults,
      },
    });
  });

  /* ================================================================ */
  /* POST /ai/portal/education — Patient lab education                 */
  /* ================================================================ */
  server.post('/ai/portal/education', async (request, reply) => {
    if (!getPortalSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const portalSession = getPortalSessionFn(request);
    if (!portalSession) {
      return reply.code(401).send({ error: 'Portal session required' });
    }

    const policy = getFacilityPolicy();
    if (!policy.patientAiEnabled) {
      return reply.code(403).send({ error: 'Patient AI features are disabled' });
    }

    const body = (request.body as any) || {};
    const { labName, labValue, labUnits, referenceRange, labDate } = body;

    if (!labName) {
      return reply.code(400).send({ error: 'labName is required' });
    }

    const result = await processAiRequest({
      useCase: 'lab-education',
      promptId: 'lab-education-v1',
      variables: {
        labName: labName || '',
        labValue: labValue || '',
        labUnits: labUnits || '',
        referenceRange: referenceRange || '',
        labDate: labDate || '',
      },
      patientDfn: portalSession.patientDfn,
      actor: {
        id: `patient-${portalSession.patientDfn}`,
        role: 'patient',
        name: portalSession.patientName,
      },
    });

    if (!result.ok) {
      return reply.code(422).send({ error: result.error });
    }

    return reply.send({
      ok: true,
      explanation: result.response?.text,
      confidence: result.response?.confidence,
      disclaimer:
        'This explanation is for educational purposes only. Always discuss your lab results with your healthcare provider.',
    });
  });

  /* ================================================================ */
  /* POST /ai/portal/search — Portal navigation search                 */
  /* ================================================================ */
  server.post('/ai/portal/search', async (request, reply) => {
    if (!getPortalSessionFn) return reply.code(500).send({ error: 'AI routes not initialized' });
    const portalSession = getPortalSessionFn(request);
    if (!portalSession) {
      return reply.code(401).send({ error: 'Portal session required' });
    }

    const policy = getFacilityPolicy();
    if (!policy.patientAiEnabled) {
      return reply.code(403).send({ error: 'Patient AI features are disabled' });
    }

    const body = (request.body as any) || {};
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return reply.code(400).send({ error: 'question is required' });
    }

    // Cap question length
    const safeQuestion = question.slice(0, 500);

    const portalSections = [
      'Home, Tasks, Health Records, Medications, Refill Requests,',
      'Messages, Appointments, Telehealth, Share Records, Export,',
      'Family Access, Activity Log, Account, My Profile',
    ].join(' ');

    const result = await processAiRequest({
      useCase: 'portal-search',
      promptId: 'portal-search-v1',
      variables: {
        portalSections,
        question: safeQuestion,
      },
      patientDfn: null, // No patient context needed for navigation
      actor: {
        id: `patient-${portalSession.patientDfn}`,
        role: 'patient',
        name: portalSession.patientName,
      },
    });

    if (!result.ok) {
      return reply.code(422).send({ error: result.error });
    }

    return reply.send({
      ok: true,
      answer: result.response?.text,
    });
  });

  log.info('AI Gateway routes registered (Phase 33)');
}
