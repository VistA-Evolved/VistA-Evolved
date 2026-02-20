/**
 * RCM — Job Queue Abstraction
 *
 * Phase 40 (Superseding): In-memory job queue with clean adapter interface
 * for later migration to Redis/RabbitMQ/SQS.
 *
 * Job types:
 *   CLAIM_SUBMIT — Submit claim to payer via connector
 *   ELIGIBILITY_CHECK — Run 270/271 eligibility inquiry
 *   STATUS_POLL — Poll claim status via 276/277
 *   ERA_INGEST — Process inbound 835 remittance
 *   ACK_PROCESS — Process 999/TA1 acknowledgments
 *
 * Strategy: in-memory FIFO queue with retry + backoff + dead-letter.
 * Production: swap InMemoryJobQueue for RedisJobQueue via env var.
 */

import { randomUUID } from "node:crypto";

/* ── Job Types ─────────────────────────────────────────────── */

export type RcmJobType =
  | "CLAIM_SUBMIT"
  | "ELIGIBILITY_CHECK"
  | "STATUS_POLL"
  | "ERA_INGEST"
  | "ACK_PROCESS";

export type RcmJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "dead_letter"
  | "cancelled";

export interface RcmJob {
  id: string;
  type: RcmJobType;
  status: RcmJobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string;
  priority: number;          // 0 = highest, 9 = lowest
  createdAt: string;
  scheduledAt: string;       // when to run (for delayed/retry)
  startedAt?: string;
  completedAt?: string;
  nextRetryAt?: string;
}

/* ── Job Queue Interface (adapter pattern) ──────────────────── */

export interface RcmJobQueue {
  /** Enqueue a job; returns job ID */
  enqueue(params: {
    type: RcmJobType;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
    priority?: number;
    maxAttempts?: number;
    delayMs?: number;
  }): Promise<string>;

  /** Dequeue next ready job (FIFO within priority) */
  dequeue(): Promise<RcmJob | null>;

  /** Mark job completed */
  complete(jobId: string, result?: Record<string, unknown>): Promise<void>;

  /** Mark job failed (will retry if attempts < maxAttempts) */
  fail(jobId: string, error: string): Promise<void>;

  /** Move to dead-letter after max retries */
  deadLetter(jobId: string, error: string): Promise<void>;

  /** Cancel a queued job */
  cancel(jobId: string): Promise<void>;

  /** Get job by ID */
  getJob(jobId: string): Promise<RcmJob | null>;

  /** List jobs by status/type */
  listJobs(filter?: {
    status?: RcmJobStatus;
    type?: RcmJobType;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: RcmJob[]; total: number }>;

  /** Get queue stats */
  getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }>;

  /** Purge completed jobs older than given timestamp */
  purge(beforeTimestamp: string): Promise<number>;
}

/* ── In-Memory Implementation ──────────────────────────────── */

const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 5000; // 5s, 10s, 20s exponential

export class InMemoryJobQueue implements RcmJobQueue {
  private jobs = new Map<string, RcmJob>();
  private idempotencyIndex = new Map<string, string>(); // key → jobId

  async enqueue(params: {
    type: RcmJobType;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
    priority?: number;
    maxAttempts?: number;
    delayMs?: number;
  }): Promise<string> {
    // Idempotency check
    if (params.idempotencyKey) {
      const existing = this.idempotencyIndex.get(params.idempotencyKey);
      if (existing && this.jobs.has(existing)) return existing;
    }

    const now = new Date();
    const scheduledAt = params.delayMs
      ? new Date(now.getTime() + params.delayMs).toISOString()
      : now.toISOString();

    const job: RcmJob = {
      id: randomUUID(),
      type: params.type,
      status: "queued",
      payload: params.payload,
      attempts: 0,
      maxAttempts: params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      idempotencyKey: params.idempotencyKey,
      priority: params.priority ?? 5,
      createdAt: now.toISOString(),
      scheduledAt,
    };

    this.jobs.set(job.id, job);
    if (params.idempotencyKey) {
      this.idempotencyIndex.set(params.idempotencyKey, job.id);
    }
    return job.id;
  }

  async dequeue(): Promise<RcmJob | null> {
    const now = new Date().toISOString();
    const ready = Array.from(this.jobs.values())
      .filter(j => j.status === "queued" && j.scheduledAt <= now)
      .sort((a, b) => a.priority - b.priority || a.scheduledAt.localeCompare(b.scheduledAt));

    if (ready.length === 0) return null;

    const job = ready[0];
    job.status = "processing";
    job.startedAt = now;
    job.attempts += 1;
    this.jobs.set(job.id, job);
    return job;
  }

  async complete(jobId: string, result?: Record<string, unknown>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "completed";
    job.result = result;
    job.completedAt = new Date().toISOString();
    this.jobs.set(jobId, job);
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.error = error;

    if (job.attempts >= job.maxAttempts) {
      job.status = "dead_letter";
      job.completedAt = new Date().toISOString();
    } else {
      // Exponential backoff
      const delayMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, job.attempts - 1);
      job.status = "queued";
      job.nextRetryAt = new Date(Date.now() + delayMs).toISOString();
      job.scheduledAt = job.nextRetryAt;
    }
    this.jobs.set(jobId, job);
  }

  async deadLetter(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "dead_letter";
    job.error = error;
    job.completedAt = new Date().toISOString();
    this.jobs.set(jobId, job);
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "queued") return;
    job.status = "cancelled";
    job.completedAt = new Date().toISOString();
    this.jobs.set(jobId, job);
  }

  async getJob(jobId: string): Promise<RcmJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async listJobs(filter?: {
    status?: RcmJobStatus;
    type?: RcmJobType;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: RcmJob[]; total: number }> {
    let results = Array.from(this.jobs.values());
    if (filter?.status) results = results.filter(j => j.status === filter.status);
    if (filter?.type) results = results.filter(j => j.type === filter.type);
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = results.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    return { jobs: results.slice(offset, offset + limit), total };
  }

  async getStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    const stats = { queued: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 };
    for (const j of this.jobs.values()) {
      if (j.status === "queued") stats.queued++;
      else if (j.status === "processing") stats.processing++;
      else if (j.status === "completed") stats.completed++;
      else if (j.status === "failed") stats.failed++;
      else if (j.status === "dead_letter") stats.deadLetter++;
    }
    return stats;
  }

  async purge(beforeTimestamp: string): Promise<number> {
    let count = 0;
    for (const [id, job] of this.jobs) {
      if ((job.status === "completed" || job.status === "cancelled") &&
          job.completedAt && job.completedAt < beforeTimestamp) {
        this.jobs.delete(id);
        if (job.idempotencyKey) this.idempotencyIndex.delete(job.idempotencyKey);
        count++;
      }
    }
    return count;
  }
}

/* ── Singleton ─────────────────────────────────────────────── */

let _queue: RcmJobQueue | null = null;

export function getJobQueue(): RcmJobQueue {
  if (!_queue) _queue = new InMemoryJobQueue();
  return _queue;
}

export function resetJobQueue(): void {
  _queue = null;
}
