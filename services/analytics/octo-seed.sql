-- Analytics SQL Schema — Phase 25D
--
-- Seed schema for the Octo SQL analytics layer.
-- All tables contain AGGREGATED, DE-IDENTIFIED metrics only.
-- NO PHI (no patient names, SSNs, DFNs, DOBs).
--
-- These tables are populated by the ETL writer from the analytics
-- aggregation engine. ROcto exposes them as read-only tables to BI tools.
--
-- See: docs/analytics/phase25-data-classification.md

-- ================================================================
-- Hourly metric buckets
-- ================================================================
CREATE TABLE analytics_hourly (
  id          VARCHAR(64)  PRIMARY KEY,
  period_start TIMESTAMP   NOT NULL,
  period_end   TIMESTAMP   NOT NULL,
  metric      VARCHAR(128) NOT NULL,
  category    VARCHAR(64)  NOT NULL,
  tenant_id   VARCHAR(64)  NOT NULL,
  event_count INTEGER      NOT NULL DEFAULT 0,
  sum_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  min_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  max_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  p50_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  p95_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  p99_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit        VARCHAR(32)  NOT NULL DEFAULT 'count',
  aggregated_at TIMESTAMP  NOT NULL
);

-- ================================================================
-- Daily metric buckets
-- ================================================================
CREATE TABLE analytics_daily (
  id          VARCHAR(64)  PRIMARY KEY,
  period_start TIMESTAMP   NOT NULL,
  period_end   TIMESTAMP   NOT NULL,
  metric      VARCHAR(128) NOT NULL,
  category    VARCHAR(64)  NOT NULL,
  tenant_id   VARCHAR(64)  NOT NULL,
  event_count INTEGER      NOT NULL DEFAULT 0,
  sum_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  avg_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  min_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  max_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  p50_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  p95_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  p99_value   NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit        VARCHAR(32)  NOT NULL DEFAULT 'count',
  aggregated_at TIMESTAMP  NOT NULL
);

-- ================================================================
-- RPC health snapshots (hourly)
-- ================================================================
CREATE TABLE rpc_health_hourly (
  id              VARCHAR(64) PRIMARY KEY,
  snapshot_time   TIMESTAMP   NOT NULL,
  tenant_id       VARCHAR(64) NOT NULL,
  circuit_state   VARCHAR(16) NOT NULL,
  total_calls     INTEGER     NOT NULL DEFAULT 0,
  total_successes INTEGER     NOT NULL DEFAULT 0,
  total_failures  INTEGER     NOT NULL DEFAULT 0,
  total_timeouts  INTEGER     NOT NULL DEFAULT 0,
  cache_size      INTEGER     NOT NULL DEFAULT 0,
  avg_duration_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
  p95_duration_ms NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ================================================================
-- Clinical report usage (daily, de-identified)
-- ================================================================
CREATE TABLE clinical_report_usage (
  id              VARCHAR(64) PRIMARY KEY,
  report_date     TIMESTAMP   NOT NULL,
  tenant_id       VARCHAR(64) NOT NULL,
  report_id       VARCHAR(64) NOT NULL,
  report_heading  VARCHAR(256),
  view_count      INTEGER     NOT NULL DEFAULT 0,
  unique_users    INTEGER     NOT NULL DEFAULT 0,
  avg_latency_ms  NUMERIC(10,2) NOT NULL DEFAULT 0,
  cache_hit_rate  NUMERIC(5,4) NOT NULL DEFAULT 0
);

-- ================================================================
-- System uptime & resource tracking (hourly)
-- ================================================================
CREATE TABLE system_health_hourly (
  id              VARCHAR(64) PRIMARY KEY,
  snapshot_time   TIMESTAMP   NOT NULL,
  tenant_id       VARCHAR(64) NOT NULL,
  uptime_seconds  INTEGER     NOT NULL DEFAULT 0,
  heap_used_mb    NUMERIC(10,2) NOT NULL DEFAULT 0,
  rss_mb          NUMERIC(10,2) NOT NULL DEFAULT 0,
  event_buffer_size INTEGER   NOT NULL DEFAULT 0,
  active_sessions   INTEGER   NOT NULL DEFAULT 0
);

-- ================================================================
-- Dashboard access audit (de-identified)
-- ================================================================
CREATE TABLE dashboard_access_log (
  id              VARCHAR(64)  PRIMARY KEY,
  access_time     TIMESTAMP    NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  user_hash       VARCHAR(32)  NOT NULL,
  dashboard_type  VARCHAR(64)  NOT NULL,
  role            VARCHAR(32)  NOT NULL
);

-- ================================================================
-- Export audit trail
-- ================================================================
CREATE TABLE export_audit (
  id              VARCHAR(64)  PRIMARY KEY,
  export_time     TIMESTAMP    NOT NULL,
  tenant_id       VARCHAR(64)  NOT NULL,
  user_hash       VARCHAR(32)  NOT NULL,
  export_type     VARCHAR(32)  NOT NULL,
  format          VARCHAR(16)  NOT NULL,
  row_count       INTEGER      NOT NULL DEFAULT 0,
  role            VARCHAR(32)  NOT NULL
);

-- ================================================================
-- Sample read-only views for BI tools
-- ================================================================

-- Top metrics by event count (last 30 days)
CREATE VIEW top_metrics_30d AS
SELECT metric, category, tenant_id,
       SUM(event_count) as total_events,
       AVG(avg_value) as overall_avg,
       MAX(max_value) as overall_max,
       unit
FROM analytics_daily
WHERE period_start >= TIMESTAMP '2024-01-01'
GROUP BY metric, category, tenant_id, unit;

-- RPC health trend
CREATE VIEW rpc_health_trend AS
SELECT DATE(snapshot_time) as health_date,
       tenant_id,
       circuit_state,
       SUM(total_calls) as daily_calls,
       SUM(total_failures) as daily_failures,
       AVG(avg_duration_ms) as avg_duration
FROM rpc_health_hourly
GROUP BY DATE(snapshot_time), tenant_id, circuit_state;
