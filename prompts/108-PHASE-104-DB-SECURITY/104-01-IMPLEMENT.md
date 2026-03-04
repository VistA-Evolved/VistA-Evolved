# Phase 104 v2 -- IMPLEMENT: Platform DB Security/Compliance Posture

## Goal

Harden PlatformStore against PHI leaks and multi-tenant breaches.
Security engineer + compliance-minded architecture pass.

## Steps

### 1. Access Controls

- Ensure all platform DB access is tenant-scoped and role-checked
- Add admin-only bypass only where necessary and auditable
- Add explicit `requireRole(session, ["admin"])` in admin-payer-db-routes preHandler
- Ensure PG repos honor tenant scoping in all queries

### 2. Audit Controls

- Ensure audit trail is append-only and tamper-evident (application-level)
- Add audit chain verification endpoint (GET /admin/payer-db/audit/verify)
- Add audit export endpoint (GET /admin/payer-db/audit/export)
- Document retention + export policy

### 3. Integrity

- Add `version` column to mutable tables (payer, tenant_payer, payer_capability, payer_task)
- Add optimistic concurrency check on updates (WHERE version = $expected)
- Migration v7: ALTER TABLE ADD COLUMN version

### 4. Transmission Security Posture

- Ensure pg-db.ts supports TLS via PLATFORM_PG_SSL env var
- Document TLS configuration in architecture doc

### 5. Optional Row-Level Security

- Create `create_tenant_rls_policy()` PG function in migration if not exists
- Add FORCE ROW LEVEL SECURITY to all tenant tables
- Gated behind PLATFORM_PG_RLS_ENABLED=true
- Document FORCE ROW LEVEL SECURITY considerations

### 6. Secrets

- Ensure no secrets in git, no PHI in logs
- Strengthen pre-commit secret scanner to detect credential patterns
- Add PHI pattern detection to audit sanitizer

## Deliverables

- docs/architecture/platform-db-security.md
- apps/api/src/platform/pg/audit-integrity.ts
- Migration v7 in pg-migrate.ts
- pg-db.ts TLS support
- admin-payer-db-routes.ts: role enforcement + audit endpoints
- Pre-commit hook: secret scanner rules
- scripts/verify-phase104-db-security.ps1
- Prompt file, ops artifacts

## Files Touched

- apps/api/src/platform/pg/pg-migrate.ts (migration v7)
- apps/api/src/platform/pg/pg-db.ts (TLS config)
- apps/api/src/platform/pg/audit-integrity.ts (NEW)
- apps/api/src/platform/pg/index.ts (barrel export)
- apps/api/src/platform/pg/repo/payer-repo.ts (optimistic concurrency)
- apps/api/src/routes/admin-payer-db-routes.ts (role enforcement + endpoints)
- .hooks/pre-commit.ps1 (secret scanner)
- docs/architecture/platform-db-security.md (NEW)
- scripts/verify-phase104-db-security.ps1 (NEW)
- scripts/verify-latest.ps1 (delegate to Phase 104)
- ops/summary.md, ops/notion-update.json
