/**
 * Job Admin Routes — Phase 116: Postgres Job Queue
 *
 * Admin-only endpoints for job queue visibility and management.
 *
 * Routes:
 *   GET  /admin/jobs/runs     — List recent job run log entries
 *   GET  /admin/jobs/status   — Runner status + registry info
 *   POST /admin/jobs/trigger  — Manually trigger a job (ad-hoc)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  ALL_JOB_NAMES,
  DEFAULT_CRON_SCHEDULES,
  getJobConcurrency,
  getJobCronSchedule,
} from "../jobs/registry.js";
import {
  getRecentJobRuns,
  validateJobPayload,
} from "../jobs/governance.js";
import {
  isJobRunnerActive,
  getAddJobFn,
} from "../jobs/runner.js";
import { isPgConfigured } from "../platform/pg/index.js";
import { log } from "../lib/logger.js";
import { safeErr } from '../lib/safe-error.js';

export async function jobAdminRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /admin/jobs/status — Runner status + registry info
   */
  server.get("/admin/jobs/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    const jobs = ALL_JOB_NAMES.map((name) => ({
      name,
      concurrency: getJobConcurrency(name),
      cronSchedule: getJobCronSchedule(name),
      defaultCron: DEFAULT_CRON_SCHEDULES[name],
    }));

    return reply.send({
      ok: true,
      runner: {
        active: isJobRunnerActive(),
        pgConfigured: isPgConfigured(),
      },
      jobs,
    });
  });

  /**
   * GET /admin/jobs/runs — List recent job run log entries
   */
  server.get("/admin/jobs/runs", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query ?? {}) as Record<string, string>;
    const jobName = query.jobName;
    const limit = Math.min(parseInt(query.limit ?? "50", 10) || 50, 200);
    const offset = parseInt(query.offset ?? "0", 10) || 0;
    const okOnly = query.okOnly === "true" ? true : query.okOnly === "false" ? false : undefined;

    const result = await getRecentJobRuns({ jobName, limit, offset, okOnly });
    return reply.send({ ok: true, ...result });
  });

  /**
   * POST /admin/jobs/trigger — Manually trigger a job
   *
   * Body: { jobName: string, payload?: object }
   */
  server.post("/admin/jobs/trigger", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = ((request.body as any) || {}) as {
      jobName?: string;
      payload?: Record<string, unknown>;
    };

    if (!body.jobName) {
      return reply.code(400).send({ ok: false, error: "jobName is required" });
    }

    if (!ALL_JOB_NAMES.includes(body.jobName as any)) {
      return reply.code(400).send({
        ok: false,
        error: `Unknown job name: ${body.jobName}. Valid: ${ALL_JOB_NAMES.join(", ")}`,
      });
    }

    // Validate payload
    const validation = validateJobPayload(body.jobName, body.payload ?? {});
    if (!validation.ok) {
      return reply.code(400).send({ ok: false, error: validation.error });
    }

    // Enqueue via runner's addJob
    const addJob = getAddJobFn();
    if (!addJob) {
      return reply.code(503).send({
        ok: false,
        error: "Job runner is not active. Start with JOB_WORKER_ENABLED=true or pnpm api:worker",
      });
    }

    try {
      const job = await addJob(body.jobName, validation.payload!, {
        maxAttempts: 3,
        jobKey: `manual-${body.jobName}-${Date.now()}`,
      });

      log.info("Job manually triggered", {
        jobName: body.jobName,
        jobId: job.id,
      });

      return reply.send({
        ok: true,
        jobId: job.id,
        jobName: body.jobName,
        scheduledAt: job.run_at,
      });
    } catch (err: any) {
      log.warn("Job trigger failed", { jobName: body.jobName, error: safeErr(err) });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
