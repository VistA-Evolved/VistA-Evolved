# Platform PostgreSQL — Dev Setup Runbook

> Phase 101 v2 — Production-grade platform data layer

## Prerequisites

- Docker Desktop (or Docker Engine + Compose V2)
- Node.js 20+
- pnpm

## 1. Start the Database

```powershell
cd services/platform-db
docker compose up -d
```

This starts PostgreSQL 16 on **port 5433** (non-default to avoid conflicts).

### Verify it's running

```powershell
docker compose -f services/platform-db/docker-compose.yml ps
# Should show ve-platform-db as healthy

# Connect directly
psql -h 127.0.0.1 -p 5433 -U ve_api -d ve_platform
# Password: ve_dev_only_change_in_prod (dev default)
```

## 2. Configure the API

Copy the example env if you haven't already:

```powershell
cp apps/api/.env.example apps/api/.env.local
```

Add (or uncomment) these lines in `.env.local`:

```dotenv
# Platform DB (Phase 101)
PLATFORM_PG_URL=postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform
PLATFORM_PG_POOL_MIN=2
PLATFORM_PG_POOL_MAX=10
```

## 3. Run Migrations

Migrations run automatically on API startup. To run manually:

```powershell
cd apps/api
npx tsx --env-file=.env.local src/platform/pg/run-migrations.ts
```

## 4. Verify

```powershell
# After starting the API
curl http://127.0.0.1:3001/health
# Should include "platformPg": { "configured": true, "ok": true }
```

## 5. Connection Details

| Setting  | Dev Default                  | Production                     |
| -------- | ---------------------------- | ------------------------------ |
| Host     | 127.0.0.1                    | RDS/Aurora endpoint            |
| Port     | 5433                         | 5432                           |
| Database | ve_platform                  | ve_platform                    |
| User     | ve_api                       | ve_api (IAM auth recommended)  |
| Password | `ve_dev_only_change_in_prod` | From secrets manager           |
| SSL      | Off                          | `sslmode=require`              |
| Pool min | 2                            | 2                              |
| Pool max | 10                           | 20                             |
| RLS      | Off                          | `PLATFORM_DB_RLS_ENABLED=true` |

## 6. Troubleshooting

### Port conflict

If port 5433 is taken, edit `services/platform-db/docker-compose.yml` and
update `PLATFORM_PG_URL` in `.env.local` accordingly.

### Reset database

```powershell
docker compose -f services/platform-db/docker-compose.yml down -v
docker compose -f services/platform-db/docker-compose.yml up -d
```

### View logs

```powershell
docker logs ve-platform-db -f
```

### RLS debugging

If RLS is enabled and queries return empty:

1. Check that `SET app.current_tenant_id` is being called per-connection
2. Verify the tenant_id value matches what's in the table
3. Disable RLS temporarily: `PLATFORM_PG_RLS_ENABLED=false`
