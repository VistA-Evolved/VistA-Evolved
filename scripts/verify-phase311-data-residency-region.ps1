# verify-phase311-data-residency-region.ps1
# Phase 311 verifier -- Data Residency & Region Routing
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

Write-Host "`n=== Phase 311 Verification: Data Residency & Region Routing ===`n"

$drFile = "apps/api/src/platform/data-residency.ts"
$rtFile = "apps/api/src/routes/data-residency-routes.ts"

# Gate 1: Module exists
Test-Gate 1 "Data residency module exists" {
    Test-Path -LiteralPath $drFile
}

# Gate 2: 6 regions
Test-Gate 2 "DataRegion type has 6 regions" {
    $c = Get-Content $drFile -Raw
    ($c -match "us-east") -and ($c -match "us-west") -and ($c -match "ph-mnl") -and
    ($c -match "gh-acc") -and ($c -match "eu-fra") -and ($c -match "local")
}

# Gate 3: Region catalog complete
Test-Gate 3 "REGION_CATALOG has metadata for all 6" {
    $c = Get-Content $drFile -Raw
    ($c -match "REGION_CATALOG") -and ($c -match "displayName") -and ($c -match "crossBorderAllowed")
}

# Gate 4: Immutability enforced
Test-Gate 4 "Region assignment immutability enforced" {
    $c = Get-Content $rtFile -Raw
    ($c -match "immutable") -and ($c -match "already assigned")
}

# Gate 5: Cross-border validation
Test-Gate 5 "validateCrossBorderTransfer exported" {
    $c = Get-Content $drFile -Raw
    $c -match "export function validateCrossBorderTransfer"
}

# Gate 6: PG URL resolution
Test-Gate 6 "resolveRegionPgUrl handles per-region env vars" {
    $c = Get-Content $drFile -Raw
    ($c -match "export function resolveRegionPgUrl") -and ($c -match "PLATFORM_PG_URL_")
}

# Gate 7: Audit bucket resolution
Test-Gate 7 "resolveRegionAuditBucket is region-scoped" {
    $c = Get-Content $drFile -Raw
    ($c -match "export function resolveRegionAuditBucket") -and ($c -match "AUDIT_SHIP_BUCKET")
}

# Gate 8: Routes file exists
Test-Gate 8 "Data residency routes file exists" {
    Test-Path -LiteralPath $rtFile
}

# Gate 9: Transfer agreement interface
Test-Gate 9 "DataTransferAgreement interface defined" {
    $c = Get-Content $drFile -Raw
    ($c -match "export interface DataTransferAgreement") -and
    ($c -match "sourceRegion") -and ($c -match "targetRegion") -and
    ($c -match "legalBasis") -and ($c -match "consentEvidenceRef")
}

# Gate 10: Prompts complete
Test-Gate 10 "Prompts complete for Phase 311" {
    $dir = "prompts/311-PHASE-311-DATA-RESIDENCY-REGION"
    (Test-Path -LiteralPath "$dir/311-01-IMPLEMENT.md") -and
    (Test-Path -LiteralPath "$dir/311-99-VERIFY.md") -and
    (Test-Path -LiteralPath "$dir/311-NOTES.md")
}

# Gate 11: Evidence exists
Test-Gate 11 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/311-data-residency-region/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
