# Payer Registry Persistence -- Runbook

> Phase 102: Migrate Prototype Stores to PlatformStore

## Overview

The Payer Registry subsystem supports two persistence backends:

| Backend        | When Used                             | Notes                                     |
| -------------- | ------------------------------------- | ----------------------------------------- |
| **SQLite**     | Default when PG is not configured     | Synchronous, single-file, zero-config     |
| **PostgreSQL** | When `PLATFORM_PG_*` env vars are set | Async, multi-tenant RLS, production-grade |

The **store resolver** (`apps/api/src/platform/store-resolver.ts`) automatically
selects the correct backend at runtime based on `isPgConfigured()`.

## Architecture

```
admin-payer-db-routes.ts
        |
        v
  store-resolver.ts  (Proxy -- re-evaluates on each access)
        |
  +-----------+-----------+
  |                       |
  v                       v
SQLite repos           PG repos
(db/repo/*.ts)         (pg/repo/*.ts)
  sync                   async
```

All route handlers use `await` on every repo call. When SQLite is active, the
store resolver wraps sync returns in `Promise.resolve()`.

## Repos Migrated

| Repo                 | SQLite Source                  | PG Source                           |
| -------------------- | ------------------------------ | ----------------------------------- |
| payerRepo            | `db/repo/payer-repo.ts`        | `pg/repo/payer-repo.ts`             |
| auditRepo            | `db/repo/audit-repo.ts`        | `pg/repo/audit-repo.ts`             |
| capabilityRepo       | `db/repo/capability-repo.ts`   | `pg/repo/capability-repo.ts`        |
| taskRepo             | `db/repo/task-repo.ts`         | `pg/repo/task-repo.ts`              |
| evidenceRepo         | `db/repo/evidence-repo.ts`     | `pg/repo/evidence-repo.ts`          |
| tenantPayerRepo      | `db/repo/tenant-payer-repo.ts` | `pg/repo/tenant-payer-repo.ts`      |
| capabilityMatrixRepo | in-memory Map                  | `pg/repo/capability-matrix-repo.ts` |

## New PG Tables (Migration v5)

- `capability_matrix_cell` -- payer x capability grid with maturity tracking
- `capability_matrix_evidence` -- evidence attachments per matrix cell

## Checking Active Backend

```bash
curl http://localhost:3001/admin/payer-db/backend
# Returns: {"backend":"pg","pgHealthy":true} or {"backend":"sqlite"}
```

The RCM admin UI shows a green "PostgreSQL" or gray "SQLite" badge in the header.

## PG Seed Loader

On PG initialization, `pgSeedFromJsonFixtures()` reads `data/payers/*.json` and
idempotently inserts payer records that don't already exist. It:

- Strips UTF-8 BOM (PowerShell-generated files)
- Skips `registry-db.json` and `tenant-overrides.json`
- Logs inserted/skipped counts

## Switching Backends

### Enable PostgreSQL

Set these env vars in `apps/api/.env.local`:

```
PLATFORM_PG_HOST=localhost
PLATFORM_PG_PORT=5433
PLATFORM_PG_DATABASE=ve_platform
PLATFORM_PG_USER=ve_admin
PLATFORM_PG_PASSWORD=<your-password>
```

Start the PG container:

```bash
cd services/platform-db
docker compose up -d
```

Restart the API. The store resolver will detect PG and switch automatically.

### Revert to SQLite

Remove or comment out `PLATFORM_PG_*` env vars and restart. No data loss --
SQLite database file persists independently.

## Troubleshooting

| Symptom                                              | Cause                                     | Fix                                              |
| ---------------------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Badge shows "SQLite" despite PG env vars             | PG pool failed to connect                 | Check container is running, port 5433 accessible |
| `/admin/payer-db/backend` returns `pgHealthy: false` | PG health check failed                    | Run `docker logs ve-platform-db`                 |
| Seed shows 0 inserted, 0 skipped                     | No JSON files in `data/payers/`           | Verify files exist (us_core.json, ph_hmos.json)  |
| Migration v5 error                                   | Tables already exist from manual creation | Migrations are idempotent -- safe to re-run      |
