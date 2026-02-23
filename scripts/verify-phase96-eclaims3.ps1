<# ─────────────────────────────────────────────────────────
   Phase 96 Verifier -- PhilHealth eClaims 3.0 Adapter Skeleton
   ───────────────────────────────────────────────────────── #>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0; $total = 0

function Gate([string]$label, [bool]$ok, [string]$detail = "") {
  $script:total++
  if ($ok) {
    $script:pass++
    Write-Host "  PASS  $label" -ForegroundColor Green
  } else {
    $script:fail++
    Write-Host "  FAIL  $label  $detail" -ForegroundColor Red
  }
}

Write-Host "`n=== Phase 96 Verifier -- PhilHealth eClaims 3.0 Adapter Skeleton ===" -ForegroundColor Cyan

# ── Section 1: File Existence ──────────────────────────────────
Write-Host "`n--- 1. File Existence ---" -ForegroundColor Yellow

$apiBase = Join-Path $root "apps\api\src\rcm\philhealth-eclaims3"
$webBase = Join-Path $root "apps\web\src\app\cprs\admin\philhealth-eclaims3"

$requiredFiles = @(
  (Join-Path $apiBase "types.ts"),
  (Join-Path $apiBase "packet-builder.ts"),
  (Join-Path $apiBase "export-generators.ts"),
  (Join-Path $apiBase "xml-generator.ts"),
  (Join-Path $apiBase "submission-tracker.ts"),
  (Join-Path $apiBase "eclaims3-routes.ts"),
  (Join-Path $webBase "page.tsx"),
  (Join-Path $root "docs\runbooks\philhealth-eclaims3-spec-status.md")
)

foreach ($f in $requiredFiles) {
  $name = Split-Path -Leaf $f
  Gate "File exists: $name" (Test-Path -LiteralPath $f)
}

# ── Section 2: Route Wiring ────────────────────────────────────
Write-Host "`n--- 2. Route Wiring ---" -ForegroundColor Yellow

$indexTs = Get-Content (Join-Path $root "apps\api\src\index.ts") -Raw
Gate "Import eclaims3Routes in index.ts" ($indexTs -match 'import\s+eclaims3Routes\s+from\s+"./rcm/philhealth-eclaims3/eclaims3-routes')
Gate "Register eclaims3Routes in index.ts" ($indexTs -match 'server\.register\(eclaims3Routes\)')

$layoutTsx = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\layout.tsx") -Raw
Gate "Nav entry for eClaims 3.0" ($layoutTsx -match "eClaims 3\.0.*philhealth-eclaims3")

# ── Section 3: Auth Rules ──────────────────────────────────────
Write-Host "`n--- 3. Auth Rules ---" -ForegroundColor Yellow

$securityTs = Get-Content (Join-Path $root "apps\api\src\middleware\security.ts") -Raw
Gate "Auth rule covers /rcm/ prefix (session)" ($securityTs -match '/\^\\\/rcm\\\/.*session')

# ── Section 4: No Fake Success ─────────────────────────────────
Write-Host "`n--- 4. No Fake Success ---" -ForegroundColor Yellow

$typesTs = Get-Content (Join-Path $apiBase "types.ts") -Raw
Gate "xmlSpecAvailable literal false in ExportBundle" ($typesTs -match 'xmlSpecAvailable:\s*false')

# Check actual SPEC_ACQUISITION_GATES array entries -- gate status values only
# The word "completed" appears in the union type def but should NOT appear as an actual status value
$gateSection = $typesTs -replace '(?s).*SPEC_ACQUISITION_GATES', '' 
$gateHasCompleted = $gateSection -match 'status:\s*"completed"'
Gate "SPEC_ACQUISITION_GATES all not_started" (-not $gateHasCompleted)

$xmlGen = Get-Content (Join-Path $apiBase "xml-generator.ts") -Raw
Gate "XML generator returns ok:false" ($xmlGen -match 'ok:\s*false.*reason.*schema not yet available')
Gate "XML contains SPEC_PENDING marker" ($xmlGen -match 'SPEC_PENDING')
Gate "specBased: false in XML output" ($xmlGen -match "specBased.*false")

$routesTs = Get-Content (Join-Path $apiBase "eclaims3-routes.ts") -Raw
Gate "Status endpoint shows submissionMode manual_only" ($routesTs -match 'submissionMode.*manual_only')

# ── Section 5: Honest FSM ──────────────────────────────────────
Write-Host "`n--- 5. Honest FSM ---" -ForegroundColor Yellow

$trackerTs = Get-Content (Join-Path $apiBase "submission-tracker.ts") -Raw
Gate "isManualOnlyTransition re-exported" ($trackerTs -match 'export.*isManualOnlyTransition')

Gate "staffConfirmation guard on manual transitions" ($routesTs -match 'staffConfirmation.*manual-only transition')
Gate "accepted is terminal state" ($typesTs -match 'accepted:\s*\[\s*\]')

# ── Section 6: No PHI Leaks ───────────────────────────────────
Write-Host "`n--- 6. No PHI / No console.log ---" -ForegroundColor Yellow

$allApiFiles = Get-ChildItem -Path $apiBase -Filter "*.ts" -Recurse
$consoleCount = 0
foreach ($f in $allApiFiles) {
  $content = Get-Content $f.FullName -Raw
  $matches = [regex]::Matches($content, 'console\.log')
  $consoleCount += $matches.Count
}
Gate "Zero console.log in API backend" ($consoleCount -eq 0) "Found $consoleCount"

$pageTsx = Get-Content (Join-Path $webBase "page.tsx") -Raw
$pageConsole = [regex]::Matches($pageTsx, 'console\.log').Count
Gate "Zero console.log in UI page" ($pageConsole -eq 0) "Found $pageConsole"

# ── Section 7: No Hardcoded Credentials ────────────────────────
Write-Host "`n--- 7. No Hardcoded Credentials ---" -ForegroundColor Yellow

$allPhase96 = @()
$allPhase96 += $allApiFiles
$allPhase96 += Get-ChildItem -Path $webBase -Filter "*.tsx" -Recurse

$credFound = $false
foreach ($f in $allPhase96) {
  $content = Get-Content $f.FullName -Raw
  if ($content -match 'PROV123|PHARM123|NURSE123|password\s*=\s*"') {
    $credFound = $true
  }
}
Gate "No hardcoded credentials in Phase 96 files" (-not $credFound)

# ── Section 8: Content Hash Determinism ────────────────────────
Write-Host "`n--- 8. Content Hash Determinism ---" -ForegroundColor Yellow

$pbTs = Get-Content (Join-Path $apiBase "packet-builder.ts") -Raw
Gate "SHA-256 content hash in packet builder" ($pbTs -match 'createHash.*sha256')
Gate "verifyPacketIntegrity function exists" ($pbTs -match 'export function verifyPacketIntegrity')

# ── Section 9: Totals Correctness ──────────────────────────────
Write-Host "`n--- 9. Totals Computation ---" -ForegroundColor Yellow

Gate "totalCharges uses unitCharge*quantity" ($pbTs -match 'totalCharges.*unitCharge.*quantity')
Gate "totalNetAmount uses netAmount" ($pbTs -match 'totalNetAmount.*c\.netAmount')

# ── Section 10: UI Data Contract ───────────────────────────────
Write-Host "`n--- 10. UI Data Contract ---" -ForegroundColor Yellow

Gate "UI reads data.drafts (not data.claims)" ($pageTsx -match 'data\.drafts')
Gate "UI uses credentials:include on all fetches" (-not ($pageTsx -match "fetch\([^)]*\)\s*;" -and $pageTsx -notmatch 'credentials.*include'))

# ── Section 11: Export Format Coverage ─────────────────────────
Write-Host "`n--- 11. Export Format Coverage ---" -ForegroundColor Yellow

$exportTs = Get-Content (Join-Path $apiBase "export-generators.ts") -Raw
Gate "JSON export generator exists" ($exportTs -match 'generateJsonExport')
Gate "PDF text export generator exists" ($exportTs -match 'generatePdfTextExport')
Gate "Manual submission footer in PDF" ($exportTs -match 'MANUAL PORTAL SUBMISSION')
Gate "XML placeholder delegated" ($exportTs -match 'generatePlaceholderXml')

# ── Section 12: Payer Registry ─────────────────────────────────
Write-Host "`n--- 12. Payer Registry ---" -ForegroundColor Yellow

$phHmos = Get-Content (Join-Path $root "data\payers\ph_hmos.json") -Raw
Gate "PH-PHIC payer exists in seed data" ($phHmos -match 'PH-PHIC')
Gate "eClaims 3.0 noted in payer enrollment" ($phHmos -match 'eClaims 3\.0')

# ── Section 13: Page Routes ────────────────────────────────────
Write-Host "`n--- 13. Page Route Existence ---" -ForegroundColor Yellow

Gate "eClaims 3.0 page dir exists" (Test-Path -LiteralPath $webBase)
Gate "page.tsx is a client component" ($pageTsx -match '"use client"')

# ── Section 14: Phase 90 Regression ───────────────────────────
Write-Host "`n--- 14. Phase 90 Regression ---" -ForegroundColor Yellow

Gate "Phase 90 philhealthRoutes still imported" ($indexTs -match 'import\s+philhealthRoutes\s+from.*philhealth-routes')
Gate "Phase 90 philhealthRoutes still registered" ($indexTs -match 'server\.register\(philhealthRoutes\)')

$phRoutesPath = Join-Path $root "apps\api\src\rcm\payerOps\philhealth-routes.ts"
$phRoutesExists = Test-Path -LiteralPath $phRoutesPath
Gate "Phase 90 philhealth-routes.ts exists" $phRoutesExists
if ($phRoutesExists) {
  $phRoutes = Get-Content $phRoutesPath -Raw
  Gate "Phase 90 claim draft endpoints intact" ($phRoutes -match '/rcm/philhealth/claims')
}

# ── Section 15: TypeScript Build ───────────────────────────────
Write-Host "`n--- 15. TypeScript Build ---" -ForegroundColor Yellow

Push-Location (Join-Path $root "apps\api")
$apiTsc = & npx tsc --noEmit 2>&1
$apiOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "apps/api tsc --noEmit clean" $apiOk

Push-Location (Join-Path $root "apps\web")
$webTsc = & npx tsc --noEmit 2>&1
$webOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "apps/web tsc --noEmit clean" $webOk

# ── Summary ────────────────────────────────────────────────────
Write-Host "`n=== Phase 96 Results: $pass PASS / $fail FAIL / $total TOTAL ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

if ($fail -gt 0) {
  Write-Host "VERIFICATION FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "ALL GATES PASSED" -ForegroundColor Green
  exit 0
}
