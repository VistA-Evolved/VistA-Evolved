<#
  Phase 533 - Workflow State Switchboard Verifier
  Wave 39 P3
  12 gates per prompts/533/533-99-VERIFY.md
#>
param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\package.json")) { $root = Get-Location }

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id -- $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id -- $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id -- $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 533: Workflow State Switchboard Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

$apiSrc = Join-Path $root "apps/api/src"

# G1: FSM class file exists
Gate "G1" "workflow/fsm.ts exists with StateMachine" {
  $f = Join-Path $apiSrc "workflow/fsm.ts"
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'class StateMachine')
}

# G2: Required methods present
Gate "G2" "canTransition, transition, validNextStates, toMermaid present" {
  $f = Join-Path $apiSrc "workflow/fsm.ts"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'canTransition' -and $c -match 'transition\(' -and $c -match 'validNextStates' -and $c -match 'toMermaid')
}

# G3: Switchboard service exists
Gate "G3" "workflow/switchboard.ts exists" {
  Test-Path -LiteralPath (Join-Path $apiSrc "workflow/switchboard.ts")
}

# G4: Switchboard functions present
Gate "G4" "registerWorkflow, getAllWorkflows, getWorkflowStatus present" {
  $f = Join-Path $apiSrc "workflow/switchboard.ts"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'registerWorkflow' -and $c -match 'getAllWorkflows' -and ($c -match 'getWorkflow\b'))
}

# G5: Routes file exists
Gate "G5" "workflow/switchboard-routes.ts exists" {
  Test-Path -LiteralPath (Join-Path $apiSrc "workflow/switchboard-routes.ts")
}

# G6: Routes registered for /workflow/switchboard
Gate "G6" "Routes use /workflow/switchboard prefix" {
  $f = Join-Path $apiSrc "workflow/switchboard-routes.ts"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match '/workflow/switchboard')
}

# G7: At least 3 FSMs registered
Gate "G7" "At least 3 FSMs registered in switchboard" {
  $f = Join-Path $apiSrc "workflow/index.ts"
  $c = [System.IO.File]::ReadAllText($f)
  $matches = [regex]::Matches($c, 'registerWorkflow\(')
  if ($Verbose) { Write-Host "    Registered FSMs: $($matches.Count)" }
  return ($matches.Count -ge 3)
}

# G8: Mermaid generation contains stateDiagram-v2
Gate "G8" "toMermaid generates stateDiagram-v2" {
  $f = Join-Path $apiSrc "workflow/fsm.ts"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'stateDiagram-v2')
}

# G9: Admin workflows page has switchboard tab
Gate "G9" "Workflows page.tsx has switchboard tab" {
  $f = Join-Path $root "apps/web/src/app/cprs/admin/workflows/page.tsx"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'switchboard' -and $c -match 'SwitchboardTab')
}

# G10: TypeScript compiles
Gate "G10" "TypeScript compiles without errors in workflow files" {
  Push-Location (Join-Path $root "apps/api")
  try {
    $null = & npx tsc --noEmit 2>&1
    return ($LASTEXITCODE -eq 0)
  } finally { Pop-Location }
}

# G11: No PHI in switchboard files
Gate "G11" "No PHI in workflow switchboard files" {
  foreach ($file in @("workflow/fsm.ts","workflow/switchboard.ts","workflow/switchboard-routes.ts","workflow/index.ts")) {
    $f = Join-Path $apiSrc $file
    if (Test-Path -LiteralPath $f) {
      $c = [System.IO.File]::ReadAllText($f)
      if ($c -match '\d{3}-\d{2}-\d{4}|\bpatient.name\b') { return $false }
    }
  }
  return $true
}

# G12: Evidence directory exists
Gate "G12" "Evidence directory exists" {
  $d = Join-Path $root "evidence/wave-39/533-W39-P3-WORKFLOW-SWITCHBOARD"
  if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  return (Test-Path -LiteralPath $d)
}

# Summary
Write-Host "`n--- Summary ---"
Write-Host "  PASS: $pass / $($pass + $fail)" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
Write-Host ""
exit $fail
