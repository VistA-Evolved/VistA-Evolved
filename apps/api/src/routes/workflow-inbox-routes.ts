/**
 * Workflow Inbox Routes — Phase 350
 *
 * Unified task inbox endpoints: create, list, assign, transition, counts.
 * Session-scoped for all users; facility/department filtering.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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

export async function workflowInboxRoutes(server: FastifyInstance): Promise<void> {
  const tenantId = 'default';

  // ─── List / Filter Tasks ─────────────────────────────

  server.get('/workflow/tasks', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req.query as any) || {};
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

  // ─── Get Single Task ─────────────────────────────────

  server.get('/workflow/tasks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const task = getTask(id);
    if (!task || task.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  // ─── Task Event History ──────────────────────────────

  server.get('/workflow/tasks/:id/events', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const task = getTask(id);
    if (!task || task.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, events: getTaskEvents(id) });
  });

  // ─── Create Task ─────────────────────────────────────

  server.post('/workflow/tasks', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.title || !body.category || !body.createdBy) {
      return reply.code(400).send({
        ok: false,
        error: 'title, category, and createdBy are required',
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
      assignedBy: body.assignedBy || null,
      createdBy: body.createdBy,
      patientDfn: body.patientDfn || null,
      sourceType: body.sourceType || null,
      sourceId: body.sourceId || null,
      dueAt: body.dueAt || null,
      escalateAt: body.escalateAt || null,
      metadata: body.metadata || {},
    });
    return reply.code(201).send({ ok: true, task });
  });

  // ─── Task Transitions ────────────────────────────────

  server.post('/workflow/tasks/:id/assign', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    if (!body.assignedTo || !body.assignedBy) {
      return reply.code(400).send({ ok: false, error: 'assignedTo and assignedBy are required' });
    }
    const task = assignTask(id, body.assignedTo, body.assignedBy);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/start', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const task = startTask(id, body.actor || 'system');
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found or not in assigned state' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/complete', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const task = completeTask(id, body.actor || 'system', body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const task = cancelTask(id, body.actor || 'system', body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/escalate', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const task = escalateTask(id, body.actor || 'system', body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  server.post('/workflow/tasks/:id/defer', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    if (!body.dueAt) {
      return reply.code(400).send({ ok: false, error: 'dueAt is required' });
    }
    const task = deferTask(id, body.actor || 'system', body.dueAt, body.comment);
    if (!task) {
      return reply.code(404).send({ ok: false, error: 'Task not found' });
    }
    return reply.send({ ok: true, task });
  });

  // ─── Dashboard Counts ────────────────────────────────

  server.get('/workflow/counts', async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId } = (req.query as any) || {};
    return reply.send({ ok: true, counts: getTaskCounts(tenantId, departmentId) });
  });
}

export default workflowInboxRoutes;
