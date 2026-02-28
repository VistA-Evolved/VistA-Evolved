<# Phase 305 -- Inpatient ADT Writeback (W12-P7) Verifier #>
param([switch]$Verbose)

$pass = 0; $fail = 0
function Gate($n, $msg, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  $n - $msg" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  $n - $msg" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 305: Inpatient ADT Writeback ===" -ForegroundColor Cyan

$executor = "apps/api/src/writeback/executors/adt-executor.ts"
$barrel   = "apps/api/src/writeback/executors/index.ts"
$tests    = "apps/api/src/writeback/__tests__/adt-contract.test.ts"

Gate 1 "adt-executor.ts exists" { Test-Path -LiteralPath $executor }

Gate 2 "Implements RpcExecutor (execute + dryRun)" {
  $c = Get-Content $executor -Raw
  $c -match "async execute\(" -and $c -match "dryRun\("
}

Gate 3 "3 intents mapped" {
  $c = Get-Content $executor -Raw
  $c -match "ADMIT_PATIENT" -and $c -match "TRANSFER_PATIENT" -and $c -match "DISCHARGE_PATIENT"
}

Gate 4 "All intents integration-pending" {
  $c = Get-Content $executor -Raw
  $c -match "integration-pending" -and $c -match "integrationPending.*true"
}

Gate 5 "vistaGrounding with DGPM + File 405" {
  $c = Get-Content $executor -Raw
  $c -match "DGPM" -and $c -match "File 405"
}

Gate 6 "Barrel exports adtExecutor" {
  $c = Get-Content $barrel -Raw
  $c -match "adtExecutor"
}

Gate 7 "Contract tests exist" { Test-Path -LiteralPath $tests }

Gate 8 "No PHI in executor" {
  $c = Get-Content $executor -Raw
  -not ($c -match '\d{3}-\d{2}-\d{4}' -or $c -match 'PROV123' -or $c -match 'patient.*name')
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
exit $fail
