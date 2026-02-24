/**
 * Job Governance — Phase 116: Postgres Job Queue (Graphile Worker)
 *
 * Enforces payload validation, PHI rejection, and run logging
 * for all jobs processed by the Graphile Worker runner.
 *
 * Every job enqueue goes through `validateAndEnqueue()` which:
 *  1. Validates payload against the zod schema for that job name
 *  2. Rejects payloads containing PHI-blocked fields
 *  3. Logs the enqueue to the job_run_log table (PG)
 *
 * Every job completion/failure is logged via `logJobRun()`.
 */

import { randomUUID } from "node:crypto";
import {
  type JobName,
  JOB_PAYLOAD_SCHEMAS,
  containsPhiFields,
  ALL_JOB_NAMES,
} from "./registry.js";
import { log } from "../lib/logger.js";
import { isPgConfigured, getPgPool } from "../platform/pg/index.js";

/* ── Types ─────────────────────────────────────────────────── */

export interface JobRunLogEntry {
  id: string;
  jobName: string;
  graphileJobId?: string;
  payload: Record<string, unknown>;
  startedAt: string;
  finishedAt?: string;
  ok: boolean;
  durationMs?: number;
  errorRedacted?: string;
  tenantId: string;
}

/* ── Payload Validation ────────────────────────────────────── */

export interface ValidateResult {
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}

/**
 * Validate a job payload:
 *  1. Check job name is known
 *  2. Parse through zod schema
 *  3. Reject if PHI fields detected
 */
export function validateJobPayload(
  jobName: string,
  rawPayload: unknown,
): ValidateResult {
  // 1. Known job name?
  if (!ALL_JOB_NAMES.includes(jobName as JobName)) {
    return { ok: false, error: `Unknown job name: ${jobName}` };
  }

  // 2. PHI field check on RAW payload (before zod strips unknown keys)
  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    const phiViolations = containsPhiFields(rawPayload as Record<string, unknown>);
    if (phiViolations.length > 0) {
      return {
        ok: false,
        error: `PHI fields detected in payload: ${phiViolations.join(", ")}`,
      };
    }
  }

  // 3. Zod validation
  const schema = JOB_PAYLOAD_SCHEMAS[jobName as JobName];
  const parsed = schema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Payload validation failed: ${parsed.error.message}`,
    };
  }

  const payload = parsed.data as Record<string, unknown>;
  return { ok: true, payload };
}

/* ── Job Run Logging (PG) ──────────────────────────────────── */

/**
 * Log a job run start to the job_run_log table.
 * Returns the log entry ID.
 */
export async function logJobStart(
  jobName: string,
  payload: Record<string, unknown>,
  graphileJobId?: string,
): Promise<string> {
  const id = randomUUID();
  const tenantId = (payload as any).tenantId ?? "default";
  const now = new Date().toISOString();

  if (isPgConfigured()) {
    try {
      const pool = getPgPool();
      await pool.query(
        `INSERT INTO job_run_log (id, job_name, graphile_job_id, payload_json, tenant_id, started_at, ok)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [id, jobName, graphileJobId ?? null, JSON.stringify(payload), tenantId, now],
      );
    } catch (err: any) {
      log.warn("Failed to log job start to PG", {
        jobName,
        error: err.message,
      });
    }
  }

  return id;
}

/**
 * Log job completion or failure.
 */
export async function logJobFinish(
  logId: string,
  ok: boolean,
  durationMs: number,
  errorRedacted?: string,
): Promise<void> {
  const now = new Date().toISOString();

  if (isPgConfigured()) {
    try {
      const pool = getPgPool();
      await pool.query(
        `UPDATE job_run_log
         SET finished_at = $1, ok = $2, duration_ms = $3, error_redacted = $4
         WHERE id = $5`,
        [now, ok, durationMs, errorRedacted ?? null, logId],
      );
    } catch (err: any) {
      log.warn("Failed to log job finish to PG", {
        logId,
        ok,
        error: err.message,
      });
    }
  }
}

/* ── Redact Error Messages ─────────────────────────────────── */

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,       // SSN
  /\b\d{2}\/\d{2}\/\d{4}\b/g,     // Date of birth
  /\b[A-Z][a-z]+,\s?[A-Z][a-z]+/g, // Patient names (Last, First)
];

/**
 * Strip potential PHI from error messages before logging.
 */
export function redactErrorMessage(msg: string): string {
  let redacted = msg;
  for (const pattern of PHI_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  // Truncate to prevent log bloat
  return redacted.length > 500 ? redacted.slice(0, 500) + "..." : redacted;
}

/* ── Job Run Log Read ──────────────────────────────────────── */

/**
 * Query recent job run log entries. Admin-only endpoint backing.
 */
export async function getRecentJobRuns(opts?: {
  jobName?: string;
  limit?: number;
  offset?: number;
  okOnly?: boolean;
}): Promise<{ runs: JobRunLogEntry[]; total: number }> {
  if (!isPgConfigured()) {
    return { runs: [], total: 0 };
  }

  const pool = getPgPool();
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (opts?.jobName) {
    conditions.push(`job_name = $${paramIdx++}`);
    params.push(opts.jobName);
  }
  if (opts?.okOnly !== undefined) {
    conditions.push(`ok = $${paramIdx++}`);
    params.push(opts.okOnly);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM job_run_log ${where}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const dataParams = [...params, limit, offset];
    const dataRes = await pool.query(
      `SELECT id, job_name, graphile_job_id, payload_json, tenant_id,
              started_at, finished_at, ok, duration_ms, error_redacted
       FROM job_run_log ${where}
       ORDER BY started_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataParams,
    );

    const runs: JobRunLogEntry[] = dataRes.rows.map((r: any) => ({
      id: r.id,
      jobName: r.job_name,
      graphileJobId: r.graphile_job_id ?? undefined,
      payload: typeof r.payload_json === "string" ? JSON.parse(r.payload_json) : (r.payload_json ?? {}),
      startedAt: r.started_at,
      finishedAt: r.finished_at ?? undefined,
      ok: r.ok,
      durationMs: r.duration_ms ?? undefined,
      errorRedacted: r.error_redacted ?? undefined,
      tenantId: r.tenant_id ?? "default",
    }));

    return { runs, total };
  } catch (err: any) {
    log.warn("Failed to query job run log", { error: err.message });
    return { runs: [], total: 0 };
  }
}
