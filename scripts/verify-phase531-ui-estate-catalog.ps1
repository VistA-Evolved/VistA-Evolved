<#
  Phase 531 - UI Estate Catalog Verifier
  Wave 39 P1: VA + IHS UI Estate Catalog
  15 gates per prompts/531/531-99-VERIFY.md
#>
param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $warn = 0
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\package.json")) { $root = $PSScriptRoot | Split-Path }
if (-not (Test-Path -LiteralPath "$root\package.json")) { $root = Get-Location }

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id -- $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id -- $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id -- $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 531: UI Estate Catalog Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ---- G1: Schema file exists and is valid JSON ----
Gate "G1" "Schema file exists and is valid JSON" {
  $f = Join-Path $root "data/ui-estate/ui-estate.schema.json"
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  return ($null -ne $j.'$schema' -or $null -ne $j.type)
}

# ---- G2: VA catalog exists and is valid JSON ----
Gate "G2" "VA catalog exists and is valid JSON" {
  $f = Join-Path $root "data/ui-estate/va-ui-estate.json"
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  return ($null -ne $j.systems)
}

# ---- G3: IHS catalog exists and is valid JSON ----
Gate "G3" "IHS catalog exists and is valid JSON" {
  $f = Join-Path $root "data/ui-estate/ihs-ui-estate.json"
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  return ($null -ne $j.systems)
}

# ---- G4: VA catalog has >= 20 systems and >= 80 surfaces ----
Gate "G4" "VA >= 20 systems, >= 80 surfaces" {
  $f = Join-Path $root "data/ui-estate/va-ui-estate.json"
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  $sysCount = @($j.systems).Count
  $surfCount = 0
  foreach ($sys in $j.systems) { $surfCount += @($sys.surfaces).Count }
  if ($Verbose) { Write-Host "    VA systems=$sysCount surfaces=$surfCount" }
  return ($sysCount -ge 20 -and $surfCount -ge 80)
}

# ---- G5: IHS catalog has >= 4 systems and >= 15 surfaces ----
Gate "G5" "IHS >= 4 systems, >= 15 surfaces" {
  $f = Join-Path $root "data/ui-estate/ihs-ui-estate.json"
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  $sysCount = @($j.systems).Count
  $surfCount = 0
  foreach ($sys in $j.systems) { $surfCount += @($sys.surfaces).Count }
  if ($Verbose) { Write-Host "    IHS systems=$sysCount surfaces=$surfCount" }
  return ($sysCount -ge 4 -and $surfCount -ge 15)
}

# ---- G6: Every surface has all 6 coverage booleans ----
Gate "G6" "Every surface has 6 coverage booleans" {
  $requiredFields = @("present_ui","present_api","vista_rpc_wired","writeback_ready","tests_present","evidence_present")
  foreach ($catalog in @("va-ui-estate.json","ihs-ui-estate.json")) {
    $f = Join-Path $root "data/ui-estate/$catalog"
    $raw = [System.IO.File]::ReadAllText($f)
    $j = $raw | ConvertFrom-Json
    foreach ($sys in $j.systems) {
      foreach ($surf in $sys.surfaces) {
        foreach ($field in $requiredFields) {
          if ($null -eq $surf.coverage.$field) {
            if ($Verbose) { Write-Host "    Missing $field on $($surf.id) in $catalog" }
            return $false
          }
        }
      }
    }
  }
  return $true
}

# ---- G7: Every surface has a valid priority enum ----
Gate "G7" "Every surface has valid priority" {
  $validP = @("p0-critical","p1-high","p2-medium","p3-low")
  foreach ($catalog in @("va-ui-estate.json","ihs-ui-estate.json")) {
    $f = Join-Path $root "data/ui-estate/$catalog"
    $raw = [System.IO.File]::ReadAllText($f)
    $j = $raw | ConvertFrom-Json
    foreach ($sys in $j.systems) {
      foreach ($surf in $sys.surfaces) {
        if ($surf.priority -notin $validP) {
          if ($Verbose) { Write-Host "    Invalid priority '$($surf.priority)' on $($surf.id)" }
          return $false
        }
      }
    }
  }
  return $true
}

# ---- G8: Every surface has a valid migrationStatus enum ----
Gate "G8" "Every surface has valid migrationStatus" {
  $validS = @("not-started","scaffold","api-wired","writeback","parity","certified")
  foreach ($catalog in @("va-ui-estate.json","ihs-ui-estate.json")) {
    $f = Join-Path $root "data/ui-estate/$catalog"
    $raw = [System.IO.File]::ReadAllText($f)
    $j = $raw | ConvertFrom-Json
    foreach ($sys in $j.systems) {
      foreach ($surf in $sys.surfaces) {
        if ($surf.migrationStatus -notin $validS) {
          if ($Verbose) { Write-Host "    Invalid status '$($surf.migrationStatus)' on $($surf.id)" }
          return $false
        }
      }
    }
  }
  return $true
}

# ---- G9: Build script runs and exits 0 ----
Gate "G9" "build-ui-estate.mjs exits 0" {
  $script = Join-Path $root "scripts/ui-estate/build-ui-estate.mjs"
  if (-not (Test-Path -LiteralPath $script)) { return $false }
  Push-Location $root
  try {
    $output = & node $script 2>&1
    return ($LASTEXITCODE -eq 0)
  } finally { Pop-Location }
}

# ---- G10: Gap report file exists and has expected fields ----
Gate "G10" "Gap report exists with required fields" {
  $f = Join-Path $root "data/ui-estate/ui-gap-report.json"
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $raw = [System.IO.File]::ReadAllText($f)
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  return ($null -ne $j.totals -and $null -ne $j.gaps -and $null -ne $j.workspace)
}

# ---- G11: >= 50 surfaces have veEquivalent with route or page ----
Gate "G11" ">= 50 surfaces have veEquivalent" {
  $count = 0
  foreach ($catalog in @("va-ui-estate.json","ihs-ui-estate.json")) {
    $f = Join-Path $root "data/ui-estate/$catalog"
    $raw = [System.IO.File]::ReadAllText($f)
    $j = $raw | ConvertFrom-Json
    foreach ($sys in $j.systems) {
      foreach ($surf in $sys.surfaces) {
        $ve = $surf.PSObject.Properties['veEquivalent']
        if ($null -ne $ve -and $null -ne $ve.Value) {
          $veObj = $ve.Value
          $hasRoute = $null -ne $veObj.PSObject.Properties['route'] -and $null -ne $veObj.route
          $hasPage = $null -ne $veObj.PSObject.Properties['page'] -and $null -ne $veObj.page
          if ($hasRoute -or $hasPage) { $count++ }
        }
      }
    }
  }
  if ($Verbose) { Write-Host "    veEquivalent count: $count" }
  return ($count -ge 50)
}

# ---- G12: >= 50 surfaces reference targetRpcs ----
Gate "G12" ">= 50 surfaces reference targetRpcs" {
  $count = 0
  foreach ($catalog in @("va-ui-estate.json","ihs-ui-estate.json")) {
    $f = Join-Path $root "data/ui-estate/$catalog"
    $raw = [System.IO.File]::ReadAllText($f)
    $j = $raw | ConvertFrom-Json
    foreach ($sys in $j.systems) {
      foreach ($surf in $sys.surfaces) {
        if ($null -ne $surf.targetRpcs -and @($surf.targetRpcs).Count -gt 0) { $count++ }
      }
    }
  }
  if ($Verbose) { Write-Host "    RPC-referencing surfaces: $count" }
  return ($count -ge 50)
}

# ---- G13: docs/ui-estate/README.md exists ----
Gate "G13" "docs/ui-estate/README.md exists" {
  $f = Join-Path $root "docs/ui-estate/README.md"
  return (Test-Path -LiteralPath $f)
}

# ---- G14: No PHI in catalog files ----
Gate "G14" "No PHI in catalog files (no SSN/DOB/patient names)" {
  $phiPattern = '\d{3}-\d{2}-\d{4}|\bdate.of.birth\b|\bpatient.name\b'
  foreach ($catalog in @("va-ui-estate.json","ihs-ui-estate.json","ui-gap-report.json")) {
    $f = Join-Path $root "data/ui-estate/$catalog"
    if (Test-Path -LiteralPath $f) {
      $content = [System.IO.File]::ReadAllText($f)
      if ($content -match $phiPattern) {
        if ($Verbose) { Write-Host "    PHI pattern matched in $catalog" }
        return $false
      }
    }
  }
  return $true
}

# ---- G15: Evidence directory exists ----
Gate "G15" "Evidence directory exists" {
  $d = Join-Path $root "evidence/wave-39/531-W39-P1-UI-ESTATE-CATALOG"
  return (Test-Path -LiteralPath $d)
}

# ---- Summary ----
Write-Host "`n--- Summary ---"
Write-Host "  PASS: $pass / $($pass + $fail)" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
Write-Host ""

exit $fail
