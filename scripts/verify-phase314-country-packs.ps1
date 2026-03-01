# verify-phase314-country-packs.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 12

function Test-Gate {
    param([int]$Num, [string]$Name, [scriptblock]$Check)
    try {
        $result = & $Check
        if ($result) { Write-Host "  Gate $($Num.ToString().PadLeft(2))  PASS  $Name" -ForegroundColor Green; $script:pass++ }
        else { Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name" -ForegroundColor Red; $script:fail++ }
    } catch { Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name -- $_" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== Phase 314 Verification: Country Packs ===`n"

Test-Gate 1 "US pack exists" { Test-Path -LiteralPath "country-packs/US/values.json" }
Test-Gate 2 "PH pack exists" { Test-Path -LiteralPath "country-packs/PH/values.json" }
Test-Gate 3 "GH pack exists" { Test-Path -LiteralPath "country-packs/GH/values.json" }

Test-Gate 4 "US pack valid JSON" {
    $j = Get-Content "country-packs/US/values.json" -Raw | ConvertFrom-Json
    $j.countryCode -eq "US"
}

Test-Gate 5 "PH pack valid JSON" {
    $j = Get-Content "country-packs/PH/values.json" -Raw | ConvertFrom-Json
    $j.countryCode -eq "PH"
}

Test-Gate 6 "GH pack valid JSON" {
    $j = Get-Content "country-packs/GH/values.json" -Raw | ConvertFrom-Json
    $j.countryCode -eq "GH"
}

Test-Gate 7 "Loader exists" {
    $c = Get-Content "apps/api/src/platform/country-pack-loader.ts" -Raw
    ($c -match "validatePack") -and ($c -match "loadCountryPack") -and ($c -match "resolvePackForTenant")
}

Test-Gate 8 "Routes exist" {
    $c = Get-Content "apps/api/src/routes/country-pack-routes.ts" -Raw
    ($c -match "/country-packs") -and ($c -match "validate") -and ($c -match "resolve") -and
    ($c -match "modules") -and ($c -match "terminology") -and ($c -match "regulatory")
}

Test-Gate 9 "Framework alignment" {
    $us = Get-Content "country-packs/US/values.json" -Raw | ConvertFrom-Json
    $ph = Get-Content "country-packs/PH/values.json" -Raw | ConvertFrom-Json
    $gh = Get-Content "country-packs/GH/values.json" -Raw | ConvertFrom-Json
    ($us.regulatoryProfile.framework -eq "HIPAA") -and
    ($ph.regulatoryProfile.framework -eq "DPA_PH") -and
    ($gh.regulatoryProfile.framework -eq "DPA_GH")
}

Test-Gate 10 "Terminology alignment" {
    $us = Get-Content "country-packs/US/values.json" -Raw | ConvertFrom-Json
    $ph = Get-Content "country-packs/PH/values.json" -Raw | ConvertFrom-Json
    $gh = Get-Content "country-packs/GH/values.json" -Raw | ConvertFrom-Json
    ($us.terminologyDefaults.diagnosisCodeSystem -eq "ICD-10-CM") -and
    ($ph.terminologyDefaults.diagnosisCodeSystem -eq "ICD-10-WHO") -and
    ($gh.terminologyDefaults.diagnosisCodeSystem -eq "ICD-10-WHO")
}

Test-Gate 11 "Prompts complete" {
    $d = "prompts/314-PHASE-314-COUNTRY-PACKS"
    (Test-Path -LiteralPath "$d/314-01-IMPLEMENT.md") -and (Test-Path -LiteralPath "$d/314-99-VERIFY.md") -and (Test-Path -LiteralPath "$d/314-NOTES.md")
}

Test-Gate 12 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/314-country-packs/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
