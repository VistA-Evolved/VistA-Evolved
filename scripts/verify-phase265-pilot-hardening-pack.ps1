<#
  verify-phase265-pilot-hardening-pack.ps1
  Phase 265 -- Pilot Hospital Hardening Pack (Wave 8 P9)
  20 gates
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0; $fail = 0; $total = 20

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 265: Pilot Hospital Hardening Pack ===" -ForegroundColor Cyan

# --- Gate 1: sat-suite.ts exists ---
$g = Test-Path -LiteralPath "$root\apps\api\src\pilot\sat-suite.ts"
Gate "G01-sat-suite" $g "sat-suite.ts exists"

# --- Gate 2: sat-routes.ts exists ---
$g = Test-Path -LiteralPath "$root\apps\api\src\routes\sat-routes.ts"
Gate "G02-sat-routes" $g "sat-routes.ts exists"

# --- Gate 3: test file exists ---
$g = Test-Path -LiteralPath "$root\apps\api\tests\sat-suite.test.ts"
Gate "G03-test-file" $g "sat-suite.test.ts exists"

# --- Gate 4: SatScenario type ---
$eng = ""
if (Test-Path -LiteralPath "$root\apps\api\src\pilot\sat-suite.ts") {
  $eng = Get-Content "$root\apps\api\src\pilot\sat-suite.ts" -Raw
}
$g = $eng -match "SatScenario"
Gate "G04-sat-scenario-type" $g "SatScenario type defined"

# --- Gate 5: SatRun type ---
$g = $eng -match "SatRun"
Gate "G05-sat-run-type" $g "SatRun type defined"

# --- Gate 6: 30 default scenarios ---
$matches = [regex]::Matches($eng, 'id:\s*"[a-z]+-\d+"')
$g = $matches.Count -ge 30
Gate "G06-30-scenarios" $g "30+ default SAT scenarios ($($matches.Count) found)"

# --- Gate 7: 10 SAT categories ---
$cats = @("connectivity","authentication","clinical-data","orders","imaging","integrations","performance","security","backup","degraded-mode")
$allCat = $true
foreach ($c in $cats) {
  if ($eng -notmatch [regex]::Escape("`"$c`"")) { $allCat = $false }
}
Gate "G07-10-categories" $allCat "10 SAT categories present"

# --- Gate 8: startSatRun ---
$g = $eng -match "export function startSatRun"
Gate "G08-start-sat-run" $g "startSatRun function exists"

# --- Gate 9: exportSatEvidence ---
$g = $eng -match "export function exportSatEvidence"
Gate "G09-export-evidence" $g "exportSatEvidence function exists"

# --- Gate 10: DegradedModeStatus ---
$g = $eng -match "DegradedModeStatus"
Gate "G10-degraded-mode" $g "DegradedModeStatus type defined"

# --- Gate 11: reportDegradation ---
$g = $eng -match "export function reportDegradation"
Gate "G11-report-degradation" $g "reportDegradation function exists"

# --- Gate 12: resolveDegradation ---
$g = $eng -match "export function resolveDegradation"
Gate "G12-resolve-degradation" $g "resolveDegradation function exists"

# --- Gate 13: 8 degradation sources ---
$srcs = @("vista-rpc","database","oidc","imaging","hl7-engine","payer-connector","audit-shipping","analytics")
$allSrc = $true
foreach ($s in $srcs) {
  if ($eng -notmatch [regex]::Escape("`"$s`"")) { $allSrc = $false }
}
Gate "G13-8-degradation-sources" $allSrc "8 degradation sources defined"

# --- Gate 14: SHA-256 evidence hashing ---
$g = ($eng -match "sha256") -and ($eng -match "evidenceHash")
Gate "G14-sha256-evidence" $g "SHA-256 evidence hashing"

# --- Gate 15: 8 default mitigations ---
$mitMatches = [regex]::Matches($eng, "registerMitigation\(")
$g = $mitMatches.Count -ge 8
Gate "G15-8-mitigations" $g "$($mitMatches.Count) default mitigations registered"

# --- Gate 16: SAT scenarios route ---
$rts = ""
if (Test-Path -LiteralPath "$root\apps\api\src\routes\sat-routes.ts") {
  $rts = Get-Content "$root\apps\api\src\routes\sat-routes.ts" -Raw
}
$g = $rts -match "/admin/pilot/sat/scenarios"
Gate "G16-route-scenarios" $g "SAT scenarios endpoint"

# --- Gate 17: SAT runs route ---
$g = $rts -match "/admin/pilot/sat/runs"
Gate "G17-route-runs" $g "SAT runs CRUD endpoint"

# --- Gate 18: Degraded mode route ---
$g = $rts -match "/admin/pilot/degraded-mode"
Gate "G18-route-degraded-mode" $g "Degraded mode monitoring endpoint"

# --- Gate 19: Existing pilot infrastructure preserved ---
$g1 = Test-Path -LiteralPath "$root\apps\api\src\pilot\site-config.ts"
$g2 = Test-Path -LiteralPath "$root\apps\api\src\pilot\preflight.ts"
$g3 = Test-Path -LiteralPath "$root\apps\api\src\routes\pilot-routes.ts"
$g = $g1 -and $g2 -and $g3
Gate "G19-existing-pilot-preserved" $g "Existing pilot files preserved"

# --- Gate 20: Prompt files ---
$pDir = "$root\prompts\262-PHASE-265-PILOT-HARDENING-PACK"
$g1 = Test-Path -LiteralPath "$pDir\265-01-IMPLEMENT.md"
$g2 = Test-Path -LiteralPath "$pDir\265-99-VERIFY.md"
$g = $g1 -and $g2
Gate "G20-prompt-files" $g "Prompt files present"

# --- Summary ---
Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
