# verify-phase316-trust-center-pack.ps1
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

Write-Host "`n=== Phase 316 Verification: Trust Center Pack ===`n"

$tcFile = "docs/trust-center/TRUST_CENTER.md"
$spFile = "docs/trust-center/SECURITY_POSTURE.md"
$aoFile = "docs/trust-center/ARCHITECTURE_OVERVIEW.md"

Test-Gate 1 "Trust center exists" { Test-Path -LiteralPath $tcFile }
Test-Gate 2 "Security posture exists" { Test-Path -LiteralPath $spFile }
Test-Gate 3 "Architecture overview exists" { Test-Path -LiteralPath $aoFile }

Test-Gate 4 "Trust center covers 3 markets" {
    $c = Get-Content $tcFile -Raw
    ($c -match "United States") -and ($c -match "Philippines") -and ($c -match "Ghana")
}

Test-Gate 5 "Security covers 5 control areas" {
    $c = Get-Content $spFile -Raw
    ($c -match "Authentication") -and ($c -match "Authorization") -and ($c -match "Data Protection") -and ($c -match "Network") -and ($c -match "Operational")
}

Test-Gate 6 "Architecture covers VistA-first" {
    $c = Get-Content $aoFile -Raw
    ($c -match "VistA") -and ($c -match "MUMPS") -and ($c -match "RPC")
}

Test-Gate 7 "Compliance summary included" {
    $c = Get-Content $tcFile -Raw
    ($c -match "HIPAA") -and ($c -match "DPA_PH") -and ($c -match "DPA_GH") -and ($c -match "91%|83%|80%")
}

Test-Gate 8 "Data residency documented" {
    $c = Get-Content $tcFile -Raw
    ($c -match "us-east") -and ($c -match "ph-mnl") -and ($c -match "gh-acc")
}

Test-Gate 9 "Prompts complete" {
    $d = "prompts/316-PHASE-316-TRUST-CENTER-PACK"
    (Test-Path -LiteralPath "$d/316-01-IMPLEMENT.md") -and (Test-Path -LiteralPath "$d/316-99-VERIFY.md") -and (Test-Path -LiteralPath "$d/316-NOTES.md")
}

Test-Gate 10 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/316-trust-center-pack/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
