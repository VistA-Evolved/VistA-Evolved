# verify-phase312-privacy-consent-controls.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 11

function Test-Gate {
    param([int]$Num, [string]$Name, [scriptblock]$Check)
    try {
        $result = & $Check
        if ($result) { Write-Host "  Gate $($Num.ToString().PadLeft(2))  PASS  $Name" -ForegroundColor Green; $script:pass++ }
        else { Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name" -ForegroundColor Red; $script:fail++ }
    } catch { Write-Host "  Gate $($Num.ToString().PadLeft(2))  FAIL  $Name -- $_" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== Phase 312 Verification: Privacy/Consent Controls ===`n"

$ceFile = "apps/api/src/services/consent-engine.ts"
$crFile = "apps/api/src/routes/consent-routes.ts"

Test-Gate 1 "Consent engine exists" { Test-Path -LiteralPath $ceFile }

Test-Gate 2 "8 consent categories" {
    $c = Get-Content $ceFile -Raw
    ($c -match "treatment") -and ($c -match "payment") -and ($c -match "operations") -and
    ($c -match "research") -and ($c -match "data_sharing") -and ($c -match "cross_border") -and
    ($c -match "telehealth") -and ($c -match "analytics")
}

Test-Gate 3 "3 regulatory profiles" {
    $c = Get-Content $ceFile -Raw
    ($c -match "HIPAA_CONSENT_PROFILE") -and ($c -match "DPA_PH_CONSENT_PROFILE") -and ($c -match "DPA_GH_CONSENT_PROFILE")
}

Test-Gate 4 "Immutable consent - revocation creates new record" {
    $c = Get-Content $ceFile -Raw
    ($c -match "export function revokeConsent") -and ($c -match "Create revocation record")
}

Test-Gate 5 "checkConsentCompliance exported" {
    $c = Get-Content $ceFile -Raw
    $c -match "export function checkConsentCompliance"
}

Test-Gate 6 "evidenceHash field in ConsentRecord" {
    $c = Get-Content $ceFile -Raw
    ($c -match "evidenceHash: string") -and ($c -match "sha256")
}

Test-Gate 7 "Consent routes exist" { Test-Path -LiteralPath $crFile }

Test-Gate 8 "Grant and revoke endpoints" {
    $c = Get-Content $crFile -Raw
    ($c -match "/consent/grant") -and ($c -match "/consent/revoke")
}

Test-Gate 9 "No PHI in logs" {
    $ce = Get-Content $ceFile -Raw
    $cr = Get-Content $crFile -Raw
    (-not ($ce -match "console\.log.*dfn")) -and (-not ($cr -match "console\.log.*dfn"))
}

Test-Gate 10 "Prompts complete" {
    $d = "prompts/312-PHASE-312-PRIVACY-CONSENT-CONTROLS"
    (Test-Path -LiteralPath "$d/312-01-IMPLEMENT.md") -and (Test-Path -LiteralPath "$d/312-99-VERIFY.md") -and (Test-Path -LiteralPath "$d/312-NOTES.md")
}

Test-Gate 11 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/312-privacy-consent-controls/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
