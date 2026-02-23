<#
.SYNOPSIS
  Phase 102 Verifier - Migrate Prototype Stores to PlatformStore

.DESCRIPTION
  Validates all Phase 102 deliverables:
    - PG repo files exist with correct exports
    - Capability matrix PG repo replaces in-memory Map
    - Store resolver exists and exports resolveStore
    - Route wiring uses async store resolver
    - PG seed loader exists
    - pg-init.ts wires seed step
    - Migration v5 for capability_matrix tables
    - UI persistence badge
    - TypeScript compiles cleanly

.NOTES
  Run from repo root: .\scripts\verify-phase102-registry-migration.ps1
#>

param(
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

Write-Host "`n=== Phase 102 Verification: Migrate Prototype Stores to PlatformStore ===" -ForegroundColor Cyan
Write-Host ""

# --- Section 1: PG Repo Files ---
Write-Host "--- Section 1: PG Repo Files ---" -ForegroundColor White

$repoDir = "apps/api/src/platform/pg/repo"

Gate "repo directory exists" (Test-Path -LiteralPath $repoDir)

$repoFiles = @(
  "payer-repo.ts",
  "audit-repo.ts",
  "capability-repo.ts",
  "task-repo.ts",
  "evidence-repo.ts",
  "tenant-payer-repo.ts",
  "capability-matrix-repo.ts",
  "index.ts"
)

foreach ($f in $repoFiles) {
  $fp = Join-Path $repoDir $f
  Gate "repo/$f exists" (Test-Path -LiteralPath $fp)
}

# Check barrel exports
$barrel = Join-Path $repoDir "index.ts"
if (Test-Path -LiteralPath $barrel) {
  $barrelContent = Get-Content $barrel -Raw
  Gate "barrel exports pgPayerRepo" ($barrelContent -match "pgPayerRepo")
  Gate "barrel exports pgAuditRepo" ($barrelContent -match "pgAuditRepo")
  Gate "barrel exports pgCapabilityRepo" ($barrelContent -match "pgCapabilityRepo")
  Gate "barrel exports pgTaskRepo" ($barrelContent -match "pgTaskRepo")
  Gate "barrel exports pgEvidenceRepo" ($barrelContent -match "pgEvidenceRepo")
  Gate "barrel exports pgTenantPayerRepo" ($barrelContent -match "pgTenantPayerRepo")
  Gate "barrel exports pgCapabilityMatrixRepo" ($barrelContent -match "pgCapabilityMatrixRepo")
}

# --- Section 2: PG Repo Content Checks ---
Write-Host "--- Section 2: PG Repo Content Checks ---" -ForegroundColor White

# Each repo must use getPgDb and be async
foreach ($f in @("payer-repo.ts","audit-repo.ts","capability-repo.ts","task-repo.ts","evidence-repo.ts","tenant-payer-repo.ts","capability-matrix-repo.ts")) {
  $fp = Join-Path $repoDir $f
  if (Test-Path -LiteralPath $fp) {
    $content = Get-Content $fp -Raw
    Gate "$f imports getPgDb" ($content -match "getPgDb")
    Gate "$f has async functions" ($content -match "async ")
  }
}

# Capability matrix repo specific checks
$cmRepo = Join-Path $repoDir "capability-matrix-repo.ts"
if (Test-Path -LiteralPath $cmRepo) {
  $cm = Get-Content $cmRepo -Raw
  Gate "capability-matrix-repo: getFullMatrix" ($cm -match "getFullMatrix")
  Gate "capability-matrix-repo: setCapability" ($cm -match "setCapability")
  Gate "capability-matrix-repo: addEvidence" ($cm -match "addEvidence")
  Gate "capability-matrix-repo: getMatrixStats" ($cm -match "getMatrixStats")
  Gate "capability-matrix-repo: capabilityMatrixCell schema ref" ($cm -match "capabilityMatrixCell")
}

# --- Section 3: Store Resolver ---
Write-Host "--- Section 3: Store Resolver ---" -ForegroundColor White

$resolver = "apps/api/src/platform/store-resolver.ts"
Gate "store-resolver.ts exists" (Test-Path -LiteralPath $resolver)
if (Test-Path -LiteralPath $resolver) {
  $sr = Get-Content $resolver -Raw
  Gate "store-resolver: exports resolveStore" ($sr -match "export.*resolveStore")
  Gate "store-resolver: exports store proxy" ($sr -match "export.*store")
  Gate "store-resolver: uses isPgConfigured" ($sr -match "isPgConfigured")
  Gate "store-resolver: wraps SQLite repos" ($sr -match "Promise\.resolve")
  Gate "store-resolver: references pg repos" ($sr -match "pgPayerRepo")
  Gate "store-resolver: backend property" ($sr -match "backend")
}

# --- Section 4: Route Wiring ---
Write-Host "--- Section 4: Route Wiring ---" -ForegroundColor White

$routes = "apps/api/src/routes/admin-payer-db-routes.ts"
if (Test-Path -LiteralPath $routes) {
  $r = Get-Content $routes -Raw
  Gate "routes: imports resolveStore" ($r -match "resolveStore")
  Gate "routes: async ensureDb" ($r -match "async.*ensureDb|ensureDb.*async")
  Gate "routes: uses await ensureDb" ($r -match "await ensureDb")
  Gate "routes: backend endpoint" ($r -match "/admin/payer-db/backend")
  Gate "routes: no direct SQLite repo imports" (-not ($r -match 'from.*db/repo/payer-repo'))
} else {
  Gate "routes file exists" $false
}

# --- Section 5: PG Seed Loader ---
Write-Host "--- Section 5: PG Seed Loader ---" -ForegroundColor White

$seed = "apps/api/src/platform/pg/pg-seed.ts"
Gate "pg-seed.ts exists" (Test-Path -LiteralPath $seed)
if (Test-Path -LiteralPath $seed) {
  $s = Get-Content $seed -Raw
  Gate "pg-seed: reads JSON fixtures" ($s -match "data/payers")
  Gate "pg-seed: strips BOM" ($s -match 'BOM|charCodeAt|0xfeff')
  Gate "pg-seed: async function" ($s -match "async.*pgSeedFromJsonFixtures")
  Gate "pg-seed: idempotent insert" ($s -match "existing|skip")
}

# --- Section 6: pg-init.ts Integration ---
Write-Host "--- Section 6: pg-init.ts Integration ---" -ForegroundColor White

$init = "apps/api/src/platform/pg/pg-init.ts"
if (Test-Path -LiteralPath $init) {
  $i = Get-Content $init -Raw
  Gate "pg-init: imports pgSeedFromJsonFixtures" ($i -match "pgSeedFromJsonFixtures")
  Gate "pg-init: seeded in result type" ($i -match "seeded")
  Gate "pg-init: calls seed function" ($i -match "pgSeedFromJsonFixtures\(\)")
} else {
  Gate "pg-init.ts exists" $false
}

# --- Section 7: Migration v5 ---
Write-Host "--- Section 7: Migration v5 ---" -ForegroundColor White

$migrate = "apps/api/src/platform/pg/pg-migrate.ts"
if (Test-Path -LiteralPath $migrate) {
  $m = Get-Content $migrate -Raw
  Gate "pg-migrate: v5 migration exists" ($m -match "version.*5|v5|create_capability_matrix")
  Gate "pg-migrate: capability_matrix_cell table" ($m -match "capability_matrix_cell")
  Gate "pg-migrate: capability_matrix_evidence table" ($m -match "capability_matrix_evidence")
} else {
  Gate "pg-migrate.ts exists" $false
}

# --- Section 8: PG Schema ---
Write-Host "--- Section 8: PG Schema ---" -ForegroundColor White

$schema = "apps/api/src/platform/pg/pg-schema.ts"
if (Test-Path -LiteralPath $schema) {
  $sc = Get-Content $schema -Raw
  Gate "pg-schema: capabilityMatrixCell table" ($sc -match "capabilityMatrixCell")
  Gate "pg-schema: capabilityMatrixEvidence table" ($sc -match "capabilityMatrixEvidence")
  Gate "pg-schema: unique index on payer+capability" ($sc -match "uniqueIndex|unique.*index")
} else {
  Gate "pg-schema.ts exists" $false
}

# --- Section 9: UI Persistence Badge ---
Write-Host "--- Section 9: UI Persistence Badge ---" -ForegroundColor White

$rcmPage = "apps/web/src/app/cprs/admin/rcm/page.tsx"
if (Test-Path -LiteralPath $rcmPage) {
  $ui = Get-Content $rcmPage -Raw
  Gate "UI: fetches backend endpoint" ($ui -match "/admin/payer-db/backend")
  Gate "UI: backendInfo state" ($ui -match "backendInfo")
  Gate "UI: shows PostgreSQL label" ($ui -match "PostgreSQL")
  Gate "UI: shows SQLite label" ($ui -match "SQLite")
} else {
  Gate "RCM page exists" $false
}

# --- Section 10: PG Barrel Export ---
Write-Host "--- Section 10: PG Module Barrel ---" -ForegroundColor White

$pgIndex = "apps/api/src/platform/pg/index.ts"
if (Test-Path -LiteralPath $pgIndex) {
  $pi = Get-Content $pgIndex -Raw
  Gate "pg/index.ts: exports repo barrel" ($pi -match "repo")
} else {
  Gate "pg/index.ts exists" $false
}

# --- Section 11: TypeScript Compilation ---
Write-Host "--- Section 11: TypeScript Compilation ---" -ForegroundColor White

if (-not $SkipBuild) {
  try {
    Push-Location (Join-Path $PWD "apps/api")
    $tscOut = & npx tsc --noEmit 2>&1 | Out-String
    $tscOk = $LASTEXITCODE -eq 0
    Pop-Location
    Gate "TypeScript compiles cleanly (apps/api)" $tscOk
    if (-not $tscOk -and $Verbose) {
      Write-Host $tscOut -ForegroundColor DarkGray
    }
  } catch {
    Gate "TypeScript compiles cleanly (apps/api)" $false
    Warn "tsc" $_.Exception.Message
  }
} else {
  Warn "TypeScript" "Skipped (use -SkipBuild:$false to enable)"
}

# --- Summary ---
Write-Host ""
Write-Host "=== Phase 102 Results ===" -ForegroundColor Cyan
$total = $pass + $fail
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
}
if ($warn -gt 0) {
  Write-Host "  WARN: $warn" -ForegroundColor Yellow
}

Write-Host ""
foreach ($r in $results) {
  $color = if ($r -match "^PASS") { "Green" } elseif ($r -match "^FAIL") { "Red" } else { "Yellow" }
  Write-Host "  $r" -ForegroundColor $color
}

Write-Host ""
if ($fail -eq 0) {
  Write-Host "Phase 102 PASSED" -ForegroundColor Green
} else {
  Write-Host "Phase 102 FAILED -- $fail gates" -ForegroundColor Red
}

exit $fail
