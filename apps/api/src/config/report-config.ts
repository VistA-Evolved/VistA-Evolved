/**
 * Reporting & export configuration -- Phase 19.
 *
 * Controls pagination limits, cache TTLs, export policies,
 * and query constraints for all /reports/* endpoints.
 */

/* ------------------------------------------------------------------ */
/* Report query limits                                                  */
/* ------------------------------------------------------------------ */

export const REPORT_CONFIG = {
  /** Max rows per report page. Default: 100 */
  defaultPageSize: Number(process.env.REPORT_PAGE_SIZE || 100),
  /** Absolute max rows allowed in a single request */
  maxPageSize: Number(process.env.REPORT_MAX_PAGE_SIZE || 500),
  /** Cache TTL for operations report (ms). Default: 30s */
  operationsCacheTtlMs: Number(process.env.REPORT_OPS_CACHE_MS || 30_000),
  /** Cache TTL for integration report (ms). Default: 30s */
  integrationsCacheTtlMs: Number(process.env.REPORT_INT_CACHE_MS || 30_000),
  /** Cache TTL for clinical stats report (ms). Default: 60s */
  clinicalCacheTtlMs: Number(process.env.REPORT_CLIN_CACHE_MS || 60_000),
  /** Max time range for audit queries (days). Default: 90 */
  maxAuditRangeDays: Number(process.env.REPORT_AUDIT_MAX_DAYS || 90),
} as const;

/* ------------------------------------------------------------------ */
/* Export policy                                                        */
/* ------------------------------------------------------------------ */

export type ExportFormat = 'csv' | 'json';

export const EXPORT_CONFIG = {
  /** Maximum rows in a single export. Default: 10000 */
  maxExportRows: Number(process.env.EXPORT_MAX_ROWS || 10_000),
  /** Allowed export formats */
  allowedFormats: ['csv', 'json'] as ExportFormat[],
  /** Require admin role for all exports. Default: true */
  requireAdmin: true,
  /** Export job retention (hours). After this, completed exports are purged. */
  jobRetentionHours: Number(process.env.EXPORT_RETENTION_HOURS || 24),
  /** PHI export allowed? Default: false -- only summary/aggregate data */
  allowPhiExport: process.env.EXPORT_ALLOW_PHI === 'true',
  /** Max concurrent export jobs per user */
  maxConcurrentJobsPerUser: Number(process.env.EXPORT_MAX_CONCURRENT || 3),
} as const;
