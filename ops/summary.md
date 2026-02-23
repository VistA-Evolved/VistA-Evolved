# Phase 104 v2 -- Platform DB Security/Compliance Posture (VERIFIED)

## What Changed

- **Migration v7**: version + updated_by columns on 5 mutable tables, `create_tenant_rls_policy()` PG function with FORCE RLS, `prevent_audit_mutation()` trigger function, append-only triggers on both audit tables
- **Audit integrity service**: `audit-integrity.ts` with hash-chain verification, PHI-sanitized export, configurable retention policy (395 day default)
- **TLS/SSL configuration**: `pg-db.ts` supports PLATFORM_PG_SSL (false/true/require/verify-ca/verify-full) with mutual TLS via CA/cert/key env vars
- **Optimistic concurrency**: `payer-repo.ts` accepts `expectedVersion` param, throws 409 CONCURRENCY_CONFLICT on mismatch, auto-increments version on update
- **Admin role enforcement**: All 8 mutation routes in `admin-payer-db-routes.ts` now call `requireSession` + `requireRole(session, ["admin"])` inside handler bodies
- **3 new audit endpoints**: GET audit/verify (chain integrity), GET audit/export (PHI-sanitized), GET audit/retention (policy config)
- **Secret scanner**: `.hooks/pre-commit.ps1` now scans staged files for credential patterns (PROV123, PHARM123, NURSE123, password=, api_key=, secret=)
- **Architecture doc**: `docs/architecture/platform-db-security.md` (9 sections, HIPAA compliance mapping)
- **BUG-067 fix**: Unauthenticated mutation requests no longer crash the server (ERR_HTTP_HEADERS_SENT). Auth gateway sets `_rejected` flag; downstream hooks check it.

## Verification Results

- **Verifier**: 73/73 gates PASS
- **TypeScript**: `npx tsc --noEmit` clean (0 errors)
- **Secret scan**: Clean (PROV123 only in session-store.ts comment, exempt)
- **Runtime tests**:
  - Health/ready/version: OK
  - Auth session: OK
  - Payer DB CRUD (57 payers): OK
  - Audit trail written on mutations: CONFIRMED
  - 3 new audit endpoints (retention/verify/export): OK
  - Unauthenticated PATCH: 401 (no crash) -- BUG-067 FIXED
  - Unauthenticated GET/POST/DELETE/PUT: 401 (no crash)
  - RCM/Analytics/Capabilities/Modules/Telehealth: OK
  - Prometheus metrics: OK

## Files Changed

### New Files (4)
- `apps/api/src/platform/pg/audit-integrity.ts` -- audit chain verification + export + retention
- `docs/architecture/platform-db-security.md` -- security architecture doc
- `prompts/108-PHASE-104-DB-SECURITY/104-01-IMPLEMENT.md` -- implement prompt
- `prompts/108-PHASE-104-DB-SECURITY/104-99-VERIFY.md` -- verify prompt

### Modified Files (7)
- `apps/api/src/platform/pg/pg-migrate.ts` -- migration v7 (version columns, RLS function, audit triggers)
- `apps/api/src/platform/pg/pg-db.ts` -- TLS/SSL configuration
- `apps/api/src/platform/pg/pg-schema.ts` -- version + updatedBy columns on 4 tables
- `apps/api/src/platform/pg/repo/payer-repo.ts` -- optimistic concurrency
- `apps/api/src/platform/pg/index.ts` -- barrel exports for audit-integrity
- `apps/api/src/routes/admin-payer-db-routes.ts` -- admin role enforcement + audit endpoints
- `.hooks/pre-commit.ps1` -- secret scanning

### Verification
- `scripts/verify-phase104-db-security.ps1` -- 60+ gates across 9 sections
- `scripts/verify-latest.ps1` -- updated to Phase 104

## How to Test

```powershell
.\scripts\verify-phase104-db-security.ps1
```

## Follow-ups
- Enable RLS in production with `PLATFORM_PG_RLS_ENABLED=true`
- Configure TLS with `PLATFORM_PG_SSL=verify-full` + CA cert in production
- Implement audit retention auto-purge when `PLATFORM_AUDIT_AUTO_PURGE=true`
- Add `expectedVersion` to remaining PATCH/PUT endpoints beyond payer
