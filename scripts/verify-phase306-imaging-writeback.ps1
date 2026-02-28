<# Phase 306 -- Imaging/PACS Validation (W12-P8) Verifier #>
param([switch]$Verbose)

$pass = 0; $fail = 0
function Gate($n, $msg, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  $n - $msg" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  $n - $msg" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 306: Imaging/PACS Validation ===" -ForegroundColor Cyan

$executor = "apps/api/src/writeback/executors/img-executor.ts"
$barrel   = "apps/api/src/writeback/executors/index.ts"
$tests    = "apps/api/src/writeback/__tests__/img-contract.test.ts"

Gate 1 "img-executor.ts exists" { Test-Path -LiteralPath $executor }

Gate 2 "Implements RpcExecutor (execute + dryRun)" {
  $c = Get-Content $executor -Raw
  $c -match "async execute\(" -and $c -match "dryRun\("
}

Gate 3 "2 intents mapped" {
  $c = Get-Content $executor -Raw
  $c -match "PLACE_IMAGING_ORDER" -and $c -match "LINK_IMAGING_STUDY"
}

Gate 4 "LOCK/UNLOCK for PLACE with finally" {
  $c = Get-Content $executor -Raw
  $c -match "ORWDX LOCK" -and $c -match "ORWDX UNLOCK" -and $c -match "finally"
}

Gate 5 "LINK is sidecar (no VistA RPC)" {
  $c = Get-Content $executor -Raw
  $c -match "sidecar" -and $c -match 'LINK_IMAGING_STUDY.*\[\]'
}

Gate 6 "Barrel exports imgExecutor" {
  $c = Get-Content $barrel -Raw
  $c -match "imgExecutor"
}

Gate 7 "Contract tests exist" { Test-Path -LiteralPath $tests }

Gate 8 "No PHI in executor" {
  $c = Get-Content $executor -Raw
  -not ($c -match '\d{3}-\d{2}-\d{4}' -or $c -match 'PROV123' -or $c -match 'patient.*name')
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
exit $fail
