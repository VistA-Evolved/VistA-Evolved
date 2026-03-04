# Runbook: Reporting & Export Governance (Phase 19)

## Overview

Phase 19 adds admin-only reporting endpoints, export governance with full audit trail,
a web-based reporting dashboard, and optional RCM placeholder surfaces.

## Endpoints

| Method | Path                         | Auth  | Description                                  |
| ------ | ---------------------------- | ----- | -------------------------------------------- |
| GET    | `/reports/operations`        | admin | RPC health, circuit breaker, process metrics |
| GET    | `/reports/integrations`      | admin | Integration health summary + queue metrics   |
| GET    | `/reports/audit`             | admin | Audit event summary with filters             |
| GET    | `/reports/clinical-activity` | admin | Clinical action counts (no PHI text)         |
| POST   | `/reports/export`            | admin | Create audited export job (CSV/JSON)         |
| GET    | `/reports/export/jobs`       | admin | List export jobs                             |
| GET    | `/reports/export/:jobId`     | admin | Download completed export                    |

## Query Parameters

### /reports/audit

- `actionPrefix` — filter events by action prefix (e.g., `clinical`, `phi`, `auth`)
- `actorDuz` — filter by actor DUZ
- `since` — ISO timestamp for time range start
- `limit` — max events to return (default: 100, max: 500)

### /reports/integrations

- `tenantId` — tenant to report on (default: `default`)

### /reports/export/jobs

- `mine=true` — show only the requesting user's jobs

## Export Governance

### Policy Enforcement

- Admin role required for all exports
- Maximum row limit: 10,000 (configurable via `EXPORT_MAX_ROWS`)
- Clinical data export disabled by default (`EXPORT_ALLOW_PHI=false`)
- Concurrent job limit: 3 per user
- Export jobs auto-expire after 24 hours

### Export Flow

1. `POST /reports/export` with `{ reportType, format, filters }`
2. Policy check (role, format, row count, PHI flag)
3. Job created + audit event `export.request`
4. Data generated + row limits enforced
5. Completion + audit event `export.download`
6. Download via `GET /reports/export/:jobId`

### Supported Formats

- CSV (`text/csv`)
- JSON (`application/json`)

## Configuration

### Environment Variables

| Variable                 | Default | Description                     |
| ------------------------ | ------- | ------------------------------- |
| `REPORT_PAGE_SIZE`       | 100     | Default report page size        |
| `REPORT_MAX_PAGE_SIZE`   | 500     | Maximum rows per request        |
| `REPORT_OPS_CACHE_MS`    | 30000   | Operations report cache TTL     |
| `REPORT_INT_CACHE_MS`    | 30000   | Integrations report cache TTL   |
| `REPORT_CLIN_CACHE_MS`   | 60000   | Clinical report cache TTL       |
| `REPORT_AUDIT_MAX_DAYS`  | 90      | Max audit query range (days)    |
| `EXPORT_MAX_ROWS`        | 10000   | Max rows in single export       |
| `EXPORT_RETENTION_HOURS` | 24      | Export job retention window     |
| `EXPORT_ALLOW_PHI`       | false   | Allow clinical data export      |
| `EXPORT_MAX_CONCURRENT`  | 3       | Max concurrent exports per user |

## Audit Action Types (Phase 19)

- `report.generate` — report viewed via API
- `export.request` — export job created
- `export.download` — export data downloaded
- `export.policy-check` — export denied by policy

## Feature Flags

- `rcm.enabled` — gates the RCM placeholder UI (default: false)

## Web UI Pages

- `/cprs/admin/reports` — Reporting dashboard with 5 tabs
- `/cprs/admin/rcm` — RCM placeholder (feature-flagged)

## Manual Testing

```bash
# 1. Login
curl -X POST http://127.0.0.1:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' \
  -c cookies.txt

# 2. Operations report
curl http://127.0.0.1:3001/reports/operations -b cookies.txt | jq .

# 3. Integrations report
curl http://127.0.0.1:3001/reports/integrations -b cookies.txt | jq .

# 4. Audit report
curl "http://127.0.0.1:3001/reports/audit?limit=10" -b cookies.txt | jq .

# 5. Clinical report
curl http://127.0.0.1:3001/reports/clinical-activity -b cookies.txt | jq .

# 6. Create export
curl -X POST http://127.0.0.1:3001/reports/export \
  -H 'Content-Type: application/json' \
  -d '{"reportType":"operations","format":"csv"}' \
  -b cookies.txt | jq .

# 7. List exports
curl http://127.0.0.1:3001/reports/export/jobs -b cookies.txt | jq .

# 8. Download export (replace JOB_ID)
curl http://127.0.0.1:3001/reports/export/JOB_ID -b cookies.txt
```

## Troubleshooting

| Symptom                                           | Cause                  | Fix                                       |
| ------------------------------------------------- | ---------------------- | ----------------------------------------- |
| 403 on /reports/\*                                | Not logged in as admin | Login with PROV123/PROV123!!              |
| Export denied: "Clinical data export is disabled" | PHI export off         | Set `EXPORT_ALLOW_PHI=true` in .env.local |
| Export denied: "Max concurrent exports reached"   | Too many active jobs   | Wait for jobs to complete or expire       |
| Empty RPC metrics                                 | No RPCs called yet     | Call a VistA endpoint first               |
