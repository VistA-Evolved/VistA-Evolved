# scripts/verify-phase289-load-tests.ps1 - Verify Phase 289
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pass = 0; $fail = 0; $total = 9

function Gate($n, $desc, [scriptblock]$test) {
    Write-Host "Gate $n`: $desc ... " -NoNewline
    try {
        $result = & $test
        if ($result) { Write-Host "PASS" -ForegroundColor Green; $script:pass++ }
        else         { Write-Host "FAIL" -ForegroundColor Red;   $script:fail++ }
    } catch {
        Write-Host "FAIL ($_)" -ForegroundColor Red; $script:fail++
    }
}

Write-Host "=== Phase 289: Production-Scale Load Test Campaign ===" -ForegroundColor Cyan

Gate 1 "Sustained test script exists" {
    Test-Path -LiteralPath "tests/k6/prod-sustained.js"
}

Gate 2 "Spike test script exists" {
    Test-Path -LiteralPath "tests/k6/prod-spike.js"
}

Gate 3 "Soak test script exists" {
    Test-Path -LiteralPath "tests/k6/prod-soak.js"
}

Gate 4 "Campaign runner exists" {
    Test-Path -LiteralPath "tests/k6/run-campaign.ps1"
}

Gate 5 "Load test plan document exists" {
    Test-Path -LiteralPath "tests/k6/prod-load-plan.md"
}

Gate 6 "Runbook exists" {
    Test-Path -LiteralPath "docs/runbooks/load-testing.md"
}

Gate 7 "Sustained test has ramp stages" {
    (Get-Content "tests/k6/prod-sustained.js" -Raw) -match 'stages:'
}

Gate 8 "Spike test has 100 VU target" {
    (Get-Content "tests/k6/prod-spike.js" -Raw) -match 'target:\s*100'
}

Gate 9 "Performance budgets defined in plan" {
    (Get-Content "tests/k6/prod-load-plan.md" -Raw) -match 'p50 Target.*p95 Target'
}

Write-Host ""
Write-Host "=== Results: $pass/$total passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail
