/**
 * Analytics Configuration — Phase 25.
 *
 * Central configuration for the analytics subsystem including
 * event stream, aggregation, SQL endpoint, and BI exports.
 */

/* ================================================================== */
/* Analytics Permission Model                                           */
/* ================================================================== */

export type AnalyticsPermission =
  | "analytics_viewer"   // Read dashboards, query aggregated metrics
  | "analytics_admin";   // Export, manage connectors, full event access

import type { UserRole } from "../auth/session-store.js";

/**
 * Default analytics permission mapping by UserRole.
 * Provider/nurse/pharmacist get viewer access for quality metrics.
 * Admin gets full analytics_admin.
 * Clerk gets no analytics access by default.
 */
export const ANALYTICS_ROLE_PERMISSIONS: Record<UserRole, AnalyticsPermission[]> = {
  provider:   ["analytics_viewer"],
  nurse:      ["analytics_viewer"],
  pharmacist: ["analytics_viewer"],
  clerk:      [],
  admin:      ["analytics_viewer", "analytics_admin"],
};

/* ================================================================== */
/* Event Stream Config                                                  */
/* ================================================================== */

export const ANALYTICS_EVENT_CONFIG = {
  /** Maximum in-memory events before ring buffer eviction. */
  maxMemoryEvents: Number(process.env.ANALYTICS_MAX_EVENTS || 50000),
  /** JSONL persistence path (set to empty string to disable). */
  eventFilePath: process.env.ANALYTICS_EVENT_FILE ?? "data/analytics-events.jsonl",
  /** Retention days for event file (used by cleanup job). */
  retentionDays: Number(process.env.ANALYTICS_RETENTION_DAYS || 7),
  /** Salt for hashing user IDs in analytics (rotate periodically). */
  userIdSalt: process.env.ANALYTICS_USER_SALT || "ve-analytics-salt-change-in-prod",
  /** Flush interval for batch writes to JSONL (ms). */
  flushIntervalMs: Number(process.env.ANALYTICS_FLUSH_INTERVAL_MS || 5000),
} as const;

/* ================================================================== */
/* Aggregation Config                                                   */
/* ================================================================== */

export const ANALYTICS_AGGREGATION_CONFIG = {
  /** Aggregation interval (ms). Default: 1 hour. */
  intervalMs: Number(process.env.ANALYTICS_AGGREGATION_INTERVAL_MS || 3600000),
  /** Retention days for aggregated metrics. */
  retentionDays: Number(process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS || 365),
  /** Maximum aggregation buckets in memory. */
  maxBuckets: Number(process.env.ANALYTICS_MAX_BUCKETS || 8760), // ~1 year of hourly buckets
} as const;

/* ================================================================== */
/* Dashboard Config                                                     */
/* ================================================================== */

export const ANALYTICS_DASHBOARD_CONFIG = {
  /** Cache TTL for dashboard data (ms). */
  cacheTtlMs: Number(process.env.ANALYTICS_DASHBOARD_CACHE_TTL_MS || 30000),
  /** Maximum data points returned per series. */
  maxDataPoints: Number(process.env.ANALYTICS_MAX_DATA_POINTS || 500),
  /** Default time range for dashboards (hours). */
  defaultTimeRangeHours: Number(process.env.ANALYTICS_DEFAULT_RANGE_HOURS || 24),
} as const;

/* ================================================================== */
/* Export Config                                                         */
/* ================================================================== */

export const ANALYTICS_EXPORT_CONFIG = {
  /** Maximum rows per export. */
  maxExportRows: Number(process.env.ANALYTICS_MAX_EXPORT_ROWS || 100000),
  /** Allowed export formats. */
  allowedFormats: ["csv", "json"] as const,
  /** Max concurrent exports per user. */
  maxConcurrentPerUser: 3,
  /** Job TTL before cleanup (hours). */
  jobRetentionHours: 24,
} as const;

/* ================================================================== */
/* SQL / Octo Config                                                    */
/* ================================================================== */

export const ANALYTICS_SQL_CONFIG = {
  /** ROcto host (internal). */
  roctoHost: process.env.ROCTO_HOST || "127.0.0.1",
  /** ROcto port. */
  roctoPort: Number(process.env.ROCTO_PORT || 1338),
  /** Read-only BI user (for external tools). */
  biReadOnlyUser: process.env.ANALYTICS_BI_USER || "bi_readonly",
  /** ETL writer user (for aggregation jobs). */
  etlWriterUser: process.env.ANALYTICS_ETL_USER || "etl_writer",
  /** ETL writer password. Change in production. */
  etlWriterPassword: process.env.ANALYTICS_ETL_PASSWORD || "etl_writer_pass",
  /** IP allowlist for ROcto connections (comma-separated CIDRs). */
  ipAllowlist: (process.env.ROCTO_IP_ALLOWLIST || "127.0.0.1/32,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16")
    .split(",").map(s => s.trim()).filter(Boolean),
} as const;

/* ================================================================== */
/* Rate Limit Config                                                    */
/* ================================================================== */

export const ANALYTICS_RATE_LIMIT_CONFIG = {
  /** Max analytics API requests per window per user. */
  maxRequests: Number(process.env.ANALYTICS_RATE_LIMIT || 60),
  /** Window duration (ms). */
  windowMs: Number(process.env.ANALYTICS_RATE_WINDOW_MS || 60000),
} as const;
