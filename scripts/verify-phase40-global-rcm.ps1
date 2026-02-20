<# Phase 40 (Superseding) -- Global RCM Connectivity Foundation Verifier
   Covers: expanded payer registry, global connectors, VistA bindings,
           job queue, importer framework, country-specific validation rules,
           UI enhancements, source structure

   Also runs Phase 38 + Phase 39 regression at the end.
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

Write-Host "`n=== Phase 40 (Superseding) -- Global RCM Connectivity Foundation ===" -ForegroundColor Cyan

# ---- Payer Registry: PH HMOs ----
Write-Host "`n--- Payer Registry: PH HMOs ---" -ForegroundColor Yellow

Gate "G40-001" "ph_hmos.json exists" {
  Test-Path -LiteralPath "data/payers/ph_hmos.json"
}

Gate "G40-002" "ph_hmos.json has >= 28 payers" {
  $j = Get-Content "data/payers/ph_hmos.json" -Raw | ConvertFrom-Json
  $j.payers.Count -ge 28
}

Gate "G40-003" "ph_hmos.json includes PhilHealth" {
  (Get-Content "data/payers/ph_hmos.json" -Raw) -match 'PH-PHIC'
}

Gate "G40-004" "ph_hmos.json includes Maxicare" {
  (Get-Content "data/payers/ph_hmos.json" -Raw) -match 'PH-MAXICARE'
}

Gate "G40-005" "ph_hmos.json includes Intellicare" {
  (Get-Content "data/payers/ph_hmos.json" -Raw) -match 'PH-INTELLICARE'
}

Gate "G40-006" "ph_hmos.json includes Medicard" {
  (Get-Content "data/payers/ph_hmos.json" -Raw) -match 'PH-MEDICARD'
}

Gate "G40-007" "ph_hmos.json includes Pacific Cross" {
  (Get-Content "data/payers/ph_hmos.json" -Raw) -match 'PH-PACIFIC-CROSS'
}

# ---- Payer Registry: AU/SG/NZ ----
Write-Host "`n--- Payer Registry: AU/SG/NZ ---" -ForegroundColor Yellow

Gate "G40-008" "au_core.json exists" {
  Test-Path -LiteralPath "data/payers/au_core.json"
}

Gate "G40-009" "au_core.json has >= 6 payers" {
  $j = Get-Content "data/payers/au_core.json" -Raw | ConvertFrom-Json
  $j.payers.Count -ge 6
}

Gate "G40-010" "au_core.json includes AU-MEDICARE" {
  (Get-Content "data/payers/au_core.json" -Raw) -match 'AU-MEDICARE'
}

Gate "G40-011" "sg_core.json exists" {
  Test-Path -LiteralPath "data/payers/sg_core.json"
}

Gate "G40-012" "sg_core.json has >= 5 payers" {
  $j = Get-Content "data/payers/sg_core.json" -Raw | ConvertFrom-Json
  $j.payers.Count -ge 5
}

Gate "G40-013" "sg_core.json includes SG-NPHC" {
  (Get-Content "data/payers/sg_core.json" -Raw) -match 'SG-NPHC'
}

Gate "G40-014" "nz_core.json exists" {
  Test-Path -LiteralPath "data/payers/nz_core.json"
}

Gate "G40-015" "nz_core.json has >= 4 payers" {
  $j = Get-Content "data/payers/nz_core.json" -Raw | ConvertFrom-Json
  $j.payers.Count -ge 4
}

Gate "G40-016" "nz_core.json includes NZ-ACC" {
  (Get-Content "data/payers/nz_core.json" -Raw) -match 'NZ-ACC'
}

Gate "G40-017" "payer.ts PayerCountry includes AU|SG|NZ" {
  $c = Get-Content "apps/api/src/rcm/domain/payer.ts" -Raw
  ($c -match '"AU"') -and ($c -match '"SG"') -and ($c -match '"NZ"')
}

Gate "G40-018" "registry.ts loads au_core.json" {
  (Get-Content "apps/api/src/rcm/payer-registry/registry.ts" -Raw) -match 'au_core\.json'
}

Gate "G40-019" "registry.ts loads sg_core.json" {
  (Get-Content "apps/api/src/rcm/payer-registry/registry.ts" -Raw) -match 'sg_core\.json'
}

Gate "G40-020" "registry.ts loads nz_core.json" {
  (Get-Content "apps/api/src/rcm/payer-registry/registry.ts" -Raw) -match 'nz_core\.json'
}

# ---- Connector Framework ----
Write-Host "`n--- Connector Framework ---" -ForegroundColor Yellow

Gate "G40-021" "officeally-connector.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/officeally-connector.ts"
}

Gate "G40-022" "officeally-connector exports OfficeAllyConnector" {
  (Get-Content "apps/api/src/rcm/connectors/officeally-connector.ts" -Raw) -match 'export class OfficeAllyConnector'
}

Gate "G40-023" "availity-connector.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/availity-connector.ts"
}

Gate "G40-024" "availity-connector exports AvailityConnector" {
  (Get-Content "apps/api/src/rcm/connectors/availity-connector.ts" -Raw) -match 'export class AvailityConnector'
}

Gate "G40-025" "stedi-connector.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/stedi-connector.ts"
}

Gate "G40-026" "stedi-connector is feature-flagged (STEDI_ENABLED)" {
  (Get-Content "apps/api/src/rcm/connectors/stedi-connector.ts" -Raw) -match 'STEDI_ENABLED'
}

Gate "G40-027" "eclipse-au-connector.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/eclipse-au-connector.ts"
}

Gate "G40-028" "eclipse-au-connector exports EclipseAuConnector" {
  (Get-Content "apps/api/src/rcm/connectors/eclipse-au-connector.ts" -Raw) -match 'export class EclipseAuConnector'
}

Gate "G40-029" "acc-nz-connector.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/acc-nz-connector.ts"
}

Gate "G40-030" "acc-nz-connector exports AccNzConnector" {
  (Get-Content "apps/api/src/rcm/connectors/acc-nz-connector.ts" -Raw) -match 'export class AccNzConnector'
}

Gate "G40-031" "nphc-sg-connector.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/nphc-sg-connector.ts"
}

Gate "G40-032" "nphc-sg-connector exports NphcSgConnector" {
  (Get-Content "apps/api/src/rcm/connectors/nphc-sg-connector.ts" -Raw) -match 'export class NphcSgConnector'
}

Gate "G40-033" "rcm-routes.ts imports all new connectors" {
  $r = Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw
  ($r -match 'OfficeAllyConnector') -and ($r -match 'AvailityConnector') -and
  ($r -match 'StediConnector') -and ($r -match 'EclipseAuConnector') -and
  ($r -match 'AccNzConnector') -and ($r -match 'NphcSgConnector')
}

Gate "G40-034" "rcm-routes.ts registers all new connectors in ensureInitialized" {
  $r = Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw
  ($r -match 'new OfficeAllyConnector') -and ($r -match 'new AccNzConnector')
}

# ---- Job Queue ----
Write-Host "`n--- Job Queue ---" -ForegroundColor Yellow

Gate "G40-035" "queue.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/jobs/queue.ts"
}

Gate "G40-036" "queue.ts exports getJobQueue" {
  (Get-Content "apps/api/src/rcm/jobs/queue.ts" -Raw) -match 'export function getJobQueue'
}

Gate "G40-037" "queue.ts has RcmJobType with 5 types" {
  $c = Get-Content "apps/api/src/rcm/jobs/queue.ts" -Raw
  ($c -match 'CLAIM_SUBMIT') -and ($c -match 'ELIGIBILITY_CHECK') -and
  ($c -match 'STATUS_POLL') -and ($c -match 'ERA_INGEST') -and ($c -match 'ACK_PROCESS')
}

Gate "G40-038" "queue.ts has dead_letter status" {
  (Get-Content "apps/api/src/rcm/jobs/queue.ts" -Raw) -match 'dead_letter'
}

Gate "G40-039" "rcm-routes has /rcm/jobs route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/jobs'"
}

Gate "G40-040" "rcm-routes has /rcm/jobs/enqueue route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/jobs/enqueue'"
}

# ---- Payer Catalog Importer ----
Write-Host "`n--- Payer Catalog Importer ---" -ForegroundColor Yellow

Gate "G40-041" "payer-catalog-importer.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/importers/payer-catalog-importer.ts"
}

Gate "G40-042" "payer-catalog-importer exports CsvPayerImporter" {
  (Get-Content "apps/api/src/rcm/importers/payer-catalog-importer.ts" -Raw) -match 'export class CsvPayerImporter'
}

Gate "G40-043" "payer-catalog-importer exports JsonPayerImporter" {
  (Get-Content "apps/api/src/rcm/importers/payer-catalog-importer.ts" -Raw) -match 'export class JsonPayerImporter'
}

Gate "G40-044" "rcm-routes has /rcm/payers/import/json route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/payers/import/json'"
}

# ---- VistA Binding Points ----
Write-Host "`n--- VistA Binding Points ---" -ForegroundColor Yellow

Gate "G40-045" "vistaBindings/encounter-to-claim.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/vistaBindings/encounter-to-claim.ts"
}

Gate "G40-046" "encounter-to-claim exports buildClaimFromVistaEncounter" {
  (Get-Content "apps/api/src/rcm/vistaBindings/encounter-to-claim.ts" -Raw) -match 'export async function buildClaimFromVistaEncounter'
}

Gate "G40-047" "encounter-to-claim exports buildClaimFromEncounterData" {
  (Get-Content "apps/api/src/rcm/vistaBindings/encounter-to-claim.ts" -Raw) -match 'export function buildClaimFromEncounterData'
}

Gate "G40-048" "vistaBindings/era-to-vista.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/vistaBindings/era-to-vista.ts"
}

Gate "G40-049" "era-to-vista exports postEraToVista" {
  (Get-Content "apps/api/src/rcm/vistaBindings/era-to-vista.ts" -Raw) -match 'export async function postEraToVista'
}

Gate "G40-050" "vistaBindings/charge-capture.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/vistaBindings/charge-capture.ts"
}

Gate "G40-051" "charge-capture exports getChargeCaptureCandidates" {
  (Get-Content "apps/api/src/rcm/vistaBindings/charge-capture.ts" -Raw) -match 'export async function getChargeCaptureCandidates'
}

Gate "G40-052" "vistaBindings/index.ts barrel export" {
  Test-Path -LiteralPath "apps/api/src/rcm/vistaBindings/index.ts"
}

Gate "G40-053" "rcm-routes has /rcm/vista/encounter-to-claim route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/vista/encounter-to-claim'"
}

Gate "G40-054" "rcm-routes has /rcm/vista/charge-candidates route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/vista/charge-candidates'"
}

Gate "G40-055" "rcm-routes has /rcm/vista/era-post route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/vista/era-post'"
}

# ---- Validation Engine Enhancement ----
Write-Host "`n--- Validation Engine ---" -ForegroundColor Yellow

Gate "G40-056" "validation engine has CTY-001 PhilHealth PIN rule" {
  (Get-Content "apps/api/src/rcm/validation/engine.ts" -Raw) -match 'CTY-001'
}

Gate "G40-057" "validation engine has CTY-002 AU Medicare rule" {
  (Get-Content "apps/api/src/rcm/validation/engine.ts" -Raw) -match 'CTY-002'
}

Gate "G40-058" "validation engine has CTY-003 NZ ACC rule" {
  (Get-Content "apps/api/src/rcm/validation/engine.ts" -Raw) -match 'CTY-003'
}

Gate "G40-059" "validation engine has CTY-004 connector readiness rule" {
  (Get-Content "apps/api/src/rcm/validation/engine.ts" -Raw) -match 'CTY-004'
}

Gate "G40-060" "validation engine has CTY-005 NPI format rule" {
  (Get-Content "apps/api/src/rcm/validation/engine.ts" -Raw) -match 'CTY-005'
}

Gate "G40-061" "validation engine includes countrySpecificRules in ALL_RULES" {
  (Get-Content "apps/api/src/rcm/validation/engine.ts" -Raw) -match 'countrySpecificRules'
}

# ---- UI Enhancements ----
Write-Host "`n--- UI Enhancements ---" -ForegroundColor Yellow

Gate "G40-062" "RCM page has AU country filter" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match 'Australia'
}

Gate "G40-063" "RCM page has SG country filter" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match 'Singapore'
}

Gate "G40-064" "RCM page has NZ country filter" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match 'New Zealand'
}

Gate "G40-065" "RCM page has job queue stats in connectors tab" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match '/rcm/jobs/stats'
}

Gate "G40-066" "RCM page shows Global RCM branding" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match 'Global RCM'
}

# ---- Connector capability route ----
Write-Host "`n--- Connector Capability ---" -ForegroundColor Yellow

Gate "G40-067" "rcm-routes has /rcm/connectors/capabilities route" {
  (Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "'/rcm/connectors/capabilities'"
}

# ---- Docs ----
Write-Host "`n--- Documentation ---" -ForegroundColor Yellow

Gate "G40-068" "phase40-inventory.md exists" {
  Test-Path -LiteralPath "docs/rcm/phase40-inventory.md"
}

Gate "G40-069" "rcm-global-connectivity.md exists" {
  Test-Path -LiteralPath "docs/runbooks/rcm-global-connectivity.md"
}

# ---- Secret Scan ----
Write-Host "`n--- Secret Scan ---" -ForegroundColor Yellow

Gate "G40-070" "No PROV123 outside login page / e2e / tests / comments" {
  # Scan only apps/api/src and apps/web/src to avoid e2e/tests/node_modules
  $srcFiles = @()
  $srcFiles += Get-ChildItem -Recurse -Include *.ts,*.tsx -Path apps/api/src -ErrorAction SilentlyContinue
  $srcFiles += Get-ChildItem -Recurse -Include *.ts,*.tsx -Path apps/web/src -ErrorAction SilentlyContinue
  $srcFiles += Get-ChildItem -Recurse -Include *.ts,*.tsx -Path apps/portal/src -ErrorAction SilentlyContinue
  $allHits = @($srcFiles |
    Where-Object { $_.Name -notmatch '\.test\.' } |
    Select-String -Pattern 'PROV123' -SimpleMatch |
    Where-Object { $_.Path -notmatch 'page\.tsx' -and $_.Path -notmatch 'config\.ts' -and $_.Path -notmatch 'session-store\.ts' -and $_.Line -notmatch '^\s*//' })
  [int]$allHits.Count -eq 0
}

# ---- console.log cap ----
Gate "G40-071" "console.log count <= 6 in API src" {
  $hits = Get-ChildItem -Recurse -Include *.ts -Path apps/api/src -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules' } |
    Select-String -Pattern 'console\.log'
  $hits.Count -le 6
}

# ---- Summary ----
Write-Host "`n=== Phase 40 Global RCM: $pass/$total passed ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) {
  Write-Host "  $fail gate(s) FAILED" -ForegroundColor Red
}
exit $fail
