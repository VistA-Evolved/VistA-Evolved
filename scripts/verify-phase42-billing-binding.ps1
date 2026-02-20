<# verify-phase42-billing-binding.ps1 -- Phase 42 Verification
   VistA Billing/RCM Binding Pack + Claim Draft Sources
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

Write-Host "`n=== Phase 42: VistA Billing/RCM Binding Pack ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── Section 1: Deliverable A -- Billing Capability Map ──
Write-Host "--- A) Billing Capability Map ---" -ForegroundColor Yellow

Gate "billing-grounding-v2.md exists" {
  Test-Path (Join-Path $root "docs\vista\billing-grounding-v2.md")
}

Gate "billing-grounding-v2.md has package table" {
  $f = Get-Content (Join-Path $root "docs\vista\billing-grounding-v2.md") -Raw
  $f -match "PCE.*POPULATED" -and $f -match "IB.*EMPTY" -and $f -match "PRCA.*EMPTY"
}

Gate "billing-grounding-v2.md maps objects to RPCs" {
  $f = Get-Content (Join-Path $root "docs\vista\billing-grounding-v2.md") -Raw
  $f -match "ORWPCE VISIT" -and $f -match "ORWPCE DIAG" -and $f -match "ORWPCE PROC" -and $f -match "IBCN INSURANCE QUERY"
}

Gate "billing-grounding-v2.md documents wrapper RPC" {
  $f = Get-Content (Join-Path $root "docs\vista\billing-grounding-v2.md") -Raw
  $f -match "VE RCM PROVIDER INFO"
}

# ── Section 2: Deliverable B -- Wrapper RPCs ──
Write-Host "`n--- B) Safe Wrapper RPCs ---" -ForegroundColor Yellow

Gate "ZVERCMP.m exists" {
  Test-Path (Join-Path $root "services\vista\ZVERCMP.m")
}

Gate "ZVERCMP.m is read-only (no SET/KILL to globals)" {
  $f = Get-Content (Join-Path $root "services\vista\ZVERCMP.m") -Raw
  # LIST entry should not have SET ^ or KILL ^
  $listSection = ($f -split "(?m)^INSTALL")[0]
  -not ($listSection -match 'S \^' -or $listSection -match 'KILL \^')
}

Gate "ZVERCMP.m has INSTALL entry" {
  $f = Get-Content (Join-Path $root "services\vista\ZVERCMP.m") -Raw
  $f -match "(?m)^INSTALL"
}

Gate "install-rcm-wrappers.ps1 exists" {
  Test-Path (Join-Path $root "scripts\install-rcm-wrappers.ps1")
}

Gate "vista-billing-wrappers.md runbook exists" {
  Test-Path (Join-Path $root "docs\runbooks\vista-billing-wrappers.md")
}

Gate "VE RCM PROVIDER INFO in RPC_EXCEPTIONS" {
  $f = Get-Content (Join-Path $root "apps\api\src\vista\rpcRegistry.ts") -Raw
  $f -match "VE RCM PROVIDER INFO"
}

# ── Section 3: Deliverable C -- Claim Draft Builder ──
Write-Host "`n--- C) Claim Draft Builder ---" -ForegroundColor Yellow

Gate "buildClaimDraftFromVista.ts exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts")
}

Gate "buildClaimDraftFromVista exports builder function" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "export async function buildClaimDraftFromVista"
}

Gate "builder uses RpcCaller interface (injectable)" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "export interface RpcCaller" -and $f -match "rpc: RpcCaller"
}

Gate "builder annotates missingFields" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "missingFields" -and $f -match "sourceMissing"
}

Gate "builder calls ORWPCE VISIT" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "ORWPCE VISIT"
}

Gate "builder calls ORWPCE DIAG" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "ORWPCE DIAG"
}

Gate "builder calls ORWPCE PROC" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "ORWPCE PROC"
}

Gate "builder calls IBCN INSURANCE QUERY" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  $f -match "IBCN INSURANCE QUERY"
}

Gate "barrel export includes Phase 42 types" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\index.ts") -Raw
  $f -match "buildClaimDraftFromVista" -and $f -match "getVistaCoverage" -and $f -match "RpcCaller"
}

# ── Section 4: Deliverable D -- API Endpoints ──
Write-Host "`n--- D) API Endpoints ---" -ForegroundColor Yellow

Gate "rcm-routes.ts has /rcm/vista/encounters" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $f -match "/rcm/vista/encounters"
}

Gate "rcm-routes.ts has /rcm/vista/claim-drafts" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $f -match "/rcm/vista/claim-drafts"
}

Gate "rcm-routes.ts has /rcm/vista/coverage" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $f -match "/rcm/vista/coverage"
}

Gate "rcm-routes.ts imports buildClaimDraftFromVista" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $f -match "buildClaimDraftFromVista"
}

Gate "rcm-routes.ts imports getVistaCoverage" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\rcm-routes.ts") -Raw
  $f -match "getVistaCoverage"
}

# ── Section 5: Deliverable E -- UI ──
Write-Host "`n--- E) UI Draft from VistA ---" -ForegroundColor Yellow

Gate "rcm page.tsx has DraftFromVistaTab" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "DraftFromVistaTab"
}

Gate "rcm page.tsx has 'draft-from-vista' tab" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "draft-from-vista"
}

Gate "DraftFromVistaTab fetches /rcm/vista/encounters" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "/rcm/vista/encounters"
}

Gate "DraftFromVistaTab fetches /rcm/vista/claim-drafts" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "/rcm/vista/claim-drafts"
}

Gate "DraftFromVistaTab fetches /rcm/vista/coverage" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "/rcm/vista/coverage"
}

Gate "DraftFromVistaTab has prerequisites checklist" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "Prerequisites Checklist" -or $f -match "prerequisitesCheck"
}

Gate "DraftFromVistaTab has missing fields display" {
  $f = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw
  $f -match "missingFields" -and $f -match "sourceMissing"
}

# ── Section 6: Deliverable F -- Tests ──
Write-Host "`n--- F) Tests + Safety ---" -ForegroundColor Yellow

Gate "test file exists" {
  Test-Path (Join-Path $root "apps\api\tests\buildClaimDraftFromVista.test.ts")
}

Gate "tests use RpcCaller stub (no real VistA)" {
  $f = Get-Content (Join-Path $root "apps\api\tests\buildClaimDraftFromVista.test.ts") -Raw
  $f -match "createStubRpc" -or $f -match "RpcCaller"
}

Gate "tests include no-PHI checks" {
  $f = Get-Content (Join-Path $root "apps\api\tests\buildClaimDraftFromVista.test.ts") -Raw
  $f -match "no PHI" -or $f -match "SSN|credential|password"
}

Gate "vitest runs and passes" {
  Push-Location (Join-Path $root "apps\api")
  try {
    $output = & npx vitest run tests/buildClaimDraftFromVista.test.ts 2>&1 | Out-String
    $output -match "25 passed"
  } finally { Pop-Location }
}

# ── Section 7: Deliverable G -- Docs ──
Write-Host "`n--- G) Docs ---" -ForegroundColor Yellow

Gate "rcm-draft-from-vista.md runbook exists" {
  Test-Path (Join-Path $root "docs\runbooks\rcm-draft-from-vista.md")
}

Gate "runbook documents all 3 endpoints" {
  $f = Get-Content (Join-Path $root "docs\runbooks\rcm-draft-from-vista.md") -Raw
  $f -match "/rcm/vista/encounters" -and $f -match "/rcm/vista/claim-drafts" -and $f -match "/rcm/vista/coverage"
}

Gate "rcm-gateway-architecture.md updated with Phase 42" {
  $f = Get-Content (Join-Path $root "docs\architecture\rcm-gateway-architecture.md") -Raw
  $f -match "Phase 42"
}

Gate "architecture doc has VistA draft pipeline diagram" {
  $f = Get-Content (Join-Path $root "docs\architecture\rcm-gateway-architecture.md") -Raw
  $f -match "buildClaimDraftFromVista" -and $f -match "ClaimDraftCandidate"
}

# ── Section 8: PHI Safety ──
Write-Host "`n--- PHI Safety ---" -ForegroundColor Yellow

Gate "no hardcoded credentials in vistaBindings" {
  $files = Get-ChildItem (Join-Path $root "apps\api\src\rcm\vistaBindings") -Filter "*.ts" -Recurse
  $found = $false
  foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "PROV123|PHARM123|NURSE123") { $found = $true; break }
  }
  -not $found
}

Gate "builder does not log patient names or SSN" {
  $f = Get-Content (Join-Path $root "apps\api\src\rcm\vistaBindings\buildClaimDraftFromVista.ts") -Raw
  -not ($f -match "console\.log.*patient|console\.log.*ssn|console\.log.*name")
}

# ── Section 9: Prompt file ──
Write-Host "`n--- Prompt ---" -ForegroundColor Yellow

Gate "prompt file exists" {
  Test-Path -LiteralPath (Join-Path $root "prompts\46-PHASE-42-VISTA-BILLING-RCM\prompt.md")
}

# ── Summary ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 42 Verification: $pass/$total PASS" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) {
  Write-Host "$fail FAILED" -ForegroundColor Red
}
Write-Host "========================================`n"
exit $fail
