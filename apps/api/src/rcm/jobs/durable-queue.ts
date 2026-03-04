/**
 * Durable Job Queue — Phase 142: RCM Operational Excellence
 *
 * SQLite-backed implementation of RcmJobQueue that survives API restarts.
 * Uses the platform DB (same as denial, reconciliation, and claim tables).
 *
 * Strategy:
 *   - All job state persisted in `rcm_durable_job` table
 *   - Idempotency via UNIQUE(tenant_id, idempotency_key) index
 *   - Exponential backoff: 5s × 2^(attempt-1) capped at 5 min
 *   - Purge removes completed/cancelled jobs older than threshold
 *   - No PHI in payloads — enforced by job-audit-bridge.ts
 *
 * Extended job types (Phase 142):
 *   REMITTANCE_IMPORT — Background ERA 835 import processing
 *   DENIAL_FOLLOWUP_TICK — Periodic SLA-deadline scanner for denials
 */

import { randomUUID } from 'node:crypto';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { rcmDurableJob } from '../../platform/pg/pg-schema.js';
import { eq, and, lte, sql, desc } from 'drizzle-orm';
import type { RcmJobQueue, RcmJob, RcmJobType, RcmJobStatus } from './queue.js';

/* ── Constants ─────────────────────────────────────────────── */

const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 5_000;
const RETRY_BACKOFF_CAP_MS = 300_000; // 5 minutes max

/* ── Row Mapper ────────────────────────────────────────────── */

function rowToJob(row: any): RcmJob {
  return {
    id: row.id,
    type: row.type as RcmJobType,
    status: row.status as RcmJobStatus,
    payload: safeJsonParse(row.payloadJson, {}),
    result: row.resultJson ? safeJsonParse(row.resultJson, undefined) : undefined,
    error: row.error ?? undefined,
    attempts: row.attempts ?? 0,
    maxAttempts: row.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    idempotencyKey: row.idempotencyKey ?? undefined,
    priority: row.priority ?? 5,
    createdAt: row.createdAt,
    scheduledAt: row.scheduledAt,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    nextRetryAt: row.nextRetryAt ?? undefined,
  };
}

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/* ── Durable Queue Implementation ──────────────────────────── */

export class DurableJobQueue implements RcmJobQueue {
  async enqueue(params: {
    type: RcmJobType;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
    priority?: number;
    maxAttempts?: number;
    delayMs?: number;
  }): Promise<string> {
    const db = getPgDb();
    const now = new Date();
    const scheduledAt = params.delayMs
      ? new Date(now.getTime() + params.delayMs).toISOString()
      : now.toISOString();

    // Idempotency check — return existing job ID if key matches
    if (params.idempotencyKey) {
      const existingRows = await db
        .select({ id: rcmDurableJob.id })
        .from(rcmDurableJob)
        .where(
          and(
            eq(rcmDurableJob.idempotencyKey, params.idempotencyKey),
            eq(rcmDurableJob.tenantId, String((params.payload as any)?._tenantId ?? 'default'))
          )
        );
      const existing = existingRows[0] ?? null;
      if (existing) return existing.id;
    }

    const id = randomUUID();
    await db.insert(rcmDurableJob).values({
      id,
      tenantId: String((params.payload as any)?._tenantId ?? 'default'),
      type: params.type,
      status: 'queued',
      payloadJson: JSON.stringify(params.payload),
      attempts: 0,
      maxAttempts: params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      idempotencyKey: params.idempotencyKey ?? null,
      priority: params.priority ?? 5,
      scheduledAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return id;
  }

  async dequeue(): Promise<RcmJob | null> {
    const db = getPgDb();
    const now = new Date().toISOString();

    // Atomic dequeue: UPDATE ... RETURNING avoids race conditions
    // between concurrent workers. Only one worker can claim each job.
    const claimed = await db
      .update(rcmDurableJob)
      .set({
        status: 'processing',
        startedAt: now,
        attempts: sql`${rcmDurableJob.attempts} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(rcmDurableJob.status, 'queued'),
          lte(rcmDurableJob.scheduledAt, now),
          // Pick the best candidate by sub-selecting the exact row ID
          sql`${rcmDurableJob.id} = (
            SELECT ${rcmDurableJob.id} FROM ${rcmDurableJob}
            WHERE ${rcmDurableJob.status} = 'queued'
              AND ${rcmDurableJob.scheduledAt} <= ${now}
            ORDER BY ${rcmDurableJob.priority} ASC, ${rcmDurableJob.scheduledAt} ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )`
        )
      )
      .returning();

    const row = claimed[0] ?? null;
    if (!row) return null;

    return rowToJob(row);
  }

  async complete(jobId: string, result?: Record<string, unknown>): Promise<void> {
    const db = getPgDb();
    const now = new Date().toISOString();
    await db
      .update(rcmDurableJob)
      .set({
        status: 'completed',
        resultJson: result ? JSON.stringify(result) : null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(rcmDurableJob.id, jobId));
  }

  async fail(jobId: string, error: string): Promise<void> {
    const db = getPgDb();
    const now = new Date().toISOString();

    const failRows = await db.select().from(rcmDurableJob).where(eq(rcmDurableJob.id, jobId));
    const row = failRows[0] ?? null;
    if (!row) return;

    const attempts = row.attempts ?? 1;
    const maxAttempts = row.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    if (attempts >= maxAttempts) {
      // Move to dead letter
      await db
        .update(rcmDurableJob)
        .set({
          status: 'dead_letter',
          error,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(rcmDurableJob.id, jobId));
    } else {
      // Exponential backoff, capped
      const delayMs = Math.min(
        RETRY_BACKOFF_BASE_MS * Math.pow(2, attempts - 1),
        RETRY_BACKOFF_CAP_MS
      );
      const nextRetry = new Date(Date.now() + delayMs).toISOString();

      await db
        .update(rcmDurableJob)
        .set({
          status: 'queued',
          error,
          scheduledAt: nextRetry,
          nextRetryAt: nextRetry,
          updatedAt: now,
        })
        .where(eq(rcmDurableJob.id, jobId));
    }
  }

  async deadLetter(jobId: string, error: string): Promise<void> {
    const db = getPgDb();
    const now = new Date().toISOString();
    await db
      .update(rcmDurableJob)
      .set({
        status: 'dead_letter',
        error,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(rcmDurableJob.id, jobId));
  }

  async cancel(jobId: string): Promise<void> {
    const db = getPgDb();
    const now = new Date().toISOString();
    await db
      .update(rcmDurableJob)
      .set({
        status: 'cancelled',
        completedAt: now,
        updatedAt: now,
      })
      .where(and(eq(rcmDurableJob.id, jobId), eq(rcmDurableJob.status, 'queued')));
  }

  async getJob(jobId: string): Promise<RcmJob | null> {
    const db = getPgDb();
    const rows = await db.select().from(rcmDurableJob).where(eq(rcmDurableJob.id, jobId));
    const row = rows[0] ?? null;
    return row ? rowToJob(row) : null;
  }

  async listJobs(filter?: {
    status?: RcmJobStatus;
    type?: RcmJobType;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: RcmJob[]; total: number }> {
    const db = getPgDb();
    const conditions: any[] = [];
    if (filter?.status) conditions.push(eq(rcmDurableJob.status, filter.status));
    if (filter?.type) conditions.push(eq(rcmDurableJob.type, filter.type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(rcmDurableJob)
      .where(whereClause);
    const total = Number((countRows[0] as any)?.count ?? 0);

    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;

    const rows = await db
      .select()
      .from(rcmDurableJob)
      .where(whereClause)
      .orderBy(desc(rcmDurableJob.createdAt))
      .limit(limit)
      .offset(offset);

    return { jobs: rows.map(rowToJob), total };
  }

  async getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    const db = getPgDb();
    const rows = await db
      .select({
        status: rcmDurableJob.status,
        count: sql<number>`count(*)`,
      })
      .from(rcmDurableJob)
      .groupBy(rcmDurableJob.status);

    const stats = { queued: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 };
    for (const row of rows) {
      const count = Number((row as any).count ?? 0);
      switch (row.status) {
        case 'queued':
          stats.queued = count;
          break;
        case 'processing':
          stats.processing = count;
          break;
        case 'completed':
          stats.completed = count;
          break;
        case 'failed':
          stats.failed = count;
          break;
        case 'dead_letter':
          stats.deadLetter = count;
          break;
      }
    }
    return stats;
  }

  async purge(beforeTimestamp: string): Promise<number> {
    const db = getPgDb();
    // Atomic bulk delete — no SELECT+loop needed
    const deleted = await db
      .delete(rcmDurableJob)
      .where(
        and(
          lte(rcmDurableJob.completedAt, beforeTimestamp),
          sql`${rcmDurableJob.status} IN ('completed', 'cancelled')`
        )
      )
      .returning({ id: rcmDurableJob.id });

    return deleted.length;
  }
}
