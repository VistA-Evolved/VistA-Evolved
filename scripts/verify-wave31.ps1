<#
  verify-wave31.ps1 -- Wave 31 Service-Line Expansion verifier
  Phases 464-472: ED / OR / ICU types, stores, routes, RBAC, dashboards
#>
param([switch]$Verbose)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Test-Gate([string]$Name, [scriptblock]$Check) {
  $script:total++
  try {
    $result = & $Check
    if ($result) {
      Write-Host "  PASS  $Name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $Name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $Name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
  $root = Split-Path -Parent $PSScriptRoot
  if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
    $root = $PSScriptRoot
  }
}

Write-Host "`n=== Wave 31 Service-Line Expansion Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# -- ED (Phases 464-465) ---------------------------------------------------
Write-Host "--- ED Tracker (464-465) ---"

Test-Gate "464: ED types.ts exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'ed'))) 'types.ts')
}
Test-Gate "464: ED types exports TriageLevel" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'ed'))) 'types.ts'
  (Get-Content $f -Raw) -match 'TriageLevel'
}
Test-Gate "464: ED store exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'ed'))) 'ed-store.ts')
}
Test-Gate "465: ED routes exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'ed'))) 'ed-routes.ts')
}
Test-Gate "465: ED routes has /ed/visits" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'ed'))) 'ed-routes.ts'
  (Get-Content $f -Raw) -match '/ed/visits'
}
Test-Gate "465: ED runbook exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path $root 'docs') (Join-Path 'runbooks' 'ed-whiteboard.md'))
}

# -- OR (Phases 466-467) ---------------------------------------------------
Write-Host "`n--- OR Scheduling (466-467) ---"

Test-Gate "466: OR types.ts exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'or'))) 'types.ts')
}
Test-Gate "466: OR types exports OrCase" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'or'))) 'types.ts'
  (Get-Content $f -Raw) -match 'OrCase'
}
Test-Gate "466: OR store exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'or'))) 'or-store.ts')
}
Test-Gate "467: OR routes exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'or'))) 'or-routes.ts')
}
Test-Gate "467: OR routes has /or/cases" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'or'))) 'or-routes.ts'
  (Get-Content $f -Raw) -match '/or/cases'
}
Test-Gate "467: OR runbook exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path $root 'docs') (Join-Path 'runbooks' 'or-scheduling.md'))
}

# -- ICU (Phases 468-469) --------------------------------------------------
Write-Host "`n--- ICU Flowsheet (468-469) ---"

Test-Gate "468: ICU types.ts exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'icu'))) 'types.ts')
}
Test-Gate "468: ICU types exports IcuAdmission" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'icu'))) 'types.ts'
  (Get-Content $f -Raw) -match 'IcuAdmission'
}
Test-Gate "468: ICU store exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'icu'))) 'icu-store.ts')
}
Test-Gate "469: ICU routes exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'icu'))) 'icu-routes.ts')
}
Test-Gate "469: ICU routes has /icu/admissions" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' (Join-Path 'service-lines' 'icu'))) 'icu-routes.ts'
  (Get-Content $f -Raw) -match '/icu/admissions'
}
Test-Gate "469: ICU runbook exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path $root 'docs') (Join-Path 'runbooks' 'icu-flowsheet.md'))
}

# -- RBAC (Phase 470) ------------------------------------------------------
Write-Host "`n--- Service-Line RBAC (470) ---"

Test-Gate "470: RBAC module exists" {
  Test-Path -LiteralPath (Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' 'service-lines')) 'rbac.ts')
}
Test-Gate "470: RBAC exports checkServiceLineAccess" {
  $f = Join-Path (Join-Path (Join-Path (Join-Path $root 'apps') 'api') (Join-Path 'src' 'service-lines')) 'rbac.ts'
  (Get-Content $f -Raw) -match 'checkServiceLineAccess'
}

# -- Dashboards (Phase 471) ------------------------------------------------
Write-Host "`n--- Service-Line Dashboards (471) ---"

Test-Gate "471: Dashboard page.tsx exists" {
  $p = "$root\apps\web\src\app\cprs\admin\service-lines\page.tsx"
  Test-Path -LiteralPath $p
}
Test-Gate "471: Dashboard runbook exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\service-line-dashboards.md"
}

# -- Prompt files -----------------------------------------------------------
Write-Host "`n--- Prompt Files ---"

Test-Gate "464 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\464-PHASE-464-ED-TRACKER-TYPES" }
Test-Gate "465 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\465-PHASE-465-ED-BOARD-ADAPTER" }
Test-Gate "466 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\466-PHASE-466-OR-ANESTHESIA-TYPES" }
Test-Gate "467 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\467-PHASE-467-OR-SCHEDULING-ADAPTER" }
Test-Gate "468 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\468-PHASE-468-ICU-FLOWSHEET-TYPES" }
Test-Gate "469 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\469-PHASE-469-ICU-DEVICE-ADAPTER" }
Test-Gate "470 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\470-PHASE-470-SERVICE-LINE-RBAC" }
Test-Gate "471 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\471-PHASE-471-SERVICE-LINE-DASHBOARDS" }
Test-Gate "472 prompt dir exists" { Test-Path -LiteralPath "$root\prompts\472-PHASE-472-SERVICE-LINE-QA" }

# -- Summary ----------------------------------------------------------------
Write-Host "`n=== Wave 31 Results: $pass/$total PASS ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) { Write-Host "$fail gates FAILED" -ForegroundColor Red }
exit $fail
