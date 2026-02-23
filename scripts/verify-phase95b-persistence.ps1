<#
.SYNOPSIS
  Phase 95B -- Platform Persistence Unification verifier.
.DESCRIPTION
  Validates the SQLite-backed payer registry (Drizzle ORM + better-sqlite3).
  Gates:
    1. Dependencies installed (drizzle-orm, better-sqlite3)
    2. Schema file exists with 6 tables
    3. DB singleton, migration, seed, init files exist
    4. 6 repository files exist
    5. Evidence ingest pipeline exists
    6. Admin routes file exists
    7. Admin UI page exists
    8. Wired into index.ts
    9. ADR + runbook exist
   10. Nav item in admin layout
   11. .gitignore entries
   12. No console.log in new files
#>

param(
  [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
$pass = 0
$fail = 0
$warnings = 0
$results = @()

function Gate([string]$name, [scriptblock]$check) {
  try {
    $ok = & $check
    if ($ok) {
      $results += "PASS: $name"
      $script:pass++
    } else {
      $results += "FAIL: $name"
      $script:fail++
    }
  } catch {
    $results += "FAIL: $name -- $_"
    $script:fail++
  }
}

function Warn([string]$msg) {
  $results += "WARN: $msg"
  $script:warnings++
}

Write-Host "`n=== Phase 95B Platform Persistence Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── Gate 1: Dependencies ─────────────────────────────────────
Gate "drizzle-orm in package.json" {
  $pkg = Get-Content -LiteralPath "$root\apps\api\package.json" -Raw | ConvertFrom-Json
  $pkg.dependencies.'drizzle-orm' -ne $null
}

Gate "better-sqlite3 in package.json" {
  $pkg = Get-Content -LiteralPath "$root\apps\api\package.json" -Raw | ConvertFrom-Json
  $pkg.dependencies.'better-sqlite3' -ne $null
}

Gate "drizzle-kit in devDependencies" {
  $pkg = Get-Content -LiteralPath "$root\apps\api\package.json" -Raw | ConvertFrom-Json
  $pkg.devDependencies.'drizzle-kit' -ne $null
}

# ── Gate 2: Schema ───────────────────────────────────────────
Gate "schema.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\db\schema.ts"
}

Gate "schema has 6 tables" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\platform\db\schema.ts" -Raw
  $tables = ([regex]::Matches($content, 'sqliteTable\(')).Count
  $tables -ge 6
}

# ── Gate 3: DB layer files ───────────────────────────────────
Gate "db.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\db\db.ts"
}

Gate "migrate.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\db\migrate.ts"
}

Gate "seed.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\db\seed.ts"
}

Gate "init.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\db\init.ts"
}

# ── Gate 4: Repositories ────────────────────────────────────
$repos = @("payer-repo.ts", "tenant-payer-repo.ts", "capability-repo.ts", "task-repo.ts", "evidence-repo.ts", "audit-repo.ts", "index.ts")
foreach ($r in $repos) {
  Gate "repo/$r exists" {
    Test-Path -LiteralPath "$root\apps\api\src\platform\db\repo\$r"
  }
}

# ── Gate 5: Evidence pipeline ────────────────────────────────
Gate "evidence-ingest.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\payers\evidence-ingest.ts"
}

# ── Gate 6: Admin routes ─────────────────────────────────────
Gate "admin-payer-db-routes.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\routes\admin-payer-db-routes.ts"
}

Gate "admin routes has /admin/payer-db prefix" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\routes\admin-payer-db-routes.ts" -Raw
  $content -match '/admin/payer-db'
}

# ── Gate 7: Admin UI ─────────────────────────────────────────
Gate "payer-db page.tsx exists" {
  Test-Path -LiteralPath "$root\apps\web\src\app\cprs\admin\payer-db\page.tsx"
}

Gate "payer-db UI has 4 tabs" {
  $content = Get-Content -LiteralPath "$root\apps\web\src\app\cprs\admin\payer-db\page.tsx" -Raw
  ($content -match 'payers') -and ($content -match 'capabilities') -and ($content -match 'evidence') -and ($content -match 'audit')
}

# ── Gate 8: Wired into index.ts ──────────────────────────────
Gate "index.ts imports admin-payer-db-routes" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\index.ts" -Raw
  $content -match 'admin-payer-db-routes'
}

Gate "index.ts imports initPlatformDb" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\index.ts" -Raw
  $content -match 'initPlatformDb'
}

Gate "index.ts registers adminPayerDbRoutes" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\index.ts" -Raw
  $content -match 'server\.register\(adminPayerDbRoutes\)'
}

# ── Gate 9: ADR + runbook ────────────────────────────────────
Gate "ADR exists" {
  Test-Path -LiteralPath "$root\docs\decisions\phase95b-platform-persistence.md"
}

Gate "Runbook exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\platform-persistence.md"
}

# ── Gate 10: Admin layout nav ────────────────────────────────
Gate "layout.tsx has Payer DB nav" {
  $content = Get-Content -LiteralPath "$root\apps\web\src\app\cprs\admin\layout.tsx" -Raw
  $content -match 'payer-db'
}

# ── Gate 11: .gitignore ──────────────────────────────────────
Gate ".gitignore has platform.db" {
  $content = Get-Content -LiteralPath "$root\.gitignore" -Raw
  $content -match 'platform\.db'
}

# ── Gate 12: No console.log in new files ─────────────────────
$newFiles = @(
  "$root\apps\api\src\platform\db\schema.ts",
  "$root\apps\api\src\platform\db\db.ts",
  "$root\apps\api\src\platform\db\migrate.ts",
  "$root\apps\api\src\platform\db\seed.ts",
  "$root\apps\api\src\platform\db\init.ts",
  "$root\apps\api\src\platform\payers\evidence-ingest.ts",
  "$root\apps\api\src\routes\admin-payer-db-routes.ts"
)
$consoleLogCount = 0
foreach ($f in $newFiles) {
  if (Test-Path -LiteralPath $f) {
    $lines = Get-Content -LiteralPath $f
    foreach ($line in $lines) {
      if ($line -match 'console\.log') { $consoleLogCount++ }
    }
  }
}
Gate "No console.log in Phase 95B API files" {
  $consoleLogCount -eq 0
}

# ── Gate 13: Prompt file ─────────────────────────────────────
Gate "Prompt file exists" {
  Test-Path -LiteralPath "$root\prompts\99-PHASE-95B-PLATFORM-PERSISTENCE\95B-01-IMPLEMENT.md"
}

# ── Gate 14: Barrel exports ──────────────────────────────────
Gate "platform/index.ts barrel exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\index.ts"
}

Gate "platform/db/repo/index.ts barrel exists" {
  Test-Path -LiteralPath "$root\apps\api\src\platform\db\repo\index.ts"
}

# ── Gate 15: Audit repo is READ-ONLY ─────────────────────────
Gate "audit-repo.ts has no insert/update/delete exports" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\platform\db\repo\audit-repo.ts" -Raw
  -not ($content -match 'export.*function.*(insert|update|delete)Audit')
}

# ── Gate 16: Capability repo requires reason ──────────────────
Gate "capability-repo.ts enforces reason" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\platform\db\repo\capability-repo.ts" -Raw
  $content -match 'reason'
}

# ── Summary ──────────────────────────────────────────────────
Write-Host ""
foreach ($r in $results) {
  if ($r -match '^PASS') { Write-Host $r -ForegroundColor Green }
  elseif ($r -match '^FAIL') { Write-Host $r -ForegroundColor Red }
  else { Write-Host $r -ForegroundColor Yellow }
}

Write-Host "`n--- Summary ---" -ForegroundColor Cyan
Write-Host "PASS: $pass  FAIL: $fail  WARN: $warnings" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "Total gates: $($pass + $fail)"

if ($fail -eq 0) {
  Write-Host "`nPhase 95B: ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "`nPhase 95B: $fail gate(s) FAILED" -ForegroundColor Red
}

exit $fail
