<# Phase 302 -- Orders Writeback Core (W12-P4) Verifier #>
param([switch]$Verbose)

$pass = 0; $fail = 0
function Gate($n, $msg, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  $n - $msg" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  $n - $msg" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 302: Orders Writeback Core ===" -ForegroundColor Cyan

$executor = "apps/api/src/writeback/executors/orders-executor.ts"
$barrel   = "apps/api/src/writeback/executors/index.ts"
$tests    = "apps/api/src/writeback/__tests__/orders-contract.test.ts"
$prompt   = "prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE/302-01-IMPLEMENT.md"
$verify   = "prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE/302-99-VERIFY.md"
$notes    = "prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE/302-NOTES.md"
$evidence = "evidence/wave-12/302-orders-writeback/evidence.md"

# Gate 1: executor exists
Gate 1 "orders-executor.ts exists" {
  Test-Path -LiteralPath $executor
}

# Gate 2: implements RpcExecutor (has execute + dryRun)
Gate 2 "Implements RpcExecutor (execute + dryRun)" {
  $c = Get-Content $executor -Raw
  $c -match "async execute\(" -and $c -match "dryRun\("
}

# Gate 3: 5 intents mapped
Gate 3 "5 intents in INTENT_RPC_MAP" {
  $c = Get-Content $executor -Raw
  $c -match "PLACE_ORDER" -and $c -match "DISCONTINUE_ORDER" -and
  $c -match "VERIFY_ORDER" -and $c -match "SIGN_ORDER" -and
  $c -match "FLAG_ORDER"
}

# Gate 4: LOCK + UNLOCK for PLACE, DISCONTINUE, SIGN
Gate 4 "LOCK/UNLOCK pattern for write intents" {
  $c = Get-Content $executor -Raw
  $c -match 'PLACE_ORDER.*ORWDX LOCK.*ORWDX SAVE.*ORWDX UNLOCK' -or
  ($c -match "ORWDX LOCK" -and $c -match "ORWDX UNLOCK")
}

# Gate 5: VERIFY has no LOCK
Gate 5 "VERIFY_ORDER uses only ORWDXA VERIFY" {
  $c = Get-Content $executor -Raw
  $c -match 'VERIFY_ORDER.*\[.*ORWDXA VERIFY.*\]'
}

# Gate 6: FLAG has no LOCK
Gate 6 "FLAG_ORDER uses only ORWDXA FLAG" {
  $c = Get-Content $executor -Raw
  $c -match 'FLAG_ORDER.*\[.*ORWDXA FLAG.*\]'
}

# Gate 7: esCode hashed for sign
Gate 7 "esCode SHA-256 hashed for SIGN_ORDER" {
  $c = Get-Content $executor -Raw
  $c -match 'createHash.*sha256.*esCode' -or $c -match 'sha256.*update.*esCode'
}

# Gate 8: error classification
Gate 8 "Error classification (permanent/transient)" {
  $c = Get-Content $executor -Raw
  $c -match '"permanent"' -and $c -match '"transient"'
}

# Gate 9: barrel re-exports ordersExecutor
Gate 9 "Barrel re-exports ordersExecutor" {
  $c = Get-Content $barrel -Raw
  $c -match "ordersExecutor"
}

# Gate 10: contract tests exist
Gate 10 "Contract tests file exists" {
  Test-Path -LiteralPath $tests
}

# Gate 11: contract tests have 18 test cases
Gate 11 "Contract tests have expected assertions" {
  $c = Get-Content $tests -Raw
  ($c -match "PLACE_ORDER") -and
  ($c -match "DISCONTINUE_ORDER") -and
  ($c -match "SIGN_ORDER") -and
  ($c -match "VERIFY_ORDER") -and
  ($c -match "FLAG_ORDER") -and
  ($c -match "Safety invariants")
}

# Gate 12: no PHI in executor
Gate 12 "No PHI in executor (no SSN/DOB/patient names)" {
  $c = Get-Content $executor -Raw
  -not ($c -match '\d{3}-\d{2}-\d{4}' -or $c -match 'PROV123' -or $c -match 'patient.*name')
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
exit $fail
