<# verify-phase42-verify.ps1 -- Phase 42 VERIFY gates
   G42-1: Vivian + live RPC alignment
   G42-2: Draft builder determinism + missingFields
   G42-3: Wrapper RPCs (read-only, documented, cataloged)
   G42-4: UI flow (no dead clicks, prerequisites checklist)
   G42-5: Security + regression
#>

param([switch]$SkipDocker)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Phase 42 VERIFY -- Real VistA Drafts or Honest Pending ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ====================================================================
# G42-1: Vivian + live RPC alignment
# ====================================================================
Write-Host "--- G42-1: Vivian + RPC Alignment ---" -ForegroundColor Yellow

# Load Vivian index
$vivianPath = Join-Path $root "data\vista\vivian\rpc_index.json"
$vivian = Get-Content $vivianPath -Raw | ConvertFrom-Json
$vivianNames = $vivian.rpcs | ForEach-Object { $_.name }

# RPCs used by the claim draft builder
$builderRpcs = @("ORWPCE VISIT", "ORWPCE DIAG", "ORWPCE PROC", "IBCN INSURANCE QUERY")
$customRpcs = @("VE RCM PROVIDER INFO")

Gate "G42-1a: ORWPCE VISIT in Vivian index" {
  $vivianNames -contains "ORWPCE VISIT"
}

Gate "G42-1b: ORWPCE DIAG in Vivian index" {
  $vivianNames -contains "ORWPCE DIAG"
}

Gate "G42-1c: ORWPCE PROC in Vivian index" {
  $vivianNames -contains "ORWPCE PROC"
}

Gate "G42-1d: IBCN INSURANCE QUERY in Vivian index" {
  $vivianNames -contains "IBCN INSURANCE QUERY"
}

Gate "G42-1e: VE RCM PROVIDER INFO in RPC_EXCEPTIONS with explanation" {
  $reg = Get-Content (Join-Path $root "apps\api\src\vista\rpcRegistry.ts") -Raw
  $reg -match 'VE RCM PROVIDER INFO.*reason.*Custom RPC.*ZVERCMP'
}

Gate "G42-1f: All builder RPCs in RPC_REGISTRY (registry section)" {
  $reg = Get-Content (Join-Path $root "apps\api\src\vista\rpcRegistry.ts") -Raw
  ($builderRpcs | ForEach-Object { $reg -match [regex]::Escape($_) }) -notcontains $false
}

Gate "G42-1g: /rcm/vista/rpc-check endpoint exists for presence checks" {
  $routes = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $routes -match "/rcm/vista/rpc-check"
}

Gate "G42-1h: rpc-check probes all 5 RPCs (4 standard + 1 custom)" {
  $routes = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $routes -match "DRAFT_RPCS" -and $routes -match "VE RCM PROVIDER INFO" -and $routes -match "ORWPCE VISIT"
}

# ====================================================================
# G42-2: Draft builder
# ====================================================================
Write-Host "`n--- G42-2: Draft Builder ---" -ForegroundColor Yellow

Gate "G42-2a: buildClaimDraftFromVista export is async function" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "export async function buildClaimDraftFromVista"
}

Gate "G42-2b: Returns ClaimDraftResult with candidates[]" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "ClaimDraftResult" -and $f -match "candidates:\s*ClaimDraftCandidate\[\]"
}

Gate "G42-2c: Each candidate has missingFields[]" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "missingFields:\s*string\[\]"
}

Gate "G42-2d: Each candidate has sourceMissing[] with vistaSource" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "sourceMissing:" -and $f -match "vistaSource:\s*string"
}

Gate "G42-2e: IB charge always marked missing (sandbox empty)" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "ibChargeAmount" -and $f -match "IB billing empty"
}

Gate "G42-2f: Builder is deterministic (injectable RpcCaller)" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "export interface RpcCaller" -and $f -match "rpc: RpcCaller"
}

Gate "G42-2g: POST /rcm/vista/claim-drafts endpoint stores drafts" {
  $routes = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $routes -match "storeClaim\(candidate\.claim\)"
}

Gate "G42-2h: Unit tests pass (25 tests)" {
  Push-Location (Join-Path $root "apps\api")
  try {
    $output = & npx vitest run tests/buildClaimDraftFromVista.test.ts 2>&1 | Out-String
    $output -match "25 passed"
  } finally { Pop-Location }
}

# ====================================================================
# G42-3: Wrapper RPCs
# ====================================================================
Write-Host "`n--- G42-3: Wrapper RPCs ---" -ForegroundColor Yellow

Gate "G42-3a: ZVERCMP.m LIST entry is read-only" {
  $f = Get-Content (Join-Path $root "services\vista\ZVERCMP.m") -Raw
  $listSection = ($f -split "(?m)^INSTALL")[0]
  -not ($listSection -match 'S \^' -or $listSection -match 'KILL \^')
}

Gate "G42-3b: ZVERCMP.m reads ^VA(200) for provider name" {
  $f = Get-Content (Join-Path $root "services\vista\ZVERCMP.m") -Raw
  $f -match '\^VA\(200'
}

Gate "G42-3c: ZVERCMP.m reads ^DIC(4) for facility" {
  $f = Get-Content (Join-Path $root "services\vista\ZVERCMP.m") -Raw
  $f -match '\^DIC\(4'
}

Gate "G42-3d: Install script documents how to install" {
  $f = Get-Content (Join-Path $root "scripts\install-rcm-wrappers.ps1") -Raw
  $f -match "docker" -and $f -match "ZVERCMP"
}

Gate "G42-3e: Runbook documents VE RCM PROVIDER INFO installation" {
  $f = Get-Content (Join-Path $root "docs\runbooks\vista-billing-wrappers.md") -Raw
  $f -match "VE RCM PROVIDER INFO" -and $f -match "install"
}

Gate "G42-3f: VE RCM PROVIDER INFO in live RPC catalog (exception list)" {
  $reg = Get-Content (Join-Path $root "apps\api\src\vista\rpcRegistry.ts") -Raw
  $reg -match '"VE RCM PROVIDER INFO"'
}

Gate "G42-3g: rpc-check shows VE RCM PROVIDER INFO as 'Custom' source" {
  $routes = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $routes -match "'VE RCM PROVIDER INFO'.*source:.*'Custom'"
}

Gate "G42-3h: If not installed, endpoints gracefully handle failure" {
  # The builder catches RPC call failures and adds to errors[]
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "catch" -and $f -match "errors\.push"
}

# ====================================================================
# G42-4: UI flow
# ====================================================================
Write-Host "`n--- G42-4: UI Flow ---" -ForegroundColor Yellow

Gate "G42-4a: 'Draft from VistA' tab exists in tab list" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "'draft-from-vista'" -and $f -match "Draft from VistA"
}

Gate "G42-4b: DraftFromVistaTab function defined" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "function DraftFromVistaTab"
}

Gate "G42-4c: Step 0 - RPC availability check button exists" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "Check RPC Availability" -and $f -match "checkRpcAvailability"
}

Gate "G42-4d: Step 1 - Fetch Encounters button exists" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "Fetch Encounters" -and $f -match "fetchEncounters"
}

Gate "G42-4e: Step 2 - Generate Draft button exists" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "Generate Draft" -and $f -match "generateDraft"
}

Gate "G42-4f: Step 3 - Review Draft Candidates section exists" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "Review Draft Candidates"
}

Gate "G42-4g: Prerequisites checklist includes VE RCM PROVIDER INFO" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "VE RCM PROVIDER INFO" -and $f -match "prerequisitesCheck"
}

Gate "G42-4h: Prerequisites checklist shows IB Charges as pending" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "IB Charges.*pending"
}

Gate "G42-4i: Missing fields displayed in draft review" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "missingFields" -and $f -match "sourceMissing" -and $f -match "vistaSource"
}

Gate "G42-4j: Empty state shown when no encounters" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "No encounters found"
}

# ====================================================================
# G42-5: Security + regression
# ====================================================================
Write-Host "`n--- G42-5: Security + Regression ---" -ForegroundColor Yellow

Gate "G42-5a: verify-latest.ps1 passes (all 42 gates)" {
  $output = powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts\verify-latest.ps1") 2>&1 | Out-String
  $output -match "42/42 PASS"
}

Gate "G42-5b: No hardcoded credentials in vistaBindings" {
  $files = Get-ChildItem (Join-Path $root "apps\api\src\rcm\vistaBindings") -Filter "*.ts" -Recurse
  $found = $false
  foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "PROV123|PHARM123|NURSE123") { $found = $true; break }
  }
  -not $found
}

Gate "G42-5c: No console.log in vistaBindings or rcm-routes" {
  $files = @(
    (Get-ChildItem (Join-Path $root "apps\api\src\rcm\vistaBindings") -Filter "*.ts" -Recurse).FullName
  )
  $files += (Join-Path $root "apps\api\src\rcm\rcm-routes.ts")
  $found = $false
  foreach ($file in $files) {
    $content = Get-Content $file -Raw
    if ($content -match "console\.log\(") { $found = $true; break }
  }
  -not $found
}

Gate "G42-5d: No PHI logged (patient name/SSN in log calls)" {
  $files = Get-ChildItem (Join-Path $root "apps\api\src\rcm\vistaBindings") -Filter "*.ts" -Recurse
  $found = $false
  foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "log\.(info|warn|error).*patient.*name|log\.(info|warn|error).*ssn") { $found = $true; break }
  }
  -not $found
}

Gate "G42-5e: tsc --noEmit clean" {
  Push-Location (Join-Path $root "apps\api")
  try {
    $output = & npx tsc --noEmit 2>&1 | Out-String
    $output.Trim().Length -eq 0
  } finally { Pop-Location }
}

Gate "G42-5f: RPC_EXCEPTIONS not empty for custom RPCs" {
  $reg = Get-Content (Join-Path $root "apps\api\src\vista\rpcRegistry.ts") -Raw
  $count = ([regex]::Matches($reg, '"VE ')).Count
  $count -ge 6  # VE LIST RPCS, VE INTEROP x4, VE RCM PROVIDER INFO
}

# ── Summary ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 42 VERIFY: $pass/$total PASS" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) {
  Write-Host "$fail FAILED" -ForegroundColor Red
}
Write-Host "========================================`n"
exit $fail
