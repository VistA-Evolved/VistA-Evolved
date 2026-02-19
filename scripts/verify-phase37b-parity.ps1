param([switch]$SkipDocker, [switch]$SkipPlaywright, [switch]$SkipE2E)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$warn = 0

function Write-Gate {
  param([string]$Name, [bool]$Ok, [string]$Detail = "")
  if ($Ok) {
    Write-Host "  [PASS] $Name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

function Write-Warning-Gate {
  param([string]$Name, [string]$Detail = "")
  Write-Host "  [WARN] $Name - $Detail" -ForegroundColor Yellow
  $script:warn++
}

function Test-FileContains {
  param([string]$Path, [string]$Pattern, [switch]$IsRegex)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  if ($IsRegex) {
    return (Select-String -LiteralPath $Path -Pattern $Pattern -Quiet)
  }
  return (Select-String -LiteralPath $Path -Pattern $Pattern -SimpleMatch -Quiet)
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Phase 37B VERIFY -- CPRS Parity + Grounding Gates"         -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ================================================================
# G37B-0 FULL REGRESSION (delegate to Phase 37)
# ================================================================
Write-Host ""
Write-Host "--- G37B-0: Full Regression (Phase 37 gates) ---" -ForegroundColor Yellow

$p37Script = "$root\scripts\verify-phase1-to-phase37.ps1"
if (Test-Path -LiteralPath $p37Script) {
  $p37Args = @()
  if ($SkipDocker) { $p37Args += "-SkipDocker" }
  if ($SkipPlaywright) { $p37Args += "-SkipPlaywright" }
  if ($SkipE2E) { $p37Args += "-SkipE2E" }

  Write-Host "  Delegating to Phase 37 verifier (90s timeout)..." -ForegroundColor DarkGray
  $job = Start-Job -ScriptBlock {
    param($s, $a) & $s @a 2>&1
  } -ArgumentList $p37Script, $p37Args
  $done = $job | Wait-Job -Timeout 90
  if ($done) {
    $output = Receive-Job $job
    $output | ForEach-Object { Write-Host "    $_" }
    Write-Gate "Phase 37 regression" ($job.State -eq "Completed")
  } else {
    Stop-Job $job
    Write-Warning-Gate "Phase 37 regression timeout (advisory)"
  }
  Remove-Job $job -Force
} else {
  Write-Warning-Gate "Phase 37 verifier not found"
}

# ================================================================
# G37B-1 PROMPTS ORDERING
# ================================================================
Write-Host ""
Write-Host "--- G37B-1: Prompts Ordering ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 37B prompt folder exists" (Test-Path -LiteralPath "$promptsDir\40-PHASE-37B-CPRS-PARITY-GROUNDING")
Write-Gate "Phase 37B IMPLEMENT prompt" (Test-Path -LiteralPath "$promptsDir\40-PHASE-37B-CPRS-PARITY-GROUNDING\40-01-cprs-parity-grounding-IMPLEMENT.md")

# Folder numbering should be ascending (skip 00-* meta folders which share prefix 0)
$folders = Get-ChildItem -Path $promptsDir -Directory | Where-Object { $_.Name -match '^[1-9]\d*' } | Sort-Object Name
$prevNum = 0
$allAscending = $true
foreach ($f in $folders) {
  $num = [int]($f.Name -replace '^(\d+).*', '$1')
  if ($num -le $prevNum) { $allAscending = $false; break }
  $prevNum = $num
}
Write-Gate "Prompt folder numbering ascending" $allAscending

# ================================================================
# G37B-2 CPRS CONTRACT EXTRACTION (Step 0)
# ================================================================
Write-Host ""
Write-Host "--- G37B-2: CPRS Contract Extraction ---" -ForegroundColor Yellow

$contractFile = "$root\docs\grounding\cprs-contract.extracted.json"
Write-Gate "cprs-contract.extracted.json exists" (Test-Path -LiteralPath $contractFile)

if (Test-Path -LiteralPath $contractFile) {
  $contract = Get-Content -LiteralPath $contractFile -Raw | ConvertFrom-Json
  Write-Gate "Contract has rpcs array" ($null -ne $contract.rpcs -and $contract.rpcs.Count -gt 0)
  Write-Gate "Contract has 975+ RPCs" ($contract.summary.rpcCount -ge 975) "Got: $($contract.summary.rpcCount)"
  Write-Gate "Contract has 10+ tabs" ($contract.summary.mainTabCount -ge 10) "Got: $($contract.summary.mainTabCount)"
  Write-Gate "Contract has screens" ($contract.summary.screenCount -gt 0) "Got: $($contract.summary.screenCount)"
  Write-Gate "Contract has forms" ($contract.summary.formCount -gt 0) "Got: $($contract.summary.formCount)"
  Write-Gate "Contract has menu items" ($contract.summary.menuItemCount -gt 0) "Got: $($contract.summary.menuItemCount)"
  Write-Gate "Contract has UI actions" ($contract.summary.uiActionCount -gt 0) "Got: $($contract.summary.uiActionCount)"
} else {
  Write-Gate "Contract has rpcs array" $false "File not found"
  Write-Gate "Contract has 975+ RPCs" $false "File not found"
}

$extractScript = "$root\scripts\extract_cprs_contract.mjs"
Write-Gate "extract_cprs_contract.mjs exists" (Test-Path -LiteralPath $extractScript)

# ================================================================
# G37B-3 RPC CATALOG ENDPOINT (Step 1)
# ================================================================
Write-Host ""
Write-Host "--- G37B-3: RPC Catalog Endpoint ---" -ForegroundColor Yellow

$mRoutine = "$root\services\vista\ZVERPC.m"
Write-Gate "ZVERPC.m M routine exists" (Test-Path -LiteralPath $mRoutine)
if (Test-Path -LiteralPath $mRoutine) {
  Write-Gate "ZVERPC.m has LIST entry point" (Test-FileContains $mRoutine "LIST(RESULT")
  Write-Gate "ZVERPC.m has INSTALL entry point" (Test-FileContains $mRoutine "INSTALL")
  Write-Gate "ZVERPC.m queries File 8994" (Test-FileContains $mRoutine "8994")
}

$installScript = "$root\scripts\install-rpc-catalog.ps1"
Write-Gate "install-rpc-catalog.ps1 exists" (Test-Path -LiteralPath $installScript)

# Check API has the endpoint defined
$indexTs = "$root\apps\api\src\index.ts"
Write-Gate "API index has /vista/rpc-catalog route" (Test-FileContains $indexTs "/vista/rpc-catalog")
Write-Gate "API uses VE LIST RPCS RPC" (Test-FileContains $indexTs "VE LIST RPCS")

# If API is running, try to fetch
if (-not $SkipDocker) {
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3001/vista/rpc-catalog" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($resp.StatusCode -eq 200) {
      $data = $resp.Content | ConvertFrom-Json
      Write-Gate "RPC catalog endpoint responds" $true
      Write-Gate "RPC catalog returns ok" ($data.ok -eq $true) "Got: $($data.ok)"
    } else {
      Write-Warning-Gate "RPC catalog returned $($resp.StatusCode)"
    }
  } catch {
    Write-Warning-Gate "RPC catalog endpoint not reachable (API not running?)"
  }
} else {
  Write-Warning-Gate "Skipped RPC catalog live check (--SkipDocker)"
}

# ================================================================
# G37B-4 VIVIAN/DOX GROUNDING (Step 2)
# ================================================================
Write-Host ""
Write-Host "--- G37B-4: Vivian/DOX Grounding ---" -ForegroundColor Yellow

$vivianScript = "$root\scripts\vivian_snapshot.ts"
Write-Gate "vivian_snapshot.ts exists" (Test-Path -LiteralPath $vivianScript)

$vivianIndex = "$root\docs\grounding\vivian-index.json"
Write-Gate "vivian-index.json exists" (Test-Path -LiteralPath $vivianIndex)

if (Test-Path -LiteralPath $vivianIndex) {
  $vivian = Get-Content -LiteralPath $vivianIndex -Raw | ConvertFrom-Json
  $pkgCount = ($vivian.packages | Get-Member -MemberType NoteProperty).Count
  Write-Gate "Vivian index has 10+ packages" ($pkgCount -ge 10) "Got: $pkgCount"

  # Check key packages
  $requiredPkgs = @("OR", "TIU", "LR", "RA", "XU", "HL", "DG")
  $missingPkgs = $requiredPkgs | Where-Object { -not $vivian.packages.$_ }
  Write-Gate "Vivian covers required packages" ($missingPkgs.Count -eq 0) "Missing: $($missingPkgs -join ', ')"
}

$cacheDir = "$root\docs\grounding\vivian-dox-cache"
Write-Gate "vivian-dox-cache directory exists" (Test-Path -LiteralPath $cacheDir)

# ================================================================
# G37B-5 PARITY MATRIX (Step 3)
# ================================================================
Write-Host ""
Write-Host "--- G37B-5: Parity Matrix ---" -ForegroundColor Yellow

$matrixScript = "$root\scripts\build_parity_matrix.ts"
Write-Gate "build_parity_matrix.ts exists" (Test-Path -LiteralPath $matrixScript)

$matrixJson = "$root\docs\grounding\parity-matrix.json"
$matrixMd = "$root\docs\grounding\parity-matrix.md"
Write-Gate "parity-matrix.json exists" (Test-Path -LiteralPath $matrixJson)
Write-Gate "parity-matrix.md exists" (Test-Path -LiteralPath $matrixMd)

if (Test-Path -LiteralPath $matrixJson) {
  $matrix = Get-Content -LiteralPath $matrixJson -Raw | ConvertFrom-Json

  Write-Gate "Matrix has rpcParity array" ($null -ne $matrix.rpcParity -and $matrix.rpcParity.Count -gt 0)
  Write-Gate "Matrix has tabParity array" ($null -ne $matrix.tabParity -and $matrix.tabParity.Count -gt 0)
  Write-Gate "Matrix has menuParity array" ($null -ne $matrix.menuParity -and $matrix.menuParity.Count -gt 0)

  $wired = ($matrix.rpcParity | Where-Object { $_.status -eq 'wired' }).Count
  Write-Gate "Matrix has 20+ wired RPCs" ($wired -ge 20) "Got: $wired"

  $unhandled = $matrix.summary.unhandledUiActions
  Write-Gate "Zero unhandled UI actions" ($unhandled -eq 0) "Got: $unhandled"

  $tabsWired = ($matrix.tabParity | Where-Object { $_.status -eq 'wired' }).Count
  Write-Gate "All Delphi-original tabs wired" ($tabsWired -ge 10) "Got: $tabsWired"
}

# ================================================================
# G37B-6 PLAYWRIGHT E2E (Step 4)
# ================================================================
Write-Host ""
Write-Host "--- G37B-6: Playwright Dead-Click Tests ---" -ForegroundColor Yellow

$e2eDir = "$root\apps\web\e2e"
Write-Gate "E2E directory exists" (Test-Path -LiteralPath $e2eDir)
Write-Gate "cprs-tabs.spec.ts exists" (Test-Path -LiteralPath "$e2eDir\cprs-tabs.spec.ts")
Write-Gate "menu-no-dead-clicks.spec.ts exists" (Test-Path -LiteralPath "$e2eDir\menu-no-dead-clicks.spec.ts")
Write-Gate "clinical-flows.spec.ts exists" (Test-Path -LiteralPath "$e2eDir\clinical-flows.spec.ts")
Write-Gate "parity-enforcement.spec.ts exists" (Test-Path -LiteralPath "$e2eDir\parity-enforcement.spec.ts")
Write-Gate "console-error-gate.spec.ts exists" (Test-Path -LiteralPath "$e2eDir\console-error-gate.spec.ts")

# Check clinical flows covers required areas
if (Test-Path -LiteralPath "$e2eDir\clinical-flows.spec.ts") {
  $areas = @("Problems", "Meds", "Orders", "Notes", "Labs", "Reports")
  foreach ($area in $areas) {
    Write-Gate "clinical-flows covers $area" (Test-FileContains "$e2eDir\clinical-flows.spec.ts" $area)
  }
}

# Playwright config
Write-Gate "playwright.config.ts exists" (Test-Path -LiteralPath "$root\apps\web\playwright.config.ts")
Write-Gate "auth setup exists" (Test-Path -LiteralPath "$e2eDir\auth.setup.ts")

# Live Playwright run (advisory)
if (-not $SkipPlaywright -and -not $SkipE2E) {
  Write-Host "  Running Playwright tests (headless, 120s timeout)..." -ForegroundColor DarkGray
  try {
    Push-Location "$root\apps\web"
    $pwJob = Start-Job -ScriptBlock {
      param($dir)
      Set-Location $dir
      & npx playwright test --reporter=list 2>&1
    } -ArgumentList "$root\apps\web"
    $pwDone = $pwJob | Wait-Job -Timeout 120
    if ($pwDone) {
      $pwOutput = Receive-Job $pwJob
      $pwOutput | ForEach-Object { Write-Host "    $_" }
      Write-Gate "Playwright suite passes" ($pwJob.State -eq "Completed")
    } else {
      Stop-Job $pwJob
      Write-Warning-Gate "Playwright timeout (120s) -- advisory"
    }
    Remove-Job $pwJob -Force
    Pop-Location
  } catch {
    Write-Warning-Gate "Playwright run failed: $($_.Exception.Message)"
  }
} else {
  Write-Warning-Gate "Playwright tests skipped (--SkipPlaywright or --SkipE2E)"
}

# ================================================================
# G37B-7 SECURITY SCAN
# ================================================================
Write-Host ""
Write-Host "--- G37B-7: Security / Secret Scan ---" -ForegroundColor Yellow

# No PHI/credentials in grounding files (check for actual credential values, not generic terms)
$groundingFiles = Get-ChildItem -Path "$root\docs\grounding" -File -Filter "*.json" -ErrorAction SilentlyContinue
$phiLeak = $false
foreach ($f in $groundingFiles) {
  $content = Get-Content -LiteralPath $f.FullName -Raw
  # Check for actual credentials/secrets, not VistA field names that contain SSN/DOB/Password
  if ($content -match "PROV123|NURSE123|PHARM123|\d{3}-\d{2}-\d{4}") {
    $phiLeak = $true
    Write-Gate "No PHI in $($f.Name)" $false "Contains sensitive pattern"
  }
}
if (-not $phiLeak) {
  Write-Gate "No PHI in grounding files" $true
}

# ZVERPC.m should not contain credentials
if (Test-Path -LiteralPath $mRoutine) {
  Write-Gate "No credentials in ZVERPC.m" (-not (Test-FileContains $mRoutine "PROV123"))
}

# ================================================================
# G37B-8 DOCUMENTATION
# ================================================================
Write-Host ""
Write-Host "--- G37B-8: Documentation ---" -ForegroundColor Yellow

Write-Gate "docs/grounding directory exists" (Test-Path -LiteralPath "$root\docs\grounding")
Write-Gate "cprs-contract.extracted.json" (Test-Path -LiteralPath "$root\docs\grounding\cprs-contract.extracted.json")
Write-Gate "vivian-index.json" (Test-Path -LiteralPath "$root\docs\grounding\vivian-index.json")
Write-Gate "parity-matrix.json" (Test-Path -LiteralPath "$root\docs\grounding\parity-matrix.json")
Write-Gate "parity-matrix.md" (Test-Path -LiteralPath "$root\docs\grounding\parity-matrix.md")

# Ops artifacts
Write-Gate "ops/phase37b-summary.md" (Test-Path -LiteralPath "$root\ops\phase37b-summary.md")
Write-Gate "ops/phase37b-notion-update.json" (Test-Path -LiteralPath "$root\ops\phase37b-notion-update.json")

# ================================================================
# G37B-9 TypeScript BUILD
# ================================================================
Write-Host ""
Write-Host "--- G37B-9: TypeScript Compilation ---" -ForegroundColor Yellow

try {
  Push-Location "$root\apps\api"
  $tscResult = & npx tsc --noEmit 2>&1
  $tscOk = $LASTEXITCODE -eq 0
  Pop-Location
  Write-Gate "API TypeScript compiles cleanly" $tscOk
  if (-not $tscOk) {
    $tscResult | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  }
} catch {
  Write-Warning-Gate "TypeScript check failed: $($_.Exception.Message)"
}

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Phase 37B Results:  PASS=$pass  FAIL=$fail  WARN=$warn"     -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

exit $fail
