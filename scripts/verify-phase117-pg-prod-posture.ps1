<# Phase 117 -- Postgres-First Prod Posture + Multi-Instance Verifier #>
param(
  [switch]$SkipDocker,
  [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Gate-Pass($label) { $script:pass++; Write-Host "  [PASS] $label" -ForegroundColor Green }
function Gate-Fail($label, $detail) { $script:fail++; Write-Host "  [FAIL] $label -- $detail" -ForegroundColor Red }
function Gate-Skip($label) { $script:skip++; Write-Host "  [SKIP] $label" -ForegroundColor Yellow }

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$root\apps\api\src\index.ts")) {
  $root = (Get-Location).Path
}
$api = Join-Path $root "apps\api\src"

Write-Host "`n=== Phase 117: Postgres-First Prod Posture Verifier ===" -ForegroundColor Cyan

# ── Gate 1: docker-compose.prod.yml has platform-db service ──
Write-Host "`n--- Gate 1: Compose prod profile ---"
$compose = Join-Path $root "docker-compose.prod.yml"
if (Test-Path $compose) {
  $cc = Get-Content $compose -Raw
  if ($cc -match "platform-db:") { Gate-Pass "platform-db service defined" } else { Gate-Fail "platform-db service" "not found in compose" }
  if ($cc -match "postgres:16") { Gate-Pass "postgres:16 image used" } else { Gate-Fail "postgres image" "not postgres:16" }
  if ($cc -match "PLATFORM_PG_URL") { Gate-Pass "PLATFORM_PG_URL in API env" } else { Gate-Fail "PLATFORM_PG_URL" "missing from API env" }
  if ($cc -match "STORE_BACKEND=pg") { Gate-Pass "STORE_BACKEND=pg in API env" } else { Gate-Fail "STORE_BACKEND" "not set to pg" }
  if ($cc -match "wal_level|archive_mode|WAL") { Gate-Pass "WAL/PITR config referenced" } else { Gate-Fail "WAL config" "no WAL reference in compose" }
  if ($cc -match "pgdata:") { Gate-Pass "pgdata volume defined" } else { Gate-Fail "pgdata volume" "not defined" }
  if ($cc -match "scale api=2|JOB_WORKER_ENABLED") { Gate-Pass "multi-instance support hints" } else { Gate-Fail "multi-instance" "no scale/job hints" }
} else { Gate-Fail "docker-compose.prod.yml" "file not found" }

# ── Gate 2: PG schema has session + workqueue tables ──
Write-Host "`n--- Gate 2: PG schema tables ---"
$pgSchema = Join-Path $api "platform\pg\pg-schema.ts"
if (Test-Path $pgSchema) {
  $sc = Get-Content $pgSchema -Raw
  if ($sc -match "pgAuthSession") { Gate-Pass "pgAuthSession table defined" } else { Gate-Fail "pgAuthSession" "not in pg-schema" }
  if ($sc -match "pgRcmWorkItem\b") { Gate-Pass "pgRcmWorkItem table defined" } else { Gate-Fail "pgRcmWorkItem" "not in pg-schema" }
  if ($sc -match "pgRcmWorkItemEvent") { Gate-Pass "pgRcmWorkItemEvent table defined" } else { Gate-Fail "pgRcmWorkItemEvent" "not in pg-schema" }
  if ($sc -match "auth_session") { Gate-Pass "auth_session SQL name" } else { Gate-Fail "auth_session" "SQL name missing" }
  # Index checks
  if ($sc -match "idx_auth_session_token_hash") { Gate-Pass "session token_hash index" } else { Gate-Fail "session index" "token_hash index missing" }
  if ($sc -match "idx_auth_session_expires") { Gate-Pass "session expires_at index" } else { Gate-Fail "session index" "expires_at index missing" }
  if ($sc -match "idx_work_item_status_updated") { Gate-Pass "workqueue status+updated_at index" } else { Gate-Fail "workqueue index" "status+updated missing" }
  if ($sc -match "idx_work_item_priority_created") { Gate-Pass "workqueue priority+created_at index" } else { Gate-Fail "workqueue index" "priority+created missing" }
} else { Gate-Fail "pg-schema.ts" "file not found" }

# ── Gate 3: Migration v9 exists ──
Write-Host "`n--- Gate 3: Migration v9 ---"
$pgMigrate = Join-Path $api "platform\pg\pg-migrate.ts"
if (Test-Path $pgMigrate) {
  $mc = Get-Content $pgMigrate -Raw
  if ($mc -match "version:\s*9") { Gate-Pass "migration v9 defined" } else { Gate-Fail "migration v9" "not found" }
  if ($mc -match "session_workqueue") { Gate-Pass "migration v9 name contains session_workqueue" } else { Gate-Fail "migration v9 name" "wrong name" }
  if ($mc -match "auth_session.*rcm_work_item|rcm_work_item.*auth_session") { Gate-Pass "v9 creates both tables" } else { Gate-Fail "v9 tables" "missing table creation" }
  # RLS coverage
  if ($mc -match "auth_session" -and $mc -match "tenantTables|tenant_tables") { Gate-Pass "auth_session in RLS tenant tables" } else { Gate-Fail "RLS" "auth_session not in tenant tables" }
} else { Gate-Fail "pg-migrate.ts" "file not found" }

# ── Gate 4: PG session + workqueue repos exist ──
Write-Host "`n--- Gate 4: PG repos ---"
$pgSessionRepo = Join-Path $api "platform\pg\repo\session-repo.ts"
$pgWqRepo = Join-Path $api "platform\pg\repo\workqueue-repo.ts"
if (Test-Path $pgSessionRepo) {
  $sr = Get-Content $pgSessionRepo -Raw
  if ($sr -match "async.*createAuthSession") { Gate-Pass "PG session repo has async createAuthSession" } else { Gate-Fail "PG session repo" "missing async createAuthSession" }
  if ($sr -match "async.*findSessionByTokenHash") { Gate-Pass "PG session repo has async findSessionByTokenHash" } else { Gate-Fail "PG session repo" "missing findSessionByTokenHash" }
  if ($sr -match "pgAuthSession") { Gate-Pass "PG session repo uses pgAuthSession schema" } else { Gate-Fail "PG session repo" "not using pgAuthSession" }
} else { Gate-Fail "PG session-repo.ts" "file not found" }

if (Test-Path $pgWqRepo) {
  $wr = Get-Content $pgWqRepo -Raw
  if ($wr -match "async.*createWorkItem") { Gate-Pass "PG workqueue repo has async createWorkItem" } else { Gate-Fail "PG workqueue repo" "missing async createWorkItem" }
  if ($wr -match "async.*listWorkItems") { Gate-Pass "PG workqueue repo has async listWorkItems" } else { Gate-Fail "PG workqueue repo" "missing listWorkItems" }
  if ($wr -match "pgRcmWorkItem") { Gate-Pass "PG workqueue repo uses pgRcmWorkItem schema" } else { Gate-Fail "PG workqueue repo" "not using pgRcmWorkItem" }
} else { Gate-Fail "PG workqueue-repo.ts" "file not found" }

# ── Gate 5: Store resolver has STORE_BACKEND support ──
Write-Host "`n--- Gate 5: Store resolver ---"
$resolver = Join-Path $api "platform\store-resolver.ts"
if (Test-Path $resolver) {
  $rc = Get-Content $resolver -Raw
  if ($rc -match "STORE_BACKEND") { Gate-Pass "STORE_BACKEND env var read" } else { Gate-Fail "STORE_BACKEND" "not referenced" }
  if ($rc -match "resolveBackend") { Gate-Pass "resolveBackend function exists" } else { Gate-Fail "resolveBackend" "function not found" }
  if ($rc -match "auto.*pg.*sqlite|StoreBackend") { Gate-Pass "StoreBackend type with auto/pg/sqlite" } else { Gate-Fail "StoreBackend type" "missing" }
} else { Gate-Fail "store-resolver.ts" "file not found" }

# ── Gate 6: Session store is async ──
Write-Host "`n--- Gate 6: Session store async ---"
$sessStore = Join-Path $api "auth\session-store.ts"
if (Test-Path $sessStore) {
  $ss = Get-Content $sessStore -Raw
  if ($ss -match "async function createSession") { Gate-Pass "createSession is async" } else { Gate-Fail "createSession" "not async" }
  if ($ss -match "async function getSession") { Gate-Pass "getSession is async" } else { Gate-Fail "getSession" "not async" }
  if ($ss -match "async function destroySession") { Gate-Pass "destroySession is async" } else { Gate-Fail "destroySession" "not async" }
  if ($ss -match "SessionRepoLike") { Gate-Pass "SessionRepoLike interface exists" } else { Gate-Fail "SessionRepoLike" "interface not found" }
} else { Gate-Fail "session-store.ts" "file not found" }

# ── Gate 7: Workqueue store is async ──
Write-Host "`n--- Gate 7: Workqueue store async ---"
$wqStore = Join-Path $api "rcm\workqueues\workqueue-store.ts"
if (Test-Path $wqStore) {
  $ws = Get-Content $wqStore -Raw
  if ($ws -match "async function createWorkqueueItem") { Gate-Pass "createWorkqueueItem is async" } else { Gate-Fail "createWorkqueueItem" "not async" }
  if ($ws -match "async function listWorkqueueItems") { Gate-Pass "listWorkqueueItems is async" } else { Gate-Fail "listWorkqueueItems" "not async" }
  if ($ws -match "async function getWorkqueueStats") { Gate-Pass "getWorkqueueStats is async" } else { Gate-Fail "getWorkqueueStats" "not async" }
  if ($ws -match "WorkqueueRepoLike") { Gate-Pass "WorkqueueRepoLike interface exists" } else { Gate-Fail "WorkqueueRepoLike" "interface not found" }
} else { Gate-Fail "workqueue-store.ts" "file not found" }

# ── Gate 8: index.ts wires PG repos conditionally ──
Write-Host "`n--- Gate 8: index.ts PG wiring ---"
$idx = Join-Path $api "index.ts"
if (Test-Path $idx) {
  $ic = Get-Content $idx -Raw
  if ($ic -match "resolveBackend") { Gate-Pass "index.ts imports resolveBackend" } else { Gate-Fail "index.ts" "no resolveBackend import" }
  if ($ic -match 'pg/repo/session-repo') { Gate-Pass "index.ts imports PG session repo" } else { Gate-Fail "index.ts" "no PG session repo import" }
  if ($ic -match 'pg/repo/workqueue-repo') { Gate-Pass "index.ts imports PG workqueue repo" } else { Gate-Fail "index.ts" "no PG workqueue repo import" }
  if ($ic -match "re-wired to PG") { Gate-Pass "index.ts has PG re-wire log" } else { Gate-Fail "index.ts" "no PG re-wire log" }
} else { Gate-Fail "index.ts" "file not found" }

# ── Gate 9: Callers await async functions ──
Write-Host "`n--- Gate 9: Caller await checks ---"
$secTs = Join-Path $api "middleware\security.ts"
if (Test-Path $secTs) {
  $sec = Get-Content $secTs -Raw
  if ($sec -match "await getSession") { Gate-Pass "security.ts awaits getSession" } else { Gate-Fail "security.ts" "getSession not awaited" }
} else { Gate-Fail "security.ts" "not found" }

$authTs = Join-Path $api "auth\auth-routes.ts"
if (Test-Path $authTs) {
  $ar = Get-Content $authTs -Raw
  if ($ar -match "async.*requireSession|await requireSession") { Gate-Pass "auth-routes.ts uses async requireSession" } else { Gate-Fail "auth-routes.ts" "requireSession not async/awaited" }
} else { Gate-Fail "auth-routes.ts" "not found" }

$rcmRoutes = Join-Path $api "rcm\rcm-routes.ts"
if (Test-Path $rcmRoutes) {
  $rr = Get-Content $rcmRoutes -Raw
  if ($rr -match "await listWorkqueueItems") { Gate-Pass "rcm-routes.ts awaits listWorkqueueItems" } else { Gate-Fail "rcm-routes.ts" "listWorkqueueItems not awaited" }
  if ($rr -match "await getWorkqueueItem") { Gate-Pass "rcm-routes.ts awaits getWorkqueueItem" } else { Gate-Fail "rcm-routes.ts" "getWorkqueueItem not awaited" }
  if ($rr -match "await ingestAck") { Gate-Pass "rcm-routes.ts awaits ingestAck" } else { Gate-Fail "rcm-routes.ts" "ingestAck not awaited" }
} else { Gate-Fail "rcm-routes.ts" "not found" }

# ── Gate 10: Multi-instance test script exists ──
Write-Host "`n--- Gate 10: Multi-instance test ---"
$testScript = Join-Path $root "scripts\test-multi-instance.mjs"
if (Test-Path $testScript) {
  $ts = Get-Content $testScript -Raw
  if ($ts -match "gate2_session_cross_validation") { Gate-Pass "test has session cross-validation gate" } else { Gate-Fail "test script" "missing session gate" }
  if ($ts -match "gate3_workqueue_cross_dequeue") { Gate-Pass "test has workqueue cross-dequeue gate" } else { Gate-Fail "test script" "missing workqueue gate" }
} else { Gate-Fail "test-multi-instance.mjs" "file not found" }

# ── Gate 11: PITR/backup docs ──
Write-Host "`n--- Gate 11: Backup docs ---"
$backupDoc = Join-Path $root "docs\runbooks\pg-backup-pitr.md"
if (Test-Path $backupDoc) {
  $bd = Get-Content $backupDoc -Raw
  if ($bd -match "PITR|Point-in-Time") { Gate-Pass "PITR section in backup doc" } else { Gate-Fail "backup doc" "no PITR section" }
  if ($bd -match "pg_basebackup") { Gate-Pass "pg_basebackup documented" } else { Gate-Fail "backup doc" "no pg_basebackup" }
  if ($bd -match "restore drill|Restore Drill") { Gate-Pass "restore drill documented" } else { Gate-Fail "backup doc" "no restore drill" }
  if ($bd -match "migration|Migration") { Gate-Pass "migration management documented" } else { Gate-Fail "backup doc" "no migration docs" }
} else { Gate-Fail "pg-backup-pitr.md" "file not found" }

# ── Gate 12: Prompt file ──
Write-Host "`n--- Gate 12: Prompt file ---"
$promptDir = Join-Path $root "prompts\120-PHASE-117-PG-PROD-POSTURE"
$promptFile = Join-Path $promptDir "117-01-IMPLEMENT.md"
if (Test-Path $promptFile) { Gate-Pass "Prompt file exists" } else { Gate-Fail "prompt file" "not found at $promptFile" }

# ── Gate 13: TypeScript compile check ──
Write-Host "`n--- Gate 13: TypeScript compile ---"
if (-not $SkipDocker) {
  Push-Location (Join-Path $root "apps\api")
  try {
    $tsc = npx tsc --noEmit 2>&1
    $tscExit = $LASTEXITCODE
    if ($tscExit -eq 0) {
      Gate-Pass "tsc --noEmit clean"
    } else {
      $errCount = ($tsc | Where-Object { $_ -match "error TS" }).Count
      Gate-Fail "tsc --noEmit" "$errCount type errors"
      if ($Verbose) { $tsc | Select-Object -First 20 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }
    }
  } catch {
    Gate-Fail "tsc" $_.Exception.Message
  }
  Pop-Location
} else {
  Gate-Skip "tsc --noEmit (SkipDocker)"
}

# ── Summary ──
Write-Host "`n=== Phase 117 Results: $pass passed, $fail failed, $skip skipped ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 } else { exit 0 }
