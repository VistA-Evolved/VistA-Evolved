# Analytics & Octo/ROcto SQL Layer — Runbook

> Phase 25 — Enterprise BI + Analytics + Clinical Reporting

## Overview

The analytics subsystem provides:

1. **In-memory event stream** — PHI-safe analytics events (no DFNs, hashed user IDs)
2. **Hourly/daily aggregation** — MetricBucket summaries with counts, averages, percentiles
3. **Enhanced clinical report pipeline** — Cached, audited, sanitized VistA reports via ORWRP RPCs
4. **REST dashboards** — `/analytics/dashboards/ops` and `/analytics/dashboards/clinical`
5. **Octo/ROcto SQL** — PostgreSQL-wire-compatible read-only endpoint for BI tools

## Architecture

```
┌────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ API Events │────▶│ analytics-store  │────▶│ analytics-       │
│ (no PHI)   │     │ (ring buffer)    │     │ aggregator       │
└────────────┘     └─────────────────┘     └──────────┬───────┘
                                                       │
                    ┌─────────────────┐     ┌──────────▼───────┐
                    │ /analytics/*    │◀────│ Dashboard Cache   │
                    │ REST endpoints  │     │ (30s TTL)         │
                    └─────────────────┘     └──────────────────┘
                                                       │
                    ┌─────────────────┐     ┌──────────▼───────┐
                    │ ROcto           │◀────│ ETL Writer        │
                    │ (port 1338)     │     │ (future)          │
                    │ PostgreSQL wire  │     └──────────────────┘
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ BI Tools        │
                    │ Metabase/Grafana│
                    └─────────────────┘
```

## Starting the Analytics SQL Layer

```powershell
# From repo root
cd services/analytics
docker compose up -d

# Verify Octo is running
docker exec ve-analytics-octo bash -c "echo 'SELECT 1;' | /opt/yottadb/current/plugin/bin/octo"
```

## Connecting BI Tools

ROcto exposes a PostgreSQL-wire-compatible interface on port **1338**.

```bash
# Connect with psql
psql -h 127.0.0.1 -p 1338 -U bi_readonly -d analytics

# Example queries
SELECT * FROM analytics_hourly ORDER BY period_start DESC LIMIT 10;
SELECT metric, SUM(event_count) FROM analytics_daily GROUP BY metric;
SELECT * FROM top_metrics_30d;
```

### Metabase Configuration

- Database type: PostgreSQL
- Host: `127.0.0.1` (or container hostname)
- Port: `1338`
- Database: `analytics`
- User: `bi_readonly`
- Password: (configured via env var)

### Grafana Configuration

- Data source type: PostgreSQL
- URL: `127.0.0.1:1338`
- Database: `analytics`
- User: `bi_readonly`
- TLS: Require in production

## REST API Endpoints

All endpoints require authentication. Permission checked in handler.

| Endpoint                           | Method | Permission         | Description                                  |
| ---------------------------------- | ------ | ------------------ | -------------------------------------------- |
| `/analytics/dashboards/ops`        | GET    | `analytics_viewer` | System health, RPC metrics, event buffer     |
| `/analytics/dashboards/clinical`   | GET    | `analytics_viewer` | Clinical utilization, report access patterns |
| `/analytics/events`                | GET    | `analytics_viewer` | Browse raw analytics events                  |
| `/analytics/aggregated`            | GET    | `analytics_viewer` | Query aggregated metric buckets              |
| `/analytics/series/:metric`        | GET    | `analytics_viewer` | Time-series for a single metric              |
| `/analytics/export`                | POST   | `analytics_admin`  | Export analytics data as CSV                 |
| `/analytics/aggregate`             | POST   | `analytics_admin`  | Force aggregation run                        |
| `/analytics/health`                | GET    | `analytics_viewer` | Analytics subsystem health                   |
| `/analytics/clinical-reports`      | GET    | session            | List VistA clinical reports                  |
| `/analytics/clinical-reports/text` | GET    | session            | Fetch VistA clinical report text             |

### Permissions by Role

| Role       | `analytics_viewer` | `analytics_admin` |
| ---------- | ------------------ | ----------------- |
| admin      | Yes                | Yes               |
| provider   | Yes                | No                |
| nurse      | Yes                | No                |
| pharmacist | Yes                | No                |
| clerk      | No                 | No                |

## PHI Safety

The analytics layer is structurally designed to prevent PHI leakage:

1. **No DFN field** in the `AnalyticsEvent` schema
2. **User IDs hashed** via salted SHA-256 (`hashUserId()`)
3. **Tags sanitized** — `sanitizeAnalyticsTags()` strips sensitive patterns
4. **Clinical report text** is only served through session-authenticated endpoints, never stored in analytics
5. **SQL tables** contain only aggregated counts and averages

See `docs/analytics/phase25-data-classification.md` for the full data classification.

## Configuration

Environment variables (all optional with sensible defaults):

| Variable                            | Default                 | Description                |
| ----------------------------------- | ----------------------- | -------------------------- |
| `ANALYTICS_MAX_MEMORY_EVENTS`       | `50000`                 | Ring buffer size           |
| `ANALYTICS_USER_ID_SALT`            | `ve-analytics-salt-...` | HMAC salt for user hashing |
| `ANALYTICS_FLUSH_INTERVAL_MS`       | `60000`                 | JSONL flush interval       |
| `ANALYTICS_AGGREGATION_INTERVAL_MS` | `3600000`               | Aggregation run interval   |
| `CLINICAL_REPORT_CACHE_TTL_MS`      | `30000`                 | Clinical report cache TTL  |
| `ANALYTICS_ROCTO_HOST`              | `127.0.0.1`             | ROcto hostname             |
| `ANALYTICS_ROCTO_PORT`              | `1338`                  | ROcto port                 |
| `ANALYTICS_BI_USER`                 | `bi_readonly`           | BI tool read-only user     |

## Troubleshooting

### No events in dashboard

- Check that the API is running and recording events
- Run manual aggregation: `POST /analytics/aggregate`
- Check buffer stats: `GET /analytics/health`

### ROcto connection refused

- Ensure Octo container is running: `docker ps | grep octo`
- Check container logs: `docker logs ve-analytics-octo`
- Verify port 1338 is not in use: `netstat -an | findstr 1338`

### Clinical report timeout

- VistA container must be running on port 9430
- Check RPC circuit breaker state in ops dashboard
- Try increasing `CLINICAL_REPORT_CACHE_TTL_MS`

## SQL Schema

See `services/analytics/octo-seed.sql` for the full schema including:

- `analytics_hourly` — Hourly metric buckets
- `analytics_daily` — Daily metric buckets
- `rpc_health_hourly` — RPC circuit breaker snapshots
- `clinical_report_usage` — De-identified report access patterns
- `system_health_hourly` — Resource utilization
- `dashboard_access_log` — Dashboard access audit
- `export_audit` — Export tracking
