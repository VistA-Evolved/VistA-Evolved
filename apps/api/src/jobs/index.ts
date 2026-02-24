/**
 * Jobs Module — Barrel Export
 *
 * Phase 116: Postgres Job Queue (Graphile Worker) + Job Governance
 */

// Registry: job names, payload schemas, config
export {
  JOB_NAMES,
  ALL_JOB_NAMES,
  JOB_PAYLOAD_SCHEMAS,
  PHI_BLOCKED_FIELDS,
  containsPhiFields,
  getJobConcurrency,
  getJobCronSchedule,
  EligibilityCheckPollPayload,
  ClaimStatusPollPayload,
  EvidenceStalenessScanPayload,
  RetentionCleanupPayload,
  DEFAULT_CONCURRENCY,
  DEFAULT_CRON_SCHEDULES,
} from "./registry.js";
export type { JobName } from "./registry.js";

// Governance: validation, run logging, PHI redaction
export {
  validateJobPayload,
  logJobStart,
  logJobFinish,
  redactErrorMessage,
  getRecentJobRuns,
} from "./governance.js";
export type { JobRunLogEntry, ValidateResult } from "./governance.js";

// Runner: lifecycle management
export {
  startJobRunner,
  stopJobRunner,
  isJobRunnerActive,
  getAddJobFn,
} from "./runner.js";
