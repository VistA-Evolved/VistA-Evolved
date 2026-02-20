<# Phase 54 Verifier -- Alignment Audit v2 + Triage Generator

   Gates:
     G54-1  Entrypoint runs in offline mode
     G54-2  Produces audit-summary.json
     G54-3  Produces audit-summary.txt
     G54-4  All offline modules present in summary
     G54-5  Triage generator produces triage.md
     G54-6  Artifacts dir is gitignored
     G54-7  No audit artifacts committed to git
     G54-8  Audit types/modules exist
#>

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $warn = 0

function Gate-Pass($id, $msg) {
  Write-Host "  [PASS] $id -- $msg" -ForegroundColor Green
  $script:pass++
}
function Gate-Fail($id, $msg) {
  Write-Host "  [FAIL] $id -- $msg" -ForegroundColor Red
  $script:fail++
}
function Gate-Warn($id, $msg) {
  Write-Host "  [WARN] $id -- $msg" -ForegroundColor Yellow
  $script:warn++
}

Push-Location $PSScriptRoot\..
$root = (Resolve-Path .).Path
Pop-Location
Push-Location $root

try {
  Write-Host "`n=== Phase 54 Verification ===" -ForegroundColor Cyan
  Write-Host ""

  # ---- G54-8: Audit framework files exist ----
  $requiredFiles = @(
    "scripts\audit\run-audit.ts",
    "scripts\audit\types.ts",
    "scripts\audit\generate-triage.ts",
    "scripts\audit\run-audit.ps1",
    "scripts\audit\modules\promptsAudit.ts",
    "scripts\audit\modules\docsPolicyAudit.ts",
    "scripts\audit\modules\rpcGatingAudit.ts",
    "scripts\audit\modules\actionTraceAudit.ts",
    "scripts\audit\modules\deadClickAudit.ts",
    "scripts\audit\modules\secretScanAudit.ts",
    "scripts\audit\modules\phiLogScanAudit.ts",
    "scripts\audit\modules\fakeSuccessAudit.ts",
    "scripts\audit\modules\authRegressionAudit.ts",
    "scripts\audit\modules\perfSmokeAudit.ts"
  )
  $allExist = $true
  foreach ($f in $requiredFiles) {
    if (!(Test-Path -LiteralPath $f)) {
      Gate-Fail "G54-8" "Missing: $f"
      $allExist = $false
    }
  }
  if ($allExist) { Gate-Pass "G54-8" "All $($requiredFiles.Count) audit framework files exist" }

  # ---- G54-1: Run audit in offline mode ----
  Write-Host "`n  Running audit (offline mode)..." -ForegroundColor Gray
  & npx tsx scripts/audit/run-audit.ts --mode=offline 2>&1 | Out-Null
  $auditExit = $LASTEXITCODE
  # We allow non-zero exit if there are findings -- the point is it ran
  if (Test-Path -LiteralPath "artifacts\audit\audit-summary.json") {
    Gate-Pass "G54-1" "Audit entrypoint ran successfully"
  } else {
    Gate-Fail "G54-1" "Audit entrypoint did not produce summary"
  }

  # ---- G54-2: JSON output ----
  if (Test-Path -LiteralPath "artifacts\audit\audit-summary.json") {
    $json = Get-Content "artifacts\audit\audit-summary.json" -Raw | ConvertFrom-Json
    if ($json.version -eq "2.0" -and $json.modules.Count -gt 0) {
      Gate-Pass "G54-2" "audit-summary.json valid (version=$($json.version), modules=$($json.modules.Count))"
    } else {
      Gate-Fail "G54-2" "audit-summary.json invalid structure"
    }
  } else {
    Gate-Fail "G54-2" "audit-summary.json not found"
  }

  # ---- G54-3: TXT output ----
  if (Test-Path -LiteralPath "artifacts\audit\audit-summary.txt") {
    $txtSize = (Get-Item "artifacts\audit\audit-summary.txt").Length
    if ($txtSize -gt 100) {
      Gate-Pass "G54-3" "audit-summary.txt exists ($txtSize bytes)"
    } else {
      Gate-Fail "G54-3" "audit-summary.txt too small ($txtSize bytes)"
    }
  } else {
    Gate-Fail "G54-3" "audit-summary.txt not found"
  }

  # ---- G54-4: All offline modules in summary ----
  $expectedModules = @(
    "promptsAudit",
    "docsPolicyAudit",
    "rpcGatingAudit",
    "actionTraceAudit",
    "deadClickAudit",
    "secretScanAudit",
    "phiLogScanAudit",
    "fakeSuccessAudit"
  )
  if ($json) {
    $moduleNames = @($json.modules | ForEach-Object { $_.module })
    $allPresent = $true
    foreach ($em in $expectedModules) {
      if ($em -notin $moduleNames) {
        Gate-Fail "G54-4" "Missing module in summary: $em"
        $allPresent = $false
      }
    }
    if ($allPresent) { Gate-Pass "G54-4" "All $($expectedModules.Count) offline modules present" }
  } else {
    Gate-Fail "G54-4" "Cannot check modules -- no JSON"
  }

  # ---- G54-5: Triage generator ----
  Write-Host "`n  Running triage generator..." -ForegroundColor Gray
  & npx tsx scripts/audit/generate-triage.ts 2>&1 | Out-Null
  if (Test-Path -LiteralPath "artifacts\audit\triage.md") {
    $triageSize = (Get-Item "artifacts\audit\triage.md").Length
    if ($triageSize -gt 100) {
      Gate-Pass "G54-5" "triage.md generated ($triageSize bytes)"
    } else {
      Gate-Fail "G54-5" "triage.md too small"
    }
  } else {
    Gate-Fail "G54-5" "triage.md not generated"
  }

  # ---- G54-6: Artifacts gitignored ----
  $gitignore = Get-Content ".gitignore" -Raw
  if ($gitignore -match "/artifacts/") {
    Gate-Pass "G54-6" "/artifacts/ is in .gitignore"
  } else {
    Gate-Fail "G54-6" "/artifacts/ not in .gitignore"
  }

  # ---- G54-7: No audit artifacts tracked by git ----
  $trackedAudit = git ls-files "artifacts/audit/" 2>$null
  if ([string]::IsNullOrWhiteSpace($trackedAudit)) {
    Gate-Pass "G54-7" "No audit artifacts tracked by git"
  } else {
    Gate-Fail "G54-7" "Audit artifacts tracked by git: $trackedAudit"
  }

  # ---- Summary ----
  Write-Host "`n=== Phase 54 Results ===" -ForegroundColor Cyan
  Write-Host "  PASS: $pass" -ForegroundColor Green
  Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
  Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
  Write-Host ""

  if ($fail -gt 0) {
    Write-Host "PHASE 54 VERIFICATION FAILED ($fail failures)" -ForegroundColor Red
    exit 1
  }

  Write-Host "PHASE 54 VERIFICATION PASSED" -ForegroundColor Green
  exit 0

} finally {
  Pop-Location
}
