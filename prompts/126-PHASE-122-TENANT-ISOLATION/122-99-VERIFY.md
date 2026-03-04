# Phase 122 — VERIFY: Multi-Tenancy Isolation (PG RLS + SQLite Guards)

## Gates

### Sanity

- [ ] Prompt folder: 126-PHASE-122-TENANT-ISOLATION has 122-01 + 122-99
- [ ] No /reports/ folder created
- [ ] artifacts/ gitignored

### Feature Integrity

- [ ] requireTenantId() helper exists and throws on missing/empty tenantId
- [ ] All NEEDS_GUARD repos wrap reads/writes with tenant check
- [ ] PG RLS defaults to TRUE when PLATFORM_PG_URL + NODE_ENV=production
- [ ] /admin/tenant-posture returns pgEnabled + rlsEnabled + enforcementMode
- [ ] Tenant leakage test: tenant A cannot read tenant B data

### Regression

- [ ] pnpm exec tsc --noEmit (api, web, portal): 0 errors
- [ ] pnpm qa:gauntlet:fast: no new failures
- [ ] Existing posture gates still pass

### CI Gate

- [ ] g11-tenant-isolation.mjs exists in gauntlet
- [ ] Gate detects unscoped repo functions
- [ ] Gate checks RLS posture alignment
