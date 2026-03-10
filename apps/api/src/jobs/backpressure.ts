/**
 * Queue Backpressure Monitor -- Wave 2 Q191
 *
 * Provides queue depth monitoring and backpressure signals for Graphile Worker.
 * Queries the graphile_worker schema to report:
 *  - Pending job count (queue depth)
 *  - Running job count
 *  - Failed/permanently-failed job count
 *  - Per-task-type breakdown
 *  - Backpressure signal (reject new jobs if queue is too deep)
 *
 * Env vars:
 *  JOB_BACKPRESSURE_MAX_PENDING  - Max pending jobs before backpressure (default: 1000)
 *  JOB_BACKPRESSURE_MAX_PER_TASK - Max pending per task type (default: 200)
 */

import { getPgPool, isPgConfigured } from '../platform/pg/index.js';
import { log } from '../lib/logger.js';

// -- Config ------------------------------------------------

const MAX_PENDING = parseInt(process.env.JOB_BACKPRESSURE_MAX_PENDING ?? '1000', 10) || 1000;
const MAX_PER_TASK = parseInt(process.env.JOB_BACKPRESSURE_MAX_PER_TASK ?? '200', 10) || 200;

const RAW_SCHEMA = process.env.JOB_WORKER_SCHEMA ?? 'graphile_worker';
// Sanitize schema name to prevent SQL injection (only allow lowercase identifier chars)
const SCHEMA = /^[a-z_][a-z0-9_]*$/.test(RAW_SCHEMA) ? RAW_SCHEMA : 'graphile_worker';

// -- Types -------------------------------------------------

export interface QueueHealth {
  ok: boolean;
  backpressure: boolean;
  pendingTotal: number;
  runningTotal: number;
  failedTotal: number;
  permanentlyFailedTotal: number;
  maxPending: number;
  maxPerTask: number;
  perTask: Array<{
    taskIdentifier: string;
    pending: number;
    running: number;
    failed: number;
    backpressure: boolean;
  }>;
  timestamp: string;
}

// -- Query -------------------------------------------------

/**
 * Get current queue health metrics.
 * Returns null if PG is not configured (Graphile Worker requires PG).
 */
export async function getQueueHealth(): Promise<QueueHealth | null> {
  if (!isPgConfigured()) {
    return null;
  }

  const pool = getPgPool();
  const now = new Date().toISOString();

  try {
    // Query job counts by task and status
    const result = await pool.query(`
      SELECT
        task_identifier,
        COUNT(*) FILTER (WHERE locked_at IS NULL AND attempts < max_attempts) AS pending,
        COUNT(*) FILTER (WHERE locked_at IS NOT NULL) AS running,
        COUNT(*) FILTER (WHERE locked_at IS NULL AND last_error IS NOT NULL AND attempts < max_attempts) AS failed,
        COUNT(*) FILTER (WHERE attempts >= max_attempts) AS permanently_failed
      FROM ${SCHEMA}.jobs
      GROUP BY task_identifier
      ORDER BY task_identifier
    `);

    let pendingTotal = 0;
    let runningTotal = 0;
    let failedTotal = 0;
    let permanentlyFailedTotal = 0;

    const perTask = result.rows.map((row: any) => {
      const pending = parseInt(row.pending, 10) || 0;
      const running = parseInt(row.running, 10) || 0;
      const failed = parseInt(row.failed, 10) || 0;
      const permFailed = parseInt(row.permanently_failed, 10) || 0;

      pendingTotal += pending;
      runningTotal += running;
      failedTotal += failed;
      permanentlyFailedTotal += permFailed;

      return {
        taskIdentifier: row.task_identifier,
        pending,
        running,
        failed,
        backpressure: pending >= MAX_PER_TASK,
      };
    });

    const backpressure = pendingTotal >= MAX_PENDING || perTask.some((t) => t.backpressure);

    return {
      ok: !backpressure,
      backpressure,
      pendingTotal,
      runningTotal,
      failedTotal,
      permanentlyFailedTotal,
      maxPending: MAX_PENDING,
      maxPerTask: MAX_PER_TASK,
      perTask,
      timestamp: now,
    };
  } catch (err: any) {
    log.warn('Failed to query queue health', { error: err.message });
    return {
      ok: false,
      backpressure: true, // fail-closed: assume backpressure on error
      pendingTotal: -1,
      runningTotal: -1,
      failedTotal: -1,
      permanentlyFailedTotal: -1,
      maxPending: MAX_PENDING,
      maxPerTask: MAX_PER_TASK,
      perTask: [],
      timestamp: now,
    };
  }
}

// -- Backpressure Check ------------------------------------

/**
 * Check if a specific task type is under backpressure.
 * Returns true if new jobs of this type should be rejected.
 */
export async function isTaskBackpressured(taskIdentifier: string): Promise<boolean> {
  const health = await getQueueHealth();
  if (!health) return false;

  if (health.pendingTotal >= MAX_PENDING) return true;

  const task = health.perTask.find((t) => t.taskIdentifier === taskIdentifier);
  return task?.backpressure ?? false;
}

/**
 * Add job with backpressure check.
 * Returns { queued: false, reason } if backpressure is active.
 */
export async function addJobWithBackpressure(
  addJob: Function,
  taskIdentifier: string,
  payload: Record<string, unknown>,
  opts?: { maxAttempts?: number; runAt?: Date; jobKey?: string }
): Promise<{ queued: boolean; reason?: string; jobId?: string }> {
  const pressured = await isTaskBackpressured(taskIdentifier);

  if (pressured) {
    log.warn('Job rejected due to backpressure', {
      task: taskIdentifier,
      maxPending: MAX_PENDING,
      maxPerTask: MAX_PER_TASK,
    });
    return {
      queued: false,
      reason: `Backpressure active for ${taskIdentifier}. Queue depth exceeds threshold.`,
    };
  }

  const job = await addJob(taskIdentifier, payload, opts);
  return { queued: true, jobId: String(job.id) };
}
