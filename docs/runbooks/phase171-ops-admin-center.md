# Phase 171 — Ops Admin Center

## Overview

Unified operational admin dashboard for SaaS + hospital IT visibility.
Aggregates all posture/health/provisioning data into a single ops view.

## Architecture

```
Admin UI (ops/page.tsx)
  → /admin/ops/overview     → Aggregates all posture domains
  → /admin/ops/alerts       → Active alert conditions
  → /admin/ops/runbooks     → Runbook index with categorization
  → /admin/ops/store-inventory → In-memory store health summary
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/ops/overview` | admin | Unified ops health snapshot |
| GET | `/admin/ops/alerts` | admin | Active alert conditions |
| GET | `/admin/ops/runbooks` | admin | Runbook index with deep links |
| GET | `/admin/ops/store-inventory` | admin | Store policy summary |

## Overview Response

The `/admin/ops/overview` endpoint returns:
- `overallScore` — 0-100 aggregate posture score
- `domains[]` — Per-domain health (observability, tenant, performance, backup, data-plane)
- `alerts[]` — Active alert conditions with severity
- `storeCount` — Total tracked in-memory stores
- `runbookCount` — Total indexed runbooks

## Alert Thresholds

| Score | Severity | Action |
|-------|----------|--------|
| >= 80% | None | Healthy |
| 50-79% | Warning | Investigate domain |
| < 50% | Critical | Immediate action |

## Admin UI

Located at `/cprs/admin/ops`:
- **Overview tab**: Score cards, domain health grid
- **Alerts tab**: Active alerts with severity badges
- **Store Inventory tab**: Classification/domain/durability breakdown
- **Runbooks tab**: Categorized runbook index

## Testing

```powershell
# Login
$r = Invoke-WebRequest -Uri http://127.0.0.1:3001/auth/login -Method POST `
  -ContentType "application/json" `
  -Body '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' `
  -SessionVariable s -UseBasicParsing

# Ops overview
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/ops/overview `
  -WebSession $s -UseBasicParsing

# Alerts
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/ops/alerts `
  -WebSession $s -UseBasicParsing

# Store inventory
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/ops/store-inventory `
  -WebSession $s -UseBasicParsing

# Runbooks
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/ops/runbooks `
  -WebSession $s -UseBasicParsing
```

## Gauntlet Gate

G28 checks: route file with 4 endpoints, admin UI page, posture aggregation,
alert generation, store inventory, runbook index, no PHI, index.ts wiring, runbook.
