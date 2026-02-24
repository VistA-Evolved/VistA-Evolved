# Phase 114: Durability Wave 1 -- Verification Script
# Sessions + Workqueues + Payer Registry + Capability Audit + Restart Gate
#
# Gates:
#  1. Schema tables exist (auth_session, rcm_work_item, rcm_work_item_event)
#  2. Migration DDL exists for all 3 tables
#  3. session-repo.ts exists with correct exports
#  4. workqueue-repo.ts exists with correct exports
#  5. session-store.ts uses DB delegation (no raw Map primary)
#  6. workqueue-store.ts uses DB delegation (no raw Map primary)
#  7. capability-matrix.ts writes audit events
#  8. index.ts wires initSessionRepo
#  9. index.ts wires initWorkqueueRepo
# 10. index.ts wires initCapabilityAudit
# 11. Barrel exports (session + workqueue repos)
# 12. store-policy.md exists
# 13. Restart-durability QA gate passes
# 14. PromptOS folder 118 exists with IMPLEMENT + VERIFY
# 15. TypeScript compiles without errors
# 16. No console.log violations (<=6 total)

param(
  [switch]$SkipDocker,
  [switch]$SkipTypeCheck
)

$ErrorActionPreference = 'Continue'
$pass = 0
$fail = 0
$root = Split-Path -Parent $PSScriptRoot

function Gate([string]$name, [bool]$ok) {
  if ($ok) {
    Write-Host "  PASS  $name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $name" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`nPhase 114 -- Durability Wave 1 Verification`n" -ForegroundColor Cyan

# ── 1. Schema tables ──────────────────────────────────────────
Write-Host "Schema:" -ForegroundColor Yellow
$schema = Get-Content "$root\apps\api\src\platform\db\schema.ts" -Raw -ErrorAction SilentlyContinue
Gate "auth_session table in schema" ($schema -match 'sqliteTable\("auth_session"')
Gate "rcm_work_item table in schema" ($schema -match 'sqliteTable\("rcm_work_item"')
Gate "rcm_work_item_event table in schema" ($schema -match 'sqliteTable\("rcm_work_item_event"')

# ── 2. Migration DDL ──────────────────────────────────────────
Write-Host "`nMigration:" -ForegroundColor Yellow
$migrate = Get-Content "$root\apps\api\src\platform\db\migrate.ts" -Raw -ErrorAction SilentlyContinue
Gate "CREATE TABLE auth_session" ($migrate -match 'CREATE TABLE IF NOT EXISTS auth_session')
Gate "CREATE TABLE rcm_work_item" ($migrate -match 'CREATE TABLE IF NOT EXISTS rcm_work_item')
Gate "CREATE TABLE rcm_work_item_event" ($migrate -match 'CREATE TABLE IF NOT EXISTS rcm_work_item_event')

# ── 3-4. Repo files ──────────────────────────────────────────
Write-Host "`nRepos:" -ForegroundColor Yellow
$sessRepo = "$root\apps\api\src\platform\db\repo\session-repo.ts"
$wqRepo = "$root\apps\api\src\platform\db\repo\workqueue-repo.ts"
Gate "session-repo.ts exists" (Test-Path -LiteralPath $sessRepo)
Gate "workqueue-repo.ts exists" (Test-Path -LiteralPath $wqRepo)

if (Test-Path -LiteralPath $sessRepo) {
  $sr = Get-Content $sessRepo -Raw
  Gate "session-repo: createAuthSession" ($sr -match 'export function createAuthSession')
  Gate "session-repo: findSessionByTokenHash" ($sr -match 'export function findSessionByTokenHash')
}
if (Test-Path -LiteralPath $wqRepo) {
  $wr = Get-Content $wqRepo -Raw
  Gate "workqueue-repo: createWorkItem" ($wr -match 'export function createWorkItem')
  Gate "workqueue-repo: listWorkItems" ($wr -match 'export function listWorkItems')
}

# ── 5-7. Store delegation ────────────────────────────────────
Write-Host "`nStore delegation:" -ForegroundColor Yellow
$sessStore = Get-Content "$root\apps\api\src\auth\session-store.ts" -Raw -ErrorAction SilentlyContinue
Gate "session-store: initSessionRepo export" ($sessStore -match 'export function initSessionRepo')
Gate "session-store: no raw Map primary" ($sessStore -notmatch 'const sessions = new Map<string, SessionData>')
Gate "session-store: hashToken" ($sessStore -match 'hashToken')

$wqStore = Get-Content "$root\apps\api\src\rcm\workqueues\workqueue-store.ts" -Raw -ErrorAction SilentlyContinue
Gate "workqueue-store: initWorkqueueRepo export" ($wqStore -match 'export function initWorkqueueRepo')
Gate "workqueue-store: no raw Map primary" ($wqStore -notmatch 'const items = new Map<string, WorkqueueItem>')

$capMat = Get-Content "$root\apps\api\src\rcm\payerOps\capability-matrix.ts" -Raw -ErrorAction SilentlyContinue
Gate "capability-matrix: initCapabilityAudit" ($capMat -match 'export function initCapabilityAudit')
Gate "capability-matrix: auditMutation calls" ($capMat -match 'auditMutation\(')

# ── 8-10. index.ts wiring ────────────────────────────────────
Write-Host "`nStartup wiring:" -ForegroundColor Yellow
$idx = Get-Content "$root\apps\api\src\index.ts" -Raw -ErrorAction SilentlyContinue
Gate "index.ts wires initSessionRepo" ($idx -match 'initSessionRepo')
Gate "index.ts wires initWorkqueueRepo" ($idx -match 'initWorkqueueRepo')
Gate "index.ts wires initCapabilityAudit" ($idx -match 'initCapabilityAudit')

# ── 11. Barrel exports ───────────────────────────────────────
Write-Host "`nBarrel:" -ForegroundColor Yellow
$barrel = Get-Content "$root\apps\api\src\platform\db\repo\index.ts" -Raw -ErrorAction SilentlyContinue
Gate "barrel: sessionRepo" ($barrel -match 'sessionRepo')
Gate "barrel: workqueueRepo" ($barrel -match 'workqueueRepo')

# ── 12. Store policy ─────────────────────────────────────────
Write-Host "`nPolicy:" -ForegroundColor Yellow
Gate "store-policy.md exists" (Test-Path -LiteralPath "$root\docs\architecture\store-policy.md")

# ── 13. QA gate ──────────────────────────────────────────────
Write-Host "`nQA gate:" -ForegroundColor Yellow
$gateScript = "$root\scripts\qa-gates\restart-durability.mjs"
Gate "restart-durability.mjs exists" (Test-Path -LiteralPath $gateScript)
if (Test-Path -LiteralPath $gateScript) {
  try {
    $gateOut = & node $gateScript 2>&1
    $gateExit = $LASTEXITCODE
    if ($gateExit -eq 0) {
      Gate "restart-durability gate PASSES" $true
    } else {
      Gate "restart-durability gate PASSES" $false
      $gateOut | ForEach-Object { Write-Host "    $_" }
    }
  } catch {
    Gate "restart-durability gate PASSES" $false
  }
}

# ── 14. PromptOS ─────────────────────────────────────────────
Write-Host "`nPromptOS:" -ForegroundColor Yellow
Gate "prompts/118* folder exists" (Test-Path -LiteralPath "$root\prompts\118-PHASE-114-DURABILITY-WAVE1")
Gate "114-01-IMPLEMENT.md" (Test-Path -LiteralPath "$root\prompts\118-PHASE-114-DURABILITY-WAVE1\114-01-IMPLEMENT.md")
Gate "114-99-VERIFY.md" (Test-Path -LiteralPath "$root\prompts\118-PHASE-114-DURABILITY-WAVE1\114-99-VERIFY.md")

# ── 15. TypeScript ────────────────────────────────────────────
if (-not $SkipTypeCheck) {
  Write-Host "`nTypeScript:" -ForegroundColor Yellow
  Push-Location "$root\apps\api"
  try {
    $tscOut = & npx tsc --noEmit 2>&1
    $tscExit = $LASTEXITCODE
    Gate "API TypeScript compiles" ($tscExit -eq 0)
    if ($tscExit -ne 0) {
      $tscOut | Select-Object -First 15 | ForEach-Object { Write-Host "    $_" }
    }
  } catch {
    Gate "API TypeScript compiles" $false
  }
  Pop-Location
}

# ── 16. console.log cap ──────────────────────────────────────
Write-Host "`nHygiene:" -ForegroundColor Yellow
# Exclude tools/ and telemetry/register.ts (CLI-only, not runtime API code)
$logCount = (Get-ChildItem "$root\apps\api\src\*.ts" -Recurse |
  Where-Object { $_.FullName -notmatch '\\tools\\' -and $_.FullName -notmatch '\\telemetry\\register\.ts$' } |
  Select-String -Pattern 'console\.log\(' -CaseSensitive |
  Where-Object { $_.Line -notmatch '//.*console\.log' }).Count
Gate "console.log count <= 6 (found: $logCount)" ($logCount -le 6)

# ── Summary ──────────────────────────────────────────────────
Write-Host "`n$('=' * 50)" -ForegroundColor Cyan
Write-Host "Phase 114 Durability Wave 1: $pass PASS / $fail FAIL" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

exit $fail
