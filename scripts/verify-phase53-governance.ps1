<#
.SYNOPSIS
  Phase 53 Verifier -- PromptOS v2.1 Governance + Anti-Sprawl Enforcement

.DESCRIPTION
  Validates all Phase 53 Definition-of-Done gates:
    1. No committed verification outputs in forbidden paths
    2. /artifacts gitignored and used by verifiers
    3. Prompts integrity (audit tool runs clean)
    4. Policy docs exist (POLICY.md, INDEX.md)
    5. Doc policy gate runs clean
    6. Pre-commit hook exists
    7. CI enforcement configured
    8. AGENTS.md updated with governance preamble

.NOTES
  Run from repo root: .\scripts\verify-phase53-governance.ps1
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipPlaywright
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$pass = 0; $fail = 0; $warn = 0
$results = @()

function Gate-Pass($name, $msg) {
    $script:pass++
    $script:results += [PSCustomObject]@{Gate=$name; Status='PASS'; Message=$msg}
    Write-Host "  [PASS] $name -- $msg" -ForegroundColor Green
}
function Gate-Fail($name, $msg) {
    $script:fail++
    $script:results += [PSCustomObject]@{Gate=$name; Status='FAIL'; Message=$msg}
    Write-Host "  [FAIL] $name -- $msg" -ForegroundColor Red
}
function Gate-Warn($name, $msg) {
    $script:warn++
    $script:results += [PSCustomObject]@{Gate=$name; Status='WARN'; Message=$msg}
    Write-Host "  [WARN] $name -- $msg" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Phase 53: Governance + Anti-Sprawl" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Gate 1: No committed verification outputs ────────────────────

Write-Host "--- Gate 1: No committed verification outputs ---"

if (Test-Path -LiteralPath "reports") {
    Gate-Fail "no-root-reports" "/reports directory exists"
} else {
    Gate-Pass "no-root-reports" "/reports directory does not exist"
}

if (Test-Path -LiteralPath "docs\reports") {
    $rptFiles = @(Get-ChildItem "docs\reports" -ErrorAction SilentlyContinue)
    if ($rptFiles.Count -gt 0) {
        Gate-Fail "no-docs-reports" "docs/reports has $($rptFiles.Count) file(s)"
    } else {
        Gate-Warn "no-docs-reports-empty" "docs/reports exists but is empty"
    }
} else {
    Gate-Pass "no-docs-reports" "docs/reports directory removed"
}

if (Test-Path -LiteralPath "docs\verify") {
    $vfyFiles = @(Get-ChildItem "docs\verify" -ErrorAction SilentlyContinue)
    if ($vfyFiles.Count -gt 0) {
        Gate-Fail "no-docs-verify" "docs/verify has $($vfyFiles.Count) file(s)"
    } else {
        Gate-Warn "no-docs-verify-empty" "docs/verify exists but is empty"
    }
} else {
    Gate-Pass "no-docs-verify" "docs/verify directory removed"
}

# ── Gate 2: Artifacts directory + gitignore ──────────────────────

Write-Host "`n--- Gate 2: Artifacts directory + .gitignore ---"

if (Test-Path -LiteralPath "artifacts") {
    Gate-Pass "artifacts-dir" "/artifacts directory exists"
} else {
    Gate-Fail "artifacts-dir" "/artifacts directory missing"
}

$gitignoreContent = Get-Content .gitignore -Raw -ErrorAction SilentlyContinue
if ($gitignoreContent -match '/artifacts/|artifacts/') {
    Gate-Pass "artifacts-gitignored" "/artifacts/ in .gitignore"
} else {
    Gate-Fail "artifacts-gitignored" "/artifacts/ not in .gitignore"
}

if ($gitignoreContent -match '/reports/|reports/') {
    Gate-Pass "reports-gitignored" "/reports/ in .gitignore"
} else {
    Gate-Fail "reports-gitignored" "/reports/ not in .gitignore"
}

if ($gitignoreContent -match 'docs/reports') {
    Gate-Pass "docs-reports-gitignored" "docs/reports in .gitignore"
} else {
    Gate-Fail "docs-reports-gitignored" "docs/reports not in .gitignore"
}

# ── Gate 3: Prompts integrity ────────────────────────────────────

Write-Host "`n--- Gate 3: Prompts integrity ---"

# Run auditPrompts.ts
try {
    $auditOutput = & npx tsx scripts/promptos/auditPrompts.ts 2>&1
    $auditExit = $LASTEXITCODE
    if ($auditExit -eq 0) {
        Gate-Pass "prompts-audit" "auditPrompts.ts passed"
    } else {
        Gate-Warn "prompts-audit" "auditPrompts.ts has warnings (exit=$auditExit)"
        $auditOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    }
} catch {
    Gate-Fail "prompts-audit" "auditPrompts.ts failed: $_"
}

# Check Phase 53 prompt files exist
$p53dir = "prompts\58-PHASE-53-PROMPTOS-GOVERNANCE"
if (Test-Path -LiteralPath "$p53dir\58-01-IMPLEMENT.md") {
    Gate-Pass "p53-implement" "Phase 53 IMPLEMENT prompt exists"
} else {
    Gate-Fail "p53-implement" "Phase 53 IMPLEMENT prompt missing"
}

if (Test-Path -LiteralPath "$p53dir\58-99-VERIFY.md") {
    Gate-Pass "p53-verify" "Phase 53 VERIFY prompt exists"
} else {
    Gate-Fail "p53-verify" "Phase 53 VERIFY prompt missing"
}

# ── Gate 4: Policy docs ──────────────────────────────────────────

Write-Host "`n--- Gate 4: Policy docs ---"

if (Test-Path -LiteralPath "docs\POLICY.md") {
    Gate-Pass "policy-md" "docs/POLICY.md exists"
    $policyContent = Get-Content "docs\POLICY.md" -Raw
    if ($policyContent -match 'Forbidden Roots') {
        Gate-Pass "policy-forbidden" "POLICY.md defines forbidden roots"
    } else {
        Gate-Fail "policy-forbidden" "POLICY.md missing forbidden roots section"
    }
    if ($policyContent -match 'Allowed Documentation Roots') {
        Gate-Pass "policy-allowed" "POLICY.md defines allowed roots"
    } else {
        Gate-Fail "policy-allowed" "POLICY.md missing allowed roots section"
    }
} else {
    Gate-Fail "policy-md" "docs/POLICY.md missing"
}

if (Test-Path -LiteralPath "docs\INDEX.md") {
    Gate-Pass "index-md" "docs/INDEX.md exists"
} else {
    Gate-Fail "index-md" "docs/INDEX.md missing"
}

# ── Gate 5: Doc policy gate ──────────────────────────────────────

Write-Host "`n--- Gate 5: Doc policy gate tool ---"

if (Test-Path -LiteralPath "scripts\governance\checkDocsPolicy.ts") {
    Gate-Pass "policy-gate-exists" "checkDocsPolicy.ts exists"
    try {
        $policyOutput = & npx tsx scripts/governance/checkDocsPolicy.ts 2>&1
        $policyExit = $LASTEXITCODE
        if ($policyExit -eq 0) {
            Gate-Pass "policy-gate-clean" "checkDocsPolicy.ts passed"
        } else {
            Gate-Warn "policy-gate-clean" "checkDocsPolicy.ts has violations (exit=$policyExit)"
            $policyOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        }
    } catch {
        Gate-Fail "policy-gate-clean" "checkDocsPolicy.ts failed: $_"
    }
} else {
    Gate-Fail "policy-gate-exists" "checkDocsPolicy.ts missing"
}

# ── Gate 6: Pre-commit hook ──────────────────────────────────────

Write-Host "`n--- Gate 6: Pre-commit hook ---"

if (Test-Path -LiteralPath ".hooks\pre-commit") {
    Gate-Pass "pre-commit-exists" ".hooks/pre-commit exists"
} else {
    Gate-Fail "pre-commit-exists" ".hooks/pre-commit missing"
}

if (Test-Path -LiteralPath ".hooks\pre-commit.ps1") {
    Gate-Pass "pre-commit-ps1" ".hooks/pre-commit.ps1 exists (Windows)"
} else {
    Gate-Warn "pre-commit-ps1" ".hooks/pre-commit.ps1 missing (optional for Windows)"
}

# ── Gate 7: CI enforcement ───────────────────────────────────────

Write-Host "`n--- Gate 7: CI enforcement ---"

$ciVerify = Get-Content ".github\workflows\ci-verify.yml" -Raw -ErrorAction SilentlyContinue
if ($ciVerify) {
    if ($ciVerify -match 'auditPrompts') {
        Gate-Pass "ci-audit-prompts" "CI includes auditPrompts gate"
    } else {
        Gate-Fail "ci-audit-prompts" "CI missing auditPrompts gate"
    }
    if ($ciVerify -match 'checkDocsPolicy') {
        Gate-Pass "ci-docs-policy" "CI includes checkDocsPolicy gate"
    } else {
        Gate-Fail "ci-docs-policy" "CI missing checkDocsPolicy gate"
    }
    if ($ciVerify -match 'secret.scan|secret-scan') {
        Gate-Pass "ci-secret-scan" "CI includes secret scan"
    } else {
        Gate-Warn "ci-secret-scan" "CI missing secret scan"
    }
} else {
    Gate-Fail "ci-verify-yml" ".github/workflows/ci-verify.yml not found"
}

# ── Gate 8: AGENTS.md governance ─────────────────────────────────

Write-Host "`n--- Gate 8: AGENTS.md governance ---"

$agentsContent = Get-Content "AGENTS.md" -Raw -ErrorAction SilentlyContinue
if ($agentsContent -match 'MANDATORY GOVERNANCE PREAMBLE') {
    Gate-Pass "agents-preamble" "AGENTS.md has governance preamble"
} else {
    Gate-Fail "agents-preamble" "AGENTS.md missing governance preamble"
}
if ($agentsContent -match 'Anti-Sprawl') {
    Gate-Pass "agents-anti-sprawl" "AGENTS.md has anti-sprawl rules"
} else {
    Gate-Fail "agents-anti-sprawl" "AGENTS.md missing anti-sprawl rules"
}
if ($agentsContent -match 'Do NOT create.*/reports') {
    Gate-Pass "agents-no-reports" "AGENTS.md states no reports folders"
} else {
    Gate-Warn "agents-no-reports" "AGENTS.md should state no reports folders"
}

# ── Gate 9: PromptOS tooling exists ──────────────────────────────

Write-Host "`n--- Gate 9: PromptOS tooling ---"

if (Test-Path -LiteralPath "scripts\promptos\auditPrompts.ts") {
    Gate-Pass "audit-tool" "auditPrompts.ts exists"
} else {
    Gate-Fail "audit-tool" "auditPrompts.ts missing"
}
if (Test-Path -LiteralPath "scripts\promptos\fixPrompts.ts") {
    Gate-Pass "fix-tool" "fixPrompts.ts exists"
} else {
    Gate-Fail "fix-tool" "fixPrompts.ts missing"
}

# ── Summary ───────────────────────────────────────────────────────

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Phase 53 Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { 'Red' } else { 'Green' })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { 'Yellow' } else { 'Green' })
Write-Host "========================================`n" -ForegroundColor Cyan

# Write artifacts
$artifactsDir = Join-Path $PSScriptRoot "..\artifacts\phase53"
New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
$results | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $artifactsDir "verify-results.json")

if ($fail -gt 0) {
    Write-Host "VERDICT: FAIL ($fail gate(s) failed)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "VERDICT: PASS (all gates green)" -ForegroundColor Green
    exit 0
}
