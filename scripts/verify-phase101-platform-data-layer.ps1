<#
.SYNOPSIS
  Phase 101 Verifier - Platform Data Architecture Convergence (Postgres-first)

.DESCRIPTION
  Validates all Phase 101 deliverables:
    - Architecture docs exist and contain required sections
    - Docker compose for Postgres exists
    - PlatformStore module files exist with correct exports
    - Env wiring is in place
    - No breaking changes to existing SQLite path
    - TypeScript compiles cleanly
    - Tenant safety guardrails present

.NOTES
  Run from repo root: .\scripts\verify-phase101-platform-data-layer.ps1
#>

param(
  [switch]$SkipDocker,
  [switch]$SkipBuild,
  [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$pass = 0
$fail = 0
$warn = 0
$results = @()

function Gate($name, $expr) {
  if ($expr) {
    $script:pass++
    $script:results += "PASS: $name"
    if ($Verbose) { Write-Host "  PASS: $name" -ForegroundColor Green }
  } else {
    $script:fail++
    $script:results += "FAIL: $name"
    Write-Host "  FAIL: $name" -ForegroundColor Red
  }
}

function Warn($name, $msg) {
  $script:warn++
  $script:results += "WARN: $name -- $msg"
  if ($Verbose) { Write-Host "  WARN: $name -- $msg" -ForegroundColor Yellow }
}

Write-Host "`n=== Phase 101 Verification: Platform Data Architecture ===" -ForegroundColor Cyan
Write-Host ""

# ─── Section 1: Architecture Documentation ───────────────────────
Write-Host "--- Section 1: Architecture Documentation ---" -ForegroundColor White

$inventoryDoc = "docs/architecture/platform-persistence-inventory.md"
Gate "Persistence inventory doc exists" (Test-Path -LiteralPath $inventoryDoc)
if (Test-Path -LiteralPath $inventoryDoc) {
  $inv = Get-Content $inventoryDoc -Raw
  Gate "Inventory doc: SQLite section" ($inv -match "SQLite")
  Gate "Inventory doc: In-memory section" ($inv -match "[Ii]n-[Mm]emory")
  Gate "Inventory doc: JSONL section" ($inv -match "JSONL")
  Gate "Inventory doc: migration priority" ($inv -match "[Mm]igration")
}

$archDoc = "docs/architecture/platform-data-architecture.md"
Gate "Architecture doc exists" (Test-Path -LiteralPath $archDoc)
if (Test-Path -LiteralPath $archDoc) {
  $arch = Get-Content $archDoc -Raw
  Gate "Architecture doc: data boundary" ($arch -match "[Dd]ata [Bb]oundary")
  Gate "Architecture doc: tenancy model" ($arch -match "[Tt]enan")
  Gate "Architecture doc: audit" ($arch -match "[Aa]udit")
  Gate "Architecture doc: idempotency" ($arch -match "[Ii]dempotency")
  Gate "Architecture doc: outbox" ($arch -match "[Oo]utbox")
  Gate "Architecture doc: migration strategy" ($arch -match "[Mm]igration")
}

# ─── Section 2: Docker Compose ───────────────────────────────────
Write-Host "--- Section 2: Docker Compose ---" -ForegroundColor White

$compose = "services/platform-db/docker-compose.yml"
Gate "Postgres compose file exists" (Test-Path -LiteralPath $compose)
if (Test-Path -LiteralPath $compose) {
  $dc = Get-Content $compose -Raw
  Gate "Compose: postgres:16" ($dc -match "postgres:16")
  Gate "Compose: port 5433" ($dc -match "5433")
  Gate "Compose: healthcheck" ($dc -match "pg_isready")
  Gate "Compose: named volume" ($dc -match "platform-pgdata")
}

$initSql = "services/platform-db/init.sql"
Gate "Init SQL exists" (Test-Path -LiteralPath $initSql)
if (Test-Path -LiteralPath $initSql) {
  $sql = Get-Content $initSql -Raw
  Gate "Init SQL: uuid-ossp extension" ($sql -match "uuid-ossp")
  Gate "Init SQL: pgcrypto extension" ($sql -match "pgcrypto")
  Gate "Init SQL: RLS helper function" ($sql -match "create_tenant_rls_policy")
}

$runbook = "docs/runbooks/platform-postgres-dev.md"
Gate "Dev runbook exists" (Test-Path -LiteralPath $runbook)

# ─── Section 3: PlatformStore Module ─────────────────────────────
Write-Host "--- Section 3: PlatformStore Module ---" -ForegroundColor White

$pgDir = "apps/api/src/platform/pg"
Gate "PG module directory exists" (Test-Path -LiteralPath $pgDir)

$pgFiles = @(
  "pg-db.ts",
  "pg-schema.ts",
  "pg-migrate.ts",
  "pg-init.ts",
  "tenant-context.ts",
  "tenant-middleware.ts",
  "index.ts"
)
foreach ($f in $pgFiles) {
  Gate "PG module: $f exists" (Test-Path -LiteralPath "$pgDir/$f")
}

# Check pg-db.ts content
$pgDb = "$pgDir/pg-db.ts"
if (Test-Path -LiteralPath $pgDb) {
  $content = Get-Content $pgDb -Raw
  Gate "pg-db: drizzle-orm/node-postgres import" ($content -match "drizzle-orm/node-postgres")
  Gate "pg-db: Pool creation" ($content -match "new Pool")
  Gate "pg-db: closePgDb export" ($content -match "export async function closePgDb")
  Gate "pg-db: pgHealthCheck export" ($content -match "export async function pgHealthCheck")
  Gate "pg-db: isPgConfigured export" ($content -match "export function isPgConfigured")
}

# Check pg-schema.ts content
$pgSchema = "$pgDir/pg-schema.ts"
if (Test-Path -LiteralPath $pgSchema) {
  $content = Get-Content $pgSchema -Raw
  Gate "pg-schema: drizzle-orm/pg-core import" ($content -match "drizzle-orm/pg-core")
  Gate "pg-schema: platformAuditEvent table" ($content -match "platformAuditEvent")
  Gate "pg-schema: idempotencyKey table" ($content -match "idempotencyKey")
  Gate "pg-schema: outboxEvent table" ($content -match "outboxEvent")
  Gate "pg-schema: payer table (Postgres)" ($content -match "export const payer = pgTable")
  Gate "pg-schema: tenant_id on payer" ($content -match 'tenantId.*tenant_id')
  Gate "pg-schema: eligibilityCheck table" ($content -match "eligibilityCheck")
  Gate "pg-schema: claimStatusCheck table" ($content -match "claimStatusCheck")
}

# Check pg-migrate.ts content
$pgMigrate = "$pgDir/pg-migrate.ts"
if (Test-Path -LiteralPath $pgMigrate) {
  $content = Get-Content $pgMigrate -Raw
  Gate "pg-migrate: versioned migrations" ($content -match "_platform_migrations")
  Gate "pg-migrate: BEGIN/COMMIT transaction" ($content -match "BEGIN" -and $content -match "COMMIT")
  Gate "pg-migrate: ROLLBACK on error" ($content -match "ROLLBACK")
  Gate "pg-migrate: RLS policy helper" ($content -match "applyRlsPolicies")
}

# Check tenant-context.ts content
$tenantCtx = "$pgDir/tenant-context.ts"
if (Test-Path -LiteralPath $tenantCtx) {
  $content = Get-Content $tenantCtx -Raw
  Gate "tenant-context: createTenantContext" ($content -match "export function createTenantContext")
  Gate "tenant-context: SQL injection guard" ($content -match "invalid characters")
  Gate "tenant-context: set_config call" ($content -match "set_config.*app\.current_tenant_id")
  Gate "tenant-context: transaction support" ($content -match "async transaction")
}

# Check tenant-middleware.ts content
$tenantMw = "$pgDir/tenant-middleware.ts"
if (Test-Path -LiteralPath $tenantMw) {
  $content = Get-Content $tenantMw -Raw
  Gate "tenant-middleware: registerTenantHook" ($content -match "export function registerTenantHook")
  Gate "tenant-middleware: X-Tenant-Id header" ($content -match "x-tenant-id")
  Gate "tenant-middleware: default fallback" ($content -match 'tenantId = "default"')
}

# ─── Section 4: Wiring ───────────────────────────────────────────
Write-Host "--- Section 4: Wiring ---" -ForegroundColor White

$indexTs = "apps/api/src/index.ts"
if (Test-Path -LiteralPath $indexTs) {
  $content = Get-Content $indexTs -Raw
  Gate "index.ts: imports initPlatformPg" ($content -match "initPlatformPg")
  Gate "index.ts: imports isPgConfigured" ($content -match "isPgConfigured")
  Gate "index.ts: imports pgHealthCheck" ($content -match "pgHealthCheck")
  Gate "index.ts: Postgres init call" ($content -match "await initPlatformPg")
  Gate "index.ts: SQLite init still present" ($content -match "initPlatformDb")
}

$securityTs = "apps/api/src/middleware/security.ts"
if (Test-Path -LiteralPath $securityTs) {
  $content = Get-Content $securityTs -Raw
  Gate "security.ts: imports closePgDb" ($content -match "closePgDb")
  Gate "security.ts: calls closePgDb in shutdown" ($content -match "await closePgDb")
}

$envExample = "apps/api/.env.example"
if (Test-Path -LiteralPath $envExample) {
  $content = Get-Content $envExample -Raw
  Gate ".env.example: PLATFORM_PG_URL" ($content -match "PLATFORM_PG_URL")
  Gate ".env.example: PLATFORM_PG_POOL_MIN" ($content -match "PLATFORM_PG_POOL_MIN")
  Gate ".env.example: PLATFORM_PG_POOL_MAX" ($content -match "PLATFORM_PG_POOL_MAX")
  Gate ".env.example: PLATFORM_PG_RLS_ENABLED" ($content -match "PLATFORM_PG_RLS_ENABLED")
}

# ─── Section 5: Package Dependencies ─────────────────────────────
Write-Host "--- Section 5: Package Dependencies ---" -ForegroundColor White

$pkgJson = "apps/api/package.json"
if (Test-Path -LiteralPath $pkgJson) {
  $pkg = Get-Content $pkgJson -Raw
  Gate "package.json: pg dependency" ($pkg -match '"pg"')
  Gate "package.json: @types/pg dev dependency" ($pkg -match '"@types/pg"')
  Gate "package.json: drizzle-orm still present" ($pkg -match '"drizzle-orm"')
  Gate "package.json: better-sqlite3 still present" ($pkg -match '"better-sqlite3"')
}

# ─── Section 6: No Breaking Changes ──────────────────────────────
Write-Host "--- Section 6: No Breaking Changes ---" -ForegroundColor White

# Verify SQLite files are untouched
Gate "SQLite db.ts still exists" (Test-Path -LiteralPath "apps/api/src/platform/db/db.ts")
Gate "SQLite schema.ts still exists" (Test-Path -LiteralPath "apps/api/src/platform/db/schema.ts")
Gate "SQLite migrate.ts still exists" (Test-Path -LiteralPath "apps/api/src/platform/db/migrate.ts")
Gate "SQLite init.ts still exists" (Test-Path -LiteralPath "apps/api/src/platform/db/init.ts")
Gate "SQLite seed.ts still exists" (Test-Path -LiteralPath "apps/api/src/platform/db/seed.ts")
Gate "SQLite repo/ directory intact" (Test-Path -LiteralPath "apps/api/src/platform/db/repo")

# Platform barrel exports both SQLite and Postgres
$barrel = "apps/api/src/platform/index.ts"
if (Test-Path -LiteralPath $barrel) {
  $content = Get-Content $barrel -Raw
  Gate "platform barrel: SQLite exports" ($content -match "getDb.*closeDb.*getRawDb")
  Gate "platform barrel: Postgres exports" ($content -match "getPgDb")
  Gate "platform barrel: tenant context exports" ($content -match "createTenantContext")
}

# ─── Section 7: Health Endpoint ───────────────────────────────────
Write-Host "--- Section 7: Health Endpoint ---" -ForegroundColor White

if (Test-Path -LiteralPath $indexTs) {
  $content = Get-Content $indexTs -Raw
  Gate "/health includes platformPg" ($content -match "platformPg")
  Gate "/health version updated to phase-101" ($content -match 'version.*phase-101')
}

# ─── Section 8: TypeScript Build ─────────────────────────────────
if (-not $SkipBuild) {
  Write-Host "--- Section 8: TypeScript Build ---" -ForegroundColor White
  try {
    Push-Location "apps/api"
    $tscOut = & npx tsc --noEmit 2>&1 | Out-String
    $tscOk = $LASTEXITCODE -eq 0
    Gate "TypeScript compiles cleanly (tsc --noEmit)" $tscOk
    if (-not $tscOk -and $Verbose) {
      Write-Host $tscOut -ForegroundColor Yellow
    }
    Pop-Location
  } catch {
    Gate "TypeScript compiles cleanly (tsc --noEmit)" $false
    Warn "tsc" $_.Exception.Message
    Pop-Location
  }
} else {
  Warn "TypeScript build" "Skipped (-SkipBuild)"
}

# ─── Section 9: Docker Postgres (optional) ───────────────────────
if (-not $SkipDocker) {
  Write-Host "--- Section 9: Docker Postgres (optional) ---" -ForegroundColor White
  try {
    $containerName = "ve-platform-db"
    $running = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>&1 | Out-String
    if ($running -match $containerName) {
      Gate "Postgres container is running" $true
      # Try a health check via pg_isready
      $pgReady = docker exec $containerName pg_isready -U ve_api -d ve_platform 2>&1 | Out-String
      Gate "Postgres accepts connections (pg_isready)" ($pgReady -match "accepting connections")
    } else {
      Warn "Docker Postgres" "Container $containerName not running -- skipping live checks"
    }
  } catch {
    Warn "Docker Postgres" "Docker not available -- $($_.Exception.Message)"
  }
} else {
  Warn "Docker Postgres" "Skipped (-SkipDocker)"
}

# ─── Summary ─────────────────────────────────────────────────────
Write-Host "`n=== Phase 101 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
if ($warn -gt 0) { Write-Host "  WARN: $warn" -ForegroundColor Yellow }
Write-Host "  Total gates: $($pass + $fail)" -ForegroundColor White
Write-Host ""

if ($fail -gt 0) {
  Write-Host "FAILED gates:" -ForegroundColor Red
  $results | Where-Object { $_ -match "^FAIL:" } | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
}

Write-Host "All gates passed." -ForegroundColor Green
exit 0
