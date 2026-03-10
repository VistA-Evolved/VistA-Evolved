/**
 * Workflow Inbox Routes -- Phase 350
 *
 * Unified task inbox endpoints: create, list, assign, transition, counts.
 * Session-scoped for all users; facility/department filtering.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  createTask,
  getTask,
  listTasks,
  assignTask,
  startTask,
  completeTask,
  cancelTask,
  escalateTask,
  deferTask,
  getTaskEvents,
  getTaskCounts,
} from '../services/workflow-inbox-service.js';
import type { TaskCategory, TaskPriority, TaskStatus } from '../services/workflow-inbox-service.js';

function resolveTenantId(request: FastifyRequest): string | null {
  const sessionTenantId =
    typeof (request as any).session?.tenantId === 'string' &&
    (request as any).session.tenantId.trim().length > 0
      ? (request as any).session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || null;
}

function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function getActor(request: FastifyRequest): string {
  return (request as any).session?.userName || (request as any).session?.duz || 'unknown';
}

function getScopedTask(taskId: string, tenantId: string) {
  return getTask(taskId, tenantId) || null;
}

export async function workflowInboxRoutes(server: FastifyInstance): Promise<void> {
  // --- List / Filter Tasks -----------------------------

  server.get('/workflow/tasks', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const q = (req.query as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const tasks = listTasks({
      tenantId,
      facilityId: q.facilityId,
      departmentId: q.departmentId,
      assignedTo: q.assignedTo,
      status: q.status as TaskStatus | undefined,
      category: q.category as TaskCategory | undefined,
      priority: q.priority as TaskPriority | undefined,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
    });
    return reply.send({ ok: true, tasks, count: tasks.length });
  });

  // --- Get Single Task ---------------------------------

  server.get('/workflow/tasks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const task = getScopedTask(id, tenantId);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  // --- Task Event History ------------------------------

  server.get('/workflow/tasks/:id/events', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const task = getScopedTask(id, tenantId);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, events: getTaskEvents(id, tenantId) });
  });

  // --- Create Task -------------------------------------

  server.post('/workflow/tasks', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!body.title || !body.category) {
      return reply.code(400).send({
        ok: false,
        error: 'title and category are required',
      });
    }
    const task = createTask(tenantId, {
      facilityId: body.facilityId || null,
      departmentId: body.departmentId || null,
      title: body.title,
      description: body.description || '',
      category: body.category,
      priority: body.priority || 'normal',
      assignedTo: body.assignedTo || null,
      assignedBy: body.assignedTo ? getActor(req) : null,
      createdBy: getActor(req),
      patientDfn: body.patientDfn || null,
      sourceType: body.sourceType || null,
      sourceId: body.sourceId || null,
      dueAt: body.dueAt || null,
      escalateAt: body.escalateAt || null,
      metadata: body.metadata || {},
    });
    return reply.code(201).send({ ok: true, task });
  });

  // --- Task Transitions --------------------------------

  server.post('/workflow/tasks/:id/assign', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!body.assignedTo) {
      return reply.code(400).send({ ok: false, error: 'assignedTo is required' });
    }
    if (!getScopedTask(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    const task = assignTask(tenantId, id, body.assignedTo, getActor(req));
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/start', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!getScopedTask(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    const task = startTask(tenantId, id, getActor(req));
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found or not in assigned state' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/complete', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!getScopedTask(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    const task = completeTask(tenantId, id, getActor(req), body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!getScopedTask(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    const task = cancelTask(tenantId, id, getActor(req), body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/escalate', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!getScopedTask(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    const task = escalateTask(tenantId, id, getActor(req), body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/defer', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!body.dueAt) {
      return reply.code(400).send({ ok: false, error: 'dueAt is required' });
    }
    if (!getScopedTask(id, tenantId)) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    const task = deferTask(tenantId, id, getActor(req), body.dueAt, body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  // --- Dashboard Counts --------------------------------

  server.get('/workflow/counts', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireSession(req, reply);
    const { departmentId } = (req.query as any) || {};
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return reply.send({ ok: true, counts: getTaskCounts(tenantId, departmentId) });
  });
}

export default workflowInboxRoutes;
