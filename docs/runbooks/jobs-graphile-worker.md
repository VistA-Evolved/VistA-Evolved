# Jobs -- Graphile Worker Runbook

> Phase 116: Postgres Job Queue + Job Governance

## Overview

VistA-Evolved uses [Graphile Worker](https://worker.graphile.org/) (MIT) as its
durable PG-backed job queue. All background processing (eligibility polling,
claim status checks, evidence scans, retention cleanup) runs through this system.

**Key properties:**
- At-least-once delivery semantics
- PG-transactional job creation
- Cron scheduling for recurring jobs
- PHI structurally excluded from all job payloads

## Architecture

```
                  +------------------+
                  |   API Server     |
                  |  (index.ts)      |
                  |                  |
                  |  Embedded mode:  |
                  |  JOB_WORKER_     |
                  |  ENABLED=true    |
                  +--------+---------+
                           |
       OR                  |  getPgPool()
                           v
+------------------+   +-------------------+
| Worker Process   |-->| PostgreSQL        |
| (pnpm api:worker)|   | graphile_worker   |
|                  |   | schema (auto)     |
| Standalone mode  |   |                   |
+------------------+   | job_run_log table |
                        | (Phase 116)      |
                        +-------------------+
```

## Running

### Embedded Mode (alongside API)

Set `JOB_WORKER_ENABLED=true` in `.env.local`. The API starts an embedded
Graphile Worker runner after PG init:

```bash
# .env.local
PLATFORM_PG_URL=postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform
JOB_WORKER_ENABLED=true
JOB_WORKER_CONCURRENCY=5
```

```powershell
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

### Standalone Worker Mode

For production, run the worker as a separate process:

```powershell
cd apps/api
pnpm worker
# or: npx tsx --env-file=.env.local src/jobs/worker-entrypoint.ts
```

This starts only the job processor without the HTTP server.

## Registered Jobs

| Job Name | Default Cron | Concurrency | Description |
|----------|-------------|-------------|-------------|
| `eligibility_check_poll` | `*/5 * * * *` (5 min) | 2 | Polls pending eligibility checks via payer adapters |
| `claim_status_poll` | `*/10 * * * *` (10 min) | 2 | Polls pending claim status checks |
| `evidence_staleness_scan` | `0 2 * * *` (daily 2AM) | 1 | Flags stale evidence entries for re-verification |
| `retention_cleanup` | `0 3 * * *` (daily 3AM) | 1 | Purges expired sessions, idempotency keys, old job logs |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JOB_WORKER_ENABLED` | `false` | Enable embedded worker in API process |
| `JOB_WORKER_CONCURRENCY` | `5` | Number of concurrent jobs |
| `JOB_WORKER_SCHEMA` | `graphile_worker` | PG schema for graphile-worker tables |
| `JOB_WORKER_POLL_INTERVAL` | `2000` | Poll interval (ms) for new jobs |
| `JOB_CONCURRENCY_<NAME>` | (per-job) | Override concurrency per job type |
| `JOB_CRON_<NAME>` | (per-job) | Override cron schedule; `disabled` to turn off |

### Disabling a Cron Job

```bash
JOB_CRON_RETENTION_CLEANUP=disabled
```

### Overriding Schedule

```bash
JOB_CRON_ELIGIBILITY_CHECK_POLL="0 */15 * * *"  # every 15 min
```

## PHI Safety

Job payloads are structurally prevented from containing PHI:

1. **Zod schemas** define only non-PHI fields (opaque IDs, counts, flags)
2. **PHI blocklist** (`PHI_BLOCKED_FIELDS`) rejects payloads with fields like
   `patientName`, `ssn`, `dateOfBirth`, `address`, etc.
3. **Error redaction** strips SSN patterns, dates, and names from error messages
   before logging to `job_run_log`
4. **Recursive check** scans nested objects for PHI fields

## Admin Endpoints

All require admin session:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/jobs/status` | GET | Runner status + registered jobs with cron/concurrency |
| `/admin/jobs/runs` | GET | Recent job run log entries (paginated, filterable) |
| `/admin/jobs/trigger` | POST | Manually trigger a job with custom payload |

### Example: Check status

```bash
curl http://127.0.0.1:3001/admin/jobs/status
```

### Example: Manual trigger

```bash
curl -X POST http://127.0.0.1:3001/admin/jobs/trigger \
  -H 'Content-Type: application/json' \
  -d '{"jobName":"retention_cleanup","payload":{"dryRun":true}}'
```

### Example: Query run log

```bash
curl 'http://127.0.0.1:3001/admin/jobs/runs?jobName=retention_cleanup&limit=10'
```

## Database

### job_run_log Table (PG migration v8)

```sql
CREATE TABLE job_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  graphile_job_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  tenant_id TEXT NOT NULL DEFAULT 'default',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  error_redacted TEXT
);
```

### Graphile Worker Tables

Graphile Worker auto-creates its schema (`graphile_worker`) on first run.
Tables include `_private_jobs`, `_private_job_queues`, `_private_known_crontabs`.
Do not modify these manually.

## Troubleshooting

### Worker won't start
- Check `PLATFORM_PG_URL` is set and PG is reachable
- Run `docker compose -f services/platform-db/docker-compose.yml up -d`
- Check PG logs: `docker logs ve-platform-db`

### Jobs stuck in processing
- Graphile Worker has built-in stale job recovery (default 4h)
- Check `graphile_worker._private_jobs` for locked_at timestamps
- Restart worker to release locks

### Cron jobs not firing
- Verify `JOB_CRON_<NAME>` isn't set to `disabled`
- Check runner is active: `GET /admin/jobs/status`
- Graphile Worker backfills missed runs on startup (backfillPeriod: 0 = disabled)

## Verification

```powershell
.\scripts\verify-phase116-job-queue.ps1
```

Expected: 31 gates, all PASS.
