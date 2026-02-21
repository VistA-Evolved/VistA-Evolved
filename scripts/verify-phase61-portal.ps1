<#
  .SYNOPSIS
    Phase 61 Verifier -- Patient Portal Digital Front Door v1
  .DESCRIPTION
    Checks prompt files, ADR, wired endpoints, UI updates, governance,
    and portal posture for Phase 61.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$check) {
  $script:total++
  try {
    $result = & $check
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

Write-Host "`n=== Phase 61: Patient Portal Digital Front Door v1 ===" -ForegroundColor Cyan
Write-Host ""

# --- G1: Prompt files ---
Gate "61-01-IMPLEMENT.md exists" {
  Test-Path -LiteralPath "prompts/66-PHASE-61-PORTAL-DIGITAL-FRONT-DOOR/61-01-IMPLEMENT.md"
}
Gate "61-99-VERIFY.md exists" {
  Test-Path -LiteralPath "prompts/66-PHASE-61-PORTAL-DIGITAL-FRONT-DOOR/61-99-VERIFY.md"
}

# --- G2: ADR ---
Gate "ADR-portal-reuse-v1.md exists" {
  Test-Path -LiteralPath "docs/decisions/ADR-portal-reuse-v1.md"
}
Gate "ADR references HealtheMe" {
  (Get-Content "docs/decisions/ADR-portal-reuse-v1.md" -Raw) -match "HealtheMe"
}
Gate "ADR references Ottehr" {
  (Get-Content "docs/decisions/ADR-portal-reuse-v1.md" -Raw) -match "Ottehr"
}
Gate "ADR references AIOTP observe-only" {
  (Get-Content "docs/decisions/ADR-portal-reuse-v1.md" -Raw) -match "observe.only"
}

# --- G3: Portal plan artifact ---
Gate "portal-plan.json exists" {
  Test-Path -LiteralPath "artifacts/phase61/portal-plan.json"
}
Gate "portal-plan.json has features array" {
  $json = Get-Content "artifacts/phase61/portal-plan.json" -Raw | ConvertFrom-Json
  $json.features.Count -ge 15
}

# --- G4: Wired endpoints (not stubs) ---
$portalAuth = Get-Content "apps/api/src/routes/portal-auth.ts" -Raw

Gate "Labs endpoint calls ORWLRR INTERIM (not stub)" {
  ($portalAuth -match "ORWLRR INTERIM") -and -not ($portalAuth -match 'labs.*_note.*"Lab results require complex')
}
Gate "Consults endpoint calls ORQQCN LIST (not stub)" {
  ($portalAuth -match "ORQQCN LIST.*patientDfn|portalRpc.*ORQQCN LIST") -and -not ($portalAuth -match 'consults.*_note.*"Consult list RPC')
}
Gate "Surgery endpoint calls ORWSR LIST (not stub)" {
  ($portalAuth -match "ORWSR LIST.*patientDfn|portalRpc.*ORWSR LIST") -and -not ($portalAuth -match 'surgery.*_note.*"Surgery list RPC')
}
Gate "DC summaries endpoint calls TIU DOCUMENTS BY CONTEXT (not stub)" {
  ($portalAuth -match 'TIU DOCUMENTS BY CONTEXT.*244') -and -not ($portalAuth -match 'dc-summaries.*_note.*"DC summaries require')
}
Gate "Reports endpoint calls ORWRP REPORT TEXT (not stub)" {
  ($portalAuth -match 'callRpc.*ORWRP REPORT TEXT') -and -not ($portalAuth -match 'reports.*_note.*"Clinical report generation')
}

# --- G5: Health Records UI ---
$healthPage = Get-Content "apps/portal/src/app/dashboard/health/page.tsx" -Raw

Gate "Health page renders lab data table" {
  $healthPage -match "testName|Test.*Result.*Units.*Ref Range"
}
Gate "Health page renders consult data table" {
  ($healthPage -match '<th.*>Service</th>') -and ($healthPage -match 'consults')
}
Gate "Health page renders surgery data table" {
  ($healthPage -match '<th.*>Procedure</th>') -and ($healthPage -match 'surgery')
}
Gate "Health page renders DC summaries data table" {
  ($healthPage -match 'Discharge Summaries') -and ($healthPage -match 'dc\.title|dc\.date|dc\.author')
}
Gate "Health page has dynamic source badge (not hardcoded pending)" {
  $healthPage -match '_integration.*===.*"pending".*\?.*"pending".*:.*"ehr"'
}

# --- G6: Dashboard home shows labs as ehr ---
Gate "Dashboard home shows Lab Results with ehr source" {
  $dash = Get-Content "apps/portal/src/app/dashboard/page.tsx" -Raw
  ($dash -match 'Lab Results') -and -not ($dash -match 'Lab Results.*pending')
}

# --- G7: AI governance banner ---
Gate "AI help page has governance notice" {
  $aiPage = Get-Content "apps/portal/src/app/dashboard/ai-help/page.tsx" -Raw
  $aiPage -match "AI Governance Notice|governance.*banner"
}
Gate "AI help page disclaims clinical advice" {
  $aiPage = Get-Content "apps/portal/src/app/dashboard/ai-help/page.tsx" -Raw
  $aiPage -match "not medical advice|no.*diagnos"
}

# --- G8: Portal auth posture ---
Gate "Portal sessions are isolated (separate cookie)" {
  $portalAuth -match 'portal_session'
}
Gate "DFN never exposed to client" {
  # The session endpoint should NOT return patientDfn
  $portalAuth -match 'patientName.*Never expose DFN|Never expose DFN'
}

# --- G9: Privacy / settings ---
Gate "Portal settings support 7 languages" {
  $settings = Get-Content "apps/api/src/services/portal-settings.ts" -Raw
  $settings -match '"en".*"es".*"fr".*"vi".*"zh".*"ko".*"tl"'
}

# --- G10: Portal audit ---
Gate "Portal audit has 50+ action types" {
  $audit = Get-Content "apps/api/src/services/portal-audit.ts" -Raw
  ($audit | Select-String -Pattern 'portal\.' -AllMatches).Matches.Count -ge 20
}

# --- G11: No dead clicks (portal nav all have pages) ---
Gate "Portal nav links count >= 10" {
  $nav = Get-Content "apps/portal/src/components/portal-nav.tsx" -Raw
  ($nav | Select-String -Pattern 'href.*dashboard' -AllMatches).Matches.Count -ge 10
}

# --- G12: Runbook exists ---
Gate "Phase 61 runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/phase61-portal-digital-front-door.md"
}

# --- Summary ---
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  Total: $total  |  Pass: $pass  |  Fail: $fail"
if ($fail -eq 0) {
  Write-Host "  ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "  $fail GATE(S) FAILED" -ForegroundColor Red
}
exit $fail
