<# Phase 242 -- Payer Adapter Scale Hardening  (Wave 6 P5) #>
param([switch]$Verbose)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
function Test-Gate([string]$name, [scriptblock]$test) {
  try { $r = & $test; if ($r) { Write-Host "  PASS  $name" -F Green; $script:pass++ } else { Write-Host "  FAIL  $name" -F Red; $script:fail++ } }
  catch { Write-Host "  FAIL  $name -- $_" -F Red; $script:fail++ }
}

$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$api = Join-Path (Join-Path $root "apps") "api"

Write-Host "`n=== Phase 242: Payer Adapter Scale Hardening ===`n" -F Cyan

# Gate 1: batch-processor.ts exists
Test-Gate "batch-processor.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/rcm/edi/batch-processor.ts")
}

# Gate 2: health-monitor.ts exists
Test-Gate "health-monitor.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/rcm/connectors/health-monitor.ts")
}

# Gate 3: rcm-scale.ts route file exists
Test-Gate "rcm-scale.ts route file exists" {
  Test-Path -LiteralPath (Join-Path $api "src/routes/rcm-scale.ts")
}

# Gate 4: batch-processor exports submitBatch / getBatchStatus
Test-Gate "batch-processor exports submitBatch + getBatchStatus" {
  $c = Get-Content (Join-Path $api "src/rcm/edi/batch-processor.ts") -Raw
  $c -match 'export\s+(async\s+)?function\s+submitBatch' -and $c -match 'export\s+function\s+getBatchStatus'
}

# Gate 5: health-monitor exports start/stop/getHealthHistory
Test-Gate "health-monitor exports start + stop + getHealthHistory" {
  $c = Get-Content (Join-Path $api "src/rcm/connectors/health-monitor.ts") -Raw
  ($c -match 'export\s+function\s+startHealthMonitor') -and
  ($c -match 'export\s+function\s+stopHealthMonitor') -and
  ($c -match 'export\s+function\s+getHealthHistory')
}

# Gate 6: rcm-scale routes registered in register-routes.ts
Test-Gate "rcm-scale routes registered" {
  $c = Get-Content (Join-Path $api "src/server/register-routes.ts") -Raw
  $c -match 'rcm-scale' -or $c -match 'rcmScale'
}

# Gate 7: lifecycle.ts references health monitor
Test-Gate "lifecycle.ts wires health monitor" {
  $c = Get-Content (Join-Path $api "src/server/lifecycle.ts") -Raw
  $c -match 'startHealthMonitor'
}

# Gate 8: security.ts shutdown references stopHealthMonitor
Test-Gate "security.ts shutdown calls stopHealthMonitor" {
  $c = Get-Content (Join-Path $api "src/middleware/security.ts") -Raw
  $c -match 'stopHealthMonitor'
}

# Gate 9: TypeScript compiles
Test-Gate "TypeScript compiles" {
  Push-Location $root
  $out = pnpm --filter api build 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

# Gate 10: No raw console.log in new files
Test-Gate "No console.log in new P5 files" {
  $files = @(
    (Join-Path $api "src/rcm/edi/batch-processor.ts"),
    (Join-Path $api "src/rcm/connectors/health-monitor.ts"),
    (Join-Path $api "src/routes/rcm-scale.ts")
  )
  $found = $false
  foreach ($f in $files) {
    if (Select-String -Path $f -Pattern 'console\.(log|warn|error)' -Quiet) { $found = $true }
  }
  -not $found
}

# Gate 11: Uses resilientConnectorCall in batch processor
Test-Gate "batch-processor uses resilientConnectorCall" {
  $c = Get-Content (Join-Path $api "src/rcm/edi/batch-processor.ts") -Raw
  $c -match 'resilientConnectorCall'
}

Write-Host "`n--- Results: $pass PASS / $fail FAIL ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
