/**
 * PG Scheduling Booking Lock Repository — TTL-based concurrency locks
 *
 * Phase 128: Imaging + Scheduling Durability (Map stores -> Postgres)
 *
 * Booking locks prevent double-booking. Each lock has an `expires_at` TTL.
 * Uses INSERT ... ON CONFLICT for safe concurrency: if lock exists and
 * hasn't expired, acquisition fails. If expired, the lock is replaced.
 *
 * Lock key format: "dfn:date:clinic" (same as in-memory pattern).
 * Persists only operational locking, NOT appointment truth (VistA is source).
 */

import { eq, sql, and, lt } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgSchedulingBookingLock } from '../pg-schema.js';

export type BookingLockRow = typeof pgSchedulingBookingLock.$inferSelect;

/* ── Acquire ───────────────────────────────────────────────── */

/**
 * Attempt to acquire a booking lock.
 * Returns true if lock was acquired, false if already held and not expired.
 *
 * Implementation: Try insert. If conflict on lock_key, check if expired.
 * If expired, replace. If not expired, deny.
 */
export async function acquireLock(data: {
  id: string;
  tenantId?: string;
  lockKey: string;
  holderDuz: string;
  expiresAt: string;
}): Promise<boolean> {
  const db = getPgDb();
  const now = new Date().toISOString();

  try {
    // First, try to clean up any expired lock for this key+tenant
    await db
      .delete(pgSchedulingBookingLock)
      .where(
        and(
          eq(pgSchedulingBookingLock.tenantId, data.tenantId ?? 'default'),
          eq(pgSchedulingBookingLock.lockKey, data.lockKey),
          lt(pgSchedulingBookingLock.expiresAt, now)
        )
      );

    // Now try to insert
    await db.insert(pgSchedulingBookingLock).values({
      id: data.id,
      tenantId: data.tenantId ?? 'default',
      lockKey: data.lockKey,
      holderDuz: data.holderDuz,
      expiresAt: data.expiresAt,
      acquiredAt: now,
    });
    return true;
  } catch (err: any) {
    // Unique constraint violation = lock already held
    if (
      err.code === '23505' ||
      err.message?.includes('unique') ||
      err.message?.includes('duplicate')
    ) {
      return false;
    }
    throw err;
  }
}

/* ── Release ───────────────────────────────────────────────── */

export async function releaseLock(lockKey: string, tenantId = 'default'): Promise<boolean> {
  const db = getPgDb();
  const result = await db
    .delete(pgSchedulingBookingLock)
    .where(
      and(
        eq(pgSchedulingBookingLock.tenantId, tenantId),
        eq(pgSchedulingBookingLock.lockKey, lockKey)
      )
    );
  return (result as any)?.rowCount > 0;
}

/* ── Lookup ────────────────────────────────────────────────── */

export async function findLockByKey(
  lockKey: string,
  tenantId = 'default'
): Promise<BookingLockRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(pgSchedulingBookingLock)
    .where(
      and(
        eq(pgSchedulingBookingLock.tenantId, tenantId),
        eq(pgSchedulingBookingLock.lockKey, lockKey),
        sql`${pgSchedulingBookingLock.expiresAt} > ${now}`
      )
    );
  return rows[0];
}

export async function findActiveLocks(): Promise<BookingLockRow[]> {
  const db = getPgDb();
  const now = new Date().toISOString();
  return db
    .select()
    .from(pgSchedulingBookingLock)
    .where(sql`${pgSchedulingBookingLock.expiresAt} > ${now}`);
}

/* ── Cleanup ───────────────────────────────────────────────── */

export async function cleanupExpiredLocks(): Promise<number> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const result = await db
    .delete(pgSchedulingBookingLock)
    .where(lt(pgSchedulingBookingLock.expiresAt, now));
  return (result as any)?.rowCount ?? 0;
}

/* ── Stats ─────────────────────────────────────────────────── */

export async function countLocks(): Promise<{ active: number; expired: number }> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const activeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgSchedulingBookingLock)
    .where(sql`${pgSchedulingBookingLock.expiresAt} > ${now}`);
  const expiredResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgSchedulingBookingLock)
    .where(lt(pgSchedulingBookingLock.expiresAt, now));
  return {
    active: activeResult[0]?.count ?? 0,
    expired: expiredResult[0]?.count ?? 0,
  };
}
