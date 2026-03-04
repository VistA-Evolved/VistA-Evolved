# Phase 107: Production Posture Runbook

> Comprehensive guide for operating VistA-Evolved in production. Covers
> observability, backup/restore, tenant isolation, and performance gates.

---

## 1. Store Inventory

### 1.1 Persistent Stores

| Store                      | Location                              | Type             | Backup Method                   |
| -------------------------- | ------------------------------------- | ---------------- | ------------------------------- |
| **SQLite Platform DB**     | `data/platform.db`                    | File (WAL mode)  | File copy (quiesce first)       |
| **SQLite WAL**             | `data/platform.db-wal`                | File             | Copy alongside .db              |
| **PostgreSQL Platform**    | Port 5433, db `ve_platform`           | Docker PG 16     | `pg_dump`                       |
| **Immutable Audit JSONL**  | `apps/api/logs/immutable-audit.jsonl` | Append-only file | File copy                       |
| **WorldVistA Docker**      | `services/vista/`                     | Docker volume    | `mupip backup` inside container |
| **Keycloak PostgreSQL**    | `services/keycloak/`                  | Docker volume    | `pg_dumpall` from keycloak-db   |
| **Orthanc DICOM**          | `services/imaging/`                   | Docker volume    | Orthanc REST API export         |
| **YottaDB/Octo Analytics** | `services/analytics/`                 | Docker volume    | `mupip backup`                  |

### 1.2 In-Memory Stores (~30)

These reset on API restart. They are intentional -- VistA is the source of
truth and the in-memory stores are caches/staging areas.

Key stores: session-store, room-store (telehealth), imaging-worklist,
imaging-ingest, imaging-devices, claim-store (RCM), payment-store,
analytics-store, handoff-store, portal-user-store, ui-prefs-store.

Full list: run `node scripts/backup-restore.mjs status`

---

## 2. Backup Procedures

### 2.1 Quick Backup (SQLite + Audit)

```bash
node scripts/backup-restore.mjs backup
# Creates timestamped dir under artifacts/backups/
```

### 2.2 Backup with Custom Output

```bash
node scripts/backup-restore.mjs backup --output /path/to/backup/dir
```

### 2.3 PostgreSQL Backup (if configured)

```bash
# Ensure PLATFORM_PG_URL is set
export PLATFORM_PG_URL="postgresql://ve_api:ve_api_dev@localhost:5433/ve_platform"
node scripts/backup-restore.mjs backup
# pg_dump output saved as platform-pg.sql in backup dir
```

### 2.4 VistA Docker Backup

```bash
# Inside the WorldVistA container:
docker exec -it wv su - wv -c "mupip backup \"*\" /tmp/vista-backup"
docker cp wv:/tmp/vista-backup ./artifacts/backups/vista/
```

### 2.5 Scheduled Backups (cron)

```cron
# Daily at 02:00 UTC
0 2 * * * cd /path/to/repo && node scripts/backup-restore.mjs backup --output /mnt/backups/$(date +\%Y\%m\%d)
```

---

## 3. Restore Procedures

### 3.1 Restore from Backup

```bash
# STOP THE API SERVER FIRST
node scripts/backup-restore.mjs restore --from artifacts/backups/2025-01-15T02-00-00
```

### 3.2 Restore PostgreSQL

```bash
export PLATFORM_PG_URL="postgresql://ve_api:ve_api_dev@localhost:5433/ve_platform"
node scripts/backup-restore.mjs restore --from /path/to/backup
# or manually:
psql "$PLATFORM_PG_URL" < /path/to/backup/platform-pg.sql
```

### 3.3 Restore VistA Docker

```bash
docker cp ./artifacts/backups/vista/ wv:/tmp/vista-restore/
docker exec -it wv su - wv -c "mupip restore \"*\" /tmp/vista-restore/"
```

---

## 4. Observability Stack

### 4.1 Components (already deployed)

| Component                  | Location                                    | Purpose                               |
| -------------------------- | ------------------------------------------- | ------------------------------------- |
| **Structured Logger**      | `apps/api/src/lib/logger.ts`                | JSON logs, PHI redaction, request IDs |
| **Request ID Propagation** | `AsyncLocalStorage` + `X-Request-Id` header | Distributed tracing correlation       |
| **Prometheus Metrics**     | `apps/api/src/telemetry/metrics.ts`         | 19 metrics at `/metrics/prometheus`   |
| **OTel Tracing**           | `apps/api/src/telemetry/tracing.ts`         | OTLP HTTP exporter to Jaeger          |
| **Audit System**           | `apps/api/src/lib/audit.ts`                 | Event audit + hash-chain verification |
| **OTel Collector**         | `services/observability/`                   | PHI-strip processor + exporters       |
| **Jaeger**                 | `services/observability/`                   | Trace visualization                   |
| **Prometheus Scraper**     | `services/observability/`                   | Metric collection + alerting          |

### 4.2 Enable OTel Tracing

```bash
# In apps/api/.env.local
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 4.3 Verify Observability

```bash
# Check metrics
curl http://127.0.0.1:3001/metrics/prometheus

# Check health + SLO fields
curl http://127.0.0.1:3001/health

# Check audit stats
curl http://127.0.0.1:3001/admin/audit-summary  # requires admin session
```

### 4.4 Live Posture Check

```bash
# Requires admin session cookie
curl -b cookies.txt http://127.0.0.1:3001/posture/observability
```

---

## 5. Tenant Isolation

### 5.1 Architecture

All PG tables include a `tenant_id` column. Row-Level Security (RLS)
policies enforce tenant isolation at the database level.

- **Middleware**: `apps/api/src/middleware/tenant-context.ts` -- resolves
  tenant from session
- **Transaction Context**: `apps/api/src/platform/pg/tenant-context.ts` --
  `SET LOCAL app.current_tenant_id` per transaction
- **RLS Policies**: `apps/api/src/platform/pg/pg-migrate.ts` --
  `applyRlsPolicies()` enables RLS + FORCE RLS on 21 tables
- **Init SQL**: `services/platform-db/init.sql` --
  `create_tenant_rls_policy()` PL/pgSQL function

### 5.2 Enable RLS (Production)

```bash
# In apps/api/.env.local
PLATFORM_PG_RLS_ENABLED=true
```

On API startup, `initPlatformPg()` calls `applyRlsPolicies()` which:

1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 21 tables
2. `ALTER TABLE ... FORCE ROW LEVEL SECURITY` (applies to table owner too)
3. Creates policy: `USING (tenant_id = current_setting('app.current_tenant_id'))`

### 5.3 Covered Tables (21)

platform_audit_event, idempotency_key, outbox_event, payer, tenant_payer,
payer_capability, payer_task, payer_evidence_snapshot, payer_audit_event,
denial_case, denial_action, denial_attachment, resubmission_attempt,
remittance_import, payment_record, reconciliation_match, underpayment_case,
eligibility_check, claim_status_check, capability_matrix_cell,
capability_matrix_evidence

### 5.4 Verify Tenant Isolation

```bash
# Live posture check (requires admin session + PG running)
curl -b cookies.txt http://127.0.0.1:3001/posture/tenant
```

### 5.5 Connection Pooling Safety

The `createTenantContext()` function uses `SET LOCAL` which is
transaction-scoped. When the transaction ends (commit or rollback),
the setting is automatically cleared. This prevents tenant context
leakage in pooled connections.

---

## 6. Performance Gates

### 6.1 Budget Configuration

See `config/performance-budgets.json` for:

- **Web Vitals**: LCP < 2500ms, FID < 100ms, CLS < 0.1
- **API Latency**: p95 < 500ms, p99 < 2000ms
- **RPC Calls**: p95 < 1000ms, p99 < 3000ms
- **Bundle Size**: Main < 250KB, Total < 500KB

### 6.2 Rate Limiting

Per-IP rate limiting is configured in `apps/api/src/middleware/security.ts`.
Default: 200 req/60s. DICOMweb has its own limiter: 120 req/60s.

### 6.3 Circuit Breaker

The RPC circuit breaker (5 failures -> open, 30s half-open, 2 retries +
exponential backoff) protects against VistA unavailability. Check state:

```bash
curl -b cookies.txt http://127.0.0.1:3001/posture/performance
```

### 6.4 k6 Smoke Tests

```bash
cd tests/k6
./run-smoke.ps1   # requires API + VistA running
```

---

## 7. QA Gate

### 7.1 Run Offline Posture Check

```bash
pnpm qa:prod-posture
```

This validates all production posture files exist and are valid without
requiring a running API server.

### 7.2 Run Live Posture Check

With the API running and admin session:

```bash
curl -b cookies.txt http://127.0.0.1:3001/posture | jq .
```

Returns unified posture report with scores for all 4 domains.

---

## 8. Troubleshooting

| Symptom                    | Likely Cause                      | Fix                                      |
| -------------------------- | --------------------------------- | ---------------------------------------- |
| `/posture` returns 401     | Not logged in as admin            | Login with admin credentials             |
| RLS posture shows 0 tables | `PLATFORM_PG_RLS_ENABLED` not set | Add to `.env.local`                      |
| Backup script skips PG     | `PLATFORM_PG_URL` not set         | Export the connection string             |
| OTel tracing gate fails    | `OTEL_ENABLED` not set            | Add to `.env.local`                      |
| Circuit breaker open       | VistA container down              | `docker compose up -d` in services/vista |
| Heap > 512MB               | Memory leak or large dataset      | Restart API, check for unbounded caches  |

---

## 9. Production Checklist

- [ ] Set `PLATFORM_PG_RLS_ENABLED=true`
- [ ] Set `OTEL_ENABLED=true` with collector endpoint
- [ ] Change all default secrets (session, imaging webhook, etc.)
- [ ] Configure scheduled backups (Section 2.5)
- [ ] Verify `pnpm qa:prod-posture` passes
- [ ] Verify `/posture` returns acceptable scores
- [ ] Set `CLAIM_SUBMISSION_ENABLED=false` until payer connectivity verified
- [ ] Review `config/performance-budgets.json` budgets
- [ ] Ensure Docker volumes are backed up
- [ ] Set `NODE_ENV=production` (disables sandbox credentials)
