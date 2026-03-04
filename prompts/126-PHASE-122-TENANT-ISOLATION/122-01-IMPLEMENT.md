# Phase 122 — IMPLEMENT: Multi-Tenancy Isolation (PG RLS + SQLite Guards)

## Mission

Make tenant isolation enforceable by default in production posture.

- PG mode: RLS ON by default for production.
- SQLite mode: strict tenant guards in repos and route boundaries.
- No cross-tenant data leakage acceptable.

## Constraints

- Do NOT rewrite auth.
- Do NOT add feature scope.
- Focus: isolation + tests + posture defaults.

## Steps

### Step 1 — Tenant context enforcement

- Audit all route groups: /rcm, /portal, /telehealth, /imaging, /admin
- Ensure each request has explicit tenant context
- Missing tenant = fail CLOSED (401/403) except global endpoints

### Step 2 — PG RLS posture

- PLATFORM_PG_RLS_ENABLED defaults TRUE when PLATFORM_PG_URL + NODE_ENV=production
- /admin/tenant-posture endpoint: pgEnabled, rlsEnabled, enforcementMode

### Step 3 — SQLite tenant isolation guardrails

- Shared `requireTenantId()` repo base helper
- All reads/writes filter by tenant_id
- Tenant leakage test

### Step 4 — CI enforcement gate

- tenant-isolation-gate in gauntlet
- Fails if PG prod mode has RLS off
- Fails if repo exposes unscoped query

### Step 5 — System audit update

## Files touched

- apps/api/src/platform/db/repo/tenant-guard.ts (NEW)
- apps/api/src/posture/tenant-posture.ts (MODIFIED)
- apps/api/src/platform/pg/pg-migrate.ts (MODIFIED)
- qa/gauntlet/gates/g11-tenant-isolation.mjs (NEW)
- qa/gauntlet/cli.mjs (MODIFIED)
- Multiple repos with tenant-id guards added
