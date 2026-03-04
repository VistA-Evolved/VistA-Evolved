# Phase 122 Runbook: Multi-Tenancy Isolation

## Overview

Phase 122 enforces tenant isolation at two layers:

1. **PG Row Level Security (RLS)** — auto-enabled in production
2. **SQLite application-layer guards** — `requireTenantId()` + `assertTenantMatch()`

## Architecture

### PG RLS (Production)

- `applyRlsPolicies()` in `pg-migrate.ts` auto-enables when `PLATFORM_PG_URL` is set AND `NODE_ENV=production`
- Explicit `PLATFORM_PG_RLS_ENABLED=true|false` overrides auto-detection
- Uses `SET LOCAL app.current_tenant_id` for transaction-scoped isolation
- Covers 25 PG tables via `create_tenant_rls_policy()` SQL function

### SQLite Guards (All Environments)

- `requireTenantId(tenantId, context?)` — validates non-empty, throws `TenantIsolationError` (403)
- `assertTenantMatch(row, tenantId, context?)` — verifies row belongs to expected tenant
- `TENANT_SCOPED_TABLES` — 30+ tables that require tenant guards
- `GLOBAL_TABLES` — 3 tables exempt from tenant scoping

### Tenant-Scoped Queries

- `findClaimByIdForTenant()`, `updateClaimForTenant()`
- `findRemittanceByIdForTenant()`, `updateRemittanceForTenant()`
- `findClaimCaseByIdForTenant()`, `updateClaimCaseForTenant()`
- `findWorkItemByIdForTenant()`, `updateWorkItemForTenant()`

## Posture Endpoint

```
GET /admin/tenant-posture
```

Returns:

```json
{
  "pgEnabled": false,
  "rlsEnabled": false,
  "enforcementMode": "app_guard",
  "score": 8,
  "gates": [...],
  "rlsTables": [],
  "timestamp": "..."
}
```

`enforcementMode` values:

- `"rls"` — PG + all tables covered
- `"app_guard"` — SQLite guards active
- `"none"` — no enforcement

## CI Gate (G11)

Runs in `rc` and `full` gauntlet suites:

```bash
node qa/gauntlet/cli.mjs --suite rc
```

Checks:

1. `tenant-guard.ts` exists with required exports
2. `tenant-scoped-queries.ts` exists with >= 2 wrappers
3. `TENANT_SCOPED_TABLES` covers critical tables
4. Barrel exports present
5. PG RLS table list present
6. Auto-enable logic present
7. Tenant isolation tests pass
8. Posture endpoint exists

Strict mode (--strict) additionally checks repo files for unguarded DB queries.

## Environment Variables

| Variable                  | Default | Description                                                   |
| ------------------------- | ------- | ------------------------------------------------------------- |
| `PLATFORM_PG_RLS_ENABLED` | (auto)  | `true`=force on, `false`=force off, unset=auto                |
| `PLATFORM_PG_URL`         | —       | PG connection string (triggers RLS auto-enable in production) |
| `NODE_ENV`                | —       | `production` enables RLS auto-enable                          |

## Testing

```bash
# Unit tests
cd apps/api && pnpm exec vitest run tests/tenant-isolation.test.ts

# G11 gate via gauntlet
node qa/gauntlet/cli.mjs --suite rc
```

## Migration Path

1. **Immediate**: Guards enforce at app layer for all tenant-scoped repos
2. **Next**: Add `tenant_id` column to 8 tables lacking it
3. **Later**: Expand PG RLS to cover Phase 115+ tables
4. **Future**: Enable G11 strict mode after full adoption
