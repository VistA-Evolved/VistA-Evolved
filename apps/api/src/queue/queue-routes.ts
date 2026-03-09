/**
 * Phase 159: Queue Routes — Patient Queue / Waiting / Numbering / Calling System
 * Fastify plugin with ~15 endpoints for queue management, display board, and stats.
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import { isPgConfigured } from '../platform/pg/pg-db.js';
import * as pgQueueRepo from '../platform/pg/repo/pg-queue-repo.js';
import {
  createTicket,
  callTicket,
  callNextTicket,
  startServing,
  completeTicket,
  markNoShow,
  transferTicket,
  listTickets,
  getTicket,
  getDisplayBoard,
  getQueueStats,
  listDepartments,
  upsertDepartmentConfig,
  seedDefaultConfigs,
  getQueueEvents,
} from './queue-engine.js';
import type {
  CreateTicketInput,
  DepartmentQueueConfig,
  QueueDisplayBoard,
  QueuePriority,
  QueueStats,
  QueueTicket,
  TransferTicketInput,
} from './types.js';

const PRIORITY_WEIGHT: Record<QueuePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function resolveTenantId(request: FastifyRequest, session?: any): string | null {
  const sessionTenantId =
    typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
      ? session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  const headerTenantId = request.headers['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  const queryTenantId =
    typeof (request.query as any)?.tenantId === 'string' && (request.query as any).tenantId.trim().length > 0
      ? (request.query as any).tenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || headerTenant || queryTenantId || null;
}

function requireTenantId(
  request: FastifyRequest,
  reply: FastifyReply,
  session?: any
): string | null {
  const tenantId = resolveTenantId(request, session);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function ensureDepartmentConfigs(tenantId: string): DepartmentQueueConfig[] {
  let departments = listDepartments(tenantId);
  if (departments.length === 0) {
    seedDefaultConfigs(tenantId);
    departments = listDepartments(tenantId);
  }
  return departments;
}

function sortTickets(tickets: QueueTicket[]): QueueTicket[] {
  return [...tickets].sort((a, b) => {
    const priorityDelta = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function buildDisplayBoard(
  department: string,
  tenantId: string,
  tickets: QueueTicket[]
): QueueDisplayBoard {
  const config = ensureDepartmentConfigs(tenantId).find((item) => item.department === department);
  const serving = tickets.filter((ticket) => ticket.status === 'serving');
  const called = tickets.filter((ticket) => ticket.status === 'called');
  const waiting = tickets.filter((ticket) => ticket.status === 'waiting');
  const windowCount = config?.windows.length || 1;
  const avgMin = config?.estimatedServiceMinutes || 15;
  const estimatedWaitMinutes = Math.round(
    ((serving.length + called.length + waiting.length) * avgMin) / windowCount
  );

  return {
    department,
    displayName: config?.displayName || department,
    currentlyServing: serving.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      windowNumber: ticket.windowNumber || '',
    })),
    nowCalling: called.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      windowNumber: ticket.windowNumber || '',
    })),
    waitingCount: waiting.length,
    estimatedWaitMinutes,
    updatedAt: new Date().toISOString(),
  };
}

function buildQueueStats(department: string, tickets: QueueTicket[]): QueueStats {
  const today = new Date().toISOString().slice(0, 10);
  const todayTickets = tickets.filter((ticket) => ticket.createdAt.startsWith(today));
  const completed = todayTickets.filter((ticket) => ticket.status === 'completed');
  const waiting = todayTickets.filter((ticket) => ticket.status === 'waiting');
  const serving = todayTickets.filter((ticket) => ticket.status === 'serving');
  const noShow = todayTickets.filter((ticket) => ticket.status === 'no-show');

  let totalWaitMs = 0;
  let waitCount = 0;
  for (const ticket of completed) {
    if (ticket.calledAt) {
      totalWaitMs += new Date(ticket.calledAt).getTime() - new Date(ticket.createdAt).getTime();
      waitCount++;
    }
  }

  let totalServiceMs = 0;
  let serviceCount = 0;
  for (const ticket of completed) {
    if (ticket.servedAt && ticket.completedAt) {
      totalServiceMs +=
        new Date(ticket.completedAt).getTime() - new Date(ticket.servedAt).getTime();
      serviceCount++;
    }
  }

  const byPriority: Record<QueuePriority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
  for (const ticket of todayTickets) byPriority[ticket.priority]++;

  return {
    department,
    totalToday: todayTickets.length,
    waiting: waiting.length,
    serving: serving.length,
    completed: completed.length,
    noShow: noShow.length,
    averageWaitMinutes: waitCount ? Math.round(totalWaitMs / waitCount / 60000) : 0,
    averageServiceMinutes: serviceCount ? Math.round(totalServiceMs / serviceCount / 60000) : 0,
    byPriority,
  };
}

function getDepartmentConfig(tenantId: string, department: string): DepartmentQueueConfig | undefined {
  return ensureDepartmentConfigs(tenantId).find((item) => item.department === department);
}

async function createPgTicket(
  input: CreateTicketInput,
  tenantId: string,
  actorDuz?: string
): Promise<QueueTicket> {
  const config = getDepartmentConfig(tenantId, input.department);
  const prefix = config?.prefix || input.department.toUpperCase().slice(0, 4);
  const day = new Date().toISOString().slice(0, 10);
  const countToday = await pgQueueRepo.countQueueTicketsForDay(tenantId, input.department, day);
  const createdAt = new Date().toISOString();
  const ticket = await pgQueueRepo.insertQueueTicket({
    id: randomUUID(),
    tenantId,
    department: input.department,
    ticketNumber: `${prefix}-${String(countToday + 1).padStart(3, '0')}`,
    patientDfn: input.patientDfn,
    patientName: input.patientName,
    priority: input.priority || 'normal',
    status: 'waiting',
    notes: input.notes,
    appointmentIen: input.appointmentIen,
    createdAt,
  });
  await pgQueueRepo.insertQueueEvent({
    id: randomUUID(),
    tenantId,
    ticketId: ticket.id,
    eventType: 'created',
    actorDuz,
    detail: `Ticket ${ticket.ticketNumber} created for dept ${ticket.department}`,
    createdAt,
  });
  return ticket;
}

export async function queueRoutes(server: FastifyInstance): Promise<void> {
  // ── Create ticket ──────────────────────────────────────────────
  server.post('/queue/tickets', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { department, patientDfn, patientName, priority, appointmentIen, notes } = body;
    if (!department || !patientDfn || !patientName) {
      return reply
        .code(400)
        .send({ ok: false, error: 'department, patientDfn, patientName required' });
    }
    const input: CreateTicketInput = {
      department,
      patientDfn,
      patientName,
      priority,
      appointmentIen,
      notes,
    };
    ensureDepartmentConfigs(tenantId);
    const ticket = isPgConfigured()
      ? await createPgTicket(input, tenantId, session.duz)
      : createTicket(input, tenantId, session.duz);
    return { ok: true, ticket };
  });

  // ── List tickets for department ────────────────────────────────
  server.get('/queue/tickets', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { dept, status } = request.query as any;
    if (!dept) return { ok: false, error: 'dept query param required' };
    ensureDepartmentConfigs(tenantId);
    const tickets = isPgConfigured()
      ? sortTickets(await pgQueueRepo.listQueueTickets({ tenantId, department: dept, status }))
      : listTickets(dept, tenantId, status);
    return { ok: true, tickets, count: tickets.length };
  });

  // ── Get single ticket ──────────────────────────────────────────
  server.get('/queue/tickets/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const ticket = isPgConfigured()
      ? await pgQueueRepo.findQueueTicketById(id, tenantId)
      : getTicket(id);
    if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return { ok: true, ticket };
  });

  // ── Get ticket events ──────────────────────────────────────────
  server.get('/queue/tickets/:id/events', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const ticket = isPgConfigured()
      ? await pgQueueRepo.findQueueTicketById(id, tenantId)
      : getTicket(id);
    if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    const events = isPgConfigured()
      ? await pgQueueRepo.listQueueEvents(id, tenantId)
      : getQueueEvents(id);
    return { ok: true, events };
  });

  // ── Call specific ticket ───────────────────────────────────────
  server.post('/queue/tickets/:id/call', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { windowNumber } = body;
    if (!windowNumber) return reply.code(400).send({ ok: false, error: 'windowNumber required' });
    let ticket: QueueTicket | null = null;
    if (isPgConfigured()) {
      const existing = await pgQueueRepo.findQueueTicketById(id, tenantId);
      if (existing && existing.status === 'waiting') {
        const calledAt = new Date().toISOString();
        ticket =
          (await pgQueueRepo.updateQueueTicket(id, tenantId, {
            status: 'called',
            windowNumber,
            calledAt,
          })) || null;
        if (ticket) {
          await pgQueueRepo.insertQueueEvent({
            id: randomUUID(),
            tenantId,
            ticketId: ticket.id,
            eventType: 'called',
            actorDuz: session.duz,
            detail: `Called to ${windowNumber}`,
            createdAt: calledAt,
          });
        }
      }
    } else {
      ticket = callTicket(id, windowNumber, session.duz);
    }
    if (!ticket)
      return reply
        .code(400)
        .send({ ok: false, error: 'Cannot call ticket (invalid status or not found)' });
    return { ok: true, ticket };
  });

  // ── Call next ticket in department ─────────────────────────────
  server.post('/queue/call-next', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { department, windowNumber } = body;
    if (!department || !windowNumber) {
      return reply.code(400).send({ ok: false, error: 'department and windowNumber required' });
    }
    let ticket: QueueTicket | null = null;
    if (isPgConfigured()) {
      const waiting = sortTickets(
        await pgQueueRepo.listQueueTickets({ tenantId, department, status: 'waiting' })
      );
      if (waiting.length > 0) {
        const calledAt = new Date().toISOString();
        ticket =
          (await pgQueueRepo.updateQueueTicket(waiting[0].id, tenantId, {
            status: 'called',
            windowNumber,
            calledAt,
          })) || null;
        if (ticket) {
          await pgQueueRepo.insertQueueEvent({
            id: randomUUID(),
            tenantId,
            ticketId: ticket.id,
            eventType: 'called',
            actorDuz: session.duz,
            detail: `Called to ${windowNumber}`,
            createdAt: calledAt,
          });
        }
      }
    } else {
      ticket = callNextTicket(department, windowNumber, tenantId, session.duz);
    }
    if (!ticket)
      return reply.code(404).send({ ok: false, error: 'No waiting tickets in this department' });
    return { ok: true, ticket };
  });

  // ── Start serving ──────────────────────────────────────────────
  server.post('/queue/tickets/:id/serve', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    let ticket: QueueTicket | null = null;
    if (isPgConfigured()) {
      const existing = await pgQueueRepo.findQueueTicketById(id, tenantId);
      if (existing && existing.status === 'called') {
        const servedAt = new Date().toISOString();
        ticket =
          (await pgQueueRepo.updateQueueTicket(id, tenantId, {
            status: 'serving',
            providerDuz: body.providerDuz || null,
            servedAt,
          })) || null;
        if (ticket) {
          await pgQueueRepo.insertQueueEvent({
            id: randomUUID(),
            tenantId,
            ticketId: ticket.id,
            eventType: 'serving',
            actorDuz: session.duz,
            detail: 'Serving started',
            createdAt: servedAt,
          });
        }
      }
    } else {
      ticket = startServing(id, body.providerDuz, session.duz);
    }
    if (!ticket)
      return reply.code(400).send({ ok: false, error: 'Cannot start serving (invalid status)' });
    return { ok: true, ticket };
  });

  // ── Complete ticket ────────────────────────────────────────────
  server.post('/queue/tickets/:id/complete', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = (request as any).params;
    let ticket: QueueTicket | null = null;
    if (isPgConfigured()) {
      const existing = await pgQueueRepo.findQueueTicketById(id, tenantId);
      if (existing && (existing.status === 'serving' || existing.status === 'called')) {
        const completedAt = new Date().toISOString();
        ticket =
          (await pgQueueRepo.updateQueueTicket(id, tenantId, {
            status: 'completed',
            completedAt,
          })) || null;
        if (ticket) {
          await pgQueueRepo.insertQueueEvent({
            id: randomUUID(),
            tenantId,
            ticketId: ticket.id,
            eventType: 'completed',
            actorDuz: session.duz,
            detail: 'Visit completed',
            createdAt: completedAt,
          });
        }
      }
    } else {
      ticket = completeTicket(id, session.duz);
    }
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot complete ticket' });
    return { ok: true, ticket };
  });

  // ── No-show ────────────────────────────────────────────────────
  server.post('/queue/tickets/:id/no-show', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = (request as any).params;
    let ticket: QueueTicket | null = null;
    if (isPgConfigured()) {
      const existing = await pgQueueRepo.findQueueTicketById(id, tenantId);
      if (existing && (existing.status === 'waiting' || existing.status === 'called')) {
        const completedAt = new Date().toISOString();
        ticket =
          (await pgQueueRepo.updateQueueTicket(id, tenantId, {
            status: 'no-show',
            completedAt,
          })) || null;
        if (ticket) {
          await pgQueueRepo.insertQueueEvent({
            id: randomUUID(),
            tenantId,
            ticketId: ticket.id,
            eventType: 'no-show',
            actorDuz: session.duz,
            detail: 'Marked as no-show',
            createdAt: completedAt,
          });
        }
      }
    } else {
      ticket = markNoShow(id, session.duz);
    }
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot mark no-show' });
    return { ok: true, ticket };
  });

  // ── Transfer to another department ─────────────────────────────
  server.post('/queue/tickets/:id/transfer', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { targetDepartment, reason } = body;
    if (!targetDepartment)
      return reply.code(400).send({ ok: false, error: 'targetDepartment required' });
    const input: TransferTicketInput = { targetDepartment, reason };
    let newTicket: QueueTicket | null = null;
    if (isPgConfigured()) {
      const existing = await pgQueueRepo.findQueueTicketById(id, tenantId);
      if (existing && existing.status !== 'completed' && existing.status !== 'no-show') {
        const completedAt = new Date().toISOString();
        await pgQueueRepo.updateQueueTicket(id, tenantId, {
          status: 'transferred',
          completedAt,
        });
        await pgQueueRepo.insertQueueEvent({
          id: randomUUID(),
          tenantId,
          ticketId: id,
          eventType: 'transferred',
          actorDuz: session.duz,
          detail: `Transferred to ${input.targetDepartment}: ${input.reason || ''}`,
          createdAt: completedAt,
        });
        newTicket = await createPgTicket(
          {
            department: input.targetDepartment,
            patientDfn: existing.patientDfn,
            patientName: existing.patientName,
            priority: existing.priority,
            appointmentIen: existing.appointmentIen,
            notes: `Transferred from ${existing.department}: ${input.reason || ''}`,
          },
          tenantId,
          session.duz
        );
        newTicket =
          (await pgQueueRepo.updateQueueTicket(newTicket.id, tenantId, {
            transferredFrom: existing.department,
          })) || newTicket;
      }
    } else {
      newTicket = transferTicket(id, input, tenantId, session.duz);
    }
    if (!newTicket) return reply.code(400).send({ ok: false, error: 'Cannot transfer ticket' });
    return { ok: true, ticket: newTicket };
  });

  // ── Public display board (NO AUTH) ─────────────────────────────
  server.get('/queue/display/:dept', async (request, reply) => {
    const { dept } = (request as any).params;
    const tenantId = resolveTenantId(request, (request as any).session) || 'default';
    const board = isPgConfigured()
      ? buildDisplayBoard(
          dept,
          tenantId,
          await pgQueueRepo.listQueueTickets({ tenantId, department: dept })
        )
      : getDisplayBoard(dept, tenantId);
    return { ok: true, board };
  });

  // ── Queue stats ────────────────────────────────────────────────
  server.get('/queue/stats/:dept', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { dept } = (request as any).params;
    const stats = isPgConfigured()
      ? buildQueueStats(
          dept,
          await pgQueueRepo.listQueueTickets({ tenantId, department: dept })
        )
      : getQueueStats(dept, tenantId);
    return { ok: true, stats };
  });

  // ── List departments ───────────────────────────────────────────
  server.get('/queue/departments', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const departments = ensureDepartmentConfigs(tenantId);
    return { ok: true, departments, count: departments.length };
  });

  // ── Upsert department config (admin) ───────────────────────────
  server.post('/queue/departments', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.department) return reply.code(400).send({ ok: false, error: 'department required' });
    const config = upsertDepartmentConfig(body, tenantId);
    return { ok: true, config };
  });

  // ── Seed default department configs ────────────────────────────
  server.post('/queue/departments/seed', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const seeded = seedDefaultConfigs(tenantId);
    return { ok: true, seeded, message: `Seeded ${seeded} department configs` };
  });
}
