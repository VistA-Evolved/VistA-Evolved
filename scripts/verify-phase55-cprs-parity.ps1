<# Phase 55 - CPRS Parity Harness v2 Verifier
   Gates:
     G55-1: Extraction scripts exist and produce output
     G55-2: Parity matrix builds without error
     G55-3: Core-actions.json has >= 20 entries
     G55-4: Parity gate passes (exit 0)
     G55-5: Prompt files exist
#>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$pass = 0; $fail = 0; $warn = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  [PASS] $id $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  [FAIL] $id $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  [FAIL] $id $desc -- $_" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 55: CPRS Parity Harness v2 ===`n"

# ---- G55-1: Extraction scripts exist ----
Write-Host "--- G55-1: Extraction scripts ---"
Gate "G55-1a" "extractDelphiRpcs.ts exists" {
  Test-Path -LiteralPath "$root\scripts\cprs\extractDelphiRpcs.ts"
}
Gate "G55-1b" "extractDelphiActions.ts exists" {
  Test-Path -LiteralPath "$root\scripts\cprs\extractDelphiActions.ts"
}
Gate "G55-1c" "extractDelphiForms.ts exists" {
  Test-Path -LiteralPath "$root\scripts\cprs\extractDelphiForms.ts"
}

# Run extractors
Write-Host "`n--- Running extractors ---"
$npxCmd = "npx"
& $npxCmd tsx scripts/cprs/extractDelphiRpcs.ts 2>&1 | Out-Null
& $npxCmd tsx scripts/cprs/extractDelphiActions.ts 2>&1 | Out-Null
& $npxCmd tsx scripts/cprs/extractDelphiForms.ts 2>&1 | Out-Null

Gate "G55-1d" "delphi-rpcs.json produced" {
  Test-Path -LiteralPath "$root\artifacts\cprs\delphi-rpcs.json"
}
Gate "G55-1e" "delphi-actions.json produced" {
  Test-Path -LiteralPath "$root\artifacts\cprs\delphi-actions.json"
}
Gate "G55-1f" "delphi-forms.json produced" {
  Test-Path -LiteralPath "$root\artifacts\cprs\delphi-forms.json"
}

# ---- G55-2: Parity matrix builds ----
Write-Host "`n--- G55-2: Parity matrix build ---"
$matrixResult = & $npxCmd tsx scripts/cprs/buildParityMatrix.ts 2>&1
$matrixExitCode = $LASTEXITCODE
Gate "G55-2a" "buildParityMatrix.ts exits 0" {
  $matrixExitCode -eq 0
}
Gate "G55-2b" "parity-matrix.json produced" {
  Test-Path -LiteralPath "$root\artifacts\cprs\parity-matrix.json"
}
Gate "G55-2c" "parity-summary.txt produced" {
  Test-Path -LiteralPath "$root\artifacts\cprs\parity-summary.txt"
}

# Validate matrix structure
if (Test-Path -LiteralPath "$root\artifacts\cprs\parity-matrix.json") {
  $matrix = Get-Content "$root\artifacts\cprs\parity-matrix.json" -Raw | ConvertFrom-Json
  Gate "G55-2d" "matrix has rpcParity array" {
    $null -ne $matrix.rpcParity -and @($matrix.rpcParity).Count -gt 0
  }
  Gate "G55-2e" "matrix has actionParity array" {
    $null -ne $matrix.actionParity -and @($matrix.actionParity).Count -gt 0
  }
  Gate "G55-2f" "matrix has coreActionGates array" {
    $null -ne $matrix.coreActionGates -and @($matrix.coreActionGates).Count -gt 0
  }
}

# ---- G55-3: Core actions contract ----
Write-Host "`n--- G55-3: Core actions contract ---"
Gate "G55-3a" "core-actions.json exists" {
  Test-Path -LiteralPath "$root\scripts\cprs\core-actions.json"
}
if (Test-Path -LiteralPath "$root\scripts\cprs\core-actions.json") {
  $coreActions = Get-Content "$root\scripts\cprs\core-actions.json" -Raw | ConvertFrom-Json
  $coreCount = @($coreActions).Count
  Gate "G55-3b" "core-actions >= 20 entries (got $coreCount)" {
    $coreCount -ge 20
  }
  # Verify must-level exist
  $mustCount = @($coreActions | Where-Object { $_.gateLevel -eq 'must' }).Count
  Gate "G55-3c" "core-actions has >= 10 must-level gates (got $mustCount)" {
    $mustCount -ge 10
  }
}

# ---- G55-4: Parity gate passes ----
Write-Host "`n--- G55-4: Parity gate ---"
Gate "G55-4a" "checkCprsParity.ts exists" {
  Test-Path -LiteralPath "$root\scripts\governance\checkCprsParity.ts"
}
$gateOutput = & $npxCmd tsx scripts/governance/checkCprsParity.ts 2>&1
$gateExitCode = $LASTEXITCODE
Gate "G55-4b" "parity gate exits 0 (PASS)" {
  $gateExitCode -eq 0
}
Gate "G55-4c" "parity gate output includes PASS" {
  ($gateOutput | Out-String) -match 'PASS'
}

# ---- G55-5: Prompt files ----
Write-Host "`n--- G55-5: Prompt files ---"
Gate "G55-5a" "60-01-IMPLEMENT.md exists" {
  Test-Path -LiteralPath "$root\prompts\60-PHASE-55-CPRS-PARITY-HARNESS\60-01-IMPLEMENT.md"
}
Gate "G55-5b" "60-99-VERIFY.md exists" {
  Test-Path -LiteralPath "$root\prompts\60-PHASE-55-CPRS-PARITY-HARNESS\60-99-VERIFY.md"
}

# ---- Summary ----
Write-Host "`n=== Phase 55 Results ==="
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
if ($fail -gt 0) {
  Write-Host "  VERDICT: FAIL" -ForegroundColor Red
  exit 1
} else {
  Write-Host "  VERDICT: PASS" -ForegroundColor Green
  exit 0
}
