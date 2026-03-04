/**
 * Payer Dossier Routes — Phase 514 (Wave 37 B2)
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
  /* ── List dossiers ─────────────────────────────────────── */

  server.get('/rcm/dossiers', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || 'default';
    const result = await listDossiers(tenantId, {
      status: q.status,
      countryCode: q.countryCode,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
    return { ok: true, ...result };
  });

  /* ── Get dossier by ID ────────────────────────────────── */

  server.get('/rcm/dossiers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const dossier = await findDossierById(id);
    if (!dossier) return reply.code(404).send({ ok: false, error: 'Dossier not found' });

    const tasks = await listOnboardingTasks(id);
    return { ok: true, dossier, tasks };
  });

  /* ── Get dossier by payer ID ──────────────────────────── */

  server.get(
    '/rcm/dossiers/by-payer/:payerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { payerId } = request.params as { payerId: string };
      const q = (request.query as any) || {};
      const tenantId = q.tenantId || 'default';

      const dossier = await findDossierByPayer(tenantId, payerId);
      if (!dossier) return reply.code(404).send({ ok: false, error: 'No dossier for this payer' });

      const tasks = await listOnboardingTasks(dossier.id);
      return { ok: true, dossier, tasks };
    }
  );

  /* ── Create dossier ────────────────────────────────────── */

  server.post('/rcm/dossiers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const {
      payerId,
      tenantId = 'default',
      enrichmentJson,
      contactJson,
      timingJson,
      complianceJson,
    } = body;

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

  /* ── Update dossier ────────────────────────────────────── */

  server.patch('/rcm/dossiers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const updated = await updateDossier(
      id,
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

  /* ── List onboarding tasks for dossier ────────────────── */

  server.get('/rcm/dossiers/:id/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const dossier = await findDossierById(id);
    if (!dossier) return reply.code(404).send({ ok: false, error: 'Dossier not found' });

    const tasks = await listOnboardingTasks(id);
    return { ok: true, tasks, completenessScore: dossier.completenessScore };
  });

  /* ── Update onboarding task ────────────────────────────── */

  server.patch(
    '/rcm/dossiers/:dossierId/tasks/:taskId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { dossierId, taskId } = request.params as { dossierId: string; taskId: string };
      const body = (request.body as any) || {};

      const task = await findOnboardingTaskById(taskId);
      if (!task || task.dossierId !== dossierId) {
        return reply.code(404).send({ ok: false, error: 'Task not found' });
      }

      const updated = await updateOnboardingTask(
        taskId,
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

      const score = await refreshCompletenessScore(dossierId);
      return { ok: true, task: updated, completenessScore: score };
    }
  );

  /* ── Complete onboarding task ──────────────────────────── */

  server.post(
    '/rcm/dossiers/:dossierId/tasks/:taskId/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { dossierId, taskId } = request.params as { dossierId: string; taskId: string };
      const body = (request.body as any) || {};

      const task = await findOnboardingTaskById(taskId);
      if (!task || task.dossierId !== dossierId) {
        return reply.code(404).send({ ok: false, error: 'Task not found' });
      }

      if (task.status === 'completed') {
        return reply.code(409).send({ ok: false, error: 'Task already completed' });
      }

      const updated = await completeOnboardingTask(
        taskId,
        body.reason || 'Completed via API',
        body.actor || 'system'
      );
      const score = await refreshCompletenessScore(dossierId);

      // If all tasks complete, auto-advance dossier to "active"
      const dossier = await findDossierById(dossierId);
      if (score === 100 && dossier && dossier.status === 'draft') {
        await updateDossier(
          dossierId,
          { status: 'active' },
          'All onboarding tasks completed',
          body.actor
        );
      }

      return { ok: true, task: updated, completenessScore: score };
    }
  );

  /* ── Seed onboarding tasks ─────────────────────────────── */

  server.post(
    '/rcm/dossiers/:id/seed-tasks',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      const dossier = await findDossierById(id);
      if (!dossier) return reply.code(404).send({ ok: false, error: 'Dossier not found' });

      const payer = await findPayerById(dossier.payerId);
      const mode = body.integrationMode || payer?.integrationMode || 'manual';

      const tasks = await seedOnboardingTasks(
        id,
        mode,
        dossier.tenantId,
        dossier.payerId,
        body.actor
      );
      return { ok: true, tasks, seeded: tasks.length };
    }
  );
}
