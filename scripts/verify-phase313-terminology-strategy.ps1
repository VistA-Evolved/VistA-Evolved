# verify-phase313-terminology-strategy.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 10

function Test-Gate {
    param([int]$Num, [string]$Name, [scriptblock]$Check)
    try {
        $result = & $Check
        if ($result) { Write-Host "  Gate $($Num.ToString().PadLeft(2))  PASS  $Name" -ForegroundColor Green; $script:pass++ }
        else { Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name" -ForegroundColor Red; $script:fail++ }
    } catch { Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name -- $_" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== Phase 313 Verification: Terminology Strategy ===`n"

$trFile = "apps/api/src/services/terminology-registry.ts"
$rtFile = "apps/api/src/routes/terminology-routes.ts"

Test-Gate 1 "Registry exists" { Test-Path -LiteralPath $trFile }

Test-Gate 2 "TerminologyResolver interface" {
    $c = Get-Content $trFile -Raw
    ($c -match "export interface TerminologyResolver") -and ($c -match "resolve\(") -and ($c -match "validate\(") -and ($c -match "search\(")
}

Test-Gate 3 "6 built-in resolvers" {
    $c = Get-Content $trFile -Raw
    ($c -match "ICD10CMResolver") -and ($c -match "ICD10WHOResolver") -and
    ($c -match "CPTResolver") -and ($c -match "LOINCResolver") -and
    ($c -match "NDCResolver") -and ($c -match "PassthroughResolver")
}

Test-Gate 4 "resolveCode with fallback" {
    $c = Get-Content $trFile -Raw
    ($c -match "export function resolveCode") -and ($c -match "passthrough")
}

Test-Gate 5 "Per-country defaults (US, PH, GH)" {
    $c = Get-Content $trFile -Raw
    ($c -match "US_TERMINOLOGY_DEFAULTS") -and ($c -match "PH_TERMINOLOGY_DEFAULTS") -and ($c -match "GH_TERMINOLOGY_DEFAULTS")
}

Test-Gate 6 "Routes exist" { Test-Path -LiteralPath $rtFile }

Test-Gate 7 "FHIR system URIs" {
    $c = Get-Content $trFile -Raw
    ($c -match "http://hl7\.org/fhir/sid/icd-10-cm") -and
    ($c -match "http://loinc\.org") -and
    ($c -match "http://hl7\.org/fhir/sid/ndc")
}

Test-Gate 8 "Code validation patterns" {
    $c = Get-Content $trFile -Raw
    ($c -match "CODE_PATTERN") -and ([regex]::Matches($c, "CODE_PATTERN")).Count -ge 4
}

Test-Gate 9 "Prompts complete" {
    $d = "prompts/313-PHASE-313-TERMINOLOGY-STRATEGY"
    (Test-Path -LiteralPath "$d/313-01-IMPLEMENT.md") -and (Test-Path -LiteralPath "$d/313-99-VERIFY.md") -and (Test-Path -LiteralPath "$d/313-NOTES.md")
}

Test-Gate 10 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/313-terminology-strategy/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
