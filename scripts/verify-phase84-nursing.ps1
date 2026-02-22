# Phase 84 -- Nursing Documentation + Flowsheets Verifier
# Checks: file existence, route wiring, UI components, safety features,
# VistA grounding, no fake data, Phase 68 intact.

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Test-Gate {
  param([string]$id, [string]$desc, [scriptblock]$check)
  try {
    $result = & $check
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

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = $PSScriptRoot | Split-Path }
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = Get-Location }

$apiRoutes = "$root\apps\api\src\routes\nursing\index.ts"
$webPage   = "$root\apps\web\src\app\cprs\nursing\page.tsx"
$menuBar   = "$root\apps\web\src\components\cprs\CPRSMenuBar.tsx"
$runbook   = "$root\docs\runbooks\nursing-flowsheets.md"
$grounding = "$root\docs\runbooks\nursing-grounding.md"
$indexTs   = "$root\apps\api\src\index.ts"

Write-Host "`n=== Phase 84 -- Nursing Documentation + Flowsheets ===" -ForegroundColor Cyan

# --- Section 1: File Existence ---
Write-Host "`n--- Section 1: File Existence ---"
Test-Gate "P84-001" "nursing route file exists" { Test-Path -LiteralPath $apiRoutes }
Test-Gate "P84-002" "nursing web page exists" { Test-Path -LiteralPath $webPage }
Test-Gate "P84-003" "runbook exists" { Test-Path -LiteralPath $runbook }
Test-Gate "P84-004" "grounding doc exists" { Test-Path -LiteralPath $grounding }
Test-Gate "P84-005" "prompt file exists" { Test-Path -LiteralPath "$root\prompts\89-PHASE-84-NURSING\89-01-IMPLEMENT.md" }

# --- Section 2: API Route Integrity ---
Write-Host "`n--- Section 2: API Route Integrity ---"
$routeContent = Get-Content $apiRoutes -Raw
Test-Gate "P84-006" "has flowsheet endpoint" { $routeContent -match '/vista/nursing/flowsheet' }
Test-Gate "P84-007" "has io endpoint" { $routeContent -match '/vista/nursing/io' }
Test-Gate "P84-008" "has assessments endpoint" { $routeContent -match '/vista/nursing/assessments' }
Test-Gate "P84-009" "has notes/create endpoint" { $routeContent -match '/vista/nursing/notes/create' }
Test-Gate "P84-010" "has note-text endpoint" { $routeContent -match '/vista/nursing/note-text' }
Test-Gate "P84-011" "has critical-thresholds endpoint" { $routeContent -match '/vista/nursing/critical-thresholds' }
Test-Gate "P84-012" "has patient-context endpoint" { $routeContent -match '/vista/nursing/patient-context' }
Test-Gate "P84-013" "uses ORQQVI VITALS" { $routeContent -match 'ORQQVI VITALS' }
Test-Gate "P84-014" "uses TIU CREATE RECORD" { $routeContent -match 'TIU CREATE RECORD' }
Test-Gate "P84-015" "uses TIU GET RECORD TEXT" { $routeContent -match 'TIU GET RECORD TEXT' }
Test-Gate "P84-016" "uses TIU SET DOCUMENT TEXT" { $routeContent -match 'TIU SET DOCUMENT TEXT' }
Test-Gate "P84-017" "uses ORWPT16 ID INFO" { $routeContent -match 'ORWPT16 ID INFO' }
Test-Gate "P84-018" "references GMR 126 I/O file" { $routeContent -match 'GMR\(126\)' }
Test-Gate "P84-019" "references GN 228 assessment file" { $routeContent -match 'GN\(228\)' }
Test-Gate "P84-020" "has requireSession in each handler" { ($routeContent | Select-String 'requireSession' -AllMatches).Matches.Count -ge 14 }
Test-Gate "P84-021" "has safeCallRpc usage" { $routeContent -match 'safeCallRpc' }
Test-Gate "P84-022" "has CRITICAL_THRESHOLDS config" { $routeContent -match 'CRITICAL_THRESHOLDS' }

# --- Section 3: Critical Value Safety ---
Write-Host "`n--- Section 3: Critical Value Safety ---"
Test-Gate "P84-023" "BP threshold >= 180" { $routeContent -match 'BLOOD PRESSURE.*high.*180' }
Test-Gate "P84-024" "Pulse low threshold 50" { $routeContent -match 'PULSE.*low.*50' }
Test-Gate "P84-025" "Pulse high threshold 130" { $routeContent -match 'PULSE.*high.*130' }
Test-Gate "P84-026" "Temp low threshold 95" { $routeContent -match 'TEMPERATURE.*low.*95' }
Test-Gate "P84-027" "Temp high threshold 103" { $routeContent -match 'TEMPERATURE.*high.*103' }
Test-Gate "P84-028" "SpO2 threshold 90" { $routeContent -match 'PULSE OXIMETRY.*low.*90' }
Test-Gate "P84-029" "Pain threshold 8" { $routeContent -match 'PAIN.*high.*8' }
Test-Gate "P84-030" "flowsheet returns criticalCount" { $routeContent -match 'criticalCount' }
Test-Gate "P84-031" "flowsheet returns overdue flag" { $routeContent -match 'overdue' }
Test-Gate "P84-032" "flowsheet returns nextVitalsDue" { $routeContent -match 'nextVitalsDue' }

# --- Section 4: Web UI Components ---
Write-Host "`n--- Section 4: Web UI Components ---"
$webContent = Get-Content $webPage -Raw
Test-Gate "P84-033" "has NotesTab component" { $webContent -match 'function NotesTab' }
Test-Gate "P84-034" "has FlowsheetsTab component" { $webContent -match 'function FlowsheetsTab' }
Test-Gate "P84-035" "has TasksTab component" { $webContent -match 'function TasksTab' }
Test-Gate "P84-036" "has PatientBanner component" { $webContent -match 'function PatientBanner' }
Test-Gate "P84-037" "has VitalsTrendSection" { $webContent -match 'function VitalsTrendSection' }
Test-Gate "P84-038" "has IOSection" { $webContent -match 'function IOSection' }
Test-Gate "P84-039" "has AssessmentsSection" { $webContent -match 'function AssessmentsSection' }
Test-Gate "P84-040" "fetches flowsheet endpoint" { $webContent -match '/vista/nursing/flowsheet' }
Test-Gate "P84-041" "fetches io endpoint" { $webContent -match '/vista/nursing/io' }
Test-Gate "P84-042" "fetches assessments endpoint" { $webContent -match '/vista/nursing/assessments' }
Test-Gate "P84-043" "fetches notes/create POST" { $webContent -match '/vista/nursing/notes/create' }
Test-Gate "P84-044" "fetches note-text endpoint" { $webContent -match '/vista/nursing/note-text' }
Test-Gate "P84-045" "fetches critical-thresholds" { $webContent -match '/vista/nursing/critical-thresholds' }
Test-Gate "P84-046" "fetches patient-context" { $webContent -match '/vista/nursing/patient-context' }
Test-Gate "P84-047" "uses credentials include" { $webContent -match "credentials.*'include'" }
Test-Gate "P84-048" "has critical value badge display" { $webContent -match 'CRITICAL' }
Test-Gate "P84-049" "has overdue indicator" { $webContent -match 'OVERDUE' }
Test-Gate "P84-050" "has integration-pending display" { $webContent -match 'Integration Pending' }
Test-Gate "P84-051" "has note creation modal" { $webContent -match 'New Nursing Note' }
Test-Gate "P84-052" "has SOAPIE template placeholder" { $webContent -match 'S:.*Patient reports' }

# --- Section 5: Navigation ---
Write-Host "`n--- Section 5: Navigation ---"
$menuContent = Get-Content $menuBar -Raw
Test-Gate "P84-053" "CPRSMenuBar has Nursing Documentation entry" { $menuContent -match 'Nursing Documentation' }
Test-Gate "P84-054" "CPRSMenuBar routes to /cprs/nursing" { $menuContent -match "/cprs/nursing" }

# --- Section 6: No Fake Data ---
Write-Host "`n--- Section 6: No Fake Data ---"
Test-Gate "P84-055" "no PROV123 in routes" { -not ($routeContent -match 'PROV123') }
Test-Gate "P84-056" "no PROV123 in UI" { -not ($webContent -match 'PROV123') }
Test-Gate "P84-057" "no hardcoded patient names in routes" { -not ($routeContent -match 'John Doe|Jane Doe|Smith,John') }
Test-Gate "P84-058" "no hardcoded patient names in UI" { -not ($webContent -match 'John Doe|Jane Doe|Smith,John') }

# --- Section 7: Documentation ---
Write-Host "`n--- Section 7: Documentation ---"
$rbContent = Get-Content $runbook -Raw
$grContent = Get-Content $grounding -Raw
Test-Gate "P84-059" "runbook has endpoints table" { $rbContent -match 'flowsheet.*ORQQVI VITALS' }
Test-Gate "P84-060" "runbook has safety features" { $rbContent -match 'Critical value highlighting' }
Test-Gate "P84-061" "runbook has troubleshooting" { $rbContent -match 'Troubleshooting' }
Test-Gate "P84-062" "grounding has FileMan files" { $grContent -match '120\.5' -and $grContent -match 'FileMan' }
Test-Gate "P84-063" "grounding has GMR 126 I/O" { $grContent -match '126.*INTAKE' }
Test-Gate "P84-064" "grounding has GN 228 assessment" { $grContent -match '228.*ASSESSMENT' }
Test-Gate "P84-065" "grounding has TIU 8925" { $grContent -match '8925.*TIU DOCUMENT' }
Test-Gate "P84-066" "grounding has migration paths" { $grContent -match 'Migration Path' }
Test-Gate "P84-067" "grounding has proposed custom RPCs" { $grContent -match 'ZVENAS' }

# --- Section 8: Phase 68 Intact ---
Write-Host "`n--- Section 8: Phase 68 Intact ---"
Test-Gate "P84-068" "Phase 68 vitals endpoint intact" { $routeContent -match '/vista/nursing/vitals"' }
Test-Gate "P84-069" "Phase 68 vitals-range intact" { $routeContent -match '/vista/nursing/vitals-range' }
Test-Gate "P84-070" "Phase 68 notes endpoint intact" { $routeContent -match '/vista/nursing/notes"' }
Test-Gate "P84-071" "Phase 68 ward-patients intact" { $routeContent -match '/vista/nursing/ward-patients' }
Test-Gate "P84-072" "Phase 68 tasks endpoint intact" { $routeContent -match '/vista/nursing/tasks' }
Test-Gate "P84-073" "Phase 68 mar endpoint intact" { $routeContent -match '/vista/nursing/mar"' }
Test-Gate "P84-074" "Phase 68 mar/administer intact" { $routeContent -match '/vista/nursing/mar/administer' }
Test-Gate "P84-075" "index.ts imports nursingRoutes" { (Get-Content $indexTs -Raw) -match 'import nursingRoutes' }
Test-Gate "P84-076" "index.ts registers nursingRoutes" { (Get-Content $indexTs -Raw) -match 'server\.register\(nursingRoutes\)' }

# --- Section 9: Route Registration ---
Write-Host "`n--- Section 9: Server Registration ---"
Test-Gate "P84-077" "Phase 84 log message present" { $routeContent -match 'Phase 84.*nursing.*endpoints registered' }

# --- Section 10: PHI Safety ---
Write-Host "`n--- Section 10: PHI Safety ---"
Test-Gate "P84-078" "no console.log in route file" { -not ($routeContent -match 'console\.log') }
Test-Gate "P84-079" "no raw connect/disconnect imports" { -not ($routeContent -match 'import.*\{.*connect.*\}.*from.*rpcBrokerClient') }

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass"
Write-Host "  FAIL: $fail"
Write-Host "  SKIP: $skip"
Write-Host "  TOTAL: $($pass + $fail + $skip)"
Write-Host ""
if ($fail -eq 0) {
  Write-Host "VERDICT: PASS" -ForegroundColor Green
} else {
  Write-Host "VERDICT: FAIL" -ForegroundColor Red
}
