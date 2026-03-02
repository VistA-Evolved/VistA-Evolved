# scripts/security/run-precert.ps1
# Phase 506 -- Security Pre-Certification Pack
# Static analysis security checks for RC readiness.
# ASCII only (BUG-055). PowerShell 5.1 compatible.
#
# Usage:
#   powershell -File scripts\security\run-precert.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "Security Pre-Cert (Phase 506)"
Write-Host "  Root: $root"
Write-Host ""

$totalPass = 0
$totalFail = 0

function SecurityCheck([string]$label, [bool]$ok, [string]$detail) {
  $tag = if ($ok) { "PASS" } else { "FAIL" }
  Write-Host "  [$tag] $label"
  if ($detail) { Write-Host "         $detail" }
  if ($ok) { $script:totalPass++ } else { $script:totalFail++ }
  return @{ label = $label; status = $tag; detail = $detail }
}

$allResults = New-Object System.Collections.ArrayList

# ---- 1. No hardcoded credentials outside login page ----
# Exclude: test files, tools/ (offline CLIs), config.ts (doc comments),
#          session-store.ts (comment-only), logger.test.ts
$credFiles = Get-ChildItem -Path "$root\apps\api\src" -Recurse -Include "*.ts" -File |
  Where-Object {
    $_.Name -ne "page.tsx" -and
    $_.FullName -notmatch '__tests__' -and
    $_.Name -notmatch '\.test\.ts$' -and
    $_.FullName -notmatch '\\tools\\' -and
    $_.Name -ne "config.ts"
  } |
  Select-String -Pattern "PROV123|PHARM123|NURSE123" -SimpleMatch |
  Where-Object { $_.Line -notmatch '^\s*//' } |
  Select-Object -ExpandProperty Path -Unique
$credOk = ($null -eq $credFiles) -or ($credFiles.Count -eq 0)
[void]$allResults.Add((SecurityCheck "No hardcoded credentials in API src" $credOk "Found in: $($credFiles -join ', ')"))

# ---- 2. Console.log budget (production server code only) ----
# Exclude: tools/ (offline CLIs), logger.ts (the logger itself),
#          test files, telemetry/register.ts (OTel bootstrap)
$clFiles = Get-ChildItem -Path "$root\apps\api\src" -Recurse -Include "*.ts" -File |
  Where-Object {
    $_.FullName -notmatch '\\tools\\' -and
    $_.Name -ne "logger.ts" -and
    $_.Name -notmatch '\.test\.ts$' -and
    $_.FullName -notmatch '__tests__' -and
    $_.Name -ne "register.ts"
  } |
  Select-String -Pattern "console\.(log|warn|error)" |
  Where-Object { $_.Line -notmatch '//.*console\.' }
$clCount = if ($null -eq $clFiles) { 0 } else { $clFiles.Count }
$clOk = $clCount -le 6
[void]$allResults.Add((SecurityCheck "Console.log budget <= 6 (found: $clCount)" $clOk ""))

# ---- 3. PHI redaction module exists ----
$phiRedaction = Test-Path -LiteralPath "$root\apps\api\src\lib\phi-redaction.ts"
[void]$allResults.Add((SecurityCheck "PHI redaction module exists" $phiRedaction "phi-redaction.ts"))

# ---- 4. CSRF protection ----
$csrfExists = Test-Path -LiteralPath "$root\apps\web\src\lib\csrf.ts"
[void]$allResults.Add((SecurityCheck "CSRF client module exists" $csrfExists "apps/web/src/lib/csrf.ts"))

$csrfInSecurity = $false
$secFile = "$root\apps\api\src\middleware\security.ts"
if (Test-Path -LiteralPath $secFile) {
  $secContent = [System.IO.File]::ReadAllText($secFile)
  $csrfInSecurity = $secContent -match "csrf|CSRF"
}
[void]$allResults.Add((SecurityCheck "CSRF referenced in security middleware" $csrfInSecurity "security.ts"))

# ---- 5. Auth rules coverage ----
$authRulesExist = $false
if (Test-Path -LiteralPath $secFile) {
  $authRulesExist = $secContent -match "AUTH_RULES"
}
[void]$allResults.Add((SecurityCheck "AUTH_RULES defined in security middleware" $authRulesExist "security.ts"))

# ---- 6. Rate limiter ----
$rateLimiter = $false
if (Test-Path -LiteralPath $secFile) {
  $rateLimiter = $secContent -match "rate.limit|rateLimit|RATE_LIMIT"
}
[void]$allResults.Add((SecurityCheck "Rate limiter configured" $rateLimiter "security.ts"))

# ---- 7. Hash-chained audit ----
$auditFile = "$root\apps\api\src\lib\immutable-audit.ts"
$auditChain = $false
if (Test-Path -LiteralPath $auditFile) {
  $auditContent = [System.IO.File]::ReadAllText($auditFile)
  $auditChain = $auditContent -match "SHA-256|sha256|previousHash|hash.*chain"
}
[void]$allResults.Add((SecurityCheck "Immutable audit is hash-chained" $auditChain "immutable-audit.ts"))

# ---- 8. Session security ----
$sessionSec = Test-Path -LiteralPath "$root\apps\api\src\auth\session-security.ts"
[void]$allResults.Add((SecurityCheck "Session security module exists" $sessionSec "auth/session-security.ts"))

# ---- 9. Policy engine ----
$policyEngine = Test-Path -LiteralPath "$root\apps\api\src\auth\policy-engine.ts"
[void]$allResults.Add((SecurityCheck "Policy engine exists" $policyEngine "auth/policy-engine.ts"))

# ---- 10. No .env files committed ----
$envCommitted = Test-Path -LiteralPath "$root\apps\api\.env.local"
$gitTracked = $false
if ($envCommitted) {
  Push-Location $root
  $gitCheck = git ls-files --error-unmatch "apps/api/.env.local" 2>&1
  $gitTracked = ($LASTEXITCODE -eq 0)
  Pop-Location
}
[void]$allResults.Add((SecurityCheck ".env.local not git-tracked" (-not $gitTracked) ""))

# ---- Summary ----
Write-Host ""
Write-Host "  === Security Pre-Cert Summary ==="
Write-Host "  PASS: $totalPass  FAIL: $totalFail"

# Write report
$evDir = Join-Path $root "evidence\wave-35\506-W35-P7-SECURITY-PRECERT"
if (-not (Test-Path -LiteralPath $evDir)) {
  New-Item -ItemType Directory -Path $evDir -Force | Out-Null
}

$report = @{
  generatedAt = (Get-Date -Format 'o')
  pass        = $totalPass
  fail        = $totalFail
  results     = [object[]]$allResults.ToArray()
}

$jsonText = $report | ConvertTo-Json -Depth 5
$reportFile = Join-Path $evDir "precert-report.json"
[System.IO.File]::WriteAllText($reportFile, $jsonText, [System.Text.Encoding]::ASCII)
Write-Host "  Report: $reportFile"

if ($totalFail -gt 0) { exit 1 } else { exit 0 }
