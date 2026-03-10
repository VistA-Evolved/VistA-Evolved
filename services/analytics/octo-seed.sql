-- Analytics SQL Schema -- Phase 25D
--
-- Seed schema for the Octo SQL analytics layer.
-- All tables contain AGGREGATED, DE-IDENTIFIED metrics only.
-- NO PHI (no patient names, SSNs, DFNs, DOBs).
--
-- Octo v1.1 compatibility: uses VARCHAR for timestamps (bare TIMESTAMP
-- type not supported), no DEFAULT clauses.
--
-- See: docs/analytics/phase25-data-classification.md

-- ================================================================
-- Hourly metric buckets
-- ================================================================
CREATE TABLE analytics_hourly (
  id            VARCHAR(64)    PRIMARY KEY,
  period_start  VARCHAR(32)    NOT NULL,
  period_end    VARCHAR(32)    NOT NULL,
  metric        VARCHAR(128)   NOT NULL,
  category      VARCHAR(64)    NOT NULL,
  tenant_id     VARCHAR(64)    NOT NULL,
  event_count   INTEGER        NOT NULL,
  sum_value     NUMERIC(18,4)  NOT NULL,
  avg_value     NUMERIC(18,4)  NOT NULL,
  min_value     NUMERIC(18,4)  NOT NULL,
  max_value     NUMERIC(18,4)  NOT NULL,
  p50_value     NUMERIC(18,4)  NOT NULL,
  p95_value     NUMERIC(18,4)  NOT NULL,
  p99_value     NUMERIC(18,4)  NOT NULL,
  unit          VARCHAR(32)    NOT NULL,
  aggregated_at VARCHAR(32)    NOT NULL
);

-- ================================================================
-- Daily metric buckets
-- ================================================================
CREATE TABLE analytics_daily (
  id            VARCHAR(64)    PRIMARY KEY,
  period_start  VARCHAR(32)    NOT NULL,
  period_end    VARCHAR(32)    NOT NULL,
  metric        VARCHAR(128)   NOT NULL,
  category      VARCHAR(64)    NOT NULL,
  tenant_id     VARCHAR(64)    NOT NULL,
  event_count   INTEGER        NOT NULL,
  sum_value     NUMERIC(18,4)  NOT NULL,
  avg_value     NUMERIC(18,4)  NOT NULL,
  min_value     NUMERIC(18,4)  NOT NULL,
  max_value     NUMERIC(18,4)  NOT NULL,
  p50_value     NUMERIC(18,4)  NOT NULL,
  p95_value     NUMERIC(18,4)  NOT NULL,
  p99_value     NUMERIC(18,4)  NOT NULL,
  unit          VARCHAR(32)    NOT NULL,
  aggregated_at VARCHAR(32)    NOT NULL
);

-- ================================================================
-- RPC health snapshots (hourly)
-- ================================================================
CREATE TABLE rpc_health_hourly (
  id              VARCHAR(64)    PRIMARY KEY,
  snapshot_time   VARCHAR(32)    NOT NULL,
  tenant_id       VARCHAR(64)    NOT NULL,
  circuit_state   VARCHAR(16)    NOT NULL,
  total_calls     INTEGER        NOT NULL,
  total_successes INTEGER        NOT NULL,
  total_failures  INTEGER        NOT NULL,
  total_timeouts  INTEGER        NOT NULL,
  cache_size      INTEGER        NOT NULL,
  avg_duration_ms NUMERIC(10,2)  NOT NULL,
  p95_duration_ms NUMERIC(10,2)  NOT NULL
);

-- ================================================================
-- Clinical report usage (daily, de-identified)
-- ================================================================
CREATE TABLE clinical_report_usage (
  id              VARCHAR(64)    PRIMARY KEY,
  report_date     VARCHAR(32)    NOT NULL,
  tenant_id       VARCHAR(64)    NOT NULL,
  report_id       VARCHAR(64)    NOT NULL,
  report_heading  VARCHAR(256),
  view_count      INTEGER        NOT NULL,
  unique_users    INTEGER        NOT NULL,
  avg_latency_ms  NUMERIC(10,2)  NOT NULL,
  cache_hit_rate  NUMERIC(5,4)   NOT NULL
);

-- ================================================================
-- System uptime & resource tracking (hourly)
-- ================================================================
CREATE TABLE system_health_hourly (
  id                VARCHAR(64)    PRIMARY KEY,
  snapshot_time     VARCHAR(32)    NOT NULL,
  tenant_id         VARCHAR(64)    NOT NULL,
  uptime_seconds    INTEGER        NOT NULL,
  heap_used_mb      NUMERIC(10,2)  NOT NULL,
  rss_mb            NUMERIC(10,2)  NOT NULL,
  event_buffer_size INTEGER        NOT NULL,
  active_sessions   INTEGER        NOT NULL
);

-- ================================================================
-- Dashboard access audit (de-identified)
-- ================================================================
CREATE TABLE dashboard_access_log (
  id              VARCHAR(64)    PRIMARY KEY,
  access_time     VARCHAR(32)    NOT NULL,
  tenant_id       VARCHAR(64)    NOT NULL,
  user_hash       VARCHAR(32)    NOT NULL,
  dashboard_type  VARCHAR(64)    NOT NULL,
  role            VARCHAR(32)    NOT NULL
);

-- ================================================================
-- Export audit trail
-- ================================================================
CREATE TABLE export_audit (
  id              VARCHAR(64)    PRIMARY KEY,
  export_time     VARCHAR(32)    NOT NULL,
  tenant_id       VARCHAR(64)    NOT NULL,
  user_hash       VARCHAR(32)    NOT NULL,
  export_type     VARCHAR(32)    NOT NULL,
  format          VARCHAR(16)    NOT NULL,
  row_count       INTEGER        NOT NULL,
  role            VARCHAR(32)    NOT NULL
);
