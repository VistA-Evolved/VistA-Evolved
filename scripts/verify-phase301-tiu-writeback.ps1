<#
.SYNOPSIS
  Phase 301 verifier -- TIU Notes Writeback Executor (W12-P3)
.DESCRIPTION
  12 gates validating TIU executor structure, safety, and RPC coverage.
#>
param([switch]$Verbose)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pass = 0; $fail = 0; $total = 12
function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $id - $desc" -ForegroundColor Green; $script:pass++ }
    else { Write-Host "  FAIL  $id - $desc" -ForegroundColor Red; $script:fail++ }
  } catch {
    Write-Host "  FAIL  $id - $desc ($_)" -ForegroundColor Red; $script:fail++
  }
}

$exec = "apps/api/src/writeback/executors"
$tests = "apps/api/src/writeback/__tests__"

Write-Host "`n=== Phase 301: TIU Notes Writeback Executor ===" -ForegroundColor Cyan
Write-Host "--- Structure Gates ---"

# Gate 1: tiu-executor.ts exists and exports tiuExecutor
Gate "S01" "tiu-executor.ts exists and exports tiuExecutor" {
  $f = "$exec/tiu-executor.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "tiuExecutor" -Quiet)
}

# Gate 2: implements execute() and dryRun()
Gate "S02" "tiuExecutor implements execute() and dryRun()" {
  $f = "$exec/tiu-executor.ts"
  $content = Get-Content $f -Raw
  ($content -match 'async execute\(') -and ($content -match 'dryRun\(')
}

# Gate 3: barrel index re-exports
Gate "S03" "executors/index.ts re-exports tiuExecutor" {
  $f = "$exec/index.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "tiuExecutor" -Quiet)
}

# Gate 4: contract test exists
Gate "S04" "Contract test file exists" {
  Test-Path -LiteralPath "$tests/tiu-contract.test.ts"
}

# Gate 5: INTENT_RPC_MAP covers 4 TIU intents
Gate "S05" "INTENT_RPC_MAP covers CREATE_NOTE_DRAFT, UPDATE_NOTE_TEXT, SIGN_NOTE, CREATE_ADDENDUM" {
  $f = "$exec/tiu-executor.ts"
  $content = Get-Content $f -Raw
  ($content -match 'CREATE_NOTE_DRAFT') -and
    ($content -match 'UPDATE_NOTE_TEXT') -and
    ($content -match 'SIGN_NOTE') -and
    ($content -match 'CREATE_ADDENDUM')
}

Write-Host "--- Safety Gates ---"

# Gate 6: SIGN_NOTE includes LOCK and UNLOCK
Gate "F06" "SIGN_NOTE sequence includes TIU LOCK RECORD and TIU UNLOCK RECORD" {
  $f = "$exec/tiu-executor.ts"
  $content = Get-Content $f -Raw
  ($content -match 'TIU LOCK RECORD') -and ($content -match 'TIU UNLOCK RECORD')
}

# Gate 7: esCode hashed
Gate "F07" "esCode is SHA-256 hashed (never stored raw)" {
  $f = "$exec/tiu-executor.ts"
  $content = Get-Content $f -Raw
  ($content -match 'createHash\("sha256"\)\.update\(esCode\)') -and
    ($content -match 'esHash')
}

# Gate 8: error classification
Gate "F08" "Uses errorClass: permanent and transient" {
  $f = "$exec/tiu-executor.ts"
  $content = Get-Content $f -Raw
  ($content -match '"permanent"') -and ($content -match '"transient"')
}

# Gate 9: disconnect in finally
Gate "F09" "disconnect() called in finally block" {
  $f = "$exec/tiu-executor.ts"
  $content = Get-Content $f -Raw
  ($content -match 'finally[\s\S]*?disconnect')
}

Write-Host "--- RPC Coverage Gates ---"

# Gate 10: TIU CREATE RECORD
Gate "R10" "References TIU CREATE RECORD" {
  Select-String -Path "$exec/tiu-executor.ts" -Pattern "TIU CREATE RECORD" -Quiet
}

# Gate 11: TIU SIGN RECORD
Gate "R11" "References TIU SIGN RECORD" {
  Select-String -Path "$exec/tiu-executor.ts" -Pattern "TIU SIGN RECORD" -Quiet
}

# Gate 12: TIU CREATE ADDENDUM RECORD
Gate "R12" "References TIU CREATE ADDENDUM RECORD" {
  Select-String -Path "$exec/tiu-executor.ts" -Pattern "TIU CREATE ADDENDUM RECORD" -Quiet
}

Write-Host "`n=== Results: $pass/$total PASS, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail
