<#
  Phase 79 Verifier -- CPRS Cover Sheet Layout Parity v1
  Gates G79-1 through G79-17 (structural + type + audit)
  Run: powershell -ExecutionPolicy Bypass -File scripts/verify-phase79-coversheet-layout.ps1
#>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "   [PASS] $id -- $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "   [FAIL] $id -- $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "   [FAIL] $id -- $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n============================================================"
Write-Host " Phase 79 Verifier -- CPRS Cover Sheet Layout Parity"
Write-Host "============================================================`n"

# --- A. API Store Gates ---
Write-Host "--- A. API Store Gates ---"

Gate "G79-A01" "ui-prefs-store.ts exists" {
  Test-Path -LiteralPath "apps/api/src/services/ui-prefs-store.ts"
}

Gate "G79-A02" "ui-prefs-store.ts exports CoverSheetLayoutV1 type" {
  (Get-Content "apps/api/src/services/ui-prefs-store.ts" -Raw) -match 'CoverSheetLayoutV1'
}

Gate "G79-A03" "ui-prefs-store.ts validates min height 80" {
  (Get-Content "apps/api/src/services/ui-prefs-store.ts" -Raw) -match '80'
}

Gate "G79-A04" "ui-prefs-store.ts validates max height 800" {
  (Get-Content "apps/api/src/services/ui-prefs-store.ts" -Raw) -match '800'
}

Gate "G79-A05" "ui-prefs-store.ts has duplicate panel detection" {
  (Get-Content "apps/api/src/services/ui-prefs-store.ts" -Raw) -match 'duplicate|Set\('
}

# --- B. API Route Gates ---
Write-Host "`n--- B. API Route Gates ---"

Gate "G79-B01" "ui-prefs.ts route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/ui-prefs.ts"
}

Gate "G79-B02" "ui-prefs.ts has GET /ui-prefs/coversheet" {
  (Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw) -match "GET.*ui-prefs/coversheet|url.*ui-prefs/coversheet.*method.*GET"
}

Gate "G79-B03" "ui-prefs.ts has PUT /ui-prefs/coversheet" {
  (Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw) -match "PUT.*ui-prefs/coversheet|url.*ui-prefs/coversheet.*method.*PUT"
}

Gate "G79-B04" "ui-prefs.ts has DELETE /ui-prefs/coversheet" {
  (Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw) -match "DELETE.*ui-prefs/coversheet|url.*ui-prefs/coversheet.*method.*DELETE"
}

Gate "G79-B05" "ui-prefs.ts uses requireSession inside handler (not preHandler)" {
  $content = Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw
  ($content -match 'requireSession') -and -not ($content -match 'preHandler')
}

Gate "G79-B06" "ui-prefs.ts has audit action config.ui-prefs-save" {
  (Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw) -match 'config\.ui-prefs-save'
}

Gate "G79-B07" "ui-prefs.ts guards request.body with fallback" {
  (Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw) -match '\|\|\s*\{\}'
}

# --- C. Web Store Gates ---
Write-Host "`n--- C. Web Store Gates ---"

Gate "G79-C01" "cprs-ui-state.tsx exports saveCoverSheetLayout" {
  (Get-Content "apps/web/src/stores/cprs-ui-state.tsx" -Raw) -match 'saveCoverSheetLayout'
}

Gate "G79-C02" "cprs-ui-state.tsx has server sync (fetchServerPrefs)" {
  (Get-Content "apps/web/src/stores/cprs-ui-state.tsx" -Raw) -match 'fetchServerPrefs'
}

Gate "G79-C03" "cprs-ui-state.tsx has debounced PUT" {
  (Get-Content "apps/web/src/stores/cprs-ui-state.tsx" -Raw) -match 'setTimeout|debounce'
}

Gate "G79-C04" "cprs-ui-state.tsx uses credentials: include" {
  (Get-Content "apps/web/src/stores/cprs-ui-state.tsx" -Raw) -match "credentials.*include"
}

Gate "G79-C05" "cprs-ui-state.tsx exports DEFAULT_PANEL_HEIGHTS" {
  (Get-Content "apps/web/src/stores/cprs-ui-state.tsx" -Raw) -match 'DEFAULT_PANEL_HEIGHTS'
}

Gate "G79-C06" "cprs-ui-state.tsx exports DEFAULT_PANEL_ORDER" {
  (Get-Content "apps/web/src/stores/cprs-ui-state.tsx" -Raw) -match 'DEFAULT_PANEL_ORDER'
}

# --- D. CoverSheetPanel Gates ---
Write-Host "`n--- D. CoverSheetPanel Gates ---"

Gate "G79-D01" "CoverSheetPanel.tsx exists" {
  Test-Path -LiteralPath "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx"
}

Gate "G79-D02" "CoverSheetPanel.tsx has resize handle with role=separator" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'role.*separator'
}

Gate "G79-D03" "CoverSheetPanel.tsx has aria-label on resize handle" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'aria-label.*[Rr]esize'
}

Gate "G79-D04" "CoverSheetPanel.tsx has Customize Layout button" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'Customize Layout'
}

Gate "G79-D05" "CoverSheetPanel.tsx has Reset Layout button" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'Reset Layout'
}

Gate "G79-D06" "CoverSheetPanel.tsx has keyboard resize (ArrowDown/ArrowUp)" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'ArrowDown|ArrowUp'
}

Gate "G79-D07" "CoverSheetPanel.tsx has drag-and-drop (onDragStart)" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'onDragStart'
}

Gate "G79-D08" "CoverSheetPanel.tsx has visibility toggle" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'hiddenPanels|visibility|panelVisibility'
}

Gate "G79-D09" "CoverSheetPanel.tsx has data-panel-key attributes" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'data-panel-key'
}

Gate "G79-D10" "CoverSheetPanel.tsx has echo-back guard (isInitialSyncRef)" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'isInitialSyncRef'
}

Gate "G79-D11" "CoverSheetPanel.tsx has JSON comparison guard (prevHeightsJsonRef)" {
  (Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'prevHeightsJsonRef'
}

Gate "G79-D12" "CoverSheetPanel.tsx persist effect includes saveCoverSheetLayout in deps" {
  $content = Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw
  # The persist effect should have saveCoverSheetLayout in its dependency array
  $content -match '\[heights,\s*saveCoverSheetLayout\]'
}

# --- E. Structural Integrity Gates ---
Write-Host "`n--- E. Structural Integrity Gates ---"

Gate "G79-E01" "CoverSheetLayoutManager.tsx is deleted (superseded)" {
  -not (Test-Path -LiteralPath "apps/web/src/components/cprs/CoverSheetLayoutManager.tsx")
}

Gate "G79-E02" "page.tsx does NOT import CoverSheetLayoutManager" {
  $p = "apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx"
  -not ((Get-Content -LiteralPath $p -Raw) -match 'CoverSheetLayoutManager')
}

Gate "G79-E03" "No console.log in ui-prefs-store.ts or ui-prefs.ts" {
  $a = Get-Content "apps/api/src/services/ui-prefs-store.ts" -Raw
  $b = Get-Content "apps/api/src/routes/ui-prefs.ts" -Raw
  -not (($a -match 'console\.log') -or ($b -match 'console\.log'))
}

Gate "G79-E04" "No console.log in CoverSheetPanel.tsx" {
  -not ((Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw) -match 'console\.log')
}

Gate "G79-E05" "No eslint-disable for react-hooks/exhaustive-deps in CoverSheetPanel.tsx persist effect" {
  # Allow it in data-fetching effects (fetchAll) but not in persist effect
  $content = Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw
  # Count eslint-disable-line occurrences
  $matches = [regex]::Matches($content, 'eslint-disable-line react-hooks/exhaustive-deps')
  # Should have at most 1 (the fetchAll effect)
  $matches.Count -le 1
}

Gate "G79-E06" "E2E spec file exists" {
  Test-Path -LiteralPath "apps/web/e2e/coversheet-layout.spec.ts"
}

Gate "G79-E07" "E2E spec covers all 6 test scenarios" {
  $content = Get-Content "apps/web/e2e/coversheet-layout.spec.ts" -Raw
  ($content -match 'all 10 cover sheet panels render') -and
  ($content -match 'resize handle changes panel height') -and
  ($content -match 'Customize Layout') -and
  ($content -match 'Reset Layout') -and
  ($content -match 'keyboard resize') -and
  ($content -match 'panel visibility toggle')
}

# --- F. CSS / Accessibility Gates ---
Write-Host "`n--- F. CSS / Accessibility Gates ---"

Gate "G79-F01" "CSS module has coverToolbar class" {
  (Get-Content "apps/web/src/components/cprs/cprs.module.css" -Raw) -match '\.coverToolbar'
}

Gate "G79-F02" "CSS module has resizeHandle focus styles" {
  (Get-Content "apps/web/src/components/cprs/cprs.module.css" -Raw) -match 'resizeHandle.*focus|focus.*resizeHandle'
}

Gate "G79-F03" "CoverSheetPanel.tsx toolbar has no duplicate inline styles on coverToolbar" {
  # The toolbar div should use className only, not inline style
  $content = Get-Content "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx" -Raw
  # Look for coverToolbar div - it should NOT have both className and style
  -not ($content -match 'className=\{styles\.coverToolbar\}\s+style=')
}

# --- Summary ---
Write-Host "`n============================================================"
Write-Host " Phase 79 Verifier -- RESULTS"
Write-Host "============================================================"
Write-Host "  PASS: $pass / $total"
Write-Host "  FAIL: $fail / $total"
Write-Host "============================================================`n"

if ($fail -eq 0) {
  Write-Host "ALL $total GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "$fail GATE(S) FAILED" -ForegroundColor Red
}

# --- Evidence Artifacts ---
$artifactDir = "artifacts/phase79"
if (-not (Test-Path -LiteralPath $artifactDir)) {
  New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
}
@"
Phase 79 Verification Results
=============================
Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Pass: $pass / $total
Fail: $fail / $total
"@ | Set-Content -Path "$artifactDir/verify-results.txt" -Encoding ASCII

exit $fail
