/**
 * Export Engine -- Phase 245: Data Exports v2
 *
 * Unified export orchestration layer with:
 *   - Background job queue (in-memory, resets on restart)
 *   - Progress tracking per job
 *   - Format dispatch via export-formats.ts
 *   - Source dispatch via export-sources.ts
 *   - Policy enforcement (row limits, PHI gate, concurrent limits)
 *   - Audit trail integration
 *
 * This engine consolidates the scattered export paths across analytics,
 * reporting, imaging audit, and RCM into a single orchestration layer.
 * The existing subsystem-specific exports remain functional -- this engine
 * provides a unified alternative.
 */

import { randomBytes } from 'node:crypto';
import { log } from '../lib/logger.js';
import { audit, type AuditAction } from '../lib/audit.js';
import { formatRows, type ExportV2Format, SUPPORTED_FORMATS } from './export-formats.js';
import { getSource } from './export-sources.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export interface ExportV2Job {
  id: string;
  /** Source ID from export-sources registry */
  sourceId: string;
  /** Requested format */
  format: ExportV2Format;
  /** Job status */
  status: ExportJobStatus;
  /** Requesting user */
  requestedBy: { duz: string; name?: string; role?: string };
  /** Tenant ID */
  tenantId: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of completion */
  completedAt?: string;
  /** Number of rows exported */
  rowCount?: number;
  /** Generated data (held in memory for download) */
  data?: string;
  /** MIME type of generated data */
  mimeType?: string;
  /** File extension */
  extension?: string;
  /** Error message if failed */
  error?: string;
  /** Optional query filters */
  filters?: Record<string, unknown>;
  /** Progress 0-100 */
  progress: number;
}

export interface CreateExportRequest {
  sourceId: string;
  format: ExportV2Format;
  filters?: Record<string, unknown>;
}

export interface ExportPolicyCheck {
  allowed: boolean;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const EXPORT_V2_CONFIG = {
  maxRowsPerExport: Number(process.env.EXPORT_V2_MAX_ROWS || 100_000),
  maxConcurrentPerUser: Number(process.env.EXPORT_V2_MAX_CONCURRENT || 3),
  jobRetentionMs: Number(process.env.EXPORT_V2_RETENTION_MS || 24 * 60 * 60 * 1000),
  allowPhiExport: process.env.EXPORT_ALLOW_PHI === 'true',
};

/* ------------------------------------------------------------------ */
/* In-memory job store                                                 */
/* ------------------------------------------------------------------ */

const jobs = new Map<string, ExportV2Job>();
let purgeTimer: ReturnType<typeof setInterval> | null = null;

function generateJobId(): string {
  return `exp-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

function purgeExpired(): void {
  const cutoff = Date.now() - EXPORT_V2_CONFIG.jobRetentionMs;
  for (const [id, job] of jobs) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      jobs.delete(id);
    }
  }
}

/** Start periodic purge timer */
export function startExportPurge(): void {
  if (purgeTimer) return;
  purgeTimer = setInterval(purgeExpired, 60 * 60 * 1000); // hourly
  if (purgeTimer.unref) purgeTimer.unref();
}

/** Stop periodic purge timer */
export function stopExportPurge(): void {
  if (purgeTimer) {
    clearInterval(purgeTimer);
    purgeTimer = null;
  }
}

/* ------------------------------------------------------------------ */
/* Policy checks                                                       */
/* ------------------------------------------------------------------ */

export function checkExportV2Policy(
  actor: { duz: string; role?: string },
  sourceId: string
): ExportPolicyCheck {
  // Must be admin
  if (actor.role !== 'admin') {
    return { allowed: false, reason: 'Export requires admin role' };
  }

  // Source must exist
  const source = getSource(sourceId);
  if (!source) {
    return { allowed: false, reason: `Unknown export source: ${sourceId}` };
  }

  // PHI gate
  if (source.containsPhi && !EXPORT_V2_CONFIG.allowPhiExport) {
    return { allowed: false, reason: 'PHI export is disabled' };
  }

  // Concurrent job limit
  const active = Array.from(jobs.values()).filter(
    (j) => j.requestedBy.duz === actor.duz && (j.status === 'queued' || j.status === 'processing')
  );
  if (active.length >= EXPORT_V2_CONFIG.maxConcurrentPerUser) {
    return {
      allowed: false,
      reason: `Maximum concurrent exports reached (${EXPORT_V2_CONFIG.maxConcurrentPerUser})`,
    };
  }

  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/* Job lifecycle                                                       */
/* ------------------------------------------------------------------ */

/**
 * Create and immediately execute an export job.
 */
export async function createExportJob(
  actor: { duz: string; name?: string; role?: string },
  tenantId: string,
  request: CreateExportRequest
): Promise<ExportV2Job> {
  if (!SUPPORTED_FORMATS.includes(request.format)) {
    throw new Error(
      `Unsupported format: ${request.format}. Supported: ${SUPPORTED_FORMATS.join(', ')}`
    );
  }

  const policy = checkExportV2Policy(actor, request.sourceId);
  if (!policy.allowed) {
    throw new Error(policy.reason || 'Export not allowed');
  }

  const job: ExportV2Job = {
    id: generateJobId(),
    sourceId: request.sourceId,
    format: request.format,
    status: 'queued',
    requestedBy: actor,
    tenantId,
    createdAt: new Date().toISOString(),
    filters: request.filters,
    progress: 0,
  };

  jobs.set(job.id, job);

  audit('export.request' as AuditAction, 'success', actor, {
    detail: { jobId: job.id, sourceId: request.sourceId, format: request.format },
  });

  // Execute inline (background-like but awaited)
  await executeJob(job);

  return job;
}

async function executeJob(job: ExportV2Job): Promise<void> {
  const source = getSource(job.sourceId);
  if (!source) {
    job.status = 'failed';
    job.error = `Source not found: ${job.sourceId}`;
    job.completedAt = new Date().toISOString();
    return;
  }

  job.status = 'processing';
  job.progress = 10;

  try {
    // Fetch rows
    const rows = await source.fetchRows(job.filters);
    job.progress = 50;

    // Enforce row limit
    const limited = rows.slice(0, EXPORT_V2_CONFIG.maxRowsPerExport);
    job.progress = 70;

    // Format output
    const result = formatRows(job.format, limited);
    job.data = result.data;
    job.mimeType = result.mimeType;
    job.extension = result.extension;
    job.rowCount = result.rowCount;
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date().toISOString();

    audit('export.download' as AuditAction, 'success', job.requestedBy, {
      detail: {
        jobId: job.id,
        sourceId: job.sourceId,
        format: job.format,
        rowCount: job.rowCount,
      },
    });

    log.info('Export v2 job completed', {
      jobId: job.id,
      sourceId: job.sourceId,
      rowCount: job.rowCount,
    });
  } catch (err: any) {
    job.status = 'failed';
    job.error = err.message || 'Unknown error';
    job.completedAt = new Date().toISOString();
    job.progress = 100;

    log.error('Export v2 job failed', { jobId: job.id, error: err.message });
  }
}

/**
 * Get an export job by ID.
 */
export function getExportJob(jobId: string): ExportV2Job | undefined {
  return jobs.get(jobId);
}

/**
 * List export jobs, optionally filtered by user or status.
 */
export function listExportJobs(filters?: {
  duz?: string;
  status?: ExportJobStatus;
  limit?: number;
}): ExportV2Job[] {
  purgeExpired();
  let result = Array.from(jobs.values());
  if (filters?.duz) result = result.filter((j) => j.requestedBy.duz === filters.duz);
  if (filters?.status) result = result.filter((j) => j.status === filters.status);
  // Sort newest first
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (filters?.limit) result = result.slice(0, filters.limit);
  return result;
}

/**
 * Get export engine stats.
 */
export function getExportStats(): {
  totalJobs: number;
  completed: number;
  failed: number;
  active: number;
} {
  const all = Array.from(jobs.values());
  return {
    totalJobs: all.length,
    completed: all.filter((j) => j.status === 'completed').length,
    failed: all.filter((j) => j.status === 'failed').length,
    active: all.filter((j) => j.status === 'queued' || j.status === 'processing').length,
  };
}
