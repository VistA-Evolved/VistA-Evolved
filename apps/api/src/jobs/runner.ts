/**
 * Job Runner -- Phase 116: Postgres Job Queue (Graphile Worker)
 *
 * Thin wrapper around graphile-worker's `run()` that:
 *  1. Uses the existing PG pool from `pg-db.ts`
 *  2. Registers all task functions from the registry
 *  3. Sets up cron schedules for recurring jobs
 *  4. Wraps each task with governance (validation, PHI check, run logging)
 *  5. Provides `startJobRunner()` / `stopJobRunner()` lifecycle
 *
 * The runner can operate in two modes:
 *  A. Embedded -- called from `index.ts` alongside the Fastify server
 *  B. Standalone -- via `worker-entrypoint.ts` for `pnpm api:worker`
 */

import {
  run,
  parseCronItems,
  type Runner,
  type TaskList,
  type Task,
  type CronItem,
} from 'graphile-worker';
import { getPgPool, isPgConfigured } from '../platform/pg/index.js';
import { JOB_NAMES, type JobName, getJobCronSchedule } from './registry.js';
import { validateJobPayload, logJobStart, logJobFinish, redactErrorMessage } from './governance.js';
import { log } from '../lib/logger.js';

/* -- Task Imports -------------------------------------------- */

import { handleEligibilityCheckPoll } from './tasks/eligibility-check-poll.js';
import { handleClaimStatusPoll } from './tasks/claim-status-poll.js';
import { handleEvidenceStalenessScan } from './tasks/evidence-staleness-scan.js';
import { handleRetentionCleanup } from './tasks/retention-cleanup.js';
import { handlePgBackup } from './tasks/pg-backup.js';

/* -- Governance Wrapper -------------------------------------- */

/**
 * Wrap a raw task handler with governance:
 *  - Validate payload via zod + PHI check
 *  - Log job start/finish to job_run_log
 *  - Redact errors in logs
 */
function governedTask(
  jobName: JobName,
  handler: (payload: Record<string, unknown>) => Promise<void>
): Task {
  return async (payload: unknown, helpers) => {
    const rawPayload = (payload ?? {}) as Record<string, unknown>;
    const startMs = Date.now();

    // Validate payload (zod + PHI check)
    const validation = validateJobPayload(jobName, rawPayload);
    if (!validation.ok) {
      log.warn(`Job ${jobName} rejected: ${validation.error}`, { jobName });
      throw new Error(`Job validation failed: ${validation.error}`);
    }

    const effectivePayload = validation.payload!;
    const logId = await logJobStart(jobName, effectivePayload, String(helpers.job.id));

    try {
      await handler(effectivePayload);
      const durationMs = Date.now() - startMs;
      await logJobFinish(logId, true, durationMs);
      log.info(`Job ${jobName} completed`, { jobName, durationMs });
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errMsg = err instanceof Error ? err.message : String(err);
      const redacted = redactErrorMessage(errMsg);
      await logJobFinish(logId, false, durationMs, redacted);
      log.warn(`Job ${jobName} failed`, { jobName, durationMs, error: redacted });
      throw err; // re-throw so graphile-worker handles retry
    }
  };
}

/* -- Task List ----------------------------------------------- */

function buildTaskList(): TaskList {
  return {
    [JOB_NAMES.ELIGIBILITY_CHECK_POLL]: governedTask(
      JOB_NAMES.ELIGIBILITY_CHECK_POLL,
      handleEligibilityCheckPoll
    ),
    [JOB_NAMES.CLAIM_STATUS_POLL]: governedTask(JOB_NAMES.CLAIM_STATUS_POLL, handleClaimStatusPoll),
    [JOB_NAMES.EVIDENCE_STALENESS_SCAN]: governedTask(
      JOB_NAMES.EVIDENCE_STALENESS_SCAN,
      handleEvidenceStalenessScan
    ),
    [JOB_NAMES.RETENTION_CLEANUP]: governedTask(
      JOB_NAMES.RETENTION_CLEANUP,
      handleRetentionCleanup
    ),
    [JOB_NAMES.PG_BACKUP]: governedTask(JOB_NAMES.PG_BACKUP, handlePgBackup),
  };
}

/* -- Cron Schedules ------------------------------------------ */

function buildCronItems() {
  const items: CronItem[] = [];

  for (const name of Object.values(JOB_NAMES)) {
    const schedule = getJobCronSchedule(name);
    if (schedule) {
      items.push({
        task: name,
        match: schedule,
        options: {
          backfillPeriod: 0,
          maxAttempts: 3,
          jobKey: `cron-${name}`,
          jobKeyMode: 'replace',
        },
        payload: { tenantId: 'default' },
        identifier: `cron-${name}`,
      });
    }
  }

  return items.length > 0 ? parseCronItems(items) : [];
}

/* -- Runner Lifecycle ---------------------------------------- */

let runner: Runner | null = null;

/**
 * Start the Graphile Worker job runner.
 * Requires PG to be configured (`PLATFORM_PG_URL`).
 *
 * @param concurrency Number of concurrent jobs (default from env or 5)
 * @param noHandleSignals If true, caller manages SIGINT/SIGTERM (for embedded mode)
 */
export async function startJobRunner(opts?: {
  concurrency?: number;
  noHandleSignals?: boolean;
}): Promise<Runner> {
  if (!isPgConfigured()) {
    throw new Error(
      'Cannot start job runner: PLATFORM_PG_URL is not set. ' +
        'Graphile Worker requires a PostgreSQL database.'
    );
  }

  if (runner) {
    log.warn('Job runner already started, returning existing instance');
    return runner;
  }

  const concurrency =
    opts?.concurrency ?? (parseInt(process.env.JOB_WORKER_CONCURRENCY ?? '5', 10) || 5);

  const pgPool = getPgPool();
  const taskList = buildTaskList();
  const cronItems = buildCronItems();

  log.info('Starting Graphile Worker job runner', {
    concurrency,
    taskCount: Object.keys(taskList).length,
    cronCount: cronItems.length,
  });

  runner = await run({
    pgPool,
    taskList,
    parsedCronItems: cronItems,
    concurrency,
    noHandleSignals: opts?.noHandleSignals ?? false,
    // graphile-worker creates its own schema; default "graphile_worker"
    schema: process.env.JOB_WORKER_SCHEMA ?? 'graphile_worker',
    // Poll interval for new jobs (ms)
    pollInterval: parseInt(process.env.JOB_WORKER_POLL_INTERVAL ?? '2000', 10) || 2000,
  });

  // Listen for events
  runner.events.on('job:success', ({ job }) => {
    log.debug('Job succeeded', {
      jobId: job.id,
      task: job.task_identifier,
      attempts: job.attempts,
    });
  });

  runner.events.on('job:error', ({ job, error }) => {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.warn('Job errored', {
      jobId: job.id,
      task: job.task_identifier,
      attempts: job.attempts,
      error: redactErrorMessage(errMsg),
    });
  });

  runner.events.on('job:failed', ({ job, error }) => {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error('Job permanently failed', {
      jobId: job.id,
      task: job.task_identifier,
      maxAttempts: job.max_attempts,
      error: redactErrorMessage(errMsg),
    });
  });

  log.info('Graphile Worker job runner started', { concurrency });
  return runner;
}

/**
 * Stop the Graphile Worker job runner gracefully.
 * Waits for in-flight jobs to complete.
 */
export async function stopJobRunner(): Promise<void> {
  if (!runner) return;
  log.info('Stopping Graphile Worker job runner...');
  try {
    await runner.stop();
  } catch (err: any) {
    log.warn('Error stopping job runner', { error: err.message });
  }
  runner = null;
  log.info('Graphile Worker job runner stopped');
}

/**
 * Check if the job runner is currently active.
 */
export function isJobRunnerActive(): boolean {
  return runner !== null;
}

/**
 * Get the runner's addJob function for ad-hoc job scheduling.
 * Returns null if runner is not started.
 */
export function getAddJobFn() {
  return runner?.addJob ?? null;
}
