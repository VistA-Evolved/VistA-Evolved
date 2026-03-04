/**
 * Support Ticket Store
 *
 * Phase 244 (Wave 6 P7): In-memory support ticket tracking for
 * internal operations. Matches project in-memory store pattern.
 *
 * Tickets track issues, diagnostics snapshots, and resolution status.
 */

import * as crypto from 'node:crypto';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketCategory =
  | 'vista'
  | 'adapter'
  | 'module'
  | 'performance'
  | 'data'
  | 'security'
  | 'other';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  tenantId: string;
  createdBy: string;
  assignedTo?: string;
  diagnosticSnapshotId?: string;
  notes: TicketNote[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TicketNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  tenantId?: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

const tickets = new Map<string, SupportTicket>();

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function createTicket(input: CreateTicketInput, createdBy: string): SupportTicket {
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: genId('tkt'),
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: 'open',
    tenantId: input.tenantId || 'default',
    createdBy,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
  tickets.set(ticket.id, ticket);
  log.info('Support ticket created', {
    ticketId: ticket.id,
    category: input.category,
    priority: input.priority,
  });
  return ticket;
}

export function getTicket(id: string): SupportTicket | undefined {
  return tickets.get(id);
}

export function listTickets(filters?: {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  tenantId?: string;
}): SupportTicket[] {
  let result = Array.from(tickets.values());
  if (filters?.status) result = result.filter((t) => t.status === filters.status);
  if (filters?.category) result = result.filter((t) => t.category === filters.category);
  if (filters?.priority) result = result.filter((t) => t.priority === filters.priority);
  if (filters?.tenantId) result = result.filter((t) => t.tenantId === filters.tenantId);
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateTicketStatus(id: string, status: TicketStatus): SupportTicket | null {
  const ticket = tickets.get(id);
  if (!ticket) return null;

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  if (status === 'resolved' || status === 'closed') {
    ticket.resolvedAt = ticket.updatedAt;
  }
  log.info('Support ticket status updated', { ticketId: id, status });
  return ticket;
}

export function addTicketNote(id: string, text: string, author: string): SupportTicket | null {
  const ticket = tickets.get(id);
  if (!ticket) return null;

  ticket.notes.push({
    id: genId('note'),
    text,
    author,
    createdAt: new Date().toISOString(),
  });
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

export function assignTicket(id: string, assignedTo: string): SupportTicket | null {
  const ticket = tickets.get(id);
  if (!ticket) return null;

  ticket.assignedTo = assignedTo;
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

export function attachDiagnosticSnapshot(id: string, snapshotId: string): SupportTicket | null {
  const ticket = tickets.get(id);
  if (!ticket) return null;

  ticket.diagnosticSnapshotId = snapshotId;
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

export function getTicketStats(): {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const all = Array.from(tickets.values());
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const t of all) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }

  return { total: all.length, byStatus, byPriority, byCategory };
}
