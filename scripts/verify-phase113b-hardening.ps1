<#
.SYNOPSIS
  Phase 113B -- Hardening Verifier

.DESCRIPTION
  Validates all 6 deliverables of Phase 113B:
    A. RCM audit JSONL file sink
    B. Evidence gate CI wiring
    C. Evidence staleness check
    D. Prompts tree repair
    E. Prompts-tree health gate
    F. verify-latest.ps1 delegation

  Exit 0 = all gates pass, Exit 1 = at least one failure
#>

param(
  [switch]$SkipDocker,
  [switch]$Verbose
)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $warn = 0
$Root = Split-Path -Parent $PSScriptRoot

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    $script:pass++
    Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green
  } else {
    $script:fail++
    Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red
  }
}

function WarnGate([string]$Name, [string]$Detail) {
  $script:warn++
  Write-Host "  WARN  $Name -- $Detail" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 113B -- Hardening Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ---- A. RCM Audit JSONL File Sink ----
Write-Host "== A. RCM Audit JSONL File Sink ==" -ForegroundColor White

$rcmAudit = Join-Path $Root "apps\api\src\rcm\audit\rcm-audit.ts"
$rcmContent = Get-Content $rcmAudit -Raw -ErrorAction SilentlyContinue

Gate "rcm-audit-file-exists" (Test-Path -LiteralPath $rcmAudit) "rcm-audit.ts exists"
Gate "rcm-audit-appendFileSync" ($rcmContent -match 'appendFileSync') "Uses appendFileSync for JSONL writes"
Gate "rcm-audit-ensureDir" ($rcmContent -match 'ensureAuditDir') "Has ensureAuditDir function"
Gate "rcm-audit-recoverHash" ($rcmContent -match 'recoverLastHash') "Recovers hash chain on startup"
Gate "rcm-audit-env-var" ($rcmContent -match 'RCM_AUDIT_FILE') "Supports RCM_AUDIT_FILE env var"
Gate "rcm-audit-appendToFile" ($rcmContent -match 'appendToFile\(entry\)') "Calls appendToFile in appendRcmAudit"

# ---- B. Evidence Gate CI Wiring ----
Write-Host "`n== B. Evidence Gate CI Wiring ==" -ForegroundColor White

$ciVerify = Join-Path $Root ".github\workflows\ci-verify.yml"
$qaGauntlet = Join-Path $Root ".github\workflows\qa-gauntlet.yml"
$qualityGates = Join-Path $Root ".github\workflows\quality-gates.yml"

$ciContent = Get-Content $ciVerify -Raw -ErrorAction SilentlyContinue
$qaContent = Get-Content $qaGauntlet -Raw -ErrorAction SilentlyContinue
$qgContent = Get-Content $qualityGates -Raw -ErrorAction SilentlyContinue

Gate "ci-verify-evidence" ($ciContent -match 'evidence-gate\.mjs') "ci-verify.yml runs evidence gate"
Gate "qa-gauntlet-evidence-standard" ($qaContent -match 'evidence-gate\.mjs(?!.*--strict)') "qa-gauntlet.yml runs evidence gate (standard)"
Gate "qa-gauntlet-evidence-strict" ($qaContent -match 'evidence-gate\.mjs\s+--strict') "qa-gauntlet.yml runs evidence gate (strict nightly)"
Gate "quality-gates-evidence" ($qgContent -match 'evidence-gate\.mjs') "quality-gates.yml runs evidence gate"

# ---- C. Evidence Staleness Check ----
Write-Host "`n== C. Evidence Staleness Check ==" -ForegroundColor White

$evidenceGate = Join-Path $Root "scripts\qa-gates\evidence-gate.mjs"
$egContent = Get-Content $evidenceGate -Raw -ErrorAction SilentlyContinue

Gate "evidence-gate-exists" (Test-Path -LiteralPath $evidenceGate) "evidence-gate.mjs exists"
Gate "evidence-staleness-fn" ($egContent -match 'checkStaleness') "Has checkStaleness function"
Gate "evidence-staleness-threshold" ($egContent -match 'STALENESS_THRESHOLD_DAYS') "Has staleness threshold constant"
Gate "evidence-staleness-strict" ($egContent -match 'strict.*fail.*staleness|staleness.*strict.*fail') "Strict mode fails on staleness"

# ---- D. Prompts Tree Repair ----
Write-Host "`n== D. Prompts Tree Repair ==" -ForegroundColor White

$p111Dir = Join-Path $Root "prompts\115-PHASE-111-CLAIM-LIFECYCLE-SCRUBBER"
$p112Dir = Join-Path $Root "prompts\116-PHASE-112-EVIDENCE-GATING"
$p110Dir = Join-Path $Root "prompts\114-PHASE-110-RCM-CREDENTIAL-VAULT-LOA"

Gate "p111-folder" (Test-Path -LiteralPath $p111Dir) "Phase 111 folder exists"
Gate "p111-implement" (Test-Path -LiteralPath (Join-Path $p111Dir "111-01-IMPLEMENT.md")) "Phase 111 IMPLEMENT in folder"
Gate "p111-verify" (Test-Path -LiteralPath (Join-Path $p111Dir "111-99-VERIFY.md")) "Phase 111 VERIFY in folder"
Gate "p112-folder" (Test-Path -LiteralPath $p112Dir) "Phase 112 folder exists"
Gate "p112-implement" (Test-Path -LiteralPath (Join-Path $p112Dir "112-01-IMPLEMENT.md")) "Phase 112 IMPLEMENT in folder"
Gate "p112-verify" (Test-Path -LiteralPath (Join-Path $p112Dir "112-99-VERIFY.md")) "Phase 112 VERIFY in folder"
Gate "p110-verify-canonical" (Test-Path -LiteralPath (Join-Path $p110Dir "110-99-VERIFY.md")) "Phase 110 canonical VERIFY in folder"

# Flat files should be gone
$flat110 = Join-Path $Root "prompts\110-99-VERIFY.md"
$flat111 = Join-Path $Root "prompts\111-01-IMPLEMENT.md"
$flat112 = Join-Path $Root "prompts\112-01-IMPLEMENT.md"

Gate "no-flat-110" (-not (Test-Path -LiteralPath $flat110)) "No flat 110-99-VERIFY.md at root"
Gate "no-flat-111" (-not (Test-Path -LiteralPath $flat111)) "No flat 111-01-IMPLEMENT.md at root"
Gate "no-flat-112" (-not (Test-Path -LiteralPath $flat112)) "No flat 112-01-IMPLEMENT.md at root"

# ---- E. Prompts Tree Health Gate ----
Write-Host "`n== E. Prompts Tree Health Gate ==" -ForegroundColor White

$healthGate = Join-Path $Root "scripts\qa-gates\prompts-tree-health.mjs"
Gate "health-gate-exists" (Test-Path -LiteralPath $healthGate) "prompts-tree-health.mjs exists"

$hgContent = Get-Content $healthGate -Raw -ErrorAction SilentlyContinue
Gate "health-gate-duplicate-check" ($hgContent -match 'no-duplicate-flat|duplicate.*flat') "Checks for duplicate flat files"
Gate "health-gate-pair-check" ($hgContent -match 'impl-verify-pair') "Checks IMPLEMENT/VERIFY pairs"
Gate "health-gate-mismatch-check" ($hgContent -match 'phase-mismatch') "Checks phase number mismatches"

# CI wiring
Gate "ci-prompts-health" ($ciContent -match 'prompts-tree-health') "ci-verify.yml runs prompts tree health"
Gate "qa-prompts-health" ($qaContent -match 'prompts-tree-health') "qa-gauntlet.yml runs prompts tree health"
Gate "qg-prompts-health" ($qgContent -match 'prompts-tree-health') "quality-gates.yml runs prompts tree health"

# ---- F. verify-latest.ps1 Delegation ----
Write-Host "`n== F. verify-latest.ps1 Delegation ==" -ForegroundColor White

$verifyLatest = Join-Path $Root "scripts\verify-latest.ps1"
$vlContent = Get-Content $verifyLatest -Raw -ErrorAction SilentlyContinue

Gate "verify-latest-delegates" ($vlContent -match 'verify-phase113b') "verify-latest.ps1 delegates to Phase 113B"

# ---- G. Phase 113B Prompt File ----
Write-Host "`n== G. Phase 113B Prompt File ==" -ForegroundColor White

$promptDir = Join-Path $Root "prompts\117-PHASE-113B-HARDENING"
Gate "p113b-folder" (Test-Path -LiteralPath $promptDir) "Phase 113B prompt folder exists"

if (Test-Path -LiteralPath $promptDir) {
  $files = Get-ChildItem $promptDir -Filter "*.md" | ForEach-Object { $_.Name }
  $hasImpl = ($files | Where-Object { $_ -match '113B?-01-IMPLEMENT' }).Count -gt 0
  Gate "p113b-implement" $hasImpl "Phase 113B IMPLEMENT file exists"
} else {
  Gate "p113b-implement" $false "Phase 113B IMPLEMENT file exists (folder missing)"
}

# ---- Summary ----
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  WARN: $warn" -ForegroundColor Yellow
Write-Host "  FAIL: $fail" -ForegroundColor Red

$exitCode = if ($fail -gt 0) { 1 } else { 0 }
Write-Host "`nExit code: $exitCode"
exit $exitCode
