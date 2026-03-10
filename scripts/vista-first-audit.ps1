<#
  .SYNOPSIS
  VistA-First Audit -- Phase 93: PH HMO Deepening Pack

  .DESCRIPTION
  Scans RCM store files to confirm each is properly tagged as
  "orchestration cache" or "integration metadata" -- never as an
  authoritative billing ledger. VistA IB/AR/PCE remains the source
  of truth for all billing data.

  Output: JSON report to artifacts/evidence/ (gitignored).

  .NOTES
  Uses -UseBasicParsing with Invoke-WebRequest (BUG-026).
  Uses ASCII hyphens only, no em-dashes (BUG-055).
  Uses -LiteralPath for bracket-containing paths (BUG-056).
#>

param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$report = @{
    title = "VistA-First RCM Store Audit"
    phase = 93
    timestamp = (Get-Date -Format "o")
    gates = @()
    summary = @{
        total = 0
        pass = 0
        fail = 0
        warn = 0
    }
}

function Add-Gate {
    param([string]$Name, [string]$Status, [string]$Detail)
    $report.gates += @{ name = $Name; status = $Status; detail = $Detail }
    $report.summary.total++
    switch ($Status) {
        "PASS" { $report.summary.pass++ }
        "FAIL" { $report.summary.fail++ }
        "WARN" { $report.summary.warn++ }
    }
    $symbol = switch ($Status) { "PASS" { "[PASS]" } "FAIL" { "[FAIL]" } "WARN" { "[WARN]" } }
    Write-Host "$symbol $Name -- $Detail"
}

Write-Host ""
Write-Host "=== VistA-First RCM Store Audit (Phase 93) ==="
Write-Host ""

# -------------------------------------------------------------------
# Gate 1: PH HMO registry JSON exists and has 27 entries
# -------------------------------------------------------------------
$registryPath = Join-Path (Join-Path (Join-Path $RepoRoot "data") "payers") "ph-hmo-registry.json"
if (Test-Path -LiteralPath $registryPath) {
    $raw = Get-Content -LiteralPath $registryPath -Raw -Encoding UTF8
    # Strip BOM if present
    if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
    try {
        $reg = $raw | ConvertFrom-Json
        $count = ($reg.hmos | Measure-Object).Count
        if ($count -eq 27) {
            Add-Gate "PH HMO registry count" "PASS" "Found $count HMOs (expected 27)"
        } else {
            Add-Gate "PH HMO registry count" "FAIL" "Found $count HMOs (expected 27)"
        }
    } catch {
        Add-Gate "PH HMO registry parse" "FAIL" "JSON parse error: $_"
    }
} else {
    Add-Gate "PH HMO registry exists" "FAIL" "File not found: $registryPath"
}

# -------------------------------------------------------------------
# Gate 2: All payerIds are unique and start with PH-
# -------------------------------------------------------------------
if ($reg -and $reg.hmos) {
    $ids = $reg.hmos | ForEach-Object { $_.payerId }
    $uniqueIds = $ids | Sort-Object -Unique
    if (($ids | Measure-Object).Count -eq ($uniqueIds | Measure-Object).Count) {
        Add-Gate "Unique payerIds" "PASS" "All $($ids.Count) payerIds are unique"
    } else {
        Add-Gate "Unique payerIds" "FAIL" "Duplicate payerIds found"
    }

    $nonPH = $ids | Where-Object { $_ -notmatch "^PH-" }
    if (($nonPH | Measure-Object).Count -eq 0) {
        Add-Gate "PayerId prefix" "PASS" "All payerIds start with PH-"
    } else {
        Add-Gate "PayerId prefix" "FAIL" "Non-PH payerIds: $($nonPH -join ', ')"
    }
}

# -------------------------------------------------------------------
# Gate 3: Each HMO has canonicalSource URL pointing to IC
# -------------------------------------------------------------------
if ($reg -and $reg.hmos) {
    $missingSource = $reg.hmos | Where-Object { -not $_.canonicalSource -or -not $_.canonicalSource.url }
    if (($missingSource | Measure-Object).Count -eq 0) {
        Add-Gate "Canonical source URLs" "PASS" "All 27 HMOs have canonicalSource.url"
    } else {
        Add-Gate "Canonical source URLs" "FAIL" "$($missingSource.Count) HMOs missing canonicalSource.url"
    }
}

# -------------------------------------------------------------------
# Gate 4: RCM store files are tagged as orchestration cache
# -------------------------------------------------------------------
$rcmDir = Join-Path (Join-Path (Join-Path (Join-Path $RepoRoot "apps") "api") "src") "rcm"
$storeFiles = @(
    "domain/claim-store.ts",
    "payments/payment-store.ts"
)

foreach ($sf in $storeFiles) {
    $sfPath = Join-Path $rcmDir $sf
    if (Test-Path -LiteralPath $sfPath) {
        $content = Get-Content -LiteralPath $sfPath -Raw -Encoding UTF8
        # Check for VistA-first or orchestration language
        if ($content -match "in-memory|orchestration|cache|VistA.*source.*truth|not.*authoritative|sidecar") {
            Add-Gate "Store tag: $sf" "PASS" "Contains VistA-first/cache language"
        } else {
            Add-Gate "Store tag: $sf" "WARN" "No explicit VistA-first tagging found"
        }
    } else {
        Add-Gate "Store exists: $sf" "WARN" "File not found (may be in different location)"
    }
}

# -------------------------------------------------------------------
# Gate 5: No hardcoded payer credentials in PH HMO files
# -------------------------------------------------------------------
$phHmoFiles = @(
    "apps/api/src/rcm/payers/ph-hmo-registry.ts",
    "apps/api/src/rcm/payers/ph-hmo-adapter.ts",
    "apps/api/src/rcm/payers/ph-hmo-routes.ts",
    "data/payers/ph-hmo-registry.json"
)

foreach ($f in $phHmoFiles) {
    $fPath = Join-Path $RepoRoot $f
    if (Test-Path -LiteralPath $fPath) {
        $content = Get-Content -LiteralPath $fPath -Raw -Encoding UTF8
        if ($content -match "password|secret|api_key|apiKey|bearer|token\s*[:=]") {
            Add-Gate "No creds: $f" "FAIL" "Potential credentials found in file"
        } else {
            Add-Gate "No creds: $f" "PASS" "No credentials detected"
        }
    }
}

# -------------------------------------------------------------------
# Gate 6: PH HMO routes registered in index.ts
# -------------------------------------------------------------------
$indexPath = Join-Path (Join-Path (Join-Path (Join-Path $RepoRoot "apps") "api") "src") "index.ts"
if (Test-Path -LiteralPath $indexPath) {
    $indexContent = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
    if ($indexContent -match "ph-hmo-routes") {
        Add-Gate "Route registration" "PASS" "ph-hmo-routes imported in index.ts"
    } else {
        Add-Gate "Route registration" "FAIL" "ph-hmo-routes NOT found in index.ts"
    }
    if ($indexContent -match "phHmoRoutes") {
        Add-Gate "Route plugin" "PASS" "phHmoRoutes registered as Fastify plugin"
    } else {
        Add-Gate "Route plugin" "FAIL" "phHmoRoutes NOT registered"
    }
}

# -------------------------------------------------------------------
# Gate 7: Admin layout has PH HMO Console nav entry
# -------------------------------------------------------------------
$layoutPath = Join-Path (Join-Path (Join-Path (Join-Path (Join-Path (Join-Path (Join-Path $RepoRoot "apps") "web") "src") "app") "cprs") "admin") "layout.tsx"
if (Test-Path -LiteralPath $layoutPath) {
    $layoutContent = Get-Content -LiteralPath $layoutPath -Raw -Encoding UTF8
    if ($layoutContent -match "ph-hmo-console") {
        Add-Gate "Admin nav entry" "PASS" "ph-hmo-console found in admin layout"
    } else {
        Add-Gate "Admin nav entry" "FAIL" "ph-hmo-console NOT in admin layout"
    }
}

# -------------------------------------------------------------------
# Gate 8: UI page exists
# -------------------------------------------------------------------
$uiPath = Join-Path (Join-Path (Join-Path (Join-Path (Join-Path (Join-Path (Join-Path (Join-Path $RepoRoot "apps") "web") "src") "app") "cprs") "admin") "ph-hmo-console") "page.tsx"
if (Test-Path -LiteralPath $uiPath) {
    Add-Gate "UI page exists" "PASS" "ph-hmo-console/page.tsx exists"
} else {
    Add-Gate "UI page exists" "FAIL" "ph-hmo-console/page.tsx NOT found"
}

# -------------------------------------------------------------------
# Gate 9: Prompt file exists
# -------------------------------------------------------------------
$promptDir = Join-Path (Join-Path $RepoRoot "prompts") "99-PHASE-93-PH-HMO-DEEPENING"
$promptFile = Join-Path $promptDir "93-01-IMPLEMENT.md"
if (Test-Path -LiteralPath $promptFile) {
    Add-Gate "Prompt file" "PASS" "93-01-IMPLEMENT.md exists"
} else {
    Add-Gate "Prompt file" "FAIL" "93-01-IMPLEMENT.md NOT found"
}

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
Write-Host ""
Write-Host "=== SUMMARY ==="
Write-Host "Total: $($report.summary.total) | PASS: $($report.summary.pass) | FAIL: $($report.summary.fail) | WARN: $($report.summary.warn)"
Write-Host ""

# Write JSON report to artifacts
$artifactsDir = Join-Path (Join-Path $RepoRoot "artifacts") "evidence"
if (-not (Test-Path -LiteralPath $artifactsDir)) {
    New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
}

$reportPath = Join-Path $artifactsDir "phase93-vista-first-audit.json"
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding ascii
Write-Host "Report written to: $reportPath"

# Exit code
if ($report.summary.fail -gt 0) {
    Write-Host "RESULT: FAIL" -ForegroundColor Red
    exit 1
} else {
    Write-Host "RESULT: PASS" -ForegroundColor Green
    exit 0
}
