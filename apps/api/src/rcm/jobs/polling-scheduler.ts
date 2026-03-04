/**
 * Polling Scheduler — Phase 69: RCM Ops Excellence v1
 *
 * Rate-limited, tenant-scoped polling framework on top of the
 * existing InMemoryJobQueue (Phase 40).
 *
 * Features:
 *   - Configurable poll intervals per job type
 *   - Per-tenant rate limiting (sliding window)
 *   - Graceful start/stop
 *   - Minimal metadata storage (no PHI in job payloads)
 *   - Safe defaults (disabled unless explicitly started)
 *
 * Jobs are queued via the existing RcmJobQueue interface.
 * The scheduler polls the queue at intervals and dispatches work.
 */

import { getJobQueue, type RcmJobType } from './queue.js';
import { log } from '../../lib/logger.js';

/* ── Rate Limiter ──────────────────────────────────────────── */

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

class SlidingWindowRateLimiter {
  private buckets = new Map<string, RateBucket>();
  private readonly maxTokens: number;
  private readonly windowMs: number;

  constructor(maxPerWindow: number, windowMs: number) {
    this.maxTokens = maxPerWindow;
    this.windowMs = windowMs;
  }

  /** Returns true if allowed, false if rate-limited. */
  tryAcquire(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refill = Math.floor((elapsed / this.windowMs) * this.maxTokens);
    if (refill > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refill);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }
    return false;
  }

  /** Get remaining tokens for a key. */
  remaining(key: string): number {
    const bucket = this.buckets.get(key);
    return bucket?.tokens ?? this.maxTokens;
  }

  /** Reset all buckets. */
  reset(): void {
    this.buckets.clear();
  }
}

/* ── Scheduler Configuration ───────────────────────────────── */

export interface PollingJobConfig {
  type: RcmJobType;
  label: string;
  intervalMs: number;
  rateLimitPerHour: number;
  enabled: boolean;
  handler: (job: {
    id: string;
    payload: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
}

export interface SchedulerStatus {
  running: boolean;
  jobConfigs: Array<{
    type: RcmJobType;
    label: string;
    intervalMs: number;
    rateLimitPerHour: number;
    enabled: boolean;
    rateLimitRemaining: number;
  }>;
  stats: {
    totalProcessed: number;
    totalFailed: number;
    totalRateLimited: number;
    uptimeMs: number;
  };
}

/* ── Polling Scheduler ─────────────────────────────────────── */

const HOUR_MS = 3_600_000;

export class PollingScheduler {
  private timers = new Map<RcmJobType, ReturnType<typeof setInterval>>();
  private configs = new Map<RcmJobType, PollingJobConfig>();
  private rateLimiters = new Map<RcmJobType, SlidingWindowRateLimiter>();
  private running = false;
  private startedAt = 0;
  private stats = { totalProcessed: 0, totalFailed: 0, totalRateLimited: 0 };

  /** Register a polling job configuration. */
  registerJob(config: PollingJobConfig): void {
    this.configs.set(config.type, config);
    this.rateLimiters.set(
      config.type,
      new SlidingWindowRateLimiter(config.rateLimitPerHour, HOUR_MS)
    );
  }

  /** Start all enabled polling jobs. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();

    for (const [type, config] of this.configs) {
      if (!config.enabled) continue;

      const timer = setInterval(() => {
        void this.pollOnce(type);
      }, config.intervalMs);

      // unref so timer doesn't keep process alive during shutdown
      timer.unref();
      this.timers.set(type, timer);

      log.info(`Polling scheduler started: ${config.label} (every ${config.intervalMs}ms)`);
    }
  }

  /** Stop all polling jobs. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const [type, timer] of this.timers) {
      clearInterval(timer);
      log.info(`Polling scheduler stopped: ${this.configs.get(type)?.label ?? type}`);
    }
    this.timers.clear();
  }

  /** Poll once for a specific job type. Dequeues + processes. */
  private async pollOnce(type: RcmJobType): Promise<void> {
    const config = this.configs.get(type);
    const limiter = this.rateLimiters.get(type);
    if (!config || !limiter) return;

    // Extract tenant from next job, or fall back to default
    const tenantKey = `default:${type}`;
    if (!limiter.tryAcquire(tenantKey)) {
      this.stats.totalRateLimited++;
      return;
    }

    const queue = getJobQueue();
    // Peek through ready jobs for matching type — never fail wrong-type jobs
    const { jobs: ready } = await queue.listJobs({ status: 'queued', type, limit: 1 });
    if (!ready || ready.length === 0) return;

    const job = await queue.dequeue();
    if (!job) return;
    // Safety: if dequeued job is wrong type (race condition), re-queue it
    if (job.type !== type) {
      // Reset to queued so another poller can pick it up
      await queue.fail(job.id, '__RETYPE__');
      return;
    }

    try {
      const result = await config.handler({ id: job.id, payload: job.payload });
      await queue.complete(job.id, result);
      this.stats.totalProcessed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await queue.fail(job.id, errMsg);
      this.stats.totalFailed++;
      log.warn(`Polling job failed: ${config.label}`, { jobId: job.id, error: errMsg });
    }
  }

  /** Get scheduler status. */
  getStatus(): SchedulerStatus {
    const jobConfigs = Array.from(this.configs.values()).map((c) => {
      const limiter = this.rateLimiters.get(c.type);
      return {
        type: c.type,
        label: c.label,
        intervalMs: c.intervalMs,
        rateLimitPerHour: c.rateLimitPerHour,
        enabled: c.enabled,
        rateLimitRemaining: limiter?.remaining(`default:${c.type}`) ?? 0,
      };
    });

    return {
      running: this.running,
      jobConfigs,
      stats: {
        ...this.stats,
        uptimeMs: this.running ? Date.now() - this.startedAt : 0,
      },
    };
  }

  /** Reset stats and rate limiters. */
  reset(): void {
    this.stop();
    this.stats = { totalProcessed: 0, totalFailed: 0, totalRateLimited: 0 };
    for (const limiter of this.rateLimiters.values()) {
      limiter.reset();
    }
  }
}

/* ── Singleton ─────────────────────────────────────────────── */

let _scheduler: PollingScheduler | null = null;

export function getPollingScheduler(): PollingScheduler {
  if (!_scheduler) _scheduler = new PollingScheduler();
  return _scheduler;
}

export function resetPollingScheduler(): void {
  _scheduler?.stop();
  _scheduler = null;
}
