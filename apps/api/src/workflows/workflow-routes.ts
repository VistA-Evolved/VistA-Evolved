/**
 * Phase 160: Workflow Routes — Department Workflow Packs
 */
import type { FastifyInstance } from 'fastify';
import {
  createDefinition,
  activateDefinition,
  archiveDefinition,
  getDefinition,
  listDefinitions,
  startWorkflow,
  advanceStep,
  cancelWorkflow,
  getInstance,
  listInstances,
  seedDepartmentPacks,
  getDepartmentPacks,
  getWorkflowStats,
} from './workflow-engine.js';

export async function workflowRoutes(server: FastifyInstance): Promise<void> {
  // ── Definitions ────────────────────────────────────────────────
  server.get('/admin/workflows', async (request) => {
    const { department } = request.query as any;
    const defs = listDefinitions('default', department);
    return { ok: true, definitions: defs, count: defs.length };
  });

  server.post('/admin/workflows', async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.department || !body.name || !body.steps) {
      return reply.code(400).send({ ok: false, error: 'department, name, steps required' });
    }
    const def = createDefinition(body, 'default', (request as any).session?.duz);
    return { ok: true, definition: def };
  });

  server.get('/admin/workflows/:id', async (request, reply) => {
    const { id } = request.params as any;
    const def = getDefinition(id);
    if (!def) return reply.code(404).send({ ok: false, error: 'Definition not found' });
    return { ok: true, definition: def };
  });

  server.post('/admin/workflows/:id/activate', async (request, reply) => {
    const { id } = request.params as any;
    const def = activateDefinition(id);
    if (!def) return reply.code(400).send({ ok: false, error: 'Cannot activate' });
    return { ok: true, definition: def };
  });

  server.post('/admin/workflows/:id/archive', async (request, reply) => {
    const { id } = request.params as any;
    const def = archiveDefinition(id);
    if (!def) return reply.code(400).send({ ok: false, error: 'Cannot archive' });
    return { ok: true, definition: def };
  });

  // ── Seed & Packs ──────────────────────────────────────────────
  server.post('/admin/workflows/seed', async () => {
    const result = seedDepartmentPacks('default');
    return { ok: true, ...result };
  });

  server.get('/admin/workflows/packs', async () => {
    const packs = getDepartmentPacks();
    return { ok: true, packs, count: packs.length };
  });

  server.get('/admin/workflows/stats', async () => {
    const stats = getWorkflowStats('default');
    return { ok: true, ...stats };
  });

  // ── Instances ─────────────────────────────────────────────────
  server.post('/workflows/start', async (request, reply) => {
    const body = (request.body as any) || {};
    const { definitionId, patientDfn, encounterRef, queueTicketId } = body;
    if (!definitionId || !patientDfn) {
      return reply.code(400).send({ ok: false, error: 'definitionId and patientDfn required' });
    }
    const inst = startWorkflow(
      definitionId,
      patientDfn,
      'default',
      (request as any).session?.duz,
      encounterRef,
      queueTicketId
    );
    if (!inst) return reply.code(400).send({ ok: false, error: 'Definition not found' });
    return { ok: true, instance: inst };
  });

  server.get('/workflows/instances', async (request) => {
    const { department, status } = request.query as any;
    const insts = listInstances('default', department, status);
    return { ok: true, instances: insts, count: insts.length };
  });

  server.get('/workflows/instances/:id', async (request, reply) => {
    const { id } = request.params as any;
    const inst = getInstance(id);
    if (!inst) return reply.code(404).send({ ok: false, error: 'Instance not found' });
    return { ok: true, instance: inst };
  });

  server.post('/workflows/instances/:id/step/:stepId', async (request, reply) => {
    const { id, stepId } = request.params as any;
    const body = (request.body as any) || {};
    const action = body.action === 'skip' ? 'skip' : 'complete';
    const inst = advanceStep(id, stepId, action, (request as any).session?.duz, body.notes);
    if (!inst) return reply.code(400).send({ ok: false, error: 'Cannot advance step' });
    return { ok: true, instance: inst };
  });

  server.post('/workflows/instances/:id/cancel', async (request, reply) => {
    const { id } = request.params as any;
    const inst = cancelWorkflow(id);
    if (!inst) return reply.code(400).send({ ok: false, error: 'Cannot cancel' });
    return { ok: true, instance: inst };
  });
}
