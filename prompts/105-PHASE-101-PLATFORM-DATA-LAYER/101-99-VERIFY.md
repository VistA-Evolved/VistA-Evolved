# Phase 101 — Platform Data Architecture Convergence (VERIFY)

## Verification Script
```powershell
.\scripts\verify-phase101-platform-data-layer.ps1 -Verbose
```

## Gates (by section)

### Section 1: Architecture Documentation (12 gates)
- Persistence inventory doc exists
- Inventory: SQLite, In-memory, JSONL, Migration sections
- Architecture doc exists
- Architecture: data boundary, tenancy, audit, idempotency, outbox, migration strategy

### Section 2: Docker Compose (8 gates)
- Compose file exists, postgres:16, port 5433, healthcheck, named volume
- Init SQL exists, uuid-ossp, pgcrypto, RLS helper

### Section 3: PlatformStore Module (25 gates)
- All 7 PG module files exist
- pg-db: imports, Pool, closePgDb, pgHealthCheck, isPgConfigured
- pg-schema: pg-core, 3 core tables, payer table, tenant_id, eligibility, claim status
- pg-migrate: versioned migrations, transactions, RLS
- tenant-context: createTenantContext, SQL injection, set_config, transaction
- tenant-middleware: registerTenantHook, X-Tenant-Id, default fallback

### Section 4: Wiring (9 gates)
- index.ts: initPlatformPg, isPgConfigured, pgHealthCheck imports + calls
- security.ts: closePgDb import + shutdown call
- .env.example: all 4 platform PG env vars

### Section 5: Package Dependencies (4 gates)
- pg, @types/pg, drizzle-orm, better-sqlite3 all in package.json

### Section 6: No Breaking Changes (7 gates)
- All SQLite files intact (db.ts, schema.ts, migrate.ts, init.ts, seed.ts, repo/)
- Platform barrel exports both SQLite and Postgres

### Section 7: Health Endpoint (2 gates)
- /health includes platformPg object
- Version string updated to phase-101

### Section 8: TypeScript Build (1 gate)
- tsc --noEmit passes cleanly

### Section 9: Docker Postgres (optional, 2 gates)
- Container running + accepts connections
- Skippable with -SkipDocker

## Expected Totals
- ~70 gates total
- PASS threshold: 100% for non-Docker gates
- Docker gates are optional (WARN if skipped)

## Manual Verification
```powershell
# 1. Start Postgres
docker compose -f services/platform-db/docker-compose.yml up -d

# 2. Start API with Postgres enabled
cd apps/api
$env:PLATFORM_PG_URL = "postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform"
npx tsx --env-file=.env.local src/index.ts

# 3. Check health
curl http://127.0.0.1:3001/health
# Should include: "platformPg": { "configured": true, "ok": true, "latencyMs": <N> }

# 4. Check migrations applied
docker exec ve-platform-db psql -U ve_api -d ve_platform -c "SELECT * FROM _platform_migrations ORDER BY version;"

# 5. Check tables created
docker exec ve-platform-db psql -U ve_api -d ve_platform -c "\dt"
```
