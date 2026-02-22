# Phase 85 -- eMAR + BCMA Posture Verifier
# Usage: .\scripts\verify-phase85-emar-bcma.ps1

param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
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
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 85: eMAR + BCMA Posture Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ---- Section 1: File existence ----
Write-Host "--- Section 1: File Existence ---" -ForegroundColor Yellow

Gate "API route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/emar/index.ts"
}

Gate "Web page exists" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/emar/page.tsx"
}

Gate "Runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/emar-bcma.md"
}

Gate "Grounding doc exists" {
  Test-Path -LiteralPath "docs/grounding/emar-bcma-grounding.md"
}

Gate "Prompt file exists" {
  Test-Path -LiteralPath "prompts/90-PHASE-85-EMAR-BCMA/90-01-IMPLEMENT.md"
}

# ---- Section 2: API route content ----
Write-Host "`n--- Section 2: API Route Content ---" -ForegroundColor Yellow

$emarRoute = Get-Content "apps/api/src/routes/emar/index.ts" -Raw -ErrorAction SilentlyContinue

Gate "Route has GET /emar/schedule" {
  $emarRoute -match '/emar/schedule'
}

Gate "Route has GET /emar/allergies" {
  $emarRoute -match '/emar/allergies'
}

Gate "Route has GET /emar/history" {
  $emarRoute -match '/emar/history'
}

Gate "Route has POST /emar/administer" {
  $emarRoute -match '/emar/administer'
}

Gate "Route has GET /emar/duplicate-check" {
  $emarRoute -match '/emar/duplicate-check'
}

Gate "Route has POST /emar/barcode-scan" {
  $emarRoute -match '/emar/barcode-scan'
}

Gate "Route uses ORWPS ACTIVE RPC" {
  $emarRoute -match 'ORWPS ACTIVE'
}

Gate "Route uses ORQQAL LIST RPC" {
  $emarRoute -match 'ORQQAL LIST'
}

Gate "Route uses safeCallRpc (not raw callRpc)" {
  $emarRoute -match 'safeCallRpc'
}

Gate "Route uses requireSession" {
  $emarRoute -match 'requireSession'
}

Gate "Route has pendingTargets in responses" {
  $emarRoute -match 'pendingTargets'
}

Gate "Route has vistaGrounding in pending responses" {
  $emarRoute -match 'vistaGrounding'
}

Gate "Route has PSB MED LOG target" {
  $emarRoute -match 'PSB MED LOG'
}

Gate "Route has PSJBCMA target" {
  $emarRoute -match 'PSJBCMA'
}

Gate "Route has heuristic disclaimer" {
  $emarRoute -match '_heuristicDisclaimer'
}

Gate "Route has DFN validation" {
  $emarRoute -match 'test\(val\)'
}

Gate "Route has integration-pending source" {
  $emarRoute -match 'integration-pending'
}

Gate "Duplicate check has therapeutic class map" {
  $emarRoute -match 'classMap'
}

Gate "Route exports default async function" {
  $emarRoute -match 'export default async function'
}

# ---- Section 3: Web page content ----
Write-Host "`n--- Section 3: Web Page Content ---" -ForegroundColor Yellow

$emarPage = Get-Content "apps/web/src/app/cprs/emar/page.tsx" -Raw -ErrorAction SilentlyContinue

Gate "Page is client component" {
  $emarPage -match "'use client'"
}

Gate "Page has Suspense boundary" {
  $emarPage -match 'Suspense'
}

Gate "Page has Schedule tab" {
  $emarPage -match "schedule.*[Mm]edication [Ss]chedule"
}

Gate "Page has Allergies tab" {
  $emarPage -match "allergies.*[Aa]llergy [Ww]arning"
}

Gate "Page has Administration tab" {
  $emarPage -match "admin.*[Aa]dministration"
}

Gate "Page has BCMA Scanner tab" {
  $emarPage -match "bcma.*BCMA [Ss]canner"
}

Gate "Page has IntegrationPendingBanner component" {
  $emarPage -match 'IntegrationPendingBanner'
}

Gate "Page has HeuristicDisclaimer component" {
  $emarPage -match 'HeuristicDisclaimer'
}

Gate "Page has AllergyBanner component" {
  $emarPage -match 'AllergyBanner'
}

Gate "Page has DuplicateTherapyBanner component" {
  $emarPage -match 'DuplicateTherapyBanner'
}

Gate "Page fetches /emar/schedule" {
  $emarPage -match '/emar/schedule'
}

Gate "Page fetches /emar/allergies" {
  $emarPage -match '/emar/allergies'
}

Gate "Page fetches /emar/administer" {
  $emarPage -match '/emar/administer'
}

Gate "Page fetches /emar/barcode-scan" {
  $emarPage -match '/emar/barcode-scan'
}

Gate "Page has patient context banner" {
  $emarPage -match 'patient-context'
}

Gate "Page has credentials include" {
  $emarPage -match "credentials.*include"
}

Gate "Page has 5 Rights display" {
  $emarPage -match 'Right Patient.*Right Medication'
}

Gate "Page has Back to Inpatient nav" {
  $emarPage -match 'Back to Inpatient'
}

Gate "Page uses useSearchParams for dfn" {
  $emarPage -match 'useSearchParams'
}

# ---- Section 4: Integration points ----
Write-Host "`n--- Section 4: Integration Points ---" -ForegroundColor Yellow

$indexTs = Get-Content "apps/api/src/index.ts" -Raw -ErrorAction SilentlyContinue

Gate "index.ts imports emarRoutes" {
  $indexTs -match 'import emarRoutes'
}

Gate "index.ts registers emarRoutes" {
  $indexTs -match 'server.register\(emarRoutes\)'
}

$securityTs = Get-Content "apps/api/src/middleware/security.ts" -Raw -ErrorAction SilentlyContinue

Gate "AUTH_RULES has /emar/ pattern" {
  $securityTs -match 'emar'
}

$menuBar = Get-Content "apps/web/src/components/cprs/CPRSMenuBar.tsx" -Raw -ErrorAction SilentlyContinue

Gate "CPRSMenuBar has eMAR menu item" {
  $menuBar -match 'eMAR \(Medication Admin\)'
}

Gate "CPRSMenuBar has emar action handler" {
  $menuBar -match "action === 'emar'"
}

Gate "CPRSMenuBar routes to /cprs/emar" {
  $menuBar -match '/cprs/emar'
}

# ---- Section 5: Documentation ----
Write-Host "`n--- Section 5: Documentation ---" -ForegroundColor Yellow

$runbook = Get-Content "docs/runbooks/emar-bcma.md" -Raw -ErrorAction SilentlyContinue

Gate "Runbook has endpoint table" {
  $runbook -match '/emar/schedule.*GET.*vista'
}

Gate "Runbook has migration path" {
  $runbook -match 'Migration Path to Production BCMA'
}

Gate "Runbook has manual testing section" {
  $runbook -match 'Manual Testing'
}

$grounding = Get-Content "docs/grounding/emar-bcma-grounding.md" -Raw -ErrorAction SilentlyContinue

Gate "Grounding doc has feature-to-RPC mapping" {
  $grounding -match 'Feature-to-RPC Mapping'
}

Gate "Grounding doc has VistA file references" {
  $grounding -match 'VistA File References'
}

Gate "Grounding doc has 5-Rights framework" {
  $grounding -match '5-Rights Framework'
}

Gate "Grounding doc has heuristic declarations" {
  $grounding -match 'Heuristic Declarations'
}

Gate "Grounding doc has migration prerequisites" {
  $grounding -match 'Migration Prerequisites'
}

# ---- Section 6: No anti-patterns ----
Write-Host "`n--- Section 6: Anti-Pattern Checks ---" -ForegroundColor Yellow

Gate "No console.log in emar routes" {
  -not ($emarRoute -match 'console\.log')
}

Gate "No hardcoded credentials in emar routes" {
  -not ($emarRoute -match 'PROV123|PHARM123|NURSE123')
}

Gate "No console.log in emar page" {
  -not ($emarPage -match 'console\.log')
}

Gate "No hardcoded credentials in emar page" {
  -not ($emarPage -match 'PROV123|PHARM123|NURSE123')
}

Gate "Heuristic labeled as heuristic (not clinical)" {
  ($emarRoute -match 'heuristic') -and ($emarPage -match '[Hh]euristic')
}

Gate "No fake success in pending endpoints" {
  -not ($emarRoute -match '"source":\s*"vista".*PSB MED LOG')
}

# ---- Summary ----
Write-Host "`n=== Phase 85 eMAR + BCMA Verifier Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($pass -eq $total) { "Green" } else { "Yellow" })
Write-Host "  FAIL: $fail / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

if ($fail -eq 0) {
  Write-Host "`n  ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "`n  $fail GATE(S) FAILED -- review above" -ForegroundColor Red
}

exit $fail
