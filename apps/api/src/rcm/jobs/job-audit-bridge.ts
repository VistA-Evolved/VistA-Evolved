/**
 * Job Audit Bridge — Phase 82: RCM Adapter Expansion v2
 *
 * Bridges the RCM job queue to the RCM audit trail.
 * Every job completion, failure, DLQ move, or cancellation
 * is recorded in the hash-chained audit log.
 *
 * Also provides tenant-scoped job queue helpers and
 * job enqueue validation (no PHI in payloads).
 *
 * No PHI in audit entries — only job IDs, types, payer codes, timestamps.
 */

import { getJobQueue, type RcmJob, type RcmJobType, type RcmJobStatus } from './queue.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import { log } from '../../lib/logger.js';

/* ── PHI Guard ─────────────────────────────────────────────── */

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{2}\/\d{2}\/\d{4}\b/, // DOB format
  /patient.*name/i, // patient name fields
  /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/, // Name,Name pattern
];

/** Validate job payload contains no PHI before enqueuing. */
export function validateJobPayload(payload: Record<string, unknown>): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const serialized = JSON.stringify(payload);

  for (const pattern of PHI_PATTERNS) {
    if (pattern.test(serialized)) {
      violations.push(`Potential PHI detected: ${pattern.source}`);
    }
  }

  // Check for forbidden field names
  const forbiddenFields = [
    'ssn',
    'socialsecurity',
    'dateofbirth',
    'dob',
    'patientname',
    'fullname',
  ];
  for (const key of Object.keys(payload)) {
    if (forbiddenFields.includes(key.toLowerCase())) {
      violations.push(`Forbidden field in job payload: ${key}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

/* ── Audited Job Operations ────────────────────────────────── */

/**
 * Enqueue a job with audit trail and PHI validation.
 * Returns job ID or throws if payload contains PHI.
 */
export async function auditedEnqueue(params: {
  type: RcmJobType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
  maxAttempts?: number;
  delayMs?: number;
  userId?: string;
  tenantId?: string;
}): Promise<{ jobId: string; queued: boolean }> {
  // PHI guard
  const phiCheck = validateJobPayload(params.payload);
  if (!phiCheck.valid) {
    log.warn('Job payload rejected — potential PHI', {
      type: params.type,
      violations: phiCheck.violations,
    });
    appendRcmAudit('job.enqueued', {
      userId: params.userId,
      detail: {
        type: params.type,
        rejected: true,
        reason: 'PHI detected in payload',
        tenantId: params.tenantId ?? 'default',
      },
    });
    throw new Error(`Job payload rejected: ${phiCheck.violations.join('; ')}`);
  }

  const queue = getJobQueue();
  const jobId = await queue.enqueue({
    type: params.type,
    payload: {
      ...params.payload,
      _tenantId: params.tenantId ?? 'default',
      _enqueuedBy: params.userId ?? 'system',
      _enqueuedAt: new Date().toISOString(),
    },
    idempotencyKey: params.idempotencyKey,
    priority: params.priority,
    maxAttempts: params.maxAttempts,
    delayMs: params.delayMs,
  });

  appendRcmAudit('job.enqueued', {
    userId: params.userId,
    detail: {
      jobId,
      type: params.type,
      tenantId: params.tenantId ?? 'default',
      priority: params.priority ?? 5,
      payerCode: params.payload.payerCode,
      claimId: params.payload.claimId,
    },
  });

  return { jobId, queued: true };
}

/**
 * Record a job completion in the audit trail.
 * Called by the polling scheduler after handler returns.
 */
export function auditJobCompletion(job: RcmJob): void {
  appendRcmAudit('job.completed', {
    detail: {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
      tenantId: (job.payload as any)?._tenantId ?? 'default',
      payerCode: (job.payload as any)?.payerCode,
      claimId: (job.payload as any)?.claimId,
      completedAt: job.completedAt,
    },
  });
}

/**
 * Record a job failure in the audit trail.
 */
export function auditJobFailure(job: RcmJob, error: string): void {
  const action = job.status === 'dead_letter' ? 'job.dead_letter' : 'job.failed';
  appendRcmAudit(action, {
    detail: {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error,
      deadLetter: job.status === 'dead_letter',
      tenantId: (job.payload as any)?._tenantId ?? 'default',
      payerCode: (job.payload as any)?.payerCode,
      claimId: (job.payload as any)?.claimId,
    },
  });
}

/**
 * Record a job cancellation in the audit trail.
 */
export function auditJobCancellation(jobId: string, userId?: string): void {
  appendRcmAudit('job.cancelled', {
    userId,
    detail: {
      jobId,
      cancelledAt: new Date().toISOString(),
    },
  });
}

/* ── Tenant-Scoped Queue Helpers ───────────────────────────── */

/**
 * List jobs for a specific tenant.
 */
export async function listJobsByTenant(
  tenantId: string,
  filter?: { status?: RcmJobStatus; type?: RcmJobType; limit?: number; offset?: number }
): Promise<{ jobs: RcmJob[]; total: number }> {
  const queue = getJobQueue();
  const { jobs, total: _total } = await queue.listJobs({
    status: filter?.status,
    type: filter?.type,
    limit: 1000, // get all then filter by tenant
  });

  const tenantJobs = jobs.filter(
    (j) => (j.payload as any)?._tenantId === tenantId || tenantId === 'default'
  );

  const offset = filter?.offset ?? 0;
  const limit = filter?.limit ?? 50;

  return {
    jobs: tenantJobs.slice(offset, offset + limit),
    total: tenantJobs.length,
  };
}

/**
 * Get queue stats for a specific tenant.
 */
export async function getJobStatsByTenant(tenantId: string): Promise<{
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  byType: Record<string, number>;
}> {
  const { jobs } = await listJobsByTenant(tenantId, { limit: 10000 });

  const stats = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadLetter: 0,
    byType: {} as Record<string, number>,
  };

  for (const job of jobs) {
    if (job.status === 'queued') stats.queued++;
    else if (job.status === 'processing') stats.processing++;
    else if (job.status === 'completed') stats.completed++;
    else if (job.status === 'failed') stats.failed++;
    else if (job.status === 'dead_letter') stats.deadLetter++;

    stats.byType[job.type] = (stats.byType[job.type] ?? 0) + 1;
  }

  return stats;
}
