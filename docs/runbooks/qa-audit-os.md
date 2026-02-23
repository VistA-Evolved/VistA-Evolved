# Runbook: QA/Audit OS (Phase 96B)

## Overview

Phase 96B provides a unified QA infrastructure: RPC trace ring buffer,
declarative QA flow catalog, dead-click detection, and admin dashboard.

## Enabling QA Routes

QA routes are **disabled by default**. Enable with either:

```bash
# Option 1: Environment variable
QA_ROUTES_ENABLED=true npx tsx --env-file=.env.local src/index.ts

# Option 2: NODE_ENV
NODE_ENV=test npx tsx --env-file=.env.local src/index.ts
```

## RPC Trace Buffer

- In-memory ring buffer, max 5000 entries (configurable via `RPC_TRACE_BUFFER_SIZE`)
- Disable with `RPC_TRACE_ENABLED=false`
- PHI-safe: DUZ hashed, params redacted, SSNs stripped

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/qa/traces` | Recent traces (optionally filter by `?rpc=NAME` or `?requestId=ID`) |
| GET | `/qa/traces/failed` | Failed RPC traces only |
| GET | `/qa/traces/stats` | Aggregate statistics |
| DELETE | `/qa/traces` | Clear trace buffer |

## QA Flow Catalog

15 declarative JSON flows in `config/qa-flows/`:

| ID | Domain | Priority | Description |
|----|--------|----------|-------------|
| smoke-health | system | smoke | Health/ready/ping |
| smoke-login | auth | smoke | Login + session |
| smoke-patient-search | clinical | smoke | Patient search |
| read-allergies | clinical | regression | Allergy read |
| read-vitals | clinical | regression | Vitals read |
| read-medications | clinical | regression | Medication read |
| read-problems | clinical | regression | Problem list |
| read-labs | clinical | regression | Lab results |
| read-orders | clinical | regression | Orders summary |
| payer-registry-crud | rcm | regression | Payer CRUD |
| evidence-ingest | rcm | deep | Evidence pipeline |
| modules-capabilities | system | smoke | Module/capability check |
| audit-trail | system | regression | Audit trail |
| rcm-claims-lifecycle | rcm | deep | Claims lifecycle |
| qa-self-test | qa | smoke | QA self-test |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/qa/flows/reload` | Reload catalog from disk |
| GET | `/qa/flows` | List flows (optionally `?priority=smoke` or `?domain=clinical`) |
| GET | `/qa/flows/:flowId` | Get single flow |
| POST | `/qa/flows/:flowId/run` | Execute flow |
| GET | `/qa/results` | List flow results |

### Running a Flow

```bash
# Reload catalog
curl -X POST http://localhost:3001/qa/flows/reload

# Run smoke-health flow
curl -X POST http://localhost:3001/qa/flows/smoke-health/run \
  -H 'Content-Type: application/json' \
  -d '{"baseUrl":"http://localhost:3001"}'
```

## Dead-Click Detection

### Playwright Crawler

```bash
cd apps/web
pnpm exec playwright test dead-click-crawler
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/qa/dead-clicks` | Report dead clicks (from Playwright) |
| GET | `/qa/dead-clicks` | List reported dead clicks |
| DELETE | `/qa/dead-clicks` | Clear dead-click reports |

## Admin UI

Navigate to: **Admin Console > QA Dashboard**

Four tabs:
- **Traces**: RPC call history with timing and stats
- **Flows**: Browse and execute QA flows
- **Results**: Flow execution history
- **Dead Clicks**: Detected dead-click elements

## Playwright Specs

### Phase Replay

```bash
cd apps/web
API_URL=http://localhost:3001 pnpm exec playwright test phase-replay
```

### Dead-Click Crawler

```bash
cd apps/web
pnpm exec playwright test dead-click-crawler
```

## Troubleshooting

### QA routes return 403
QA routes are disabled by default. Set `QA_ROUTES_ENABLED=true`.

### No flows loaded
Call `POST /qa/flows/reload` to load from `config/qa-flows/`.

### Empty trace buffer
Trace buffer resets on API restart. Execute API operations to populate.
