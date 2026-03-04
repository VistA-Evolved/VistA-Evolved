# Phase 116 — IMPLEMENT: Postgres Job Queue (Graphile Worker) + Job Governance

## User Request

Introduce a durable job runner for: eligibility polling, claim status polling,
evidence refresh checks, scheduled reports, cleanup/retention tasks.

## Implementation Steps

1. Add `graphile-worker` (MIT) dependency to `apps/api/package.json`
2. Create `apps/api/src/jobs/` module:
   - `registry.ts` — typesafe job name registry + zod payload schemas (NO PHI enforcement)
   - `runner.ts` — thin wrapper around graphile-worker `run()` with PG pool
   - `worker-entrypoint.ts` — standalone CLI entry for `pnpm api:worker`
   - `governance.ts` — PHI validation, run logging, concurrency config
3. Add `job_run_log` table to PG schema (`pg-migrate.ts`) + repo
4. Implement 4 initial job task functions:
   - `eligibility-check-poll.ts` — reads pending eligibility checks, invokes adapter
   - `claim-status-poll.ts` — reads pending claim status checks, invokes adapter
   - `evidence-staleness-scan.ts` — scans evidence registry for stale items
   - `retention-cleanup.ts` — purges expired sessions, idempotency keys, stale data
5. Wire `pnpm api:worker` script in `apps/api/package.json`
6. Create `scripts/verify-phase116-job-queue.ps1` verifier
7. Create `docs/runbooks/jobs-graphile-worker.md` runbook

## Verification Steps

- `npx tsc --noEmit` clean
- Phase 116 verifier passes all gates
- No PHI in job payload schemas (zod enforced)
- Worker entrypoint can be imported without errors
- Job run log table DDL correct
- All 4 job task functions importable + type-safe

## Files Touched

- `apps/api/package.json` — add graphile-worker dep
- `apps/api/src/jobs/registry.ts` (new)
- `apps/api/src/jobs/runner.ts` (new)
- `apps/api/src/jobs/worker-entrypoint.ts` (new)
- `apps/api/src/jobs/governance.ts` (new)
- `apps/api/src/jobs/tasks/eligibility-check-poll.ts` (new)
- `apps/api/src/jobs/tasks/claim-status-poll.ts` (new)
- `apps/api/src/jobs/tasks/evidence-staleness-scan.ts` (new)
- `apps/api/src/jobs/tasks/retention-cleanup.ts` (new)
- `apps/api/src/jobs/index.ts` (new barrel)
- `apps/api/src/platform/pg/pg-migrate.ts` — add job_run_log DDL
- `scripts/verify-phase116-job-queue.ps1` (new)
- `docs/runbooks/jobs-graphile-worker.md` (new)
- `prompts/119-PHASE-116-JOB-QUEUE/116-01-IMPLEMENT.md` (this file)
- `prompts/119-PHASE-116-JOB-QUEUE/116-99-VERIFY.md`
