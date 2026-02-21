# SBOM Generation -- Phase 62
#
# Generates CycloneDX 1.5 Software Bill of Materials.
# Output: artifacts/evidence/phase62/sbom/sbom.json
#
# Uses @cyclonedx/cyclonedx-npm (installed on-demand via npx).
# Falls back to a pnpm-licenses-based SBOM if the CycloneDX tool is unavailable.

param(
  [string]$OutputDir = "artifacts/evidence/phase62/sbom"
)

$ErrorActionPreference = "Stop"
$root = (git rev-parse --show-toplevel 2>$null) ?? $PSScriptRoot

if (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
  $OutputDir = Join-Path $root $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Write-Host "`n=== SBOM Generation (Phase 62) ===" -ForegroundColor Cyan
Write-Host "  Output: $OutputDir`n"

$sbomPath = Join-Path $OutputDir "sbom.json"
$licensePath = Join-Path $OutputDir "license-report.json"
$summaryPath = Join-Path $OutputDir "sbom-summary.json"

# -------------------------------------------------------------------
# 1. Try CycloneDX
# -------------------------------------------------------------------
Write-Host "[1/3] Generating CycloneDX SBOM..." -ForegroundColor Yellow
$cycloneDxOk = $false
try {
  Push-Location $root
  npx --yes @cyclonedx/cyclonedx-npm --output-file $sbomPath --spec-version 1.5 2>$null
  Pop-Location
  if (Test-Path -LiteralPath $sbomPath) {
    $sz = (Get-Item $sbomPath).Length
    Write-Host "  [PASS] CycloneDX SBOM generated ($sz bytes)" -ForegroundColor Green
    $cycloneDxOk = $true
  }
} catch {
  Pop-Location -ErrorAction SilentlyContinue
  Write-Host "  [SKIP] CycloneDX tool not available, creating fallback SBOM" -ForegroundColor DarkYellow
}

# Fallback: create a minimal SBOM from package.json
if (-not $cycloneDxOk) {
  try {
    $pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
    $fallback = @{
      bomFormat = "CycloneDX"
      specVersion = "1.5"
      version = 1
      metadata = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        component = @{
          type = "application"
          name = "vista-evolved"
          version = $pkg.version ?? "0.0.0"
        }
        tools = @(@{ name = "pnpm-licenses-fallback"; version = "1.0.0" })
      }
      components = @()
      note = "Fallback SBOM -- install @cyclonedx/cyclonedx-npm for full component enumeration"
    }
    $fallback | ConvertTo-Json -Depth 10 | Set-Content $sbomPath -Encoding utf8
    Write-Host "  [PASS] Fallback SBOM created" -ForegroundColor Green
  } catch {
    Write-Host "  [FAIL] Could not create fallback SBOM: $_" -ForegroundColor Red
  }
}

# -------------------------------------------------------------------
# 2. License report
# -------------------------------------------------------------------
Write-Host "[2/3] Generating license report..." -ForegroundColor Yellow
try {
  Push-Location $root
  $licenseOutput = pnpm licenses list --json 2>$null
  Pop-Location
  if ($licenseOutput) {
    Set-Content $licensePath $licenseOutput -Encoding utf8
    Write-Host "  [PASS] License report generated" -ForegroundColor Green
  } else {
    Set-Content $licensePath '{"note": "pnpm licenses list returned empty"}' -Encoding utf8
    Write-Host "  [SKIP] Empty license output" -ForegroundColor DarkYellow
  }
} catch {
  Pop-Location -ErrorAction SilentlyContinue
  Set-Content $licensePath '{"error": "pnpm licenses list failed"}' -Encoding utf8
  Write-Host "  [SKIP] License report failed: $_" -ForegroundColor DarkYellow
}

# -------------------------------------------------------------------
# 3. Summary
# -------------------------------------------------------------------
Write-Host "[3/3] Writing summary..." -ForegroundColor Yellow

$summary = @{
  generatedAt   = (Get-Date).ToUniversalTime().ToString("o")
  format        = "CycloneDX"
  specVersion   = "1.5"
  sbomFile      = $sbomPath
  licenseFile   = $licensePath
  cycloneDxTool = $cycloneDxOk
  sbomSizeBytes = if (Test-Path -LiteralPath $sbomPath) { (Get-Item $sbomPath).Length } else { 0 }
}
$summary | ConvertTo-Json -Depth 5 | Set-Content $summaryPath -Encoding utf8

Write-Host "`n=== SBOM Generation Complete ===" -ForegroundColor Cyan
Write-Host "  SBOM: $sbomPath"
Write-Host "  Licenses: $licensePath"
Write-Host "  Summary: $summaryPath`n"
