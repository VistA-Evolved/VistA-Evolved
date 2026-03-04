/**
 * Phase 159: Queue Routes — Patient Queue / Waiting / Numbering / Calling System
 * Fastify plugin with ~15 endpoints for queue management, display board, and stats.
 */
import type { FastifyInstance } from 'fastify';
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
import type { CreateTicketInput, TransferTicketInput } from './types.js';

export async function queueRoutes(server: FastifyInstance): Promise<void> {
  // ── Create ticket ──────────────────────────────────────────────
  server.post('/queue/tickets', async (request, reply) => {
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
    const ticket = createTicket(input, 'default', (request as any).session?.duz);
    return { ok: true, ticket };
  });

  // ── List tickets for department ────────────────────────────────
  server.get('/queue/tickets', async (request) => {
    const { dept, status } = request.query as any;
    if (!dept) return { ok: false, error: 'dept query param required' };
    const tickets = listTickets(dept, 'default', status);
    return { ok: true, tickets, count: tickets.length };
  });

  // ── Get single ticket ──────────────────────────────────────────
  server.get('/queue/tickets/:id', async (request, reply) => {
    const { id } = request.params as any;
    const ticket = getTicket(id);
    if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    return { ok: true, ticket };
  });

  // ── Get ticket events ──────────────────────────────────────────
  server.get('/queue/tickets/:id/events', async (request, reply) => {
    const { id } = request.params as any;
    const ticket = getTicket(id);
    if (!ticket) return reply.code(404).send({ ok: false, error: 'Ticket not found' });
    const events = getQueueEvents(id);
    return { ok: true, events };
  });

  // ── Call specific ticket ───────────────────────────────────────
  server.post('/queue/tickets/:id/call', async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { windowNumber } = body;
    if (!windowNumber) return reply.code(400).send({ ok: false, error: 'windowNumber required' });
    const ticket = callTicket(id, windowNumber, (request as any).session?.duz);
    if (!ticket)
      return reply
        .code(400)
        .send({ ok: false, error: 'Cannot call ticket (invalid status or not found)' });
    return { ok: true, ticket };
  });

  // ── Call next ticket in department ─────────────────────────────
  server.post('/queue/call-next', async (request, reply) => {
    const body = (request.body as any) || {};
    const { department, windowNumber } = body;
    if (!department || !windowNumber) {
      return reply.code(400).send({ ok: false, error: 'department and windowNumber required' });
    }
    const ticket = callNextTicket(
      department,
      windowNumber,
      'default',
      (request as any).session?.duz
    );
    if (!ticket)
      return reply.code(404).send({ ok: false, error: 'No waiting tickets in this department' });
    return { ok: true, ticket };
  });

  // ── Start serving ──────────────────────────────────────────────
  server.post('/queue/tickets/:id/serve', async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const ticket = startServing(id, body.providerDuz, (request as any).session?.duz);
    if (!ticket)
      return reply.code(400).send({ ok: false, error: 'Cannot start serving (invalid status)' });
    return { ok: true, ticket };
  });

  // ── Complete ticket ────────────────────────────────────────────
  server.post('/queue/tickets/:id/complete', async (request, reply) => {
    const { id } = (request as any).params;
    const ticket = completeTicket(id, (request as any).session?.duz);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot complete ticket' });
    return { ok: true, ticket };
  });

  // ── No-show ────────────────────────────────────────────────────
  server.post('/queue/tickets/:id/no-show', async (request, reply) => {
    const { id } = (request as any).params;
    const ticket = markNoShow(id, (request as any).session?.duz);
    if (!ticket) return reply.code(400).send({ ok: false, error: 'Cannot mark no-show' });
    return { ok: true, ticket };
  });

  // ── Transfer to another department ─────────────────────────────
  server.post('/queue/tickets/:id/transfer', async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { targetDepartment, reason } = body;
    if (!targetDepartment)
      return reply.code(400).send({ ok: false, error: 'targetDepartment required' });
    const input: TransferTicketInput = { targetDepartment, reason };
    const newTicket = transferTicket(id, input, 'default', (request as any).session?.duz);
    if (!newTicket) return reply.code(400).send({ ok: false, error: 'Cannot transfer ticket' });
    return { ok: true, ticket: newTicket };
  });

  // ── Public display board (NO AUTH) ─────────────────────────────
  server.get('/queue/display/:dept', async (request) => {
    const { dept } = (request as any).params;
    const board = getDisplayBoard(dept, 'default');
    return { ok: true, board };
  });

  // ── Queue stats ────────────────────────────────────────────────
  server.get('/queue/stats/:dept', async (request) => {
    const { dept } = (request as any).params;
    const stats = getQueueStats(dept, 'default');
    return { ok: true, stats };
  });

  // ── List departments ───────────────────────────────────────────
  server.get('/queue/departments', async () => {
    const departments = listDepartments('default');
    return { ok: true, departments, count: departments.length };
  });

  // ── Upsert department config (admin) ───────────────────────────
  server.post('/queue/departments', async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.department) return reply.code(400).send({ ok: false, error: 'department required' });
    const config = upsertDepartmentConfig(body, 'default');
    return { ok: true, config };
  });

  // ── Seed default department configs ────────────────────────────
  server.post('/queue/departments/seed', async () => {
    const seeded = seedDefaultConfigs('default');
    return { ok: true, seeded, message: `Seeded ${seeded} department configs` };
  });
}
