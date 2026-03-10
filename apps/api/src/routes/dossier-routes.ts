/**
 * Payer Dossier Routes -- Phase 514 (Wave 37 B2)
 *
 * REST endpoints for payer dossiers and onboarding tasks.
 * All routes scoped under `/rcm/dossiers` prefix.
 *
 * Auth: admin-level via AUTH_RULES `/rcm/*` catch-all.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  findDossierById,
  findDossierByPayer,
  listDossiers,
  insertDossier,
  updateDossier,
  listOnboardingTasks,
  findOnboardingTaskById,
  updateOnboardingTask,
  completeOnboardingTask,
  seedOnboardingTasks,
  refreshCompletenessScore,
} from '../platform/pg/repo/dossier-repo.js';
import { findPayerById } from '../platform/pg/repo/payer-repo.js';

export async function dossierRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: FastifyRequest): string | null {
    const headerTenantId = request.headers['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    const requestTenantId =
      typeof (request as any)?.tenantId === 'string' && (request as any).tenantId.trim().length > 0
        ? (request as any).tenantId.trim()
        : undefined;
    const sessionTenantId =
      typeof (request as any)?.session?.tenantId === 'string' &&
      (request as any).session.tenantId.trim().length > 0
        ? (request as any).session.tenantId.trim()
        : undefined;
    return headerTenant || requestTenantId || sessionTenantId || null;
  }

  function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  /* -- List dossiers --------------------------------------- */

  server.get('/rcm/dossiers', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const result = await listDossiers(tenantId, {
      status: q.status,
      countryCode: q.countryCode,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
    return { ok: true, ...result };
  });

  /* -- Get dossier by ID ---------------------------------- */

  server.get('/rcm/dossiers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const dossier = await findDossierById(id, tenantId);
    if (!dossier) return reply.code(404).send({ ok: false, error: 'Dossier not found' });

    const tasks = await listOnboardingTasks(id, tenantId);
    return { ok: true, dossier, tasks };
  });

  /* -- Get dossier by payer ID ---------------------------- */

  server.get(
    '/rcm/dossiers/by-payer/:payerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { payerId } = request.params as { payerId: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      const dossier = await findDossierByPayer(tenantId, payerId);
      if (!dossier) return reply.code(404).send({ ok: false, error: 'No dossier for this payer' });

      const tasks = await listOnboardingTasks(dossier.id, tenantId);
      return { ok: true, dossier, tasks };
    }
  );

  /* -- Create dossier -------------------------------------- */

  server.post('/rcm/dossiers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const {
      payerId,
      enrichmentJson,
      contactJson,
      timingJson,
      complianceJson,
    } = body;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!payerId) return reply.code(400).send({ ok: false, error: 'payerId required' });

    // Verify payer exists
    const payer = await findPayerById(payerId);
    if (!payer) return reply.code(404).send({ ok: false, error: 'Payer not found' });

    // Check for existing dossier
    const existing = await findDossierByPayer(tenantId, payerId);
    if (existing)
      return reply
        .code(409)
        .send({ ok: false, error: 'Dossier already exists', dossierId: existing.id });

    const dossier = await insertDossier(
      {
        tenantId,
        payerId,
        countryCode: payer.countryCode ?? 'US',
        displayName: payer.canonicalName ?? payerId,
        enrichmentJson: enrichmentJson ?? {},
        contactJson: contactJson ?? {},
        timingJson: timingJson ?? {},
        complianceJson: complianceJson ?? {},
        status: 'draft',
      },
      body.reason || 'Dossier created via API',
      body.actor
    );

    // Auto-seed onboarding tasks based on integration mode
    const mode = payer.integrationMode ?? 'manual';
    const tasks = await seedOnboardingTasks(dossier.id, mode, tenantId, payerId, body.actor);

    return reply.code(201).send({ ok: true, dossier, tasks });
  });

  /* -- Update dossier -------------------------------------- */

  server.patch('/rcm/dossiers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const updated = await updateDossier(
      id,
      tenantId,
      {
        displayName: body.displayName,
        enrichmentJson: body.enrichmentJson,
        contactJson: body.contactJson,
        timingJson: body.timingJson,
        complianceJson: body.complianceJson,
        status: body.status,
      },
      body.reason || 'Updated via API',
      body.actor,
      body.expectedVersion
    );

    return { ok: true, dossier: updated };
  });

  /* -- List onboarding tasks for dossier ------------------ */

  server.get('/rcm/dossiers/:id/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const dossier = await findDossierById(id, tenantId);
    if (!dossier) return reply.code(404).send({ ok: false, error: 'Dossier not found' });

    const tasks = await listOnboardingTasks(id, tenantId);
    return { ok: true, tasks, completenessScore: dossier.completenessScore };
  });

  /* -- Update onboarding task ------------------------------ */

  server.patch(
    '/rcm/dossiers/:dossierId/tasks/:taskId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { dossierId, taskId } = request.params as { dossierId: string; taskId: string };
      const body = (request.body as any) || {};

      const task = await findOnboardingTaskById(taskId, tenantId);
      if (!task || task.dossierId !== dossierId) {
        return reply.code(404).send({ ok: false, error: 'Task not found' });
      }

      const updated = await updateOnboardingTask(
        taskId,
        tenantId,
        {
          status: body.status,
          assignee: body.assignee,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          evidenceJson: body.evidenceJson,
        },
        body.reason || 'Task updated via API',
        body.actor,
        body.expectedVersion
      );

      const score = await refreshCompletenessScore(dossierId, tenantId);
      return { ok: true, task: updated, completenessScore: score };
    }
  );

  /* -- Complete onboarding task ---------------------------- */

  server.post(
    '/rcm/dossiers/:dossierId/tasks/:taskId/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { dossierId, taskId } = request.params as { dossierId: string; taskId: string };
      const body = (request.body as any) || {};

      const task = await findOnboardingTaskById(taskId, tenantId);
      if (!task || task.dossierId !== dossierId) {
        return reply.code(404).send({ ok: false, error: 'Task not found' });
      }

      if (task.status === 'completed') {
        return reply.code(409).send({ ok: false, error: 'Task already completed' });
      }

      const updated = await completeOnboardingTask(
        taskId,
        tenantId,
        body.reason || 'Completed via API',
        body.actor || 'system'
      );
      const score = await refreshCompletenessScore(dossierId, tenantId);

      // If all tasks complete, auto-advance dossier to "active"
      const dossier = await findDossierById(dossierId, tenantId);
      if (score === 100 && dossier && dossier.status === 'draft') {
        await updateDossier(
          dossierId,
          tenantId,
          { status: 'active' },
          'All onboarding tasks completed',
          body.actor
        );
      }

      return { ok: true, task: updated, completenessScore: score };
    }
  );

  /* -- Seed onboarding tasks ------------------------------- */

  server.post(
    '/rcm/dossiers/:id/seed-tasks',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      const dossier = await findDossierById(id, tenantId);
      if (!dossier) return reply.code(404).send({ ok: false, error: 'Dossier not found' });

      const payer = await findPayerById(dossier.payerId);
      const mode = body.integrationMode || payer?.integrationMode || 'manual';

      const tasks = await seedOnboardingTasks(
        id,
        mode,
        tenantId,
        dossier.payerId,
        body.actor
      );
      return { ok: true, tasks, seeded: tasks.length };
    }
  );
}
