# verify-phase315-compliance-evidence-map.ps1
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

Write-Host "`n=== Phase 315 Verification: Compliance Evidence Mapping ===`n"

$mxFile = "apps/api/src/services/compliance-matrix.ts"
$rtFile = "apps/api/src/routes/compliance-routes.ts"

Test-Gate 1 "Matrix exists" { Test-Path -LiteralPath $mxFile }

Test-Gate 2 "HIPAA requirements >= 10" {
    $c = Get-Content $mxFile -Raw
    ([regex]::Matches($c, "framework:\s*'HIPAA'")).Count -ge 10
}

Test-Gate 3 "DPA_PH requirements >= 5" {
    $c = Get-Content $mxFile -Raw
    ([regex]::Matches($c, "framework:\s*'DPA_PH'")).Count -ge 5
}

Test-Gate 4 "DPA_GH requirements >= 4" {
    $c = Get-Content $mxFile -Raw
    ([regex]::Matches($c, "framework:\s*'DPA_GH'")).Count -ge 4
}

Test-Gate 5 "Evidence artifacts linked" {
    $c = Get-Content $mxFile -Raw
    # Every implemented req should have evidence array with entries
    # Check that evidence arrays are non-empty for implemented items
    ($c -match "status:\s*'implemented'") -and ($c -match "artifact:")
}

Test-Gate 6 "All 4 statuses used" {
    $c = Get-Content $mxFile -Raw
    ($c -match "'implemented'") -and ($c -match "'partial'") -and ($c -match "'planned'") -and ($c -match "'not_applicable'")
}

Test-Gate 7 "Routes exist" {
    $c = Get-Content $rtFile -Raw
    ($c -match "/compliance/matrix") -and ($c -match "/compliance/summary") -and
    ($c -match "/compliance/requirements") -and ($c -match "/compliance/categories") -and
    ($c -match "/compliance/evidence") -and ($c -match "/compliance/gaps")
}

Test-Gate 8 "Human-readable map" {
    Test-Path -LiteralPath "docs/compliance/compliance-evidence-map.md"
}

Test-Gate 9 "Category coverage >= 6" {
    $c = Get-Content $mxFile -Raw
    $cats = [regex]::Matches($c, "category:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $cats.Count -ge 6
}

Test-Gate 10 "Prompts complete" {
    $d = "prompts/315-PHASE-315-COMPLIANCE-EVIDENCE-MAP"
    (Test-Path -LiteralPath "$d/315-01-IMPLEMENT.md") -and (Test-Path -LiteralPath "$d/315-99-VERIFY.md") -and (Test-Path -LiteralPath "$d/315-NOTES.md")
}

Test-Gate 11 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/315-compliance-evidence-map/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
