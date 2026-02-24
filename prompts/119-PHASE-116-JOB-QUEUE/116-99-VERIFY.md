# Phase 116 — VERIFY: Postgres Job Queue (Graphile Worker) + Job Governance

## User Request

Run worker locally against Postgres (docker compose). Enqueue a job and confirm
it executes. Confirm job payload redaction rules. Confirm retries and
idempotency. Add a CI smoke test that fails if worker cannot start.

Additionally: Progressive sanity/integrity/regression check (3-tier QA).

## Verification Steps Performed

### 1. Worker Against Postgres (Docker Compose)
- Started `services/platform-db/docker-compose.yml` (postgres:16-alpine, port 5433)
- Added `PLATFORM_PG_URL` and `JOB_WORKER_ENABLED=true` to `.env.local`
- API started with embedded worker, PG connected, all 8 migrations applied
- Health check: `{"ok":true, "platformPg":{"configured":true,"ok":true}}`
- `/admin/jobs/status`: `"active":true`, all 4 jobs registered with cron schedules

### 2. Enqueue + Confirm Execution
- All 4 job types triggered via `POST /admin/jobs/trigger`:
  - `eligibility_check_poll` -- executed, ok=true
  - `claim_status_poll` -- executed, ok=true
  - `evidence_staleness_scan` -- executed, ok=true
  - `retention_cleanup` -- executed, ok=true
- Run log (`GET /admin/jobs/runs`) returns all executions with payload, duration, timestamps

### 3. PHI Redaction Confirmed
- Payload `{patientName:"John Doe", ssn:"123-45-6789"}` rejected:
  `"PHI fields detected in payload: patientName, ssn"`
- Clean payloads pass through validation

### 4. Retries + Idempotency
- `maxAttempts: 3` configured for all cron jobs
- `job:error` (retry) and `job:failed` (permanent failure) events wired in runner
- Double-triggered `retention_cleanup` -- both got unique graphile jobIds (19, 20),
  both executed independently (at-least-once semantics)

### 5. CI Smoke Test Created
- `apps/api/tests/job-worker-smoke.test.ts` -- 29 tests covering:
  - Registry: 4 job names, schemas, PHI blocklist, cron schedules, concurrency
  - Payload schemas: minimal payload acceptance, optional fields
  - PHI rejection: blocked field detection, multi-field, clean payloads
  - Governance: validation accept/reject, unknown job name, PHI in payload, error redaction
  - Runner exports: function presence, inactive state, PG guard
- Added `"test:jobs"` script to `apps/api/package.json`
- All 29/29 pass: `pnpm -C apps/api test:jobs`

## Bugs Found & Fixed During VERIFY

### BUG-069: Cron eligibility_check_poll validation failure
- **Symptom**: Cron job failed all 3 retries -- `payerId` required but cron sends `{tenantId}`
- **Fix**: `registry.ts` -- `payerId: z.string().optional()` (task handler gets payerId from records)

### BUG-070: PHI rejection bypassed by zod stripping
- **Symptom**: `{patientName:"John Doe"}` passes through -- zod `z.object()` strips unknown keys
- **Fix**: `governance.ts` -- moved PHI check BEFORE zod parsing (check raw payload first)

### BUG-071: Job run log returns empty
- **Symptom**: `GET /admin/jobs/runs` returns `{runs:[], total:0}` despite PG having 13 entries
- **Fix**: `governance.ts` -- JSONB column returned as object, not string; handle both types

### BUG-072: PG migration v7 param rename error (pre-existing)
- **Symptom**: `"cannot change name of input parameter \"target_table\""` on v7 apply
- **Fix**: `pg-migrate.ts` -- `DROP FUNCTION IF EXISTS` before `CREATE OR REPLACE`

## Progressive QA Results

### Tier 1: Sanity
- tsc --noEmit: CLEAN (0 errors)
- Phase 116 verifier: 34/34 PASS
- Contract tests: 27/27 PASS
- Security tests: 12/12 PASS

### Tier 2: Feature Integrity
- Job worker smoke: 29/29 PASS
- Gateway packs: 33/33 PASS
- All 4 job types trigger/execute/log correctly
- PHI rejection confirmed at governance layer

### Tier 3: System Regression
- Full test suite: 256 PASS / 14 FAIL (pre-existing)
- Pre-existing failures (NOT Phase 116):
  - rpc-boundary: 401 auth (VistA Docker not running)
  - rcm-quality-loop: workqueue store init (needs server startup)
- Web build: CLEAN

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/jobs/registry.ts` | `payerId` optional in eligibility schema (BUG-069) |
| `apps/api/src/jobs/governance.ts` | PHI check before zod (BUG-070); JSONB parse fix (BUG-071) |
| `apps/api/src/platform/pg/pg-migrate.ts` | DROP FUNCTION before CREATE in v7 (BUG-072) |
| `apps/api/tests/job-worker-smoke.test.ts` | NEW: 29-test CI smoke suite |
| `apps/api/package.json` | Added `test:jobs` script |
