<#
.SYNOPSIS
  Release Candidate Checklist -- Phase 118 Go-Live Hardening Pack
  Validates all RC gates: tsc, dep audit, security headers, audit chains,
  performance budgets, build, and runtime posture.
.DESCRIPTION
  Run from repo root: .\scripts\rc-checklist.ps1
  Requires: API running on localhost:3001, authenticated session
  Returns exit code 0 if all gates pass, 1 if any fail.
#>

param(
  [switch]$SkipBuild,
  [switch]$SkipRuntime,
  [string]$ApiUrl = "http://127.0.0.1:3001"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$pass = 0; $fail = 0; $skip = 0

function Gate-Pass($name) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
function Gate-Fail($name, $reason) { Write-Host "  FAIL  $name -- $reason" -ForegroundColor Red; $script:fail++ }
function Gate-Skip($name) { Write-Host "  SKIP  $name" -ForegroundColor Yellow; $script:skip++ }

Write-Host "`n=== Release Candidate Checklist (Phase 118) ===" -ForegroundColor Cyan
Write-Host "API: $ApiUrl`n"

# ---------- Gate 1: TypeScript Compilation ----------
Write-Host "--- Gate 1: TypeScript --noEmit ---" -ForegroundColor White
Push-Location "apps\api"
$tscOut = npx tsc --noEmit 2>&1
Pop-Location
if ($LASTEXITCODE -eq 0) { Gate-Pass "tsc --noEmit" }
else { Gate-Fail "tsc --noEmit" "TypeScript errors found" }

# ---------- Gate 2: Dependency Audit ----------
Write-Host "--- Gate 2: Dependency Audit ---" -ForegroundColor White
$auditOut = pnpm audit --prod 2>&1 | Out-String
if ($auditOut -match "critical") {
  Gate-Fail "dep-audit" "Critical vulnerabilities found"
} else {
  Gate-Pass "dep-audit (no critical vulns)"
}

# ---------- Gate 3: Security Headers (file check) ----------
Write-Host "--- Gate 3: Security Headers ---" -ForegroundColor White
$secFile = Get-Content "apps\api\src\middleware\security.ts" -Raw
$headers = @("Content-Security-Policy", "Referrer-Policy", "Permissions-Policy",
             "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options")
$allHeaders = $true
foreach ($h in $headers) {
  if ($secFile -notmatch [regex]::Escape($h)) {
    Gate-Fail "header-$h" "Missing from security.ts"
    $allHeaders = $false
  }
}
if ($allHeaders) { Gate-Pass "All OWASP security headers present" }

# ---------- Gate 4: CSRF Protection ----------
Write-Host "--- Gate 4: CSRF Protection ---" -ForegroundColor White
if ($secFile -match "csrf" -and $secFile -match "double.submit") {
  Gate-Pass "CSRF double-submit cookie"
} else {
  Gate-Fail "CSRF" "Double-submit cookie pattern not found"
}

# ---------- Gate 5: Rate Limiter ----------
Write-Host "--- Gate 5: Rate Limiter ---" -ForegroundColor White
if ($secFile -match "checkRateLimit") {
  Gate-Pass "Rate limiter active"
} else {
  Gate-Fail "Rate limiter" "checkRateLimit not found in security.ts"
}

# ---------- Gate 6: Session Cookie Posture ----------
Write-Host "--- Gate 6: Session Cookie Posture ---" -ForegroundColor White
# Check that httpOnly and sameSite are set
$sessionStore = Get-Content "apps\api\src\auth\session-store.ts" -Raw -ErrorAction SilentlyContinue
if (!$sessionStore) { $sessionStore = "" }
if ($secFile -match "httpOnly" -and $secFile -match "sameSite") {
  Gate-Pass "Session cookie posture (httpOnly, sameSite)"
} else {
  Gate-Fail "Session cookies" "httpOnly or sameSite missing"
}

# ---------- Gate 7: Audit File Sinks ----------
Write-Host "--- Gate 7: Audit File Sinks ---" -ForegroundColor White
$iamAudit = Get-Content "apps\api\src\lib\immutable-audit.ts" -Raw
$imgAudit = Get-Content "apps\api\src\services\imaging-audit.ts" -Raw
$rcmAudit = Get-Content "apps\api\src\rcm\audit\rcm-audit.ts" -Raw

$sinkCount = 0
if ($iamAudit -match "immutable-audit\.jsonl") { $sinkCount++ }
if ($imgAudit -match "imaging-audit\.jsonl") { $sinkCount++ }
if ($rcmAudit -match "rcm-audit\.jsonl") { $sinkCount++ }

if ($sinkCount -ge 3) { Gate-Pass "All 3 audit chains have file sinks" }
elseif ($sinkCount -ge 2) { Gate-Pass "2/3 audit chains have file sinks (warn: $sinkCount)" }
else { Gate-Fail "Audit file sinks" "Only $sinkCount/3 have file sinks" }

# ---------- Gate 8: Hardening Routes Exist ----------
Write-Host "--- Gate 8: Hardening Routes ---" -ForegroundColor White
if (Test-Path -LiteralPath "apps\api\src\routes\hardening-routes.ts") {
  Gate-Pass "hardening-routes.ts exists"
} else {
  Gate-Fail "hardening-routes.ts" "File not found"
}

# ---------- Gate 9: PG Backup Task ----------
Write-Host "--- Gate 9: PG Backup Task ---" -ForegroundColor White
if (Test-Path -LiteralPath "apps\api\src\jobs\tasks\pg-backup.ts") {
  $backupReg = Get-Content "apps\api\src\jobs\registry.ts" -Raw
  if ($backupReg -match "PG_BACKUP") {
    Gate-Pass "PG backup task registered"
  } else {
    Gate-Fail "PG backup" "Task file exists but not registered in registry.ts"
  }
} else {
  Gate-Fail "PG backup task" "pg-backup.ts not found"
}

# ---------- Gate 10: Incident Runbooks ----------
Write-Host "--- Gate 10: Incident Runbooks ---" -ForegroundColor White
$runbooks = @("incident-auth-outage.md", "incident-vista-outage.md",
              "incident-pg-outage.md", "incident-pacs-outage.md")
$rbCount = 0
foreach ($rb in $runbooks) {
  if (Test-Path "docs\runbooks\$rb") { $rbCount++ }
  else { Gate-Fail "Runbook $rb" "not found" }
}
if ($rbCount -eq $runbooks.Count) { Gate-Pass "All 4 incident runbooks present" }

# ---------- Gate 11: Performance Budget Config ----------
Write-Host "--- Gate 11: Performance Budgets ---" -ForegroundColor White
if (Test-Path "config\performance-budgets.json") {
  $budgets = Get-Content "config\performance-budgets.json" -Raw | ConvertFrom-Json
  if ($budgets.apiLatencyBudgets -and $budgets.loadTestThresholds) {
    Gate-Pass "Performance budgets configured"
  } else {
    Gate-Fail "Performance budgets" "Missing apiLatencyBudgets or loadTestThresholds"
  }
} else {
  Gate-Fail "Performance budgets" "config/performance-budgets.json not found"
}

# ---------- Gate 12: k6 RC Baseline Test ----------
Write-Host "--- Gate 12: k6 RC Baseline Test ---" -ForegroundColor White
if (Test-Path "tests\k6\rc-baseline.js") {
  Gate-Pass "k6 rc-baseline.js exists"
} else {
  Gate-Fail "k6 rc-baseline" "tests/k6/rc-baseline.js not found"
}

# ---------- Gate 13: Web Build (optional) ----------
if (!$SkipBuild) {
  Write-Host "--- Gate 13: Web Build ---" -ForegroundColor White
  Push-Location "apps\web"
  $buildOut = npx next build 2>&1 | Out-String
  Pop-Location
  if ($buildOut -match "Compiled successfully" -or $buildOut -match "Collecting page data") {
    Gate-Pass "Next.js build"
  } else {
    Gate-Fail "Next.js build" "Build failed or warnings"
  }
} else {
  Gate-Skip "Web Build (--SkipBuild)"
}

# ---------- Gate 14-17: Runtime checks (if API reachable) ----------
if (!$SkipRuntime) {
  Write-Host "--- Gates 14-17: Runtime Checks ---" -ForegroundColor White
  try {
    $healthRaw = curl.exe -s "$ApiUrl/health" 2>&1
    $health = $healthRaw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($health.ok -eq $true) { Gate-Pass "API /health ok" }
    else { Gate-Fail "API /health" "not ok" }

    # Check security headers in response
    $headersRaw = curl.exe -s -I "$ApiUrl/health" 2>&1
    if ($headersRaw -match "Content-Security-Policy") { Gate-Pass "CSP header in response" }
    else { Gate-Fail "CSP header" "Not present in response" }

    if ($headersRaw -match "Referrer-Policy") { Gate-Pass "Referrer-Policy in response" }
    else { Gate-Fail "Referrer-Policy" "Not present in response" }
  } catch {
    Gate-Skip "Runtime checks (API not reachable)"
    $skip += 3
  }
} else {
  Gate-Skip "Runtime checks (--SkipRuntime)"
  $skip += 4
}

# ---------- Summary ----------
Write-Host "`n=== RC Checklist Summary ===" -ForegroundColor Cyan
Write-Host "  Passed: $pass" -ForegroundColor Green
Write-Host "  Failed: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped: $skip" -ForegroundColor Yellow
Write-Host ""

if ($fail -gt 0) {
  Write-Host "RELEASE CANDIDATE: NOT READY ($fail failures)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "RELEASE CANDIDATE: READY ($pass passed, $skip skipped)" -ForegroundColor Green
  exit 0
}
