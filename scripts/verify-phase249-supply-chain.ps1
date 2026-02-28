#!/usr/bin/env pwsh
<#
  Phase 249 -- Supply Chain Security Baseline Verifier
  Validates: CI workflow, policy file, SBOM tools, evidence artifacts
#>
param([switch]$SkipSbom)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "  PASS  $Name" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== Phase 249: Supply Chain Security Baseline ===" -ForegroundColor Cyan

# -- 1. CI Workflow exists --
Write-Host "`n-- CI Workflow --" -ForegroundColor White
Gate "supply-chain-security.yml exists" (Test-Path -LiteralPath ".github/workflows/supply-chain-security.yml")
$wf = Get-Content ".github/workflows/supply-chain-security.yml" -Raw -ErrorAction SilentlyContinue
Gate "Workflow has scorecard job" ($wf -match 'scorecard')
Gate "Workflow has sbom job" ($wf -match 'sbom')
Gate "Workflow has trivy-scan job" ($wf -match 'trivy-scan')
Gate "Workflow has grype-scan job" ($wf -match 'grype-scan')
Gate "Workflow has license-check job" ($wf -match 'license-check')
Gate "Workflow uses Syft for SBOM" ($wf -match 'syft')
Gate "Workflow outputs CycloneDX format" ($wf -match 'cyclonedx-json')
Gate "Workflow uploads SARIF" ($wf -match 'upload-sarif')

# -- 2. Policy file --
Write-Host "`n-- Supply Chain Policy --" -ForegroundColor White
$policyPath = ".github/supply-chain-policy.json"
Gate "Policy file exists" (Test-Path -LiteralPath $policyPath)
if (Test-Path -LiteralPath $policyPath) {
  try {
    $policy = Get-Content $policyPath -Raw | ConvertFrom-Json
    Gate "Policy has denied licenses" ($policy.licenses.denied.Count -ge 3) "Expected 3+ denied licenses"
    Gate "Policy has allowed licenses" ($policy.licenses.allowed.Count -ge 5) "Expected 5+ allowed licenses"
    Gate "Policy has vulnerability config" ($null -ne $policy.vulnerabilities) "Missing vulnerabilities section"
    Gate "Policy denies GPL-3.0" ($policy.licenses.denied -contains "GPL-3.0-only") "GPL-3.0-only not in denied list"
    Gate "Policy denies AGPL" ($policy.licenses.denied -contains "AGPL-3.0-only") "AGPL-3.0-only not in denied list"
  } catch {
    Gate "Policy JSON is valid" $false $_.Exception.Message
  }
}

# -- 3. Existing supply-chain-attest workflow still intact --
Write-Host "`n-- Existing Attestation Workflow --" -ForegroundColor White
Gate "supply-chain-attest.yml still exists" (Test-Path -LiteralPath ".github/workflows/supply-chain-attest.yml")

# -- 4. Prompt structure --
Write-Host "`n-- Prompt Files --" -ForegroundColor White
$promptDir = "prompts/246-PHASE-249-SUPPLY-CHAIN-SECURITY"
Gate "Prompt folder exists" (Test-Path -LiteralPath $promptDir -PathType Container)
Gate "IMPLEMENT.md exists" (Test-Path -LiteralPath "$promptDir/249-01-IMPLEMENT.md")
Gate "VERIFY.md exists" (Test-Path -LiteralPath "$promptDir/249-99-VERIFY.md")
Gate "NOTES.md exists" (Test-Path -LiteralPath "$promptDir/249-NOTES.md")

# -- 5. Evidence directory --
Write-Host "`n-- Evidence --" -ForegroundColor White
Gate "evidence/wave-7/P2/ exists" (Test-Path -LiteralPath "evidence/wave-7/P2" -PathType Container)

# -- 6. Local SBOM generation test (optional) --
if (-not $SkipSbom) {
  Write-Host "`n-- Local SBOM Test (optional) --" -ForegroundColor White
  try {
    $syftVer = syft version 2>$null
    if ($syftVer) {
      Gate "Syft available locally" $true ""
    } else {
      Write-Host "  SKIP  Syft not installed locally (CI will handle)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "  SKIP  Syft not installed locally (CI will handle)" -ForegroundColor Yellow
  }
}

# -- Summary --
Write-Host "`n--- Results: $pass PASS / $fail FAIL ---" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 } else { exit 0 }
