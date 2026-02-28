# verify-phase309-manifest-country-pack-adrs.ps1
# Phase 309 verifier -- Manifest + Country-Pack ADRs + Market Matrix
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 11

function Test-Gate {
    param([int]$Num, [string]$Name, [scriptblock]$Check)
    try {
        $result = & $Check
        if ($result) {
            Write-Host "  Gate $($Num.ToString().PadLeft(2))  PASS  $Name" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name -- $_" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== Phase 309 Verification: Manifest + Country-Pack ADRs + Market Matrix ===`n"

# Gate 1: WAVE_13_MANIFEST exists with 8 phases
Test-Gate 1 "WAVE_13_MANIFEST.md exists with 8 phases" {
    $f = "prompts/WAVE_13_MANIFEST.md"
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $c = Get-Content $f -Raw
    ($c -match "309") -and ($c -match "316")
}

# Gate 2: Country Pack Standard exists with schema
Test-Gate 2 "Country Pack Standard exists with schema" {
    $f = "docs/country-packs/COUNTRY_PACK_STANDARD.md"
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $c = Get-Content $f -Raw
    ($c -match "values\.json") -and ($c -match "regulatoryProfile") -and ($c -match "terminologyDefaults")
}

# Gate 3: ADR-country-pack-model exists
Test-Gate 3 "ADR-country-pack-model.md exists with Decision" {
    $f = "docs/adrs/ADR-country-pack-model.md"
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $c = Get-Content $f -Raw
    ($c -match "## Decision") -and ($c -match "values-driven")
}

# Gate 4: ADR-data-residency-model exists
Test-Gate 4 "ADR-data-residency-model.md exists with Decision" {
    $f = "docs/adrs/ADR-data-residency-model.md"
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $c = Get-Content $f -Raw
    ($c -match "## Decision") -and ($c -match "DataRegion")
}

# Gate 5: ADR-terminology-model exists
Test-Gate 5 "ADR-terminology-model.md exists with Decision" {
    $f = "docs/adrs/ADR-terminology-model.md"
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $c = Get-Content $f -Raw
    ($c -match "## Decision") -and ($c -match "pluggable")
}

# Gate 6: Target Markets Matrix has US, PH, GH
Test-Gate 6 "Target Markets Matrix has US, PH, GH sections" {
    $f = "docs/market/target-markets.md"
    if (-not (Test-Path -LiteralPath $f)) { return $false }
    $c = Get-Content $f -Raw
    ($c -match "United States \(US\)") -and ($c -match "Philippines \(PH\)") -and ($c -match "Ghana \(GH\)")
}

# Gate 7: No legal advice language
Test-Gate 7 "No legal advice language" {
    $files = @(
        "docs/country-packs/COUNTRY_PACK_STANDARD.md",
        "docs/adrs/ADR-country-pack-model.md",
        "docs/adrs/ADR-data-residency-model.md",
        "docs/adrs/ADR-terminology-model.md",
        "docs/market/target-markets.md"
    )
    foreach ($f in $files) {
        if (Test-Path -LiteralPath $f) {
            $c = Get-Content $f -Raw
            if ($c -match "this constitutes legal" -or $c -match "legal advice") {
                return $false
            }
        }
    }
    return $true
}

# Gate 8: Schema completeness - check all required sections in standard
Test-Gate 8 "Schema completeness in Country Pack Standard" {
    $f = "docs/country-packs/COUNTRY_PACK_STANDARD.md"
    $c = Get-Content $f -Raw
    $sections = @("countryCode", "defaultLocale", "regulatoryProfile", "dataResidency",
                   "terminologyDefaults", "payerModules", "enabledModules", "uiDefaults",
                   "reportingRequirements")
    $allFound = $true
    foreach ($s in $sections) {
        if ($c -notmatch $s) { $allFound = $false; break }
    }
    $allFound
}

# Gate 9: ADRs cross-reference each other
Test-Gate 9 "ADRs cross-reference each other" {
    $adrCP = Get-Content "docs/adrs/ADR-country-pack-model.md" -Raw
    $adrDR = Get-Content "docs/adrs/ADR-data-residency-model.md" -Raw
    $adrTM = Get-Content "docs/adrs/ADR-terminology-model.md" -Raw
    ($adrCP -match "ADR-data-residency-model") -and
    ($adrCP -match "ADR-terminology-model") -and
    ($adrDR -match "ADR-country-pack-model") -and
    ($adrTM -match "ADR-country-pack-model")
}

# Gate 10: Prompts complete (IMPLEMENT + VERIFY + NOTES)
Test-Gate 10 "Prompts complete for Phase 309" {
    $dir = "prompts/309-PHASE-309-MANIFEST-COUNTRY-PACK-ADRS"
    (Test-Path -LiteralPath "$dir/309-01-IMPLEMENT.md") -and
    (Test-Path -LiteralPath "$dir/309-99-VERIFY.md") -and
    (Test-Path -LiteralPath "$dir/309-NOTES.md")
}

# Gate 11: Evidence exists
Test-Gate 11 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/309-manifest-country-pack-adrs/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
