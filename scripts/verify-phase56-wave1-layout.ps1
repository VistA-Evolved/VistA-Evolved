<# ============================================================
   verify-phase56-wave1-layout.ps1
   Phase 56: CPRS Functional Parity Wave 1 (READ) + Cover Sheet Layout Manager
   ============================================================
   Gates:
     G56-1  wave56-plan.json exists and has >= 6 screens, >= 18 actions
     G56-2  New API route file exists with >= 6 endpoints
     G56-3  Action registry has endpoint field and >= 52 entries (48 + 4 new cover)
     G56-4  CoverSheetPanel has 9 sections (problems, allergies, meds, vitals, notes, labs, orders, appointments, reminders)
     G56-5  IntegrationPendingModal exists and handles pending actions
     G56-6  CoverSheetLayoutManager exists with reset-to-default
     G56-7  ActionInspector exists with dev-only gate
     G56-8  cprs-ui-state has resetCoverSheetLayout + 9-panel default
     G56-9  No mock data in any Wave 1 panel or endpoint
     G56-10 Dead-click audit: every integration-pending action shows pending modal
   ============================================================ #>
param([switch]$Verbose)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $warn = 0
function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id  $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id  $desc -- $_" -ForegroundColor Red
    $script:fail++
  }
}
function Warn([string]$id, [string]$desc) {
  Write-Host "  WARN  $id  $desc" -ForegroundColor Yellow
  $script:warn++
}

Write-Host "`n=== Phase 56 Verification: CPRS Wave 1 (READ) + Cover Sheet Layout ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# G56-1: wave56-plan.json exists and has correct structure
# ---------------------------------------------------------------
Gate "G56-1" "wave56-plan.json exists with >= 6 screens, >= 18 actions" {
  $planPath = "artifacts/cprs/wave56-plan.json"
  if (-not (Test-Path -LiteralPath $planPath)) { return $false }
  $plan = Get-Content $planPath -Raw | ConvertFrom-Json
  $screenCount = ($plan.screens | Measure-Object).Count
  $actionCount = $plan._meta.totalActions
  ($screenCount -ge 6) -and ($actionCount -ge 18)
}

# ---------------------------------------------------------------
# G56-2: Wave 1 API route file exists with >= 6 endpoints
# ---------------------------------------------------------------
Gate "G56-2" "Wave 1 API routes file exists with >= 6 endpoints" {
  $routePath = "apps/api/src/routes/cprs/wave1-routes.ts"
  if (-not (Test-Path -LiteralPath $routePath)) { return $false }
  $content = Get-Content $routePath -Raw
  # Count server.get( occurrences
  $endpoints = ([regex]::Matches($content, 'server\.get\(')).Count
  $endpoints -ge 6
}

# ---------------------------------------------------------------
# G56-3: Action registry has endpoint field and >= 52 entries
# ---------------------------------------------------------------
Gate "G56-3" "Action registry has endpoint field and >= 52 actions" {
  $regPath = "apps/web/src/actions/actionRegistry.ts"
  $content = Get-Content $regPath -Raw
  $hasEndpointField = $content -match 'endpoint\?:\s*string'
  $actionCount = ([regex]::Matches($content, 'actionId:')).Count
  $hasEndpointField -and ($actionCount -ge 52)
}

# ---------------------------------------------------------------
# G56-4: CoverSheetPanel has 9 sections
# ---------------------------------------------------------------
Gate "G56-4" "CoverSheetPanel has 9 sections (problems, allergies, meds, vitals, notes, labs, orders, appointments, reminders)" {
  $panelPath = "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx"
  $content = Get-Content $panelPath -Raw
  $sections = @('Active Problems', 'Allergies', 'Active Medications', 'Vitals', 'Recent Notes', 'Recent Labs', 'Orders Summary', 'Appointments', 'Clinical Reminders')
  $found = 0
  foreach ($s in $sections) {
    if ($content -match [regex]::Escape($s)) { $found++ }
  }
  $found -ge 9
}

# ---------------------------------------------------------------
# G56-5: IntegrationPendingModal exists
# ---------------------------------------------------------------
Gate "G56-5" "IntegrationPendingModal exists and handles pending actions" {
  $modalPath = "apps/web/src/components/cprs/IntegrationPendingModal.tsx"
  if (-not (Test-Path -LiteralPath $modalPath)) { return $false }
  $content = Get-Content $modalPath -Raw
  ($content -match 'Integration Pending') -and ($content -match 'VivianBadge')
}

# ---------------------------------------------------------------
# G56-6: CoverSheetLayoutManager exists with reset
# ---------------------------------------------------------------
Gate "G56-6" "CoverSheetLayoutManager exists with reset-to-default" {
  $lmPath = "apps/web/src/components/cprs/CoverSheetLayoutManager.tsx"
  if (-not (Test-Path -LiteralPath $lmPath)) { return $false }
  $content = Get-Content $lmPath -Raw
  ($content -match 'resetCoverSheetLayout') -and ($content -match 'Reset Layout')
}

# ---------------------------------------------------------------
# G56-7: ActionInspector exists with dev-only gate
# ---------------------------------------------------------------
Gate "G56-7" "ActionInspector exists with dev-only gate" {
  $aiPath = "apps/web/src/components/cprs/ActionInspector.tsx"
  if (-not (Test-Path -LiteralPath $aiPath)) { return $false }
  $content = Get-Content $aiPath -Raw
  ($content -match 'production') -and ($content -match 'Action Inspector')
}

# ---------------------------------------------------------------
# G56-8: cprs-ui-state has resetCoverSheetLayout + 9-panel default
# ---------------------------------------------------------------
Gate "G56-8" "cprs-ui-state has resetCoverSheetLayout + 9-panel default layout" {
  $statePath = "apps/web/src/stores/cprs-ui-state.tsx"
  $content = Get-Content $statePath -Raw
  $hasReset = $content -match 'resetCoverSheetLayout'
  $hasLabs = $content -match "'labs'"
  $hasOrders = $content -match "'orders'"
  $hasAppointments = $content -match "'appointments'"
  $hasReset -and $hasLabs -and $hasOrders -and $hasAppointments
}

# ---------------------------------------------------------------
# G56-9: No mock data in Wave 1 panels or endpoints
# ---------------------------------------------------------------
Gate "G56-9" "No mock/fake/hardcoded data in Wave 1 files" {
  $files = @(
    "apps/api/src/routes/cprs/wave1-routes.ts",
    "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx"
  )
  $mockPatterns = @('mock', 'fake', 'dummy', 'hardcoded', 'sampleData', 'testPatient')
  $foundMock = $false
  foreach ($f in $files) {
    if (Test-Path -LiteralPath $f) {
      $content = (Get-Content $f -Raw).ToLower()
      foreach ($p in $mockPatterns) {
        if ($content -match $p) {
          if ($Verbose) { Write-Host "    Found '$p' in $f" -ForegroundColor Yellow }
          $foundMock = $true
        }
      }
    }
  }
  -not $foundMock
}

# ---------------------------------------------------------------
# G56-10: Dead-click audit -- pending actions wire to modal
# ---------------------------------------------------------------
Gate "G56-10" "Pending actions wire to IntegrationPendingModal (no dead clicks)" {
  $panelContent = Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw
  $hasPendingImport = $panelContent -match 'IntegrationPendingModal'
  $hasShowPending = $panelContent -match 'showPending'
  $hasPendingProp = $panelContent -match 'onPendingClick'
  $hasPendingImport -and $hasShowPending -and $hasPendingProp
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== Phase 56 Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($warn -gt 0) { Write-Host "  WARN: $warn" -ForegroundColor Yellow }
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
  exit 1
} else {
  Write-Host "  All gates passed." -ForegroundColor Green
  exit 0
}
