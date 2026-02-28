# scripts/verify-phase288-distro-modernize.ps1 - Verify Phase 288
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pass = 0; $fail = 0; $total = 7

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

Write-Host "=== Phase 288: VistA Distro Modernization ===" -ForegroundColor Cyan

Gate 1 "build.env has pinned commit hash" {
    (Get-Content "services/vista-distro/build.env" -Raw) -match 'VISTA_ROUTINE_REF=[a-f0-9]{7,40}'
}

Gate 2 "Synthea seed script exists" {
    Test-Path -LiteralPath "services/vista-distro/synthea-seed/seed-synthea.ps1"
}

Gate 3 "Synthea README exists" {
    Test-Path -LiteralPath "services/vista-distro/synthea-seed/README.md"
}

Gate 4 "CI distro build workflow exists" {
    Test-Path -LiteralPath ".github/workflows/ci-distro-build.yml"
}

Gate 5 "hadolint config exists" {
    Test-Path -LiteralPath ".hadolint.yaml"
}

Gate 6 "Dockerfile has OCI labels" {
    (Get-Content "services/vista-distro/Dockerfile" -Raw) -match 'org\.opencontainers\.image'
}

Gate 7 "Runbook exists" {
    Test-Path -LiteralPath "docs/runbooks/vista-distro-modernization.md"
}

Write-Host ""
Write-Host "=== Results: $pass/$total passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail
