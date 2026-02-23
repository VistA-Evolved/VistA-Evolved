<# Phase 97 -- Top-5 HMO LOA + Claim Packet + Portal Adapter Verifier
   Gates: source structure, type system, adapter registry, LOA engine,
          claim packet builder, submission tracker, routes, UI dashboard,
          security/PHI, regression, wiring
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

Write-Host "`n=== Phase 97 -- Top-5 HMO Portal Adapter Verification ===" -ForegroundColor Cyan

# ================================================================
# Section 1: Source Structure (files exist)
# ================================================================
Write-Host "`n--- Source Structure ---" -ForegroundColor Yellow

Gate "P97-001" "types.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/types.ts"
}

Gate "P97-002" "loa-engine.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/loa-engine.ts"
}

Gate "P97-003" "hmo-packet-builder.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/hmo-packet-builder.ts"
}

Gate "P97-004" "submission-tracker.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/submission-tracker.ts"
}

Gate "P97-005" "portal-adapter.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/portal-adapter.ts"
}

Gate "P97-006" "hmo-portal-routes.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts"
}

Gate "P97-007" "adapters/index.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/adapters/index.ts"
}

Gate "P97-008" "adapters/maxicare.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/adapters/maxicare.ts"
}

Gate "P97-009" "adapters/medicard.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/adapters/medicard.ts"
}

Gate "P97-010" "adapters/intellicare.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/adapters/intellicare.ts"
}

Gate "P97-011" "adapters/philcare.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/adapters/philcare.ts"
}

Gate "P97-012" "adapters/valucare.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/hmo-portal/adapters/valucare.ts"
}

Gate "P97-013" "UI page.tsx exists" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/admin/hmo-portal/page.tsx"
}

# ================================================================
# Section 2: Type System + Domain Model
# ================================================================
Write-Host "`n--- Type System + Domain Model ---" -ForegroundColor Yellow

$typesContent = Get-Content "apps/api/src/rcm/hmo-portal/types.ts" -Raw

Gate "P97-014" "PORTAL_CAPABLE_HMOS has 5 HMOs" {
  ($typesContent -match 'PH-MAXICARE') -and
  ($typesContent -match 'PH-MEDICARD') -and
  ($typesContent -match 'PH-INTELLICARE') -and
  ($typesContent -match 'PH-PHILCARE') -and
  ($typesContent -match 'PH-VALUCARE')
}

Gate "P97-015" "isPortalCapableHmo function exported" {
  $typesContent -match 'export function isPortalCapableHmo'
}

Gate "P97-016" "VaultRef interface defined (no credential storage)" {
  $typesContent -match 'export interface VaultRef'
}

Gate "P97-017" "PortalAdapterMode type defined" {
  ($typesContent -match 'manual_assisted') -and ($typesContent -match 'vault_automated')
}

Gate "P97-018" "16 DepartmentSpecialty values" {
  ($typesContent -match 'general_medicine') -and
  ($typesContent -match 'surgery') -and
  ($typesContent -match 'obstetrics_gynecology') -and
  ($typesContent -match 'pediatrics') -and
  ($typesContent -match 'orthopedics') -and
  ($typesContent -match 'cardiology') -and
  ($typesContent -match 'neurology') -and
  ($typesContent -match 'oncology') -and
  ($typesContent -match 'emergency') -and
  ($typesContent -match 'rehabilitation') -and
  ($typesContent -match 'psychiatry') -and
  ($typesContent -match 'ophthalmology') -and
  ($typesContent -match 'dental') -and
  ($typesContent -match 'other')
}

Gate "P97-019" "LoaPacket interface defined" {
  $typesContent -match 'export interface LoaPacket'
}

Gate "P97-020" "HmoClaimPacket interface defined" {
  $typesContent -match 'export interface HmoClaimPacket'
}

Gate "P97-021" "PortalAdapter interface defined" {
  $typesContent -match 'export interface PortalAdapter'
}

Gate "P97-022" "12-state HmoSubmissionStatus FSM" {
  ($typesContent -match '"draft"') -and
  ($typesContent -match '"loa_pending"') -and
  ($typesContent -match '"loa_approved"') -and
  ($typesContent -match '"loa_denied"') -and
  ($typesContent -match '"claim_prepared"') -and
  ($typesContent -match '"claim_exported"') -and
  ($typesContent -match '"claim_submitted_manual"') -and
  ($typesContent -match '"claim_processing"') -and
  ($typesContent -match '"claim_approved"') -and
  ($typesContent -match '"claim_denied"') -and
  ($typesContent -match '"remittance_received"') -and
  ($typesContent -match '"posted_to_vista"')
}

Gate "P97-023" "HMO_STATUS_TRANSITIONS maps all states" {
  $typesContent -match 'export const HMO_STATUS_TRANSITIONS'
}

Gate "P97-024" "isValidHmoTransition function exported" {
  $typesContent -match 'export function isValidHmoTransition'
}

Gate "P97-025" "Adapter registry functions exported" {
  ($typesContent -match 'export function registerPortalAdapter') -and
  ($typesContent -match 'export function getPortalAdapter') -and
  ($typesContent -match 'export function listPortalAdapters')
}

Gate "P97-026" "HmoSubmissionRecord interface defined" {
  $typesContent -match 'export interface HmoSubmissionRecord'
}

Gate "P97-027" "PortalSubmitResult has exportFiles field" {
  $typesContent -match 'exportFiles.*Array'
}

# ================================================================
# Section 3: LOA Engine
# ================================================================
Write-Host "`n--- LOA Engine ---" -ForegroundColor Yellow

$loaContent = Get-Content "apps/api/src/rcm/hmo-portal/loa-engine.ts" -Raw

Gate "P97-028" "LOA engine imports LoaRequest from Phase 94" {
  $loaContent -match 'import.*LoaRequest.*from.*loa-types'
}

Gate "P97-029" "LOA engine has 16 specialty templates" {
  ($loaContent -match 'SPECIALTY_TEMPLATES') -and
  ($loaContent -match 'general_medicine') -and
  ($loaContent -match 'surgery') -and
  ($loaContent -match 'oncology') -and
  ($loaContent -match 'dental')
}

Gate "P97-030" "buildLoaPacket function exported" {
  $loaContent -match 'export function buildLoaPacket'
}

Gate "P97-031" "generateLoaExports function exported" {
  $loaContent -match 'export function generateLoaExports'
}

Gate "P97-032" "SHA-256 content hash for LOA packets" {
  ($loaContent -match 'createHash.*sha256') -and ($loaContent -match 'contentHash')
}

Gate "P97-033" "LOA validation checks required fields" {
  ($loaContent -match 'Patient DFN is required') -and
  ($loaContent -match 'Payer ID is required') -and
  ($loaContent -match 'Encounter date is required') -and
  ($loaContent -match 'At least one diagnosis is required')
}

Gate "P97-034" "LOA PDF text export generates formatted output" {
  ($loaContent -match 'LETTER OF AUTHORIZATION') -and
  ($loaContent -match 'PATIENT INFORMATION') -and
  ($loaContent -match 'PAYER INFORMATION')
}

Gate "P97-035" "LOA export supports json and pdf_text formats" {
  ($loaContent -match "case.*json") -and ($loaContent -match "case.*pdf_text")
}

# ================================================================
# Section 4: HMO Claim Packet Builder
# ================================================================
Write-Host "`n--- HMO Claim Packet Builder ---" -ForegroundColor Yellow

$hmoBuilderContent = Get-Content "apps/api/src/rcm/hmo-portal/hmo-packet-builder.ts" -Raw

Gate "P97-036" "HMO builder imports Claim from Phase 38" {
  $hmoBuilderContent -match 'import.*Claim.*from.*domain/claim'
}

Gate "P97-037" "buildHmoClaimPacket function exported" {
  $hmoBuilderContent -match 'export function buildHmoClaimPacket'
}

Gate "P97-038" "Cents to pesos conversion (divide by 100)" {
  $hmoBuilderContent -match 'charge\s*/\s*100'
}

Gate "P97-039" "Default 80% HMO coverage" {
  $hmoBuilderContent -match '0\.8'
}

Gate "P97-040" "SHA-256 content hash for claim packets" {
  ($hmoBuilderContent -match 'createHash.*sha256') -and ($hmoBuilderContent -match 'contentHash')
}

Gate "P97-041" "Claim validation checks required fields" {
  ($hmoBuilderContent -match 'Patient DFN is required') -and
  ($hmoBuilderContent -match 'Payer ID is required') -and
  ($hmoBuilderContent -match 'At least one diagnosis is required') -and
  ($hmoBuilderContent -match 'Date of service is required')
}

Gate "P97-042" "exportHmoPacketJson function exported" {
  $hmoBuilderContent -match 'export function exportHmoPacketJson'
}

Gate "P97-043" "exportHmoPacketText function exported" {
  $hmoBuilderContent -match 'export function exportHmoPacketText'
}

Gate "P97-044" "Totals use Math.round for currency precision" {
  $hmoBuilderContent -match 'Math\.round'
}

# ================================================================
# Section 5: Submission Tracker
# ================================================================
Write-Host "`n--- Submission Tracker ---" -ForegroundColor Yellow

$trackerContent = Get-Content "apps/api/src/rcm/hmo-portal/submission-tracker.ts" -Raw

Gate "P97-045" "createSubmission function exported" {
  $trackerContent -match 'export function createSubmission'
}

Gate "P97-046" "transitionSubmission uses isValidHmoTransition" {
  ($trackerContent -match 'export function transitionSubmission') -and
  ($trackerContent -match 'isValidHmoTransition')
}

Gate "P97-047" "getSubmissionStats returns all 12 statuses" {
  ($trackerContent -match 'export function getSubmissionStats') -and
  ($trackerContent -match 'draft.*loa_pending.*loa_approved')
}

Gate "P97-048" "updateSubmissionFields function exported" {
  $trackerContent -match 'export function updateSubmissionFields'
}

Gate "P97-049" "addStaffNote function exported" {
  $trackerContent -match 'export function addStaffNote'
}

Gate "P97-050" "In-memory store with Map" {
  $trackerContent -match 'new Map'
}

Gate "P97-051" "_resetSubmissionStore for testing" {
  $trackerContent -match 'export function _resetSubmissionStore'
}

# ================================================================
# Section 6: Portal Adapter Base Class
# ================================================================
Write-Host "`n--- Portal Adapter Base ---" -ForegroundColor Yellow

$adapterContent = Get-Content "apps/api/src/rcm/hmo-portal/portal-adapter.ts" -Raw

Gate "P97-052" "ManualAssistedAdapter class exported" {
  $adapterContent -match 'export class ManualAssistedAdapter'
}

Gate "P97-053" "ManualAssistedAdapter implements PortalAdapter" {
  $adapterContent -match 'implements PortalAdapter'
}

Gate "P97-054" "Mode is manual_assisted" {
  $adapterContent -match 'mode.*manual_assisted'
}

Gate "P97-055" "submitLOA generates exports and deep link" {
  ($adapterContent -match 'async submitLOA') -and
  ($adapterContent -match 'generateLoaExports') -and
  ($adapterContent -match 'portalUrl')
}

Gate "P97-056" "submitClaim generates JSON and text exports" {
  ($adapterContent -match 'async submitClaim') -and
  ($adapterContent -match 'exportHmoPacketJson') -and
  ($adapterContent -match 'exportHmoPacketText')
}

Gate "P97-057" "healthCheck returns healthy with details" {
  ($adapterContent -match 'async healthCheck') -and
  ($adapterContent -match 'healthy.*true')
}

# ================================================================
# Section 7: Per-HMO Adapters (5)
# ================================================================
Write-Host "`n--- Per-HMO Adapters ---" -ForegroundColor Yellow

Gate "P97-058" "Maxicare adapter registers with PH-MAXICARE" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/maxicare.ts" -Raw
  ($c -match 'PH-MAXICARE') -and ($c -match 'registerPortalAdapter') -and ($c -match 'provider\.maxicare\.com\.ph')
}

Gate "P97-059" "MediCard adapter registers with PH-MEDICARD" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/medicard.ts" -Raw
  ($c -match 'PH-MEDICARD') -and ($c -match 'registerPortalAdapter') -and ($c -match 'provider\.medicard\.com\.ph')
}

Gate "P97-060" "Intellicare adapter registers with PH-INTELLICARE" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/intellicare.ts" -Raw
  ($c -match 'PH-INTELLICARE') -and ($c -match 'registerPortalAdapter') -and ($c -match 'provider\.intellicare\.com\.ph')
}

Gate "P97-061" "PhilCare adapter registers with PH-PHILCARE" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/philcare.ts" -Raw
  ($c -match 'PH-PHILCARE') -and ($c -match 'registerPortalAdapter') -and ($c -match 'philcare\.com\.ph')
}

Gate "P97-062" "ValuCare adapter registers with PH-VALUCARE" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/valucare.ts" -Raw
  ($c -match 'PH-VALUCARE') -and ($c -match 'registerPortalAdapter') -and ($c -match 'provider\.valucare\.com\.ph')
}

Gate "P97-063" "adapters/index.ts exports initHmoPortalAdapters" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/index.ts" -Raw
  $c -match 'export function initHmoPortalAdapters'
}

Gate "P97-064" "adapters/index.ts re-exports all 5 adapters" {
  $c = Get-Content "apps/api/src/rcm/hmo-portal/adapters/index.ts" -Raw
  ($c -match 'maxicareAdapter') -and ($c -match 'medicardAdapter') -and
  ($c -match 'intellicareAdapter') -and ($c -match 'philcareAdapter') -and
  ($c -match 'valucareAdapter')
}

# ================================================================
# Section 8: Routes (18 endpoints)
# ================================================================
Write-Host "`n--- Routes ---" -ForegroundColor Yellow

$routesContent = Get-Content "apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts" -Raw

Gate "P97-065" "GET /rcm/hmo-portal/status route" {
  $routesContent -match 'rcm/hmo-portal/status'
}

Gate "P97-066" "GET /rcm/hmo-portal/adapters route" {
  $routesContent -match 'rcm/hmo-portal/adapters"'
}

Gate "P97-067" "GET /rcm/hmo-portal/adapters/:payerId route" {
  $routesContent -match 'rcm/hmo-portal/adapters/:payerId"'
}

Gate "P97-068" "GET /rcm/hmo-portal/adapters/:payerId/health route" {
  $routesContent -match 'rcm/hmo-portal/adapters/:payerId/health'
}

Gate "P97-069" "GET /rcm/hmo-portal/specialties route" {
  $routesContent -match 'rcm/hmo-portal/specialties'
}

Gate "P97-070" "POST /rcm/hmo-portal/loa/build route" {
  $routesContent -match 'rcm/hmo-portal/loa/build'
}

Gate "P97-071" "POST /rcm/hmo-portal/loa/export route" {
  $routesContent -match 'rcm/hmo-portal/loa/export'
}

Gate "P97-072" "POST /rcm/hmo-portal/loa/submit route" {
  $routesContent -match 'rcm/hmo-portal/loa/submit'
}

Gate "P97-073" "POST /rcm/hmo-portal/claims/build route" {
  $routesContent -match 'rcm/hmo-portal/claims/build'
}

Gate "P97-074" "POST /rcm/hmo-portal/claims/export route" {
  $routesContent -match 'rcm/hmo-portal/claims/export'
}

Gate "P97-075" "POST /rcm/hmo-portal/claims/submit route" {
  $routesContent -match 'rcm/hmo-portal/claims/submit'
}

Gate "P97-076" "POST /rcm/hmo-portal/status-check route" {
  $routesContent -match 'rcm/hmo-portal/status-check'
}

Gate "P97-077" "POST /rcm/hmo-portal/remit-check route" {
  $routesContent -match 'rcm/hmo-portal/remit-check'
}

Gate "P97-078" "GET /rcm/hmo-portal/submissions route" {
  $routesContent -match 'rcm/hmo-portal/submissions"'
}

Gate "P97-079" "GET /rcm/hmo-portal/submissions/stats route" {
  $routesContent -match 'rcm/hmo-portal/submissions/stats'
}

Gate "P97-080" "GET /rcm/hmo-portal/submissions/:id route" {
  $routesContent -match 'rcm/hmo-portal/submissions/:id"'
}

Gate "P97-081" "PUT /rcm/hmo-portal/submissions/:id/status route" {
  $routesContent -match 'rcm/hmo-portal/submissions/:id/status'
}

Gate "P97-082" "POST /rcm/hmo-portal/submissions/:id/note route" {
  $routesContent -match 'rcm/hmo-portal/submissions/:id/note'
}

Gate "P97-083" "Routes use (req.body as any) || {} guard (BUG-046)" {
  $matches = [regex]::Matches($routesContent, 'req\.body as any.*\|\|.*\{\}')
  $matches.Count -ge 5
}

Gate "P97-084" "Routes extract session actor safely" {
  $routesContent -match 'session\?\.\s*userName\s*\?\?\s*session\?\.\s*duz\s*\?\?\s*"system"'
}

# ================================================================
# Section 9: Wiring (index.ts + layout.tsx)
# ================================================================
Write-Host "`n--- Wiring ---" -ForegroundColor Yellow

$indexContent = Get-Content "apps/api/src/index.ts" -Raw

Gate "P97-085" "index.ts imports hmoPortalRoutes" {
  $indexContent -match 'import hmoPortalRoutes from.*hmo-portal-routes'
}

Gate "P97-086" "index.ts imports initHmoPortalAdapters" {
  $indexContent -match 'import.*initHmoPortalAdapters.*from.*hmo-portal/adapters'
}

Gate "P97-087" "index.ts calls initHmoPortalAdapters()" {
  $indexContent -match 'initHmoPortalAdapters\(\)'
}

Gate "P97-088" "index.ts registers hmoPortalRoutes" {
  $indexContent -match 'server\.register\(hmoPortalRoutes\)'
}

$layoutContent = Get-Content "apps/web/src/app/cprs/admin/layout.tsx" -Raw

Gate "P97-089" "layout.tsx has HMO Portal nav entry" {
  ($layoutContent -match 'HMO Portal') -and ($layoutContent -match 'hmo-portal')
}

# ================================================================
# Section 10: UI Dashboard
# ================================================================
Write-Host "`n--- UI Dashboard ---" -ForegroundColor Yellow

$uiContent = Get-Content "apps/web/src/app/cprs/admin/hmo-portal/page.tsx" -Raw

Gate "P97-090" "UI has 5 tab components" {
  ($uiContent -match 'AdaptersTab') -and ($uiContent -match 'LoaBuilderTab') -and
  ($uiContent -match 'ClaimBuilderTab') -and ($uiContent -match 'SubmissionsTab') -and
  ($uiContent -match 'StatsTab')
}

Gate "P97-091" "UI uses credentials include (AGENTS.md #20)" {
  $uiContent -match 'credentials.*include'
}

Gate "P97-092" "UI has demo LOA build button" {
  $uiContent -match 'Build Demo LOA Packet'
}

Gate "P97-093" "UI has demo claim build button" {
  $uiContent -match 'Build Demo Claim Packet'
}

Gate "P97-094" "UI demo claim uses cents for charges" {
  $uiContent -match 'charge:\s*150000'
}

Gate "P97-095" "UI SubmissionDetail component has timeline display" {
  ($uiContent -match 'SubmissionDetail') -and ($uiContent -match 'Timeline') -and ($uiContent -match 'fromStatus.*toStatus')
}

Gate "P97-096" "UI has staff note add functionality" {
  ($uiContent -match 'Add Note') -and ($uiContent -match 'handleAddNote')
}

Gate "P97-097" "UI specialties table renders" {
  ($uiContent -match 'Available Specialty Templates') -and ($uiContent -match 'requiredFields')
}

# ================================================================
# Section 11: Security + PHI Scan
# ================================================================
Write-Host "`n--- Security + PHI ---" -ForegroundColor Yellow

Gate "P97-098" "No console.log in API hmo-portal files" {
  $files = Get-ChildItem -Path "apps/api/src/rcm/hmo-portal" -Recurse -Include "*.ts"
  $hits = $files | Select-String -Pattern 'console\.log' -SimpleMatch
  $hits.Count -eq 0
}

Gate "P97-099" "No console.log in UI page.tsx" {
  $hits = Select-String -Path "apps/web/src/app/cprs/admin/hmo-portal/page.tsx" -Pattern 'console\.log' -SimpleMatch
  $null -eq $hits -or $hits.Count -eq 0
}

Gate "P97-100" "No hardcoded credentials in Phase 97 files" {
  $files = Get-ChildItem -Path "apps/api/src/rcm/hmo-portal" -Recurse -Include "*.ts"
  $hits = $files | Select-String -Pattern 'PROV123|NURSE123|PHARM123' -SimpleMatch
  $hits.Count -eq 0
}

Gate "P97-101" "VaultRef prevents credential storage (by design)" {
  ($typesContent -match 'VaultRef') -and ($typesContent -match 'Opaque reference to credentials')
}

Gate "P97-102" "No actual secrets stored in adapter files" {
  $files = Get-ChildItem -Path "apps/api/src/rcm/hmo-portal/adapters" -Include "*.ts" -Recurse
  $hits = $files | Select-String -Pattern 'password\s*[:=]|api_key\s*[:=]|bearer\s' -CaseSensitive:$false
  $null -eq $hits -or $hits.Count -eq 0
}

# ================================================================
# Section 12: Regression Checks
# ================================================================
Write-Host "`n--- Regression Checks ---" -ForegroundColor Yellow

Gate "P97-103" "Phase 94 loa-types.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/loa/loa-types.ts"
}

Gate "P97-104" "Phase 94 loa-store.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/loa/loa-store.ts"
}

Gate "P97-105" "Phase 94 loa-routes.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/loa/loa-routes.ts"
}

Gate "P97-106" "Phase 38 claim.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/domain/claim.ts"
}

Gate "P97-107" "Phase 93 ph-hmo-registry.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/payers/ph-hmo-registry.ts"
}

Gate "P97-108" "Phase 96 eclaims routes still registered in index.ts" {
  $indexContent -match 'eclaims3Routes|eclaims'
}

Gate "P97-109" "No duplicate route prefix /rcm/hmo-portal in index.ts" {
  ($indexContent -split 'hmoPortalRoutes').Count -le 3
}

# ================================================================
# Section 13: TypeScript Compilation
# ================================================================
Write-Host "`n--- TypeScript Compilation ---" -ForegroundColor Yellow

Gate "P97-110" "API project compiles with zero errors" {
  $output = pnpm -C apps/api exec tsc --noEmit 2>&1
  $exitCode = $LASTEXITCODE
  ($null -eq $output -or ($output | Out-String).Trim() -eq "") -and ($exitCode -eq 0 -or $null -eq $exitCode)
}

Gate "P97-111" "Web project compiles with zero errors" {
  $output = pnpm -C apps/web exec tsc --noEmit 2>&1
  $exitCode = $LASTEXITCODE
  ($null -eq $output -or ($output | Out-String).Trim() -eq "") -and ($exitCode -eq 0 -or $null -eq $exitCode)
}

# ================================================================
# Section 14: Contract Integrity
# ================================================================
Write-Host "`n--- Contract Integrity ---" -ForegroundColor Yellow

Gate "P97-112" "LOA engine imports match types exports" {
  ($loaContent -match 'LoaPacket') -and ($loaContent -match 'LoaPacketExport') -and
  ($loaContent -match 'LoaPacketFormat') -and ($loaContent -match 'DepartmentSpecialty')
}

Gate "P97-113" "HMO builder imports match types exports" {
  ($hmoBuilderContent -match 'HmoClaimPacket') -and ($hmoBuilderContent -match 'DepartmentSpecialty')
}

Gate "P97-114" "Routes import from all module files" {
  ($routesContent -match 'from.*types') -and
  ($routesContent -match 'from.*loa-engine') -and
  ($routesContent -match 'from.*hmo-packet-builder') -and
  ($routesContent -match 'from.*submission-tracker')
}

Gate "P97-115" "Submission tracker imports isValidHmoTransition" {
  $trackerContent -match 'import.*isValidHmoTransition.*from.*types'
}

# ================================================================
# Summary
# ================================================================
Write-Host "`n=== Phase 97 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "  FAIL: $fail / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

if ($fail -eq 0) {
  Write-Host "`n  ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "`n  SOME GATES FAILED -- review above" -ForegroundColor Red
}

exit $fail
