# Phase 107 -- Production Posture Pack (IMPLEMENT)

## User Request

Add enterprise SaaS hardening gates: audit integrity, tenant isolation posture,
backups/restore, performance gates, and observability.

## Implementation Steps

### 1. Observability Posture Audit

- Create `apps/api/src/posture/observability-posture.ts` — verifies structured
  logging, request IDs, metrics endpoint, tracing hooks all present at runtime
- Exposes `GET /posture/observability` (admin-only) with live gate results

### 2. Backup/Restore Tooling

- Create `scripts/backup-restore.mjs` — SQLite snapshot + PG pg_dump wrapper
- Create `scripts/restore-from-backup.mjs` — restores from snapshot
- Document all persistent + in-memory stores in runbook

### 3. Tenant Isolation — RLS Activation

- Add PG migration v10 in `pg-migrate.ts` — applies `create_tenant_rls_policy()`
  to all 21 tenant-scoped tables
- Add `GET /posture/tenant-isolation` (admin-only) — verifies RLS is active,
  tenant context is set per-request, and no cross-tenant leakage paths exist
- Create `apps/api/src/posture/tenant-posture.ts`

### 4. Performance Gates

- Create `apps/api/src/posture/perf-posture.ts` — validates budgets loaded,
  rate limiter active, SLO recording enabled
- Exposes `GET /posture/performance` (admin-only)

### 5. Unified Posture Endpoint

- Create `apps/api/src/posture/index.ts` — aggregates all posture checks
- Exposes `GET /posture` (admin-only) — returns all gate results
- Register routes in `index.ts`

### 6. QA Gate: qa:prod-posture

- Add `prod-posture` suite to `scripts/qa-runner.mjs`
- Create `scripts/qa-gates/prod-posture.mjs` — offline posture checks (no server)
- Add `"qa:prod-posture"` script to root `package.json`

### 7. Runbook

- `docs/runbooks/phase107-production-posture.md`

### 8. Verifier

- `scripts/verify-phase107-prod-posture.ps1`
- Update `scripts/verify-latest.ps1`

## Verification Steps

- Run `scripts/verify-phase107-prod-posture.ps1` — all gates PASS
- Run `pnpm qa:prod-posture` — PASS
- TypeScript compiles (both apps/api and apps/web)

## Files Touched

- `apps/api/src/posture/observability-posture.ts` (NEW)
- `apps/api/src/posture/tenant-posture.ts` (NEW)
- `apps/api/src/posture/perf-posture.ts` (NEW)
- `apps/api/src/posture/backup-posture.ts` (NEW)
- `apps/api/src/posture/index.ts` (NEW)
- `apps/api/src/platform/pg/pg-migrate.ts` (MODIFIED — add migration v10)
- `apps/api/src/index.ts` (MODIFIED — register posture routes)
- `scripts/backup-restore.mjs` (NEW)
- `scripts/qa-runner.mjs` (MODIFIED — add prod-posture suite)
- `scripts/qa-gates/prod-posture.mjs` (NEW)
- `scripts/verify-phase107-prod-posture.ps1` (NEW)
- `scripts/verify-latest.ps1` (MODIFIED)
- `package.json` (MODIFIED — add qa:prod-posture)
- `docs/runbooks/phase107-production-posture.md` (NEW)
- `prompts/111-PHASE-107-PRODUCTION-POSTURE/107-01-IMPLEMENT.md` (NEW)
