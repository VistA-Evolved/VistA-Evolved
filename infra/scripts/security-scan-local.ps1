# infra/scripts/security-scan-local.ps1 - Run security scans locally (gitleaks + SBOM)
# Outputs to /artifacts/phase-199/
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$OutDir   = Join-Path $RepoRoot 'artifacts/phase-199'

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$exitCode = 0
$results  = @{
    timestamp = (Get-Date).ToString('o')
    checks    = @()
}

Write-Host "=== VistA-Evolved Local Security Scan ===" -ForegroundColor Cyan
Write-Host "  Output: $OutDir" -ForegroundColor Gray
Write-Host ""

# ---- 1. Gitleaks ----
Write-Host "--- Secret Scan (gitleaks) ---" -ForegroundColor Cyan
$gitleaksAvailable = $null -ne (Get-Command gitleaks -ErrorAction SilentlyContinue)

if ($gitleaksAvailable) {
    $reportFile = Join-Path $OutDir 'gitleaks-report.json'
    & gitleaks detect --source $RepoRoot --report-format json --report-path $reportFile --no-banner 2>$null
    $glExit = $LASTEXITCODE
    if ($glExit -eq 0) {
        Write-Host "  [PASS] No secrets found." -ForegroundColor Green
        $results.checks += @{ name = "gitleaks"; status = "PASS"; detail = "No secrets found" }
    } else {
        Write-Host "  [FAIL] Secrets detected! See $reportFile" -ForegroundColor Red
        $results.checks += @{ name = "gitleaks"; status = "FAIL"; detail = "Secrets detected - see gitleaks-report.json" }
        $exitCode = 1
    }
} else {
    Write-Host "  [SKIP] gitleaks not installed. Install: https://github.com/gitleaks/gitleaks" -ForegroundColor Yellow
    Write-Host "         Falling back to built-in secret-scan.mjs..." -ForegroundColor Yellow
    $results.checks += @{ name = "gitleaks"; status = "SKIP"; detail = "Not installed" }

    # Fallback to existing Node.js secret scan
    $secretScan = Join-Path $RepoRoot 'scripts/secret-scan.mjs'
    if (Test-Path $secretScan) {
        Push-Location $RepoRoot
        node $secretScan 2>&1 | Out-File (Join-Path $OutDir 'secret-scan-output.txt')
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [PASS] Built-in secret scan passed." -ForegroundColor Green
            $results.checks += @{ name = "secret-scan-builtin"; status = "PASS" }
        } else {
            Write-Host "  [FAIL] Built-in secret scan found issues." -ForegroundColor Red
            $results.checks += @{ name = "secret-scan-builtin"; status = "FAIL" }
            $exitCode = 1
        }
        Pop-Location
    }
}

# ---- 2. SBOM Generation ----
Write-Host ""
Write-Host "--- SBOM Generation (syft) ---" -ForegroundColor Cyan
$syftAvailable = $null -ne (Get-Command syft -ErrorAction SilentlyContinue)

if ($syftAvailable) {
    $sbomFile = Join-Path $OutDir 'sbom-repo.spdx.json'
    & syft "dir:$RepoRoot" -o "spdx-json=$sbomFile" --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $sbomFile).Length
        Write-Host "  [PASS] SBOM generated ($([math]::Round($size/1KB, 1)) KB)" -ForegroundColor Green
        $results.checks += @{ name = "sbom"; status = "PASS"; detail = "Generated $sbomFile" }
    } else {
        Write-Host "  [FAIL] SBOM generation failed." -ForegroundColor Red
        $results.checks += @{ name = "sbom"; status = "FAIL" }
        $exitCode = 1
    }
} else {
    Write-Host "  [SKIP] syft not installed. Install: https://github.com/anchore/syft" -ForegroundColor Yellow
    $results.checks += @{ name = "sbom"; status = "SKIP"; detail = "syft not installed" }
}

# ---- 3. Dependency audit ----
Write-Host ""
Write-Host "--- Dependency Audit (pnpm) ---" -ForegroundColor Cyan
Push-Location $RepoRoot
$auditOutput = pnpm audit --audit-level=high 2>&1
$auditOutput | Out-File (Join-Path $OutDir 'pnpm-audit.txt')
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [PASS] No high/critical vulnerabilities." -ForegroundColor Green
    $results.checks += @{ name = "dependency-audit"; status = "PASS" }
} else {
    Write-Host "  [WARN] Vulnerabilities found (non-blocking). See pnpm-audit.txt" -ForegroundColor Yellow
    $results.checks += @{ name = "dependency-audit"; status = "WARN"; detail = "Vulnerabilities found" }
}
Pop-Location

# ---- Summary ----
$results | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutDir 'security-scan-results.json') -Encoding UTF8

Write-Host ""
Write-Host "=== Security Scan Summary ===" -ForegroundColor Cyan
$passCount = ($results.checks | Where-Object { $_.status -eq 'PASS' }).Count
$failCount = ($results.checks | Where-Object { $_.status -eq 'FAIL' }).Count
$skipCount = ($results.checks | Where-Object { $_.status -eq 'SKIP' -or $_.status -eq 'WARN' }).Count
Write-Host "  PASS: $passCount  FAIL: $failCount  SKIP/WARN: $skipCount"
Write-Host "  Output: $OutDir" -ForegroundColor Gray

exit $exitCode
