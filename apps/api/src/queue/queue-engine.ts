/**
 * Phase 159: Patient Queue Engine
 * In-memory queue management with ticket numbering, priority ordering,
 * department routing, and event logging. PG-backed via store-policy registration.
 */
import { randomUUID } from 'node:crypto';
import type {
  QueueTicket,
  QueueEvent,
  DepartmentQueueConfig,
  QueueDisplayBoard,
  QueueStats,
  QueuePriority,
  CreateTicketInput,
  TransferTicketInput,
} from './types.js';

// -- In-memory stores ------------------------------------------------
const ticketStore = new Map<string, QueueTicket>();
const eventStore: QueueEvent[] = [];
const departmentConfigs = new Map<string, DepartmentQueueConfig>();
const MAX_TICKETS = 20000;
const MAX_EVENTS = 50000;
const MAX_DAILY_COUNTER_KEYS = 5000;

// Daily counters per department (key: "tenantId:dept:YYYY-MM-DD")
const dailyCounters = new Map<string, number>();

// Prune stale daily counters (older than 2 days) every hour; cap total keys
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  for (const key of dailyCounters.keys()) {
    const datePart = key.split(':').pop() || '';
    if (datePart !== today && datePart !== yesterday) dailyCounters.delete(key);
  }
  // Enforce key cap to prevent unbounded growth
  if (dailyCounters.size > MAX_DAILY_COUNTER_KEYS) {
    const excess = [...dailyCounters.keys()].slice(0, dailyCounters.size - MAX_DAILY_COUNTER_KEYS);
    for (const k of excess) dailyCounters.delete(k);
  }
}, 3_600_000).unref();

// -- Priority weights (lower = called first) -------------------------
const PRIORITY_WEIGHT: Record<QueuePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// -- Default department configs --------------------------------------
const DEFAULT_CONFIGS: Array<
  Omit<DepartmentQueueConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
> = [
  {
    department: 'ed',
    displayName: 'Emergency Department',
    prefix: 'ED',
    maxActive: 50,
    autoCallEnabled: false,
    estimatedServiceMinutes: 30,
    windows: ['Triage-1', 'Triage-2', 'Bay-1', 'Bay-2', 'Bay-3'],
    enabled: true,
  },
  {
    department: 'primary-care',
    displayName: 'Primary Care',
    prefix: 'PC',
    maxActive: 30,
    autoCallEnabled: true,
    estimatedServiceMinutes: 20,
    windows: ['Room-1', 'Room-2', 'Room-3'],
    enabled: true,
  },
  {
    department: 'laboratory',
    displayName: 'Laboratory',
    prefix: 'LAB',
    maxActive: 40,
    autoCallEnabled: true,
    estimatedServiceMinutes: 10,
    windows: ['Window-1', 'Window-2'],
    enabled: true,
  },
  {
    department: 'radiology',
    displayName: 'Radiology',
    prefix: 'RAD',
    maxActive: 20,
    autoCallEnabled: true,
    estimatedServiceMinutes: 25,
    windows: ['Suite-1', 'Suite-2'],
    enabled: true,
  },
  {
    department: 'pharmacy',
    displayName: 'Pharmacy',
    prefix: 'RX',
    maxActive: 60,
    autoCallEnabled: true,
    estimatedServiceMinutes: 8,
    windows: ['Counter-1', 'Counter-2', 'Counter-3'],
    enabled: true,
  },
  {
    department: 'dental',
    displayName: 'Dental Clinic',
    prefix: 'DEN',
    maxActive: 15,
    autoCallEnabled: true,
    estimatedServiceMinutes: 45,
    windows: ['Chair-1', 'Chair-2'],
    enabled: true,
  },
  {
    department: 'mental-health',
    displayName: 'Mental Health',
    prefix: 'MH',
    maxActive: 15,
    autoCallEnabled: false,
    estimatedServiceMinutes: 50,
    windows: ['Office-1', 'Office-2'],
    enabled: true,
  },
  {
    department: 'ophthalmology',
    displayName: 'Eye Clinic',
    prefix: 'EYE',
    maxActive: 20,
    autoCallEnabled: true,
    estimatedServiceMinutes: 20,
    windows: ['Exam-1', 'Exam-2'],
    enabled: true,
  },
  {
    department: 'physical-therapy',
    displayName: 'Physical Therapy',
    prefix: 'PT',
    maxActive: 15,
    autoCallEnabled: false,
    estimatedServiceMinutes: 40,
    windows: ['Gym-1', 'Gym-2'],
    enabled: true,
  },
  {
    department: 'surgery-clinic',
    displayName: 'Surgery Clinic',
    prefix: 'SURG',
    maxActive: 15,
    autoCallEnabled: false,
    estimatedServiceMinutes: 30,
    windows: ['Pre-Op-1', 'Consult-1'],
    enabled: true,
  },
  {
    department: 'registration',
    displayName: 'Registration',
    prefix: 'REG',
    maxActive: 40,
    autoCallEnabled: true,
    estimatedServiceMinutes: 10,
    windows: ['Desk-1', 'Desk-2', 'Desk-3'],
    enabled: true,
  },
  {
    department: 'billing',
    displayName: 'Billing',
    prefix: 'BILL',
    maxActive: 20,
    autoCallEnabled: true,
    estimatedServiceMinutes: 15,
    windows: ['Desk-1', 'Desk-2'],
    enabled: true,
  },
];

// -- Helpers ---------------------------------------------------------
function todayKey(tenantId: string, dept: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${tenantId}:${dept}:${d}`;
}

function nextTicketNumber(tenantId: string, dept: string, prefix: string): string {
  const key = todayKey(tenantId, dept);
  const count = (dailyCounters.get(key) || 0) + 1;
  dailyCounters.set(key, count);
  return `${prefix}-${String(count).padStart(3, '0')}`;
}

function logEvent(
  tenantId: string,
  ticketId: string,
  eventType: string,
  actorDuz?: string,
  detail?: string
): void {
  eventStore.push({
    id: randomUUID(),
    tenantId,
    ticketId,
    eventType,
    actorDuz,
    detail,
    createdAt: new Date().toISOString(),
  });
  if (eventStore.length > MAX_EVENTS) eventStore.splice(0, eventStore.length - MAX_EVENTS);
}

function getConfig(tenantId: string, dept: string): DepartmentQueueConfig | undefined {
  return departmentConfigs.get(`${tenantId}:${dept}`);
}

// -- Initialize defaults ---------------------------------------------
export function seedDefaultConfigs(tenantId: string = 'default'): number {
  let seeded = 0;
  const now = new Date().toISOString();
  for (const cfg of DEFAULT_CONFIGS) {
    const key = `${tenantId}:${cfg.department}`;
    if (!departmentConfigs.has(key)) {
      departmentConfigs.set(key, {
        ...cfg,
        id: randomUUID(),
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
      seeded++;
    }
  }
  return seeded;
}

// -- CRUD Operations -------------------------------------------------

export function createTicket(
  input: CreateTicketInput,
  tenantId: string = 'default',
  actorDuz?: string
): QueueTicket {
  const config = getConfig(tenantId, input.department);
  const prefix = config?.prefix || input.department.toUpperCase().slice(0, 4);

  const ticket: QueueTicket = {
    id: randomUUID(),
    tenantId,
    department: input.department,
    ticketNumber: nextTicketNumber(tenantId, input.department, prefix),
    patientDfn: input.patientDfn,
    patientName: input.patientName,
    priority: input.priority || 'normal',
    status: 'waiting',
    appointmentIen: input.appointmentIen,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };

  ticketStore.set(ticket.id, ticket);
  if (ticketStore.size > MAX_TICKETS) {
    const oldest = ticketStore.keys().next().value;
    if (oldest != null) ticketStore.delete(oldest);
  }
  logEvent(
    tenantId,
    ticket.id,
    'created',
    actorDuz,
    `Ticket ${ticket.ticketNumber} created for dept ${input.department}`
  );
  return ticket;
}

export function callTicket(
  ticketId: string,
  windowNumber: string,
  actorDuz?: string
): QueueTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket || ticket.status !== 'waiting') return null;

  ticket.status = 'called';
  ticket.windowNumber = windowNumber;
  ticket.calledAt = new Date().toISOString();
  logEvent(ticket.tenantId, ticketId, 'called', actorDuz, `Called to ${windowNumber}`);
  return ticket;
}

export function callNextTicket(
  department: string,
  windowNumber: string,
  tenantId: string = 'default',
  actorDuz?: string
): QueueTicket | null {
  // Get all waiting tickets for this department, ordered by priority then creation time
  const waiting = Array.from(ticketStore.values())
    .filter((t) => t.tenantId === tenantId && t.department === department && t.status === 'waiting')
    .sort((a, b) => {
      const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (pw !== 0) return pw;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  if (waiting.length === 0) return null;
  return callTicket(waiting[0].id, windowNumber, actorDuz);
}

export function startServing(
  ticketId: string,
  providerDuz?: string,
  actorDuz?: string
): QueueTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket || ticket.status !== 'called') return null;

  ticket.status = 'serving';
  ticket.servedAt = new Date().toISOString();
  if (providerDuz) ticket.providerDuz = providerDuz;
  logEvent(ticket.tenantId, ticketId, 'serving', actorDuz, `Serving started`);
  return ticket;
}

export function completeTicket(ticketId: string, actorDuz?: string): QueueTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket || (ticket.status !== 'serving' && ticket.status !== 'called')) return null;

  ticket.status = 'completed';
  ticket.completedAt = new Date().toISOString();
  logEvent(ticket.tenantId, ticketId, 'completed', actorDuz, `Visit completed`);
  return ticket;
}

export function markNoShow(ticketId: string, actorDuz?: string): QueueTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket || (ticket.status !== 'waiting' && ticket.status !== 'called')) return null;

  ticket.status = 'no-show';
  ticket.completedAt = new Date().toISOString();
  logEvent(ticket.tenantId, ticketId, 'no-show', actorDuz, `Marked as no-show`);
  return ticket;
}

export function transferTicket(
  ticketId: string,
  input: TransferTicketInput,
  tenantId: string = 'default',
  actorDuz?: string
): QueueTicket | null {
  const ticket = ticketStore.get(ticketId);
  if (!ticket || ticket.status === 'completed' || ticket.status === 'no-show') return null;

  ticket.status = 'transferred';
  ticket.completedAt = new Date().toISOString();
  logEvent(
    ticket.tenantId,
    ticketId,
    'transferred',
    actorDuz,
    `Transferred to ${input.targetDepartment}: ${input.reason || ''}`
  );

  // Create new ticket in target department
  const newTicket = createTicket(
    {
      department: input.targetDepartment,
      patientDfn: ticket.patientDfn,
      patientName: ticket.patientName,
      priority: ticket.priority,
      appointmentIen: ticket.appointmentIen,
      notes: `Transferred from ${ticket.department}: ${input.reason || ''}`,
    },
    tenantId,
    actorDuz
  );
  newTicket.transferredFrom = ticket.department;
  return newTicket;
}

// -- Queries ---------------------------------------------------------

export function listTickets(
  department: string,
  tenantId: string = 'default',
  statusFilter?: string
): QueueTicket[] {
  return Array.from(ticketStore.values())
    .filter(
      (t) =>
        t.tenantId === tenantId &&
        t.department === department &&
        (!statusFilter || t.status === statusFilter)
    )
    .sort((a, b) => {
      const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (pw !== 0) return pw;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

export function getTicket(ticketId: string): QueueTicket | undefined {
  return ticketStore.get(ticketId);
}

export function getDisplayBoard(
  department: string,
  tenantId: string = 'default'
): QueueDisplayBoard {
  const config = getConfig(tenantId, department);
  const tickets = Array.from(ticketStore.values()).filter(
    (t) => t.tenantId === tenantId && t.department === department
  );

  const serving = tickets.filter((t) => t.status === 'serving');
  const called = tickets.filter((t) => t.status === 'called');
  const waiting = tickets.filter((t) => t.status === 'waiting');

  // Estimate wait: avg service time x (serving + called + waiting ahead) / windows
  const windowCount = config?.windows.length || 1;
  const avgMin = config?.estimatedServiceMinutes || 15;
  const estimatedWait = Math.round(
    ((serving.length + called.length + waiting.length) * avgMin) / windowCount
  );

  return {
    department,
    displayName: config?.displayName || department,
    currentlyServing: serving.map((t) => ({
      ticketNumber: t.ticketNumber,
      windowNumber: t.windowNumber || '',
    })),
    nowCalling: called.map((t) => ({
      ticketNumber: t.ticketNumber,
      windowNumber: t.windowNumber || '',
    })),
    waitingCount: waiting.length,
    estimatedWaitMinutes: estimatedWait,
    updatedAt: new Date().toISOString(),
  };
}

export function getQueueStats(department: string, tenantId: string = 'default'): QueueStats {
  const today = new Date().toISOString().slice(0, 10);
  const tickets = Array.from(ticketStore.values()).filter(
    (t) => t.tenantId === tenantId && t.department === department && t.createdAt.startsWith(today)
  );

  const completed = tickets.filter((t) => t.status === 'completed');
  const waiting = tickets.filter((t) => t.status === 'waiting');
  const serving = tickets.filter((t) => t.status === 'serving');
  const noShow = tickets.filter((t) => t.status === 'no-show');

  // Calculate average wait time (from created to called/served)
  let totalWaitMs = 0;
  let waitCount = 0;
  for (const t of completed) {
    if (t.calledAt) {
      totalWaitMs += new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime();
      waitCount++;
    }
  }

  // Calculate average service time (from served to completed)
  let totalServiceMs = 0;
  let serviceCount = 0;
  for (const t of completed) {
    if (t.servedAt && t.completedAt) {
      totalServiceMs += new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime();
      serviceCount++;
    }
  }

  const byPriority: Record<QueuePriority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
  for (const t of tickets) byPriority[t.priority]++;

  return {
    department,
    totalToday: tickets.length,
    waiting: waiting.length,
    serving: serving.length,
    completed: completed.length,
    noShow: noShow.length,
    averageWaitMinutes: waitCount ? Math.round(totalWaitMs / waitCount / 60000) : 0,
    averageServiceMinutes: serviceCount ? Math.round(totalServiceMs / serviceCount / 60000) : 0,
    byPriority,
  };
}

export function listDepartments(tenantId: string = 'default'): DepartmentQueueConfig[] {
  return Array.from(departmentConfigs.values()).filter((c) => c.tenantId === tenantId);
}

export function upsertDepartmentConfig(
  config: Partial<DepartmentQueueConfig> & { department: string },
  tenantId: string = 'default'
): DepartmentQueueConfig {
  const key = `${tenantId}:${config.department}`;
  const existing = departmentConfigs.get(key);
  const now = new Date().toISOString();

  if (existing) {
    const updated = {
      ...existing,
      ...config,
      // Pin immutable fields -- cannot be overwritten by config
      id: existing.id,
      tenantId,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    departmentConfigs.set(key, updated);
    return updated;
  }

  const newConfig: DepartmentQueueConfig = {
    id: randomUUID(),
    tenantId,
    department: config.department,
    displayName: config.displayName || config.department,
    prefix: config.prefix || config.department.toUpperCase().slice(0, 4),
    maxActive: config.maxActive ?? 30,
    autoCallEnabled: config.autoCallEnabled ?? true,
    estimatedServiceMinutes: config.estimatedServiceMinutes ?? 15,
    windows: config.windows || ['Window-1'],
    enabled: config.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
  departmentConfigs.set(key, newConfig);
  return newConfig;
}

export function getQueueEvents(ticketId: string): QueueEvent[] {
  return eventStore.filter((e) => e.ticketId === ticketId);
}

// -- Store reset (for testing) ---------------------------------------
export function resetQueueStore(): void {
  ticketStore.clear();
  eventStore.length = 0;
  departmentConfigs.clear();
  dailyCounters.clear();
}
