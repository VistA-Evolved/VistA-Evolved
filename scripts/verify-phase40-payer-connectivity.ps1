<# Phase 40 -- Payer Connectivity Platform Verifier
   Gates: source structure, submission safety, X12 serializer, CSV import,
          export artifacts, authorization rules, UI enhancements, audit actions
#>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  $script:total++
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
    Write-Host "  FAIL  $id  $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 40 -- Payer Connectivity Platform ===" -ForegroundColor Cyan

# ---- Source Structure ----
Write-Host "`n--- Source Structure ---" -ForegroundColor Yellow

Gate "P40-001" "claim.ts has ready_to_submit status" {
  (Get-Content apps/api/src/rcm/domain/claim.ts -Raw) -match 'ready_to_submit'
}

Gate "P40-002" "claim.ts has isDemo field" {
  (Get-Content apps/api/src/rcm/domain/claim.ts -Raw) -match 'isDemo'
}

Gate "P40-003" "claim.ts has submissionSafetyMode field" {
  (Get-Content apps/api/src/rcm/domain/claim.ts -Raw) -match 'submissionSafetyMode'
}

Gate "P40-004" "claim.ts has exportArtifactPath field" {
  (Get-Content apps/api/src/rcm/domain/claim.ts -Raw) -match 'exportArtifactPath'
}

Gate "P40-005" "CLAIM_TRANSITIONS includes ready_to_submit" {
  (Get-Content apps/api/src/rcm/domain/claim.ts -Raw) -match 'ready_to_submit.*submitted'
}

# ---- X12 Serializer ----
Write-Host "`n--- X12 Serializer ---" -ForegroundColor Yellow

Gate "P40-006" "x12-serializer.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/edi/x12-serializer.ts"
}

Gate "P40-007" "x12-serializer exports serialize837" {
  (Get-Content apps/api/src/rcm/edi/x12-serializer.ts -Raw) -match 'export function serialize837'
}

Gate "P40-008" "x12-serializer exports serialize270" {
  (Get-Content apps/api/src/rcm/edi/x12-serializer.ts -Raw) -match 'export function serialize270'
}

Gate "P40-009" "x12-serializer exports exportX12Bundle" {
  (Get-Content apps/api/src/rcm/edi/x12-serializer.ts -Raw) -match 'export async function exportX12Bundle'
}

Gate "P40-010" "x12-serializer uses segment terminator tilde" {
  (Get-Content apps/api/src/rcm/edi/x12-serializer.ts -Raw) -match "SEG_TERM = '~'"
}

Gate "P40-011" "x12-serializer default usageIndicator is T (test)" {
  (Get-Content apps/api/src/rcm/edi/x12-serializer.ts -Raw) -match "usageIndicator: 'T'"
}

# ---- PhilHealth Serializer ----
Write-Host "`n--- PhilHealth eClaims Serializer ---" -ForegroundColor Yellow

Gate "P40-012" "ph-eclaims-serializer.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/edi/ph-eclaims-serializer.ts"
}

Gate "P40-013" "ph-eclaims-serializer exports buildPhilHealthBundle" {
  (Get-Content apps/api/src/rcm/edi/ph-eclaims-serializer.ts -Raw) -match 'export function buildPhilHealthBundle'
}

Gate "P40-014" "ph-eclaims-serializer has CF1-CF4 types" {
  $content = Get-Content apps/api/src/rcm/edi/ph-eclaims-serializer.ts -Raw
  ($content -match 'PhilHealthCF1') -and ($content -match 'PhilHealthCF2') -and ($content -match 'PhilHealthCF3') -and ($content -match 'PhilHealthCF4')
}

Gate "P40-015" "ph-eclaims-serializer has PhilHealthClaimBundle type" {
  (Get-Content apps/api/src/rcm/edi/ph-eclaims-serializer.ts -Raw) -match 'PhilHealthClaimBundle'
}

# ---- Submission Safety ----
Write-Host "`n--- Submission Safety ---" -ForegroundColor Yellow

Gate "P40-016" "rcm-routes has CLAIM_SUBMISSION_ENABLED check" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match 'CLAIM_SUBMISSION_ENABLED'
}

Gate "P40-017" "rcm-routes has isSubmissionEnabled function" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match 'function isSubmissionEnabled'
}

Gate "P40-018" "rcm-routes has getSubmissionSafetyStatus function" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match 'function getSubmissionSafetyStatus'
}

Gate "P40-019" "rcm-routes has /rcm/submission-safety endpoint" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/submission-safety'
}

Gate "P40-020" "rcm-routes blocks demo claim submission" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match 'claim.isDemo'
}

Gate "P40-021" "rcm-routes has export-only fallback in submit" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match 'export_only'
}

# ---- Export Artifacts ----
Write-Host "`n--- Export Artifacts ---" -ForegroundColor Yellow

Gate "P40-022" "rcm-routes has /rcm/claims/:id/export endpoint" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/claims/:id/export'
}

Gate "P40-023" "sandbox-connector has exportClaim method" {
  (Get-Content apps/api/src/rcm/connectors/sandbox-connector.ts -Raw) -match 'async exportClaim'
}

Gate "P40-024" "sandbox-connector imports x12-serializer" {
  (Get-Content apps/api/src/rcm/connectors/sandbox-connector.ts -Raw) -match "from '../edi/x12-serializer"
}

# ---- CSV Import ----
Write-Host "`n--- CSV Payer Import ---" -ForegroundColor Yellow

Gate "P40-025" "rcm-routes has /rcm/payers/import endpoint" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/payers/import'
}

Gate "P40-026" "rcm-routes has PATCH /rcm/payers/:id" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match "server.patch\('/rcm/payers/:id'"
}

# ---- Validation Rules ----
Write-Host "`n--- Authorization Validation Rules ---" -ForegroundColor Yellow

Gate "P40-027" "engine.ts has AUTH-001 rule" {
  (Get-Content apps/api/src/rcm/validation/engine.ts -Raw) -match 'AUTH-001'
}

Gate "P40-028" "engine.ts has AUTH-002 demo claim rule" {
  (Get-Content apps/api/src/rcm/validation/engine.ts -Raw) -match 'AUTH-002'
}

Gate "P40-029" "engine.ts has AUTH-003 safety mode rule" {
  (Get-Content apps/api/src/rcm/validation/engine.ts -Raw) -match 'AUTH-003'
}

Gate "P40-030" "engine.ts includes authorizationRules in ALL_RULES" {
  (Get-Content apps/api/src/rcm/validation/engine.ts -Raw) -match 'authorizationRules'
}

# ---- Audit Actions ----
Write-Host "`n--- Audit Actions ---" -ForegroundColor Yellow

Gate "P40-031" "rcm-audit.ts has claim.exported action" {
  (Get-Content apps/api/src/rcm/audit/rcm-audit.ts -Raw) -match "'claim.exported'"
}

Gate "P40-032" "rcm-audit.ts has claim.ready_to_submit action" {
  (Get-Content apps/api/src/rcm/audit/rcm-audit.ts -Raw) -match "'claim.ready_to_submit'"
}

Gate "P40-033" "rcm-audit.ts has safety.export_only action" {
  (Get-Content apps/api/src/rcm/audit/rcm-audit.ts -Raw) -match "'safety.export_only'"
}

Gate "P40-034" "rcm-audit.ts has payer.csv_imported action" {
  (Get-Content apps/api/src/rcm/audit/rcm-audit.ts -Raw) -match "'payer.csv_imported'"
}

Gate "P40-035" "rcm-audit.ts has edi.x12_serialized action" {
  (Get-Content apps/api/src/rcm/audit/rcm-audit.ts -Raw) -match "'edi.x12_serialized'"
}

# ---- UI Enhancements ----
Write-Host "`n--- UI Enhancements ---" -ForegroundColor Yellow

Gate "P40-036" "page.tsx has Phase 40 in header comment" {
  (Get-Content apps/web/src/app/cprs/admin/rcm/page.tsx -Raw) -match 'Phase 40'
}

Gate "P40-037" "page.tsx has submission safety banner" {
  (Get-Content apps/web/src/app/cprs/admin/rcm/page.tsx -Raw) -match 'EXPORT-ONLY MODE'
}

Gate "P40-038" "page.tsx has ready_to_submit status color" {
  (Get-Content apps/web/src/app/cprs/admin/rcm/page.tsx -Raw) -match 'ready_to_submit'
}

Gate "P40-039" "page.tsx has DEMO badge" {
  (Get-Content apps/web/src/app/cprs/admin/rcm/page.tsx -Raw) -match 'isDemo.*DEMO'
}

Gate "P40-040" "page.tsx has EXPORTED indicator" {
  (Get-Content apps/web/src/app/cprs/admin/rcm/page.tsx -Raw) -match 'exportArtifactPath'
}

Gate "P40-041" "page.tsx fetches submission-safety endpoint" {
  (Get-Content apps/web/src/app/cprs/admin/rcm/page.tsx -Raw) -match '/rcm/submission-safety'
}

# ---- Seed Data ----
Write-Host "`n--- Seed Data ---" -ForegroundColor Yellow

Gate "P40-042" "us_core.json exists with payers" {
  $j = Get-Content data/payers/us_core.json -Raw | ConvertFrom-Json
  $j.payers.Count -ge 10
}

Gate "P40-043" "ph_hmos.json exists with payers" {
  $j = Get-Content data/payers/ph_hmos.json -Raw | ConvertFrom-Json
  $j.payers.Count -ge 10
}

# ---- Documentation ----
Write-Host "`n--- Documentation ---" -ForegroundColor Yellow

Gate "P40-044" "Prompt file exists" {
  Test-Path -LiteralPath "prompts/44-PHASE-40-PAYER-CONNECTIVITY/prompt.md"
}

Gate "P40-045" "Runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/rcm-payer-connectivity-phase40.md"
}

Gate "P40-046" "AGENTS.md has Phase 40 section" {
  (Get-Content AGENTS.md -Raw) -match 'Phase 40'
}

# ---- No Hardcoded Secrets ----
Write-Host "`n--- Security ---" -ForegroundColor Yellow

Gate "P40-047" "No hardcoded credentials in rcm files" {
  $rcmFiles = Get-ChildItem -Path apps/api/src/rcm -Recurse -Filter *.ts
  $found = $false
  foreach ($f in $rcmFiles) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match 'PROV123|password\s*=|secret\s*=') {
      $found = $true
      Write-Host "    Found credential pattern in $($f.Name)" -ForegroundColor Red
    }
  }
  -not $found
}

Gate "P40-048" "No PHI in serializer output templates" {
  $content = Get-Content apps/api/src/rcm/edi/x12-serializer.ts -Raw
  -not ($content -match '\d{3}-\d{2}-\d{4}')  # No SSN patterns
}

# ---- Regression: Phase 38 routes still present ----
Write-Host "`n--- Regression ---" -ForegroundColor Yellow

Gate "P40-049" "rcm-routes still has /rcm/health" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/health'
}

Gate "P40-050" "rcm-routes still has /rcm/claims/draft" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/claims/draft'
}

Gate "P40-051" "rcm-routes still has /rcm/eligibility/check" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/eligibility/check'
}

Gate "P40-052" "rcm-routes still has /rcm/audit/verify" {
  (Get-Content apps/api/src/rcm/rcm-routes.ts -Raw) -match '/rcm/audit/verify'
}

Gate "P40-053" "validation engine still has 15+ original rules" {
  $content = Get-Content apps/api/src/rcm/validation/engine.ts -Raw
  ($content -match 'SYN-008') -and ($content -match 'CS-003') -and ($content -match 'BUS-004') -and ($content -match 'PAY-003')
}

# ---- Summary ----
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Phase 40 Payer Connectivity: $pass / $total gates passed" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) {
  Write-Host "$fail gate(s) FAILED" -ForegroundColor Red
}
Write-Host "==========================================`n" -ForegroundColor Cyan

exit $fail
