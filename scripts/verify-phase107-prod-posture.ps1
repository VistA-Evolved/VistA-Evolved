<# Phase 107 -- Production Posture Pack Verifier

   Gates:
    1. Posture module files exist (5 files under apps/api/src/posture/)
    2. Posture routes registered in index.ts
    3. AUTH_RULES include /posture (admin-only)
    4. Backup-restore script exists
    5. QA gate script exists
    6. qa:prod-posture registered in root package.json
    7. Performance budgets file valid
    8. Runbook exists
    9. Tenant RLS infrastructure present (applyRlsPolicies in pg-migrate.ts)
   10. OTel + logger + audit + metrics modules present
   11. Prompt file exists
   12. AGENTS.md updated (Phase 107)
   13. No console.log in posture modules
   14. TypeScript compiles (apps/api)
   15. QA gate passes offline
#>

param([switch]$SkipDocker, [switch]$SkipTsc)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$total = 0

function Gate([string]$label, [bool]$ok, [string]$detail) {
    $script:total++
    if ($ok) { $script:pass++; Write-Host "  PASS  $label" }
    else { $script:fail++; Write-Host "  FAIL  $label -- $detail" }
}

Write-Host "`n=== Phase 107: Production Posture Pack Verifier ===`n"

# 1. Posture module files
$postureFiles = @(
    "apps\api\src\posture\index.ts",
    "apps\api\src\posture\observability-posture.ts",
    "apps\api\src\posture\tenant-posture.ts",
    "apps\api\src\posture\perf-posture.ts",
    "apps\api\src\posture\backup-posture.ts"
)
foreach ($f in $postureFiles) {
    $fp = Join-Path $root $f
    Gate "posture module: $(Split-Path $f -Leaf)" (Test-Path -LiteralPath $fp) "$f missing"
}

# 2. Posture routes registered in index.ts
$indexSrc = Get-Content (Join-Path $root "apps\api\src\index.ts") -Raw
Gate "posture routes imported" ($indexSrc -match 'import postureRoutes') "import not found in index.ts"
Gate "posture routes registered" ($indexSrc -match 'server\.register\(postureRoutes\)') "register call not found"

# 3. AUTH_RULES include /posture
$secSrc = Get-Content (Join-Path $root "apps\api\src\middleware\security.ts") -Raw
Gate "AUTH_RULES /posture" ($secSrc -match '\\\/posture') "/posture not in AUTH_RULES"

# 4. Backup-restore script
Gate "backup-restore.mjs" (Test-Path -LiteralPath (Join-Path $root "scripts\backup-restore.mjs")) "missing"

# 5. QA gate script
Gate "qa-gate prod-posture.mjs" (Test-Path -LiteralPath (Join-Path $root "scripts\qa-gates\prod-posture.mjs")) "missing"

# 6. qa:prod-posture in package.json
$pkgJson = Get-Content (Join-Path $root "package.json") -Raw
Gate "qa:prod-posture in package.json" ($pkgJson -match 'qa:prod-posture') "script not registered"

# 7. Performance budgets
$budgetsPath = Join-Path $root "config\performance-budgets.json"
$budgetsOk = $false
if (Test-Path -LiteralPath $budgetsPath) {
    try {
        $raw = [System.IO.File]::ReadAllText($budgetsPath)
        if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
        $null = $raw | ConvertFrom-Json
        $budgetsOk = $true
    } catch {}
}
Gate "performance-budgets.json valid" $budgetsOk "invalid or missing"

# 8. Runbook
Gate "runbook" (Test-Path -LiteralPath (Join-Path $root "docs\runbooks\phase107-production-posture.md")) "missing"

# 9. Tenant RLS infrastructure
$pgMigrateSrc = ""
$pgMigratePath = Join-Path $root "apps\api\src\platform\pg\pg-migrate.ts"
if (Test-Path -LiteralPath $pgMigratePath) { $pgMigrateSrc = Get-Content $pgMigratePath -Raw }
Gate "applyRlsPolicies in pg-migrate" ($pgMigrateSrc -match 'applyRlsPolicies') "function not found"

# 10. OTel + logger + audit + metrics
Gate "logger.ts" (Test-Path -LiteralPath (Join-Path $root "apps\api\src\lib\logger.ts")) "missing"
Gate "metrics.ts" (Test-Path -LiteralPath (Join-Path $root "apps\api\src\telemetry\metrics.ts")) "missing"
Gate "tracing.ts" (Test-Path -LiteralPath (Join-Path $root "apps\api\src\telemetry\tracing.ts")) "missing"
Gate "audit.ts" (Test-Path -LiteralPath (Join-Path $root "apps\api\src\lib\audit.ts")) "missing"

# 11. Prompt file
Gate "prompt file" (Test-Path -LiteralPath (Join-Path $root "prompts\111-PHASE-107-PRODUCTION-POSTURE\107-01-IMPLEMENT.md")) "missing"

# 12. AGENTS.md updated
$agentsSrc = Get-Content (Join-Path $root "AGENTS.md") -Raw
Gate "AGENTS.md Phase 107" ($agentsSrc -match 'Phase 107') "no Phase 107 mention"

# 13. No console.log in posture modules
$consoleCount = 0
foreach ($f in $postureFiles) {
    $fp = Join-Path $root $f
    if (Test-Path -LiteralPath $fp) {
        $src = Get-Content $fp -Raw
        $matches2 = [regex]::Matches($src, 'console\.(log|warn|error)')
        $consoleCount += $matches2.Count
    }
}
Gate "no console.log in posture" ($consoleCount -eq 0) "$consoleCount calls found"

# 14. TypeScript compiles
if (-not $SkipTsc) {
    Push-Location (Join-Path $root "apps\api")
    try {
        $tscOut = npx tsc --noEmit 2>&1 | Out-String
        $tscOk = $LASTEXITCODE -eq 0
    } catch { $tscOk = $false; $tscOut = $_.Exception.Message }
    Pop-Location
    Gate "TypeScript compiles (apps/api)" $tscOk "tsc --noEmit failed"
} else {
    Gate "TypeScript compiles (skipped)" $true ""
}

# 15. QA gate passes offline
try {
    Push-Location $root
    $qaOut = node scripts/qa-gates/prod-posture.mjs 2>&1 | Out-String
    $qaOk = $LASTEXITCODE -eq 0
    Pop-Location
} catch { $qaOk = $false; Pop-Location }
Gate "qa:prod-posture offline" $qaOk "prod-posture.mjs failed"

# ---- Summary ----
Write-Host "`n=== Phase 107 Results: $pass/$total PASS, $fail FAIL ===`n"

if ($fail -gt 0) {
    Write-Host "Some gates FAILED. Review output above."
    exit 1
} else {
    Write-Host "All gates PASSED."
    exit 0
}
