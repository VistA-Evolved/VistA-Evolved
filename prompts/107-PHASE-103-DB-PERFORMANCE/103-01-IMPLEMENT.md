# Phase 103 v2 -- IMPLEMENT: Platform DB Performance Posture

## Goal

Ensure Postgres-backed PlatformStore can scale safely with connection
handling, partitioning posture, indexes, latency/reliability guardrails,
and a light load test gate.

## Steps

### 1. Connection Pooling Posture
- Document pgbouncer plan (dev optional, prod recommended)
- Note pooling modes (transaction vs session)
- Enhance pg-db.ts with statement_timeout + idle_in_transaction timeout
- Add pool metrics to health check

### 2. Partitioning Posture
- Identify high-growth tables: platform_audit_event, outbox_event, payer_audit_event
- Add migration v6: range partition on created_at for audit tables
- Document partition management plan (quarterly rotation)

### 3. Indexes
- Migration v6: add missing composite indexes for common query patterns
- Add unique constraint for idempotency dedup in payer_capability
- Add covering indexes for frequently-filtered columns

### 4. Timeouts + Retries
- Add idempotency middleware for POST/PUT/PATCH routes
- Wire idempotency_key table for request deduplication
- Add configurable statement_timeout (env var: PLATFORM_PG_STATEMENT_TIMEOUT_MS)
- Add retry wrapper with exponential backoff

### 5. Load Test Gate
- Add k6 test: tests/k6/db-load.js targeting payer-db endpoints
- 10 VUs for 30s with p95 < 500ms threshold
- Include in verify script

## Files to Create
- docs/architecture/platform-db-performance.md
- apps/api/src/platform/pg/pg-retry.ts
- apps/api/src/middleware/idempotency.ts
- tests/k6/db-load.js
- scripts/verify-phase103-db-performance.ps1

## Files to Modify
- apps/api/src/platform/pg/pg-db.ts (timeout config, pool metrics)
- apps/api/src/platform/pg/pg-migrate.ts (migration v6)
- apps/api/src/platform/pg/pg-schema.ts (partition annotations)
- apps/api/src/routes/admin-payer-db-routes.ts (idempotency middleware)
- scripts/verify-latest.ps1
