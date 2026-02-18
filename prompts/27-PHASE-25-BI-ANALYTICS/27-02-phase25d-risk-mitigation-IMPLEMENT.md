# Phase 25D — Risk Mitigation (ETL Writer + Auth + Persistence)

## User Request
"Fix all the risks now too" — referring to 3 risks from the Phase 25 VERIFY final table:
1. Risk 1: Octo ETL writer not yet implemented
2. Risk 2: ROcto has no user auth configured
3. Risk 3: Analytics event buffer is in-memory only

## Implementation Steps

### Risk 1: ETL Writer (analytics-etl.ts)
- Created `PgSimpleClient`: minimal PG v3.0 wire protocol (net + crypto only)
- `bucketToInsert()` builds INSERT SQL from MetricBucket objects
- `syncBuckets()` INSERTs hourly + daily buckets (idempotent, suppresses duplicate key errors)
- `initEtl()` hooks into aggregator via `setOnBucketsCreated` callback
- Routes: GET `/analytics/etl/status`, POST `/analytics/etl/sync`
- Wired into startup (`initEtl`) and shutdown (`stopEtl`)

### Risk 2: ROcto User Auth (ZVEUSERS.m + octo.conf)
- Created `ZVEUSERS.m`: idempotent M routine for ROcto user creation
  - `etl_writer` (permissions=1, readwrite) for ETL INSERT
  - `bi_readonly` (permissions=0, readonly) for BI tools
  - MD5 password hashes in correct pg_authid pipe-delimited format
- Created `octo.conf`: custom config with `address = "0.0.0.0"` (Docker), MD5 auth
- Fixed `docker-compose.yml`: entrypoint with mupip rundown, octo seed, user creation

### Risk 3: Event Persistence (JSONL)
- Wired `pendingFlush.push(event)` into `recordAnalyticsEvent()` directly
- Flush timer writes JSONL to `data/analytics-events.jsonl` every 10s
- `restoreEventsFromFile()` on startup — events survive API restart

### Octo v1.1 Compatibility
- Replaced `TIMESTAMP` type with `VARCHAR(32)` in seed SQL (7 tables)
- Removed all `DEFAULT` clauses
- Removed SQL VIEWs (not critical for ETL, can add later)
- Removed `TIMESTAMP '...'` cast syntax from INSERT SQL

## Verification Steps
- `verify-latest.ps1` → 74/74 PASS, 0 FAIL (full Phase 22-25 regression)
- ETL status: `connected: true`, `errors: 0`
- ETL sync: `syncedH:2, syncedD:2, errors:0`
- Data verified in Octo: `SELECT * FROM analytics_hourly` returns 3 rows
- Event persistence: JSONL file created, events survive restart

## Files Touched
- `apps/api/src/services/analytics-etl.ts` (NEW)
- `apps/api/src/services/analytics-store.ts` (MODIFIED — pendingFlush wiring)
- `apps/api/src/services/analytics-aggregator.ts` (MODIFIED — onBucketsCreated callback)
- `apps/api/src/config/analytics-config.ts` (MODIFIED — eventFilePath, etlWriterPassword)
- `apps/api/src/routes/analytics-routes.ts` (MODIFIED — ETL endpoints)
- `apps/api/src/index.ts` (MODIFIED — initEtl on startup)
- `apps/api/src/middleware/security.ts` (MODIFIED — stopEtl on shutdown)
- `services/analytics/docker-compose.yml` (MODIFIED — full rewrite of entrypoint)
- `services/analytics/octo-seed.sql` (MODIFIED — Octo v1.1 compatibility)
- `services/analytics/octo.conf` (NEW)
- `services/analytics/ZVEUSERS.m` (NEW)
- `.gitignore` (MODIFIED — apps/api/data/)
- `AGENTS.md` (MODIFIED — gotchas 48-54, architecture map update)
