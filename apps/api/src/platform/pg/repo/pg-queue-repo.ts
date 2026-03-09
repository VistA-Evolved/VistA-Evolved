import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgQueueEvent, pgQueueTicket } from '../pg-schema.js';
import type { QueueEvent, QueuePriority, QueueTicket, TicketStatus } from '../../../queue/types.js';

type QueueTicketRow = typeof pgQueueTicket.$inferSelect;
type QueueEventRow = typeof pgQueueEvent.$inferSelect;

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function mapTicket(row: QueueTicketRow): QueueTicket {
  return {
    id: row.id,
    tenantId: row.tenantId,
    department: row.department,
    ticketNumber: row.ticketNumber,
    patientDfn: row.patientDfn,
    patientName: row.patientName,
    priority: row.priority as QueuePriority,
    status: row.status as TicketStatus,
    providerDuz: row.providerDuz || undefined,
    windowNumber: row.windowNumber || undefined,
    notes: row.notes || undefined,
    appointmentIen: row.appointmentIen || undefined,
    createdAt: toIso(row.createdAt)!,
    calledAt: toIso(row.calledAt),
    servedAt: toIso(row.servedAt),
    completedAt: toIso(row.completedAt),
    transferredFrom: row.transferredFrom || undefined,
  };
}

function mapEvent(row: QueueEventRow): QueueEvent {
  return {
    id: row.id,
    tenantId: row.tenantId,
    ticketId: row.ticketId,
    eventType: row.eventType,
    actorDuz: row.actorDuz || undefined,
    detail: row.detail || undefined,
    createdAt: toIso(row.createdAt)!,
  };
}

export async function insertQueueTicket(data: {
  id: string;
  tenantId: string;
  department: string;
  ticketNumber: string;
  patientDfn: string;
  patientName: string;
  priority: QueuePriority;
  status: TicketStatus;
  providerDuz?: string;
  windowNumber?: string;
  notes?: string;
  appointmentIen?: string;
  createdAt: string;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  transferredFrom?: string;
}): Promise<QueueTicket> {
  const db = getPgDb();
  await db.insert(pgQueueTicket).values({
    id: data.id,
    tenantId: data.tenantId,
    department: data.department,
    ticketNumber: data.ticketNumber,
    patientDfn: data.patientDfn,
    patientName: data.patientName,
    priority: data.priority,
    status: data.status,
    providerDuz: data.providerDuz || null,
    windowNumber: data.windowNumber || null,
    notes: data.notes || null,
    appointmentIen: data.appointmentIen || null,
    transferredFrom: data.transferredFrom || null,
    createdAt: new Date(data.createdAt),
    calledAt: data.calledAt ? new Date(data.calledAt) : null,
    servedAt: data.servedAt ? new Date(data.servedAt) : null,
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
  });
  return (await findQueueTicketById(data.id, data.tenantId))!;
}

export async function updateQueueTicket(
  id: string,
  tenantId: string,
  updates: Partial<{
    department: string;
    ticketNumber: string;
    priority: QueuePriority;
    status: TicketStatus;
    providerDuz: string | null;
    windowNumber: string | null;
    notes: string | null;
    appointmentIen: string | null;
    calledAt: string | null;
    servedAt: string | null;
    completedAt: string | null;
    transferredFrom: string | null;
  }>
): Promise<QueueTicket | undefined> {
  const db = getPgDb();
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (key === 'calledAt' || key === 'servedAt' || key === 'completedAt') {
      values[key] = value ? new Date(String(value)) : null;
    } else {
      values[key] = value;
    }
  }
  await db
    .update(pgQueueTicket)
    .set(values as any)
    .where(and(eq(pgQueueTicket.id, id), eq(pgQueueTicket.tenantId, tenantId)));
  return findQueueTicketById(id, tenantId);
}

export async function findQueueTicketById(
  id: string,
  tenantId: string
): Promise<QueueTicket | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgQueueTicket)
    .where(and(eq(pgQueueTicket.id, id), eq(pgQueueTicket.tenantId, tenantId)));
  return rows[0] ? mapTicket(rows[0]) : undefined;
}

export async function listQueueTickets(input: {
  tenantId: string;
  department?: string;
  status?: string;
}): Promise<QueueTicket[]> {
  const db = getPgDb();
  const filters = [eq(pgQueueTicket.tenantId, input.tenantId)];
  if (input.department) filters.push(eq(pgQueueTicket.department, input.department));
  if (input.status) filters.push(eq(pgQueueTicket.status, input.status));
  const rows = await db
    .select()
    .from(pgQueueTicket)
    .where(and(...filters))
    .orderBy(asc(pgQueueTicket.createdAt));
  return rows.map(mapTicket);
}

export async function countQueueTicketsForDay(
  tenantId: string,
  department: string,
  dayIso: string
): Promise<number> {
  const db = getPgDb();
  const start = new Date(`${dayIso}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const rows = await db
    .select()
    .from(pgQueueTicket)
    .where(
      and(
        eq(pgQueueTicket.tenantId, tenantId),
        eq(pgQueueTicket.department, department),
        gte(pgQueueTicket.createdAt, start),
        lt(pgQueueTicket.createdAt, end)
      )
    );
  return rows.length;
}

export async function insertQueueEvent(data: {
  id: string;
  tenantId: string;
  ticketId: string;
  eventType: string;
  actorDuz?: string;
  detail?: string;
  createdAt: string;
}): Promise<QueueEvent> {
  const db = getPgDb();
  await db.insert(pgQueueEvent).values({
    id: data.id,
    tenantId: data.tenantId,
    ticketId: data.ticketId,
    eventType: data.eventType,
    actorDuz: data.actorDuz || null,
    detail: data.detail || null,
    createdAt: new Date(data.createdAt),
  });
  const rows = await db
    .select()
    .from(pgQueueEvent)
    .where(and(eq(pgQueueEvent.id, data.id), eq(pgQueueEvent.tenantId, data.tenantId)));
  return mapEvent(rows[0]);
}

export async function listQueueEvents(ticketId: string, tenantId: string): Promise<QueueEvent[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgQueueEvent)
    .where(and(eq(pgQueueEvent.ticketId, ticketId), eq(pgQueueEvent.tenantId, tenantId)))
    .orderBy(asc(pgQueueEvent.createdAt));
  return rows.map(mapEvent);
}