<# Phase 303 -- Pharmacy Deep Writeback (W12-P5) Verifier #>
param([switch]$Verbose)

$pass = 0; $fail = 0
function Gate($n, $msg, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  $n - $msg" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  $n - $msg" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 303: Pharmacy Deep Writeback ===" -ForegroundColor Cyan

$executor = "apps/api/src/writeback/executors/pharm-executor.ts"
$barrel   = "apps/api/src/writeback/executors/index.ts"
$tests    = "apps/api/src/writeback/__tests__/pharm-contract.test.ts"

Gate 1 "pharm-executor.ts exists" { Test-Path -LiteralPath $executor }

Gate 2 "Implements RpcExecutor (execute + dryRun)" {
  $c = Get-Content $executor -Raw
  $c -match "async execute\(" -and $c -match "dryRun\("
}

Gate 3 "3 intents in INTENT_RPC_MAP" {
  $c = Get-Content $executor -Raw
  $c -match "PLACE_MED_ORDER" -and $c -match "DISCONTINUE_MED_ORDER" -and $c -match "ADMINISTER_MED"
}

Gate 4 "AUTOACK in PLACE_MED sequence" {
  $c = Get-Content $executor -Raw
  $c -match "ORWDXM AUTOACK"
}

Gate 5 "ADMINISTER_MED integration-pending" {
  $c = Get-Content $executor -Raw
  $c -match "integration-pending" -and $c -match "PSB MED LOG"
}

Gate 6 "LOCK/UNLOCK with finally pattern" {
  $c = Get-Content $executor -Raw
  $c -match "ORWDX LOCK" -and $c -match "ORWDX UNLOCK" -and $c -match "finally"
}

Gate 7 "Error classification (permanent/transient)" {
  $c = Get-Content $executor -Raw
  $c -match '"permanent"' -and $c -match '"transient"'
}

Gate 8 "Barrel exports pharmExecutor" {
  $c = Get-Content $barrel -Raw
  $c -match "pharmExecutor"
}

Gate 9 "Contract tests exist" { Test-Path -LiteralPath $tests }

Gate 10 "Contract tests cover all intents" {
  $c = Get-Content $tests -Raw
  $c -match "PLACE_MED_ORDER" -and $c -match "DISCONTINUE_MED_ORDER" -and $c -match "ADMINISTER_MED"
}

Gate 11 "No PHI in executor" {
  $c = Get-Content $executor -Raw
  -not ($c -match '\d{3}-\d{2}-\d{4}' -or $c -match 'PROV123' -or $c -match 'patient.*name')
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
exit $fail
