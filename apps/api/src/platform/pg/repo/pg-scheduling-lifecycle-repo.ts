/**
 * PG Scheduling Lifecycle Repository -- Phase 131.
 *
 * Tracks appointment lifecycle state transitions for audit/UI.
 * VistA remains the source of truth for appointment data.
 * This table records operational transitions only.
 *
 * States: requested -> waitlisted -> booked -> checked_in -> completed
 *                                       \-> cancelled
 *                                       \-> no_show
 */

import { eq, desc, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgSchedulingLifecycle } from '../pg-schema.js';

export type SchedulingLifecycleRow = typeof pgSchedulingLifecycle.$inferSelect;

/** Valid lifecycle states */
export const LIFECYCLE_STATES = [
  'requested',
  'waitlisted',
  'booked',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/** Valid state transitions */
const VALID_TRANSITIONS: Record<string, string[]> = {
  requested: ['waitlisted', 'booked', 'cancelled'],
  waitlisted: ['booked', 'cancelled'],
  booked: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Check if a state transition is valid */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/* -- Create ---------------------------------------------------------- */

export async function insertLifecycleEntry(data: {
  id: string;
  tenantId?: string;
  appointmentRef: string;
  patientDfn: string;
  clinicIen?: string;
  clinicName: string;
  state: string;
  previousState?: string;
  vistaIen?: string;
  rpcUsed?: string;
  transitionNote?: string;
  createdByDuz?: string;
}): Promise<SchedulingLifecycleRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db.insert(pgSchedulingLifecycle).values({
    id: data.id,
    tenantId: data.tenantId ?? 'default',
    appointmentRef: data.appointmentRef,
    patientDfn: data.patientDfn,
    clinicIen: data.clinicIen ?? null,
    clinicName: data.clinicName,
    state: data.state,
    previousState: data.previousState ?? null,
    vistaIen: data.vistaIen ?? null,
    rpcUsed: data.rpcUsed ?? null,
    transitionNote: data.transitionNote ?? null,
    createdByDuz: data.createdByDuz ?? null,
    createdAt: now,
    updatedAt: now,
  });
  const row = await findLifecycleEntryById(data.id);
  return row!;
}

/* -- Lookup ---------------------------------------------------------- */

export async function findLifecycleEntryById(
  id: string
): Promise<SchedulingLifecycleRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgSchedulingLifecycle)
    .where(eq(pgSchedulingLifecycle.id, id));
  return rows[0];
}

export async function findLifecycleByAppointmentRef(
  appointmentRef: string
): Promise<SchedulingLifecycleRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgSchedulingLifecycle)
    .where(eq(pgSchedulingLifecycle.appointmentRef, appointmentRef))
    .orderBy(desc(pgSchedulingLifecycle.createdAt));
}

export async function findLifecycleByPatient(
  patientDfn: string,
  limit = 50
): Promise<SchedulingLifecycleRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgSchedulingLifecycle)
    .where(eq(pgSchedulingLifecycle.patientDfn, patientDfn))
    .orderBy(desc(pgSchedulingLifecycle.createdAt))
    .limit(limit);
}

export async function findLatestByAppointmentRef(
  appointmentRef: string
): Promise<SchedulingLifecycleRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgSchedulingLifecycle)
    .where(eq(pgSchedulingLifecycle.appointmentRef, appointmentRef))
    .orderBy(desc(pgSchedulingLifecycle.createdAt))
    .limit(1);
  return rows[0];
}

export async function findLifecycleByState(
  state: string,
  limit = 100
): Promise<SchedulingLifecycleRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgSchedulingLifecycle)
    .where(eq(pgSchedulingLifecycle.state, state))
    .orderBy(desc(pgSchedulingLifecycle.createdAt))
    .limit(limit);
}

/* -- Stats ----------------------------------------------------------- */

export async function countByState(): Promise<Record<string, number>> {
  const db = getPgDb();
  const rows = await db
    .select({
      state: pgSchedulingLifecycle.state,
      count: sql<number>`count(*)`,
    })
    .from(pgSchedulingLifecycle)
    .groupBy(pgSchedulingLifecycle.state);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.state] = Number(row.count);
  }
  return result;
}

export async function countTotal(): Promise<number> {
  const db = getPgDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(pgSchedulingLifecycle);
  return Number(rows[0]?.count ?? 0);
}
