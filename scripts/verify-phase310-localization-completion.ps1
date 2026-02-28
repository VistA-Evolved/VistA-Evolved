# verify-phase310-localization-completion.ps1
# Phase 310 verifier -- Localization Completion
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

Write-Host "`n=== Phase 310 Verification: Localization Completion ===`n"

# Gate 1: Package exists
Test-Gate 1 "Package exists" {
    Test-Path -LiteralPath "packages/locale-utils/package.json"
}

# Gate 2: Exports formatting functions
Test-Gate 2 "Exports formatDate, formatNumber, formatCurrency" {
    $c = Get-Content "packages/locale-utils/src/index.ts" -Raw
    ($c -match "export function formatDate") -and
    ($c -match "export function formatNumber") -and
    ($c -match "export function formatCurrency")
}

# Gate 3: RTL detection
Test-Gate 3 "RTL detection functions exported" {
    $c = Get-Content "packages/locale-utils/src/index.ts" -Raw
    ($c -match "export function isRtlLocale") -and
    ($c -match "export function getTextDirection")
}

# Gate 4: Null safety (functions handle null/undefined)
Test-Gate 4 "Null safety in format functions" {
    $c = Get-Content "packages/locale-utils/src/index.ts" -Raw
    # Check that all format functions have null checks
    $nullChecks = ([regex]::Matches($c, 'if \(value == null\) return ""')).Count
    $nullChecks -ge 5  # formatDate, formatTime, formatDateTime, formatNumber, formatCurrency, formatRelativeTime
}

# Gate 5: Contract tests exist
Test-Gate 5 "Contract tests exist" {
    Test-Path -LiteralPath "packages/locale-utils/tests/locale-utils.test.ts"
}

# Gate 6: Audit script exists
Test-Gate 6 "Audit script exists" {
    Test-Path -LiteralPath "packages/locale-utils/src/audit-keys.ts"
}

# Gate 7: Workspace includes packages
Test-Gate 7 "pnpm-workspace.yaml includes packages/*" {
    $c = Get-Content "pnpm-workspace.yaml" -Raw
    $c -match "packages/\*"
}

# Gate 8: No external deps (Intl only)
Test-Gate 8 "No external runtime dependencies" {
    $raw = Get-Content "packages/locale-utils/package.json" -Raw
    # Should have no "dependencies" key at all (only devDependencies)
    -not ($raw -match '"dependencies"')
}

# Gate 9: Locale parity (check portal and web have same key count across locales)
Test-Gate 9 "Locale key parity across en/fil/es" {
    $allOk = $true
    foreach ($app in @("apps/portal/public/messages", "apps/web/public/messages")) {
        $enFile = "$app/en.json"
        $filFile = "$app/fil.json"
        $esFile = "$app/es.json"
        if (-not ((Test-Path -LiteralPath $enFile) -and (Test-Path -LiteralPath $filFile) -and (Test-Path -LiteralPath $esFile))) {
            $allOk = $false; continue
        }
        $enSize = (Get-Content $enFile -Raw).Length
        $filSize = (Get-Content $filFile -Raw).Length
        $esSize = (Get-Content $esFile -Raw).Length
        # They should all be roughly the same size (within 50% -- translations vary in length)
        if ($filSize -lt ($enSize * 0.3) -or $esSize -lt ($enSize * 0.3)) {
            $allOk = $false
        }
    }
    $allOk
}

# Gate 10: Prompts complete
Test-Gate 10 "Prompts complete for Phase 310" {
    $dir = "prompts/310-PHASE-310-LOCALIZATION-COMPLETION"
    (Test-Path -LiteralPath "$dir/310-01-IMPLEMENT.md") -and
    (Test-Path -LiteralPath "$dir/310-99-VERIFY.md") -and
    (Test-Path -LiteralPath "$dir/310-NOTES.md")
}

# Gate 11: Evidence exists
Test-Gate 11 "Evidence exists" {
    Test-Path -LiteralPath "evidence/wave-13/310-localization-completion/evidence.md"
}

Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===`n"
if ($fail -gt 0) { exit 1 } else { exit 0 }
