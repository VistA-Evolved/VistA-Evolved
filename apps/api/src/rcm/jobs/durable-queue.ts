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

import { randomUUID } from "node:crypto";
import { getDb } from "../../platform/db/db.js";
import { rcmDurableJob } from "../../platform/db/schema.js";
import { eq, and, lte, sql, desc, asc } from "drizzle-orm";
import type { RcmJobQueue, RcmJob, RcmJobType, RcmJobStatus } from "./queue.js";

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
  try { return JSON.parse(val); } catch { return fallback; }
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
    const db = getDb();
    const now = new Date();
    const scheduledAt = params.delayMs
      ? new Date(now.getTime() + params.delayMs).toISOString()
      : now.toISOString();

    // Idempotency check — return existing job ID if key matches
    if (params.idempotencyKey) {
      const existing = db
        .select({ id: rcmDurableJob.id })
        .from(rcmDurableJob)
        .where(
          and(
            eq(rcmDurableJob.idempotencyKey, params.idempotencyKey),
            eq(rcmDurableJob.tenantId, String((params.payload as any)?._tenantId ?? "default")),
          ),
        )
        .get();
      if (existing) return existing.id;
    }

    const id = randomUUID();
    db.insert(rcmDurableJob)
      .values({
        id,
        tenantId: String((params.payload as any)?._tenantId ?? "default"),
        type: params.type,
        status: "queued",
        payloadJson: JSON.stringify(params.payload),
        attempts: 0,
        maxAttempts: params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        idempotencyKey: params.idempotencyKey ?? null,
        priority: params.priority ?? 5,
        scheduledAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .run();

    return id;
  }

  async dequeue(): Promise<RcmJob | null> {
    const db = getDb();
    const now = new Date().toISOString();

    // Find next ready job — highest priority (lowest number), then earliest scheduled
    const row = db
      .select()
      .from(rcmDurableJob)
      .where(
        and(
          eq(rcmDurableJob.status, "queued"),
          lte(rcmDurableJob.scheduledAt, now),
        ),
      )
      .orderBy(asc(rcmDurableJob.priority), asc(rcmDurableJob.scheduledAt))
      .limit(1)
      .get();

    if (!row) return null;

    // Atomically transition to processing
    db.update(rcmDurableJob)
      .set({
        status: "processing",
        startedAt: now,
        attempts: (row.attempts ?? 0) + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(rcmDurableJob.id, row.id),
          eq(rcmDurableJob.status, "queued"), // CAS guard
        ),
      )
      .run();

    // Re-fetch to get updated state
    const updated = db.select().from(rcmDurableJob).where(eq(rcmDurableJob.id, row.id)).get();
    if (!updated || updated.status !== "processing") return null;

    return rowToJob(updated);
  }

  async complete(jobId: string, result?: Record<string, unknown>): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    db.update(rcmDurableJob)
      .set({
        status: "completed",
        resultJson: result ? JSON.stringify(result) : null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(rcmDurableJob.id, jobId))
      .run();
  }

  async fail(jobId: string, error: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    const row = db.select().from(rcmDurableJob).where(eq(rcmDurableJob.id, jobId)).get();
    if (!row) return;

    const attempts = row.attempts ?? 1;
    const maxAttempts = row.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    if (attempts >= maxAttempts) {
      // Move to dead letter
      db.update(rcmDurableJob)
        .set({
          status: "dead_letter",
          error,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(rcmDurableJob.id, jobId))
        .run();
    } else {
      // Exponential backoff, capped
      const delayMs = Math.min(
        RETRY_BACKOFF_BASE_MS * Math.pow(2, attempts - 1),
        RETRY_BACKOFF_CAP_MS,
      );
      const nextRetry = new Date(Date.now() + delayMs).toISOString();

      db.update(rcmDurableJob)
        .set({
          status: "queued",
          error,
          scheduledAt: nextRetry,
          nextRetryAt: nextRetry,
          updatedAt: now,
        })
        .where(eq(rcmDurableJob.id, jobId))
        .run();
    }
  }

  async deadLetter(jobId: string, error: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    db.update(rcmDurableJob)
      .set({
        status: "dead_letter",
        error,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(rcmDurableJob.id, jobId))
      .run();
  }

  async cancel(jobId: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    db.update(rcmDurableJob)
      .set({
        status: "cancelled",
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(rcmDurableJob.id, jobId),
          eq(rcmDurableJob.status, "queued"),
        ),
      )
      .run();
  }

  async getJob(jobId: string): Promise<RcmJob | null> {
    const db = getDb();
    const row = db.select().from(rcmDurableJob).where(eq(rcmDurableJob.id, jobId)).get();
    return row ? rowToJob(row) : null;
  }

  async listJobs(filter?: {
    status?: RcmJobStatus;
    type?: RcmJobType;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: RcmJob[]; total: number }> {
    const db = getDb();
    const conditions: any[] = [];
    if (filter?.status) conditions.push(eq(rcmDurableJob.status, filter.status));
    if (filter?.type) conditions.push(eq(rcmDurableJob.type, filter.type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRow = db
      .select({ count: sql<number>`count(*)` })
      .from(rcmDurableJob)
      .where(whereClause)
      .get();
    const total = (countRow as any)?.count ?? 0;

    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;

    const rows = db
      .select()
      .from(rcmDurableJob)
      .where(whereClause)
      .orderBy(desc(rcmDurableJob.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return { jobs: rows.map(rowToJob), total };
  }

  async getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    const db = getDb();
    const rows = db
      .select({
        status: rcmDurableJob.status,
        count: sql<number>`count(*)`,
      })
      .from(rcmDurableJob)
      .groupBy(rcmDurableJob.status)
      .all();

    const stats = { queued: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 };
    for (const row of rows) {
      const count = (row as any).count ?? 0;
      switch (row.status) {
        case "queued":       stats.queued = count; break;
        case "processing":   stats.processing = count; break;
        case "completed":    stats.completed = count; break;
        case "failed":       stats.failed = count; break;
        case "dead_letter":  stats.deadLetter = count; break;
      }
    }
    return stats;
  }

  async purge(beforeTimestamp: string): Promise<number> {
    const db = getDb();
    // Count first, then delete
    const targets = db
      .select({ id: rcmDurableJob.id })
      .from(rcmDurableJob)
      .where(
        and(
          lte(rcmDurableJob.completedAt, beforeTimestamp),
          sql`${rcmDurableJob.status} IN ('completed', 'cancelled')`,
        ),
      )
      .all();

    if (targets.length === 0) return 0;

    for (const t of targets) {
      db.delete(rcmDurableJob).where(eq(rcmDurableJob.id, t.id)).run();
    }
    return targets.length;
  }
}
