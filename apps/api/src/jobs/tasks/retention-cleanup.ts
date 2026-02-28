/**
 * Task: retention_cleanup — Phase 116
 *
 * Purges expired / stale data across multiple stores:
 *  - Expired sessions (PG session store)
 *  - Expired idempotency keys (PG)
 *  - Completed jobs older than threshold (PG job_run_log)
 *
 * Payload (no PHI):
 *   { tenantId, expiredSessionsMaxAgeDays, idempotencyKeysMaxAgeDays,
 *     completedJobsMaxAgeDays, dryRun }
 *
 * Idempotent: deleting already-deleted rows is a no-op.
 */

import type { RetentionCleanupPayload } from "../registry.js";
import { log } from "../../lib/logger.js";
import { isPgConfigured, getPgPool } from "../../platform/pg/index.js";

/**
 * Run retention cleanup across multiple data stores.
 *
 * Strategy:
 *  1. Purge expired sessions from PG
 *  2. Purge expired idempotency keys from PG
 *  3. Purge old completed job run log entries from PG
 *  4. Report results
 */
export async function handleRetentionCleanup(
  payload: Record<string, unknown>,
): Promise<void> {
  const p = payload as RetentionCleanupPayload;
  const {
    tenantId,
    expiredSessionsMaxAgeDays,
    idempotencyKeysMaxAgeDays,
    completedJobsMaxAgeDays,
    dryRun,
  } = p;

  log.info("retention_cleanup: starting", {
    tenantId,
    expiredSessionsMaxAgeDays,
    idempotencyKeysMaxAgeDays,
    completedJobsMaxAgeDays,
    dryRun,
  });

  const results = {
    sessionsDeleted: 0,
    idempotencyKeysDeleted: 0,
    jobRunLogsDeleted: 0,
  };

  if (!isPgConfigured()) {
    log.warn("retention_cleanup: PG not configured, skipping all cleanup");
    return;
  }

  const pool = getPgPool();

  // 1. Purge expired sessions from PG
  try {
    const sessionCutoff = new Date();
    sessionCutoff.setDate(sessionCutoff.getDate() - expiredSessionsMaxAgeDays);
    const cutoffIso = sessionCutoff.toISOString();

    if (dryRun) {
      log.info("retention_cleanup: dry-run sessions", { cutoff: cutoffIso });
    } else {
      const res = await pool.query(
        "DELETE FROM auth_session WHERE expires_at < $1",
        [cutoffIso],
      );
      results.sessionsDeleted = res.rowCount ?? 0;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.warn("retention_cleanup: session purge failed (non-fatal)", {
      error: errMsg,
    });
  }

  // 2. Purge expired idempotency keys from PG
  try {
    const idemCutoff = new Date();
    idemCutoff.setDate(idemCutoff.getDate() - idempotencyKeysMaxAgeDays);
    const cutoffIso = idemCutoff.toISOString();

    if (!dryRun) {
      const res = await pool.query(
        "DELETE FROM idempotency_key WHERE expires_at < $1",
        [cutoffIso],
      );
      results.idempotencyKeysDeleted = res.rowCount ?? 0;
    } else {
      log.info("retention_cleanup: dry-run idempotency keys", { cutoff: cutoffIso });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.warn("retention_cleanup: idempotency key purge failed (non-fatal)", {
      error: errMsg,
    });
  }

  // 3. Purge old completed job run log entries from PG
  try {
    const jobCutoff = new Date();
    jobCutoff.setDate(jobCutoff.getDate() - completedJobsMaxAgeDays);

    if (!dryRun) {
      const res = await pool.query(
        "DELETE FROM job_run_log WHERE ok = true AND finished_at < $1",
        [jobCutoff.toISOString()],
      );
      results.jobRunLogsDeleted = res.rowCount ?? 0;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.warn("retention_cleanup: job run log purge failed (non-fatal)", {
      error: errMsg,
    });
  }

  log.info("retention_cleanup: complete", {
    ...results,
    dryRun,
    tenantId,
  });
}
