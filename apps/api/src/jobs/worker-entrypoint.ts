/**
 * Worker Entrypoint — Phase 116: Postgres Job Queue (Graphile Worker)
 *
 * Standalone process entry point for running the job worker.
 * Usage: pnpm api:worker   (or: tsx --env-file=.env.local src/jobs/worker-entrypoint.ts)
 *
 * This process:
 *  1. Initializes the PG pool (ensures PLATFORM_PG_URL is set)
 *  2. Runs PG migrations (creates graphile_worker schema + job_run_log table)
 *  3. Starts the Graphile Worker runner
 *  4. Handles graceful shutdown on SIGINT/SIGTERM
 *
 * It does NOT start the Fastify HTTP server — it's a pure job processor.
 */

import { log } from "../lib/logger.js";
import { isPgConfigured } from "../platform/pg/index.js";
import { runPgMigrations } from "../platform/pg/pg-migrate.js";
import { startJobRunner, stopJobRunner } from "./runner.js";

async function main() {
  log.info("=== VistA-Evolved Job Worker starting ===");

  // 1. Check PG configuration
  if (!isPgConfigured()) {
    log.error("PLATFORM_PG_URL is not set. The job worker requires PostgreSQL.");
    log.error("Set PLATFORM_PG_URL=postgresql://ve_api:password@127.0.0.1:5433/ve_platform");
    process.exit(1);
  }

  // 2. Run PG migrations (creates job_run_log + graphile_worker schema)
  try {
    const migResult = await runPgMigrations();
    log.info("PG migrations completed", {
      applied: migResult.applied,
      skipped: migResult.skipped,
      errors: migResult.errors.length,
    });
    if (migResult.errors.length > 0) {
      log.warn("PG migration errors (non-fatal)", { errors: migResult.errors });
    }
  } catch (err: any) {
    log.error("PG migration failed", { error: err.message });
    process.exit(1);
  }

  // 3. Parse concurrency from env
  const concurrency =
    parseInt(process.env.JOB_WORKER_CONCURRENCY ?? "5", 10) || 5;

  // 4. Start the runner (worker manages its own SIGINT/SIGTERM)
  try {
    const runner = await startJobRunner({
      concurrency,
      noHandleSignals: false, // let graphile-worker handle signals
    });

    log.info("Job worker running", { concurrency, pid: process.pid });

    // Wait for the runner to stop (e.g., via SIGINT/SIGTERM)
    await runner.promise;
    log.info("Job worker shut down cleanly");
  } catch (err: any) {
    log.error("Job worker fatal error", { error: err.message });
    await stopJobRunner();
    process.exit(1);
  }
}

main().catch((err) => {
  log.error("Unhandled error in job worker", { error: err instanceof Error ? err.message : "unknown" });
  process.exit(1);
});
