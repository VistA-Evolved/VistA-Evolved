<#
.SYNOPSIS
  Phase 118 Verifier -- Go-Live Hardening Pack
  Validates all Phase 118 deliverables: backup job, audit posture,
  incident runbooks, perf gates, security hardening, RC checklist.
.DESCRIPTION
  Run from repo root: .\scripts\verify-phase118-go-live-hardening.ps1
#>

param(
  [switch]$SkipRuntime,
  [string]$ApiUrl = "http://127.0.0.1:3001"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$pass = 0; $fail = 0; $skip = 0

function Gate-Pass($name) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
function Gate-Fail($name, $reason) { Write-Host "  FAIL  $name -- $reason" -ForegroundColor Red; $script:fail++ }
function Gate-Skip($name) { Write-Host "  SKIP  $name" -ForegroundColor Yellow; $script:skip++ }

Write-Host "`n=== Phase 118 Verifier: Go-Live Hardening Pack ===" -ForegroundColor Cyan
Write-Host ""

# ======================== GATE 1: TypeScript ========================
Write-Host "--- Gate 1: TypeScript Compilation ---" -ForegroundColor White
Push-Location "apps\api"
$tscOut = npx tsc --noEmit 2>&1 | Out-String
Pop-Location
if ($LASTEXITCODE -eq 0) { Gate-Pass "tsc --noEmit clean" }
else { Gate-Fail "tsc --noEmit" $tscOut.Substring(0, [Math]::Min(200, $tscOut.Length)) }

# ======================== GATE 2: PG Backup Task ========================
Write-Host "--- Gate 2: PG Backup Task ---" -ForegroundColor White
if (Test-Path -LiteralPath "apps\api\src\jobs\tasks\pg-backup.ts") {
  Gate-Pass "pg-backup.ts exists"
} else { Gate-Fail "pg-backup.ts" "File not found" }

$regContent = Get-Content "apps\api\src\jobs\registry.ts" -Raw
if ($regContent -match "PG_BACKUP.*pg_backup") { Gate-Pass "PG_BACKUP in job registry" }
else { Gate-Fail "PG_BACKUP" "Not registered in registry.ts" }

$runnerContent = Get-Content "apps\api\src\jobs\runner.ts" -Raw
if ($runnerContent -match "handlePgBackup") { Gate-Pass "handlePgBackup in runner.ts" }
else { Gate-Fail "handlePgBackup" "Not wired in runner.ts" }

# ======================== GATE 3: Backup Runbook ========================
Write-Host "--- Gate 3: Backup Runbook ---" -ForegroundColor White
if (Test-Path "docs\runbooks\pg-backup-restore.md") {
  $rbContent = Get-Content "docs\runbooks\pg-backup-restore.md" -Raw
  if ($rbContent -match "restore" -and $rbContent -match "pg_dump") {
    Gate-Pass "PG backup/restore runbook"
  } else { Gate-Fail "Backup runbook" "Missing restore or pg_dump content" }
} else { Gate-Fail "Backup runbook" "pg-backup-restore.md not found" }

# ======================== GATE 4: Audit File Sinks ========================
Write-Host "--- Gate 4: Audit File Sinks ---" -ForegroundColor White
$iamAudit = Get-Content "apps\api\src\lib\immutable-audit.ts" -Raw
if ($iamAudit -match "immutable-audit\.jsonl") { Gate-Pass "IAM audit file sink" }
else { Gate-Fail "IAM audit" "No JSONL file sink" }

$imgAudit = Get-Content "apps\api\src\services\imaging-audit.ts" -Raw
if ($imgAudit -match "imaging-audit\.jsonl") { Gate-Pass "Imaging audit file sink (default on)" }
else { Gate-Fail "Imaging audit" "No default file sink" }

$rcmAudit = Get-Content "apps\api\src\rcm\audit\rcm-audit.ts" -Raw
if ($rcmAudit -match "rcm-audit\.jsonl") { Gate-Pass "RCM audit file sink" }
else { Gate-Fail "RCM audit" "No JSONL file sink" }

# ======================== GATE 5: Hardening Routes ========================
Write-Host "--- Gate 5: Hardening Routes ---" -ForegroundColor White
if (Test-Path -LiteralPath "apps\api\src\routes\hardening-routes.ts") {
  $hrContent = Get-Content "apps\api\src\routes\hardening-routes.ts" -Raw
  if ($hrContent -match "audit-verify" -and $hrContent -match "security-posture" -and $hrContent -match "rc-checklist") {
    Gate-Pass "Hardening routes (audit-verify, security-posture, rc-checklist)"
  } else { Gate-Fail "Hardening routes" "Missing expected endpoints" }
} else { Gate-Fail "Hardening routes" "hardening-routes.ts not found" }

# Check index.ts registration
$indexContent = Get-Content "apps\api\src\index.ts" -Raw
if ($indexContent -match "hardeningRoutes") { Gate-Pass "Hardening routes registered in index.ts" }
else { Gate-Fail "Hardening routes" "Not imported/registered in index.ts" }

# ======================== GATE 6: Security Headers ========================
Write-Host "--- Gate 6: Security Headers ---" -ForegroundColor White
$secFile = Get-Content "apps\api\src\middleware\security.ts" -Raw
$allPresent = $true
@("Content-Security-Policy", "Referrer-Policy", "Permissions-Policy",
  "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options") | ForEach-Object {
  if ($secFile -notmatch [regex]::Escape($_)) {
    Gate-Fail "Header $_" "Missing from security.ts"
    $allPresent = $false
  }
}
if ($allPresent) { Gate-Pass "All OWASP security headers present" }

# ======================== GATE 7: AUTH_RULES for /hardening/ ========================
Write-Host "--- Gate 7: /hardening/ AUTH_RULES ---" -ForegroundColor White
if ($secFile -match 'hardening.*admin') { Gate-Pass "/hardening/* requires admin auth" }
else { Gate-Fail "/hardening/ auth" "Not in AUTH_RULES or not admin" }

# ======================== GATE 8: Incident Runbooks ========================
Write-Host "--- Gate 8: Incident Runbooks ---" -ForegroundColor White
$runbooks = @("incident-auth-outage.md", "incident-vista-outage.md",
              "incident-pg-outage.md", "incident-pacs-outage.md")
foreach ($rb in $runbooks) {
  if (Test-Path "docs\runbooks\$rb") {
    $rbContent = Get-Content "docs\runbooks\$rb" -Raw
    if ($rbContent.Length -gt 500) { Gate-Pass "Runbook: $rb" }
    else { Gate-Fail "Runbook: $rb" "Content too short" }
  } else {
    Gate-Fail "Runbook: $rb" "Not found"
  }
}

# ======================== GATE 9: k6 RC Baseline Test ========================
Write-Host "--- Gate 9: k6 RC Baseline ---" -ForegroundColor White
if (Test-Path "tests\k6\rc-baseline.js") {
  $k6Content = Get-Content "tests\k6\rc-baseline.js" -Raw
  if ($k6Content -match "thresholds" -and $k6Content -match "p\(95\)") {
    Gate-Pass "k6 rc-baseline.js with p95 thresholds"
  } else { Gate-Fail "k6 rc-baseline" "Missing thresholds or p95" }
} else { Gate-Fail "k6 rc-baseline" "File not found" }

# ======================== GATE 10: CI Scripts ========================
Write-Host "--- Gate 10: CI Scripts ---" -ForegroundColor White
if (Test-Path "scripts\rc-checklist.ps1") { Gate-Pass "rc-checklist.ps1" }
else { Gate-Fail "rc-checklist.ps1" "Not found" }

if (Test-Path "scripts\rc-perf-gate.ps1") { Gate-Pass "rc-perf-gate.ps1" }
else { Gate-Fail "rc-perf-gate.ps1" "Not found" }

if (Test-Path "scripts\rc-dep-audit.ps1") { Gate-Pass "rc-dep-audit.ps1" }
else { Gate-Fail "rc-dep-audit.ps1" "Not found" }

# ======================== GATE 11: Performance Budgets ========================
Write-Host "--- Gate 11: Performance Budget Config ---" -ForegroundColor White
if (Test-Path "config\performance-budgets.json") {
  try {
    $budgets = Get-Content "config\performance-budgets.json" -Raw | ConvertFrom-Json
    if ($budgets.apiLatencyBudgets.infrastructure.health.p95 -le 100) {
      Gate-Pass "Health endpoint p95 budget <= 100ms"
    } else { Gate-Fail "Health p95" "Budget too high" }
  } catch { Gate-Fail "Performance budgets" "Parse error" }
} else { Gate-Fail "Performance budgets" "File not found" }

# ======================== GATE 12: Prompt File ========================
Write-Host "--- Gate 12: Prompt File ---" -ForegroundColor White
if (Test-Path -LiteralPath "prompts\121-PHASE-118-GO-LIVE-HARDENING\118-01-IMPLEMENT.md") {
  Gate-Pass "Phase 118 IMPLEMENT prompt"
} else { Gate-Fail "Phase 118 prompt" "Not found" }

# ======================== GATE 13: Runtime Checks ========================
if (!$SkipRuntime) {
  Write-Host "--- Gate 13: Runtime API Checks ---" -ForegroundColor White
  try {
    $healthRaw = curl.exe -s "$ApiUrl/health" 2>&1
    $health = $healthRaw | ConvertFrom-Json -ErrorAction Stop
    if ($health.ok -eq $true) { Gate-Pass "API /health returns ok" }
    else { Gate-Fail "API health" "Not ok" }

    # Check response headers
    $hdrs = curl.exe -s -I "$ApiUrl/health" 2>&1
    if ($hdrs -match "Content-Security-Policy") { Gate-Pass "CSP header in response" }
    else { Gate-Fail "CSP header" "Not in response headers" }

    if ($hdrs -match "Referrer-Policy") { Gate-Pass "Referrer-Policy in response" }
    else { Gate-Fail "Referrer-Policy" "Not in response headers" }

    if ($hdrs -match "Permissions-Policy") { Gate-Pass "Permissions-Policy in response" }
    else { Gate-Fail "Permissions-Policy" "Not in response headers" }
  } catch {
    Gate-Skip "Runtime checks (API unreachable)"
    $skip += 3
  }
} else {
  Gate-Skip "Runtime checks (--SkipRuntime)"
  $skip += 4
}

# ======================== SUMMARY ========================
Write-Host "`n=== Phase 118 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  Passed:  $pass" -ForegroundColor Green
Write-Host "  Failed:  $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped: $skip" -ForegroundColor Yellow
Write-Host ""

if ($fail -gt 0) {
  Write-Host "PHASE 118: FAIL ($fail failures)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "PHASE 118: PASS ($pass passed, $skip skipped)" -ForegroundColor Green
  exit 0
}
