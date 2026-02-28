<# Phase 304 -- Lab Deep Writeback (W12-P6) Verifier #>
param([switch]$Verbose)

$pass = 0; $fail = 0
function Gate($n, $msg, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  $n - $msg" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  $n - $msg" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 304: Lab Deep Writeback ===" -ForegroundColor Cyan

$executor = "apps/api/src/writeback/executors/lab-executor.ts"
$barrel   = "apps/api/src/writeback/executors/index.ts"
$tests    = "apps/api/src/writeback/__tests__/lab-contract.test.ts"

Gate 1 "lab-executor.ts exists" { Test-Path -LiteralPath $executor }

Gate 2 "Implements RpcExecutor (execute + dryRun)" {
  $c = Get-Content $executor -Raw
  $c -match "async execute\(" -and $c -match "dryRun\("
}

Gate 3 "2 intents in INTENT_RPC_MAP" {
  $c = Get-Content $executor -Raw
  $c -match "PLACE_LAB_ORDER" -and $c -match "ACK_LAB_RESULT"
}

Gate 4 "ACK_LAB_RESULT has no LOCK" {
  $c = Get-Content $executor -Raw
  $c -match 'ACK_LAB_RESULT.*\[.*ORWLRR ACK.*\]'
}

Gate 5 "LOCK/UNLOCK for PLACE_LAB with finally" {
  $c = Get-Content $executor -Raw
  $c -match "ORWDX LOCK" -and $c -match "ORWDX UNLOCK" -and $c -match "finally"
}

Gate 6 "Error classification (permanent/transient)" {
  $c = Get-Content $executor -Raw
  $c -match '"permanent"' -and $c -match '"transient"'
}

Gate 7 "Barrel exports labExecutor" {
  $c = Get-Content $barrel -Raw
  $c -match "labExecutor"
}

Gate 8 "Contract tests exist" { Test-Path -LiteralPath $tests }

Gate 9 "No PHI in executor" {
  $c = Get-Content $executor -Raw
  -not ($c -match '\d{3}-\d{2}-\d{4}' -or $c -match 'PROV123' -or $c -match 'patient.*name')
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
exit $fail
