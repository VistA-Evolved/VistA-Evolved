# scripts/verify-phase287-tls.ps1 - Verify Phase 287: Real TLS in Dev + K8s
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

Write-Host "=== Phase 287: Real TLS in Dev + K8s ===" -ForegroundColor Cyan

Gate 1 "Caddyfile exists" {
    Test-Path -LiteralPath "infra/tls/Caddyfile"
}

Gate 2 "mkcert bootstrap script exists" {
    Test-Path -LiteralPath "infra/tls/mkcert-bootstrap.ps1"
}

Gate 3 "docker-compose.tls.yml overlay exists" {
    Test-Path -LiteralPath "infra/tls/docker-compose.tls.yml"
}

Gate 4 "nginx tls.conf has ssl_certificate directive" {
    (Get-Content "nginx/tls.conf" -Raw) -match 'ssl_certificate\s'
}

Gate 5 "nginx tls.conf enforces TLSv1.2 + TLSv1.3" {
    (Get-Content "nginx/tls.conf" -Raw) -match 'TLSv1\.2 TLSv1\.3'
}

Gate 6 "nginx tls.conf has HSTS header" {
    (Get-Content "nginx/tls.conf" -Raw) -match 'Strict-Transport-Security'
}

Gate 7 "cert-manager Helm template exists" {
    Test-Path -LiteralPath "infra/helm/ve-shared/templates/cert-manager.yaml"
}

Gate 8 "Helm values have certManager section" {
    (Get-Content "infra/helm/ve-shared/values.yaml" -Raw) -match 'certManager:'
}

Gate 9 "TLS runbook exists" {
    Test-Path -LiteralPath "docs/runbooks/tls.md"
}

Write-Host ""
Write-Host "=== Results: $pass/$total passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail
