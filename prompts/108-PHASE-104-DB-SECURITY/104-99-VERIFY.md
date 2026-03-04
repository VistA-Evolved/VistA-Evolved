# Phase 104 v2 -- VERIFY: Platform DB Security/Compliance Posture

## Verification Gates

### Migration v7

- [ ] Migration v7 exists in pg-migrate.ts
- [ ] Version column added to mutable tables
- [ ] FORCE ROW LEVEL SECURITY in RLS function
- [ ] create_tenant_rls_policy function defined

### Access Controls

- [ ] Admin role enforced on /admin/payer-db/\* routes
- [ ] requireRole called in preHandler or route handler
- [ ] Tenant scoping in PG repos

### Audit

- [ ] audit-integrity.ts exists
- [ ] Audit chain verification function exported
- [ ] Audit export function exported
- [ ] GET /admin/payer-db/audit/verify endpoint exists
- [ ] GET /admin/payer-db/audit/export endpoint exists

### TLS

- [ ] pg-db.ts supports PLATFORM_PG_SSL env var
- [ ] SSL config passed to Pool constructor

### Secrets

- [ ] Pre-commit hook scans for credential patterns
- [ ] No PROV123 outside login page
- [ ] No PHI patterns in log statements

### Docs

- [ ] docs/architecture/platform-db-security.md exists
- [ ] Retention policy documented
- [ ] TLS configuration documented
- [ ] RLS considerations documented

### Build

- [ ] TypeScript clean (npx tsc --noEmit)
- [ ] No new lint errors

## Run

```powershell
.\scripts\verify-phase104-db-security.ps1
```
