/**
 * Export governance — Phase 19B.
 *
 * Manages export jobs with full audit trail, policy enforcement,
 * and CSV/JSON generation for report data.
 *
 * Every export is:
 *   1. Policy-checked (role, format, row count, PHI flag)
 *   2. Logged as an audit event (export.request)
 *   3. Executed with row limits
 *   4. Logged again on completion (export.download)
 *
 * No bulk PHI export by default. Only aggregate/summary data is exportable
 * unless EXPORT_ALLOW_PHI=true is set in env.
 */

import { EXPORT_CONFIG, type ExportFormat } from '../config/report-config.js';
import { audit, type AuditAction } from './audit.js';
import { log } from './logger.js';
import { safeErr } from './safe-error.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export type ExportReportType =
  | 'operations'
  | 'integrations'
  | 'audit'
  | 'clinical-activity'
  | 'clinical';

export interface ExportJob {
  id: string;
  /** Who requested the export */
  requestedBy: { duz: string; name?: string; role?: string };
  /** Report type being exported */
  reportType: ExportReportType;
  /** Export format */
  format: ExportFormat;
  /** Job status */
  status: ExportJobStatus;
  /** ISO timestamp of request */
  requestedAt: string;
  /** ISO timestamp of completion (or failure) */
  completedAt?: string;
  /** Number of rows exported */
  rowCount?: number;
  /** Generated data (held in memory for download window) */
  data?: string;
  /** MIME type of generated data */
  mimeType?: string;
  /** Error message if failed */
  error?: string;
  /** Query filters used */
  filters?: Record<string, unknown>;
}

export interface ExportPolicyResult {
  allowed: boolean;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/* In-memory export job store                                           */
/* ------------------------------------------------------------------ */

const exportJobs = new Map<string, ExportJob>();

/* Phase 146: DB repo wiring */
let exportDbRepo: {
  upsert(d: any): Promise<any>;
  update?(id: string, u: any): Promise<any>;
} | null = null;
export function initExportStoreRepo(repo: typeof exportDbRepo): void {
  exportDbRepo = repo;
}
let exportSeq = 0;

/** Purge expired jobs (older than retention window). */
function purgeExpired(): void {
  const cutoff = Date.now() - EXPORT_CONFIG.jobRetentionHours * 60 * 60 * 1000;
  for (const [id, job] of exportJobs) {
    const jobTime = new Date(job.requestedAt).getTime();
    if (jobTime < cutoff) {
      exportJobs.delete(id);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Policy checks                                                        */
/* ------------------------------------------------------------------ */

/**
 * Check whether the requesting actor can create an export.
 */
export function checkExportPolicy(
  actor: { duz: string; role?: string },
  reportType: ExportReportType,
  format: ExportFormat,
  rowEstimate: number
): ExportPolicyResult {
  // Must be admin
  if (EXPORT_CONFIG.requireAdmin && actor.role !== 'admin') {
    return { allowed: false, reason: 'Export requires admin role' };
  }

  // Format check
  if (!EXPORT_CONFIG.allowedFormats.includes(format)) {
    return {
      allowed: false,
      reason: `Format '${format}' is not allowed. Allowed: ${EXPORT_CONFIG.allowedFormats.join(', ')}`,
    };
  }

  // Row limit
  if (rowEstimate > EXPORT_CONFIG.maxExportRows) {
    return {
      allowed: false,
      reason: `Export would produce ${rowEstimate} rows (max: ${EXPORT_CONFIG.maxExportRows})`,
    };
  }

  // PHI check — clinical report exports blocked unless PHI export is enabled
  if (reportType === 'clinical' && !EXPORT_CONFIG.allowPhiExport) {
    return {
      allowed: false,
      reason:
        'Clinical data export is disabled (EXPORT_ALLOW_PHI=false). Only summary statistics are available.',
    };
  }

  // Concurrent job limit
  const activeJobs = Array.from(exportJobs.values()).filter(
    (j) => j.requestedBy.duz === actor.duz && (j.status === 'pending' || j.status === 'processing')
  );
  if (activeJobs.length >= EXPORT_CONFIG.maxConcurrentJobsPerUser) {
    return {
      allowed: false,
      reason: `Max concurrent exports reached (${EXPORT_CONFIG.maxConcurrentJobsPerUser})`,
    };
  }

  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/* CSV / JSON generators                                                */
/* ------------------------------------------------------------------ */

/**
 * Convert an array of objects to CSV format.
 * Uses the keys from the first row as headers.
 */
export function generateCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

/**
 * Convert rows to pretty JSON.
 */
export function generateJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}

/* ------------------------------------------------------------------ */
/* Job lifecycle                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a new export job. Does NOT execute — call executeExportJob() next.
 */
export function createExportJob(
  actor: { duz: string; name?: string; role?: string },
  reportType: ExportReportType,
  format: ExportFormat,
  filters?: Record<string, unknown>
): ExportJob {
  purgeExpired();

  const job: ExportJob = {
    id: `export-${++exportSeq}-${Date.now()}`,
    requestedBy: actor,
    reportType,
    format,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    filters,
  };

  exportJobs.set(job.id, job);

  // Phase 146: Write-through to PG
  exportDbRepo
    ?.upsert({
      id: job.id,
      tenantId: 'default',
      userId: (actor as any).sub ?? (actor as any).duz ?? '',
      format,
      status: job.status,
      createdAt: job.requestedAt,
    })
    .catch(() => {});

  // Audit the request
  audit('export.request' as AuditAction, 'success', actor, {
    detail: { jobId: job.id, reportType, format, filters },
  });

  log.info('Export job created', { jobId: job.id, reportType, format });

  return job;
}

/**
 * Execute an export job by generating the data from the provided rows.
 */
export function executeExportJob(jobId: string, rows: Record<string, unknown>[]): ExportJob {
  const job = exportJobs.get(jobId);
  if (!job) throw new Error(`Export job ${jobId} not found`);

  job.status = 'processing';

  try {
    // Enforce row limit
    const limited = rows.slice(0, EXPORT_CONFIG.maxExportRows);

    if (job.format === 'csv') {
      job.data = generateCsv(limited);
      job.mimeType = 'text/csv';
    } else {
      job.data = generateJson(limited);
      job.mimeType = 'application/json';
    }

    job.rowCount = limited.length;
    job.status = 'completed';
    job.completedAt = new Date().toISOString();

    audit('export.download' as AuditAction, 'success', job.requestedBy, {
      detail: { jobId, rowCount: job.rowCount, format: job.format, reportType: job.reportType },
    });

    log.info('Export job completed', { jobId, rowCount: job.rowCount });
  } catch (err: any) {
    job.status = 'failed';
    job.error = safeErr(err);
    job.completedAt = new Date().toISOString();

    audit('export.download' as AuditAction, 'error', job.requestedBy, {
      detail: { jobId, error: err.message },
    });

    log.error('Export job failed', { jobId, error: err.message });
  }

  return job;
}

/**
 * Get an export job by ID.
 */
export function getExportJob(jobId: string): ExportJob | undefined {
  return exportJobs.get(jobId);
}

/**
 * List export jobs for a given actor (or all if no duz filter).
 */
export function listExportJobs(duz?: string): ExportJob[] {
  purgeExpired();
  const jobs = Array.from(exportJobs.values());
  if (duz) return jobs.filter((j) => j.requestedBy.duz === duz);
  return jobs;
}
