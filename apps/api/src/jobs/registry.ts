/**
 * Job Registry — Phase 116: Postgres Job Queue (Graphile Worker)
 *
 * Typesafe job name registry with zod payload schemas.
 * Every job payload is validated at enqueue time to enforce:
 *  1. Correct shape
 *  2. NO PHI fields (structurally excluded)
 *
 * Job names are string literals — Graphile Worker resolves task
 * functions by matching job name to the task list in runner.ts.
 */

import { z } from "zod";

/* ── Job Name Constants ────────────────────────────────────── */

export const JOB_NAMES = {
  ELIGIBILITY_CHECK_POLL: "eligibility_check_poll",
  CLAIM_STATUS_POLL: "claim_status_poll",
  EVIDENCE_STALENESS_SCAN: "evidence_staleness_scan",
  RETENTION_CLEANUP: "retention_cleanup",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const ALL_JOB_NAMES: readonly JobName[] = Object.values(JOB_NAMES);

/* ── Payload Schemas (NO PHI — structurally enforced) ──────── */

/**
 * eligibility_check_poll payload.
 * References payer + claim by opaque IDs only — no patient name, DOB, SSN.
 */
export const EligibilityCheckPollPayload = z.object({
  tenantId: z.string().default("default"),
  payerId: z.string().optional(),
  claimId: z.string().optional(),
  integrationMode: z.string().default("sandbox"),
  batchSize: z.number().int().min(1).max(100).default(10),
});
export type EligibilityCheckPollPayload = z.infer<typeof EligibilityCheckPollPayload>;

/**
 * claim_status_poll payload.
 * Claim reference is an opaque ID, not patient-identifying.
 */
export const ClaimStatusPollPayload = z.object({
  tenantId: z.string().default("default"),
  payerId: z.string().optional(),
  claimRef: z.string().optional(),
  batchSize: z.number().int().min(1).max(100).default(10),
});
export type ClaimStatusPollPayload = z.infer<typeof ClaimStatusPollPayload>;

/**
 * evidence_staleness_scan payload.
 * Configures staleness threshold; no patient data.
 */
export const EvidenceStalenessScanPayload = z.object({
  tenantId: z.string().default("default"),
  staleAfterDays: z.number().int().min(1).max(365).default(90),
  autoFlag: z.boolean().default(true),
});
export type EvidenceStalenessScanPayload = z.infer<typeof EvidenceStalenessScanPayload>;

/**
 * retention_cleanup payload.
 * Configures what gets purged and age thresholds.
 */
export const RetentionCleanupPayload = z.object({
  tenantId: z.string().default("default"),
  expiredSessionsMaxAgeDays: z.number().int().min(1).default(7),
  idempotencyKeysMaxAgeDays: z.number().int().min(1).default(3),
  completedJobsMaxAgeDays: z.number().int().min(1).default(30),
  dryRun: z.boolean().default(false),
});
export type RetentionCleanupPayload = z.infer<typeof RetentionCleanupPayload>;

/* ── Schema Map ────────────────────────────────────────────── */

/**
 * Maps every job name to its zod schema. Used by governance layer
 * to validate payloads before enqueue.
 */
export const JOB_PAYLOAD_SCHEMAS: Record<JobName, z.ZodType> = {
  [JOB_NAMES.ELIGIBILITY_CHECK_POLL]: EligibilityCheckPollPayload,
  [JOB_NAMES.CLAIM_STATUS_POLL]: ClaimStatusPollPayload,
  [JOB_NAMES.EVIDENCE_STALENESS_SCAN]: EvidenceStalenessScanPayload,
  [JOB_NAMES.RETENTION_CLEANUP]: RetentionCleanupPayload,
};

/* ── PHI Blocklist — structural enforcement ────────────────── */

/**
 * Fields that must NEVER appear in any job payload.
 * Governance layer checks for these before enqueue.
 */
export const PHI_BLOCKED_FIELDS = new Set([
  "patientName",
  "patient_name",
  "ssn",
  "socialSecurityNumber",
  "social_security_number",
  "dateOfBirth",
  "date_of_birth",
  "dob",
  "address",
  "phoneNumber",
  "phone_number",
  "email",
  "mrn",
  "medicalRecordNumber",
  "medical_record_number",
  "insuranceId",
  "insurance_id",
  "diagnosis",
  "medication",
]);

/**
 * Validate that a payload object contains no PHI-blocked fields.
 * Checks recursively through nested objects.
 */
export function containsPhiFields(
  obj: Record<string, unknown>,
  path = "",
): string[] {
  const violations: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (PHI_BLOCKED_FIELDS.has(key)) {
      violations.push(fullPath);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      violations.push(
        ...containsPhiFields(value as Record<string, unknown>, fullPath),
      );
    }
  }
  return violations;
}

/* ── Concurrency Configuration ─────────────────────────────── */

/**
 * Default concurrency per job type. Can be overridden via env vars.
 * Format: JOB_CONCURRENCY_<UPPER_NAME>=N
 */
export const DEFAULT_CONCURRENCY: Record<JobName, number> = {
  [JOB_NAMES.ELIGIBILITY_CHECK_POLL]: 2,
  [JOB_NAMES.CLAIM_STATUS_POLL]: 2,
  [JOB_NAMES.EVIDENCE_STALENESS_SCAN]: 1,
  [JOB_NAMES.RETENTION_CLEANUP]: 1,
};

/**
 * Cron schedules for recurring jobs. Graphile Worker cron format.
 * Can be overridden via env vars: JOB_CRON_<UPPER_NAME>="..."
 */
export const DEFAULT_CRON_SCHEDULES: Record<JobName, string | null> = {
  [JOB_NAMES.ELIGIBILITY_CHECK_POLL]: "*/5 * * * *",   // every 5 minutes
  [JOB_NAMES.CLAIM_STATUS_POLL]: "*/10 * * * *",       // every 10 minutes
  [JOB_NAMES.EVIDENCE_STALENESS_SCAN]: "0 2 * * *",    // daily at 2 AM
  [JOB_NAMES.RETENTION_CLEANUP]: "0 3 * * *",          // daily at 3 AM
};

/**
 * Get effective concurrency for a job name, checking env override first.
 */
export function getJobConcurrency(name: JobName): number {
  const envKey = `JOB_CONCURRENCY_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) {
    const n = parseInt(envVal, 10);
    if (!isNaN(n) && n >= 1 && n <= 50) return n;
  }
  return DEFAULT_CONCURRENCY[name] ?? 1;
}

/**
 * Get effective cron schedule for a job name, checking env override first.
 * Returns null if job should not be scheduled via cron.
 */
export function getJobCronSchedule(name: JobName): string | null {
  const envKey = `JOB_CRON_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal === "disabled" || envVal === "off") return null;
  if (envVal) return envVal;
  return DEFAULT_CRON_SCHEDULES[name] ?? null;
}
