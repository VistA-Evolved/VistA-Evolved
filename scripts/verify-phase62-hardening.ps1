<#
  .SYNOPSIS
    Phase 62 Verifier -- Go-Live Hardening Pack v1
  .DESCRIPTION
    Validates backup/restore drills, tenant isolation, audit integrity,
    incident runbooks, perf gates, SBOM, and security baseline ADR.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$check) {
  $script:total++
  try {
    $result = & $check
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 62: Go-Live Hardening Pack v1 ===" -ForegroundColor Cyan
Write-Host ""

# ===================================================================
# G1: Prompt files
# ===================================================================
Gate "62-01-IMPLEMENT.md exists" {
  Test-Path -LiteralPath "prompts/67-PHASE-62-GO-LIVE-HARDENING/62-01-IMPLEMENT.md"
}
Gate "62-99-VERIFY.md exists" {
  Test-Path -LiteralPath "prompts/67-PHASE-62-GO-LIVE-HARDENING/62-99-VERIFY.md"
}

# ===================================================================
# G2: Inventory artifact
# ===================================================================
Gate "inventory.json exists" {
  Test-Path -LiteralPath "artifacts/phase62/inventory.json"
}
Gate "inventory.json has auditSystems" {
  $inv = Get-Content "artifacts/phase62/inventory.json" -Raw | ConvertFrom-Json
  $inv.auditSystems.Count -ge 3
}

# ===================================================================
# G3: Backup/restore drill scripts
# ===================================================================
Gate "backup-drill.ps1 exists" {
  Test-Path -LiteralPath "scripts/ops/backup-drill.ps1"
}
Gate "restore-drill.ps1 exists" {
  Test-Path -LiteralPath "scripts/ops/restore-drill.ps1"
}
Gate "backup-drill.ps1 creates app-config archive" {
  (Get-Content "scripts/ops/backup-drill.ps1" -Raw) -match "app-config"
}
Gate "backup-drill.ps1 creates audit-logs archive" {
  (Get-Content "scripts/ops/backup-drill.ps1" -Raw) -match "audit-logs"
}
Gate "backup-drill.ps1 creates vista-globals archive" {
  (Get-Content "scripts/ops/backup-drill.ps1" -Raw) -match "vista-globals"
}
Gate "backup-drill.ps1 produces manifest" {
  (Get-Content "scripts/ops/backup-drill.ps1" -Raw) -match "backup-manifest\.json"
}
Gate "restore-drill.ps1 validates config extractability" {
  (Get-Content "scripts/ops/restore-drill.ps1" -Raw) -match "config-extractable"
}
Gate "restore-drill.ps1 validates audit JSONL" {
  (Get-Content "scripts/ops/restore-drill.ps1" -Raw) -match "audit-jsonl-valid|audit-extractable"
}

# ===================================================================
# G4: Tenant isolation
# ===================================================================
Gate "tenant-context.ts exists" {
  Test-Path -LiteralPath "apps/api/src/middleware/tenant-context.ts"
}
Gate "tenant-context.ts resolves tenantId from session" {
  $tc = Get-Content "apps/api/src/middleware/tenant-context.ts" -Raw
  ($tc -match "session\.tenantId") -or ($tc -match "getSession")
}
Gate "tenant-context.ts validates tenant exists" {
  (Get-Content "apps/api/src/middleware/tenant-context.ts" -Raw) -match "getTenant"
}
Gate "tenant-cache.ts exists" {
  Test-Path -LiteralPath "apps/api/src/lib/tenant-cache.ts"
}
Gate "tenant-cache.ts prefixes keys with tenantId" {
  $tc = Get-Content "apps/api/src/lib/tenant-cache.ts" -Raw
  $tc -match "TENANT_PREFIX"
}
Gate "tenant-cache.ts has invalidateTenantCache" {
  (Get-Content "apps/api/src/lib/tenant-cache.ts" -Raw) -match "invalidateTenantCache"
}
Gate "tenant-cache.ts has verifyTenantIsolation" {
  (Get-Content "apps/api/src/lib/tenant-cache.ts" -Raw) -match "verifyTenantIsolation"
}

# ===================================================================
# G5: Audit chain integrity
# ===================================================================
Gate "verify-audit-chain.ts exists" {
  Test-Path -LiteralPath "scripts/security/verify-audit-chain.ts"
}
Gate "verify-audit-chain.ts checks iam/audit/verify" {
  (Get-Content "scripts/security/verify-audit-chain.ts" -Raw) -match "/iam/audit/verify"
}
Gate "verify-audit-chain.ts checks imaging/audit/verify" {
  (Get-Content "scripts/security/verify-audit-chain.ts" -Raw) -match "/imaging/audit/verify"
}
Gate "verify-audit-chain.ts checks rcm/audit/verify" {
  (Get-Content "scripts/security/verify-audit-chain.ts" -Raw) -match "/rcm/audit/verify"
}
Gate "verify-audit-chain.ts supports file mode" {
  (Get-Content "scripts/security/verify-audit-chain.ts" -Raw) -match "--file"
}
Gate "audit-integrity.md runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/audit-integrity.md"
}
Gate "audit-integrity.md covers hash chain architecture" {
  (Get-Content "docs/runbooks/audit-integrity.md" -Raw) -match "SHA-256"
}

# ===================================================================
# G6: Incident runbooks
# ===================================================================
Gate "incident-response.md exists" {
  Test-Path -LiteralPath "docs/runbooks/incident-response.md"
}
Gate "incident-response.md has severity table" {
  (Get-Content "docs/runbooks/incident-response.md" -Raw) -match "SEV-1|Severity"
}
Gate "incident-response.md covers VistA connection failure" {
  (Get-Content "docs/runbooks/incident-response.md" -Raw) -match "Circuit Breaker|VistA.*RPC"
}
Gate "incident-response.md covers audit chain failure (Phase 62)" {
  (Get-Content "docs/runbooks/incident-response.md" -Raw) -match "Audit Chain Integrity Failure"
}
Gate "security-triage.md exists" {
  Test-Path -LiteralPath "docs/runbooks/security-triage.md"
}
Gate "security-triage.md covers suspicious login" {
  (Get-Content "docs/runbooks/security-triage.md" -Raw) -match "Suspicious Login|auth\.failed"
}
Gate "security-triage.md covers cross-tenant" {
  (Get-Content "docs/runbooks/security-triage.md" -Raw) -match "Cross-Tenant|tenant.*leak"
}
Gate "backup-restore-phase16.md has Phase 62 drill section" {
  (Get-Content "docs/runbooks/backup-restore-phase16.md" -Raw) -match "Automated Drill.*Phase 62|Phase 62"
}

# ===================================================================
# G7: Performance / load gates
# ===================================================================
Gate "hardening-smoke.js exists" {
  Test-Path -LiteralPath "tests/k6/hardening-smoke.js"
}
Gate "hardening-smoke.js tests health probes" {
  (Get-Content "tests/k6/hardening-smoke.js" -Raw) -match "health-probes"
}
Gate "hardening-smoke.js tests audit verify endpoints" {
  (Get-Content "tests/k6/hardening-smoke.js" -Raw) -match "audit-verify"
}
Gate "hardening-smoke.js has p95 thresholds" {
  (Get-Content "tests/k6/hardening-smoke.js" -Raw) -match "p\(95\)"
}
Gate "hardening-smoke.js supports smoke/load/stress tiers" {
  $k6 = Get-Content "tests/k6/hardening-smoke.js" -Raw
  ($k6 -match "smoke") -and ($k6 -match "load") -and ($k6 -match "stress")
}
Gate "performance-budgets.json exists with loadTestThresholds" {
  $budgets = Get-Content "config/performance-budgets.json" -Raw | ConvertFrom-Json
  $null -ne $budgets.loadTestThresholds
}

# ===================================================================
# G8: SBOM generation
# ===================================================================
Gate "generate-sbom.ps1 exists" {
  Test-Path -LiteralPath "scripts/ops/generate-sbom.ps1"
}
Gate "generate-sbom.ps1 uses CycloneDX 1.5" {
  (Get-Content "scripts/ops/generate-sbom.ps1" -Raw) -match "CycloneDX.*1\.5|spec-version 1\.5"
}
Gate "generate-sbom.ps1 has fallback SBOM" {
  (Get-Content "scripts/ops/generate-sbom.ps1" -Raw) -match "fallback|Fallback"
}
Gate "generate-sbom.ps1 generates license report" {
  (Get-Content "scripts/ops/generate-sbom.ps1" -Raw) -match "license-report"
}

# ===================================================================
# G9: Security baseline ADR
# ===================================================================
Gate "ADR-security-baseline-v1.md exists" {
  Test-Path -LiteralPath "docs/decisions/ADR-security-baseline-v1.md"
}
Gate "ADR maps HIPAA 164.312 references" {
  (Get-Content "docs/decisions/ADR-security-baseline-v1.md" -Raw) -match "164\.312"
}
Gate "ADR covers audit controls (AU)" {
  (Get-Content "docs/decisions/ADR-security-baseline-v1.md" -Raw) -match "AU-1|AU-2|Audit Controls"
}
Gate "ADR covers authentication (AC)" {
  (Get-Content "docs/decisions/ADR-security-baseline-v1.md" -Raw) -match "AC-1|AC-2|Authentication.*Access Control"
}
Gate "ADR covers multi-tenancy (MT)" {
  (Get-Content "docs/decisions/ADR-security-baseline-v1.md" -Raw) -match "MT-1|MT-2|Multi-Tenancy"
}
Gate "ADR has known gaps section" {
  (Get-Content "docs/decisions/ADR-security-baseline-v1.md" -Raw) -match "Known Gaps"
}

# ===================================================================
# G10: Governance - no policy violations
# ===================================================================
Gate "No reports/ folder at root" {
  -not (Test-Path -LiteralPath "reports")
}
Gate "No docs/reports/ folder" {
  -not (Test-Path -LiteralPath "docs/reports") -or ((Get-ChildItem "docs/reports" -Recurse -File -ErrorAction SilentlyContinue).Count -eq 0)
}

# ===================================================================
# G11: Existing hardening infrastructure still works
# ===================================================================
Gate "immutable-audit.ts has verifyAuditChain export" {
  (Get-Content "apps/api/src/lib/immutable-audit.ts" -Raw) -match "export function verifyAuditChain"
}
Gate "immutable-audit.ts has verifyFileAuditChain export" {
  (Get-Content "apps/api/src/lib/immutable-audit.ts" -Raw) -match "export function verifyFileAuditChain"
}
Gate "imaging-audit.ts exists" {
  Test-Path -LiteralPath "apps/api/src/services/imaging-audit.ts"
}
Gate "rcm-audit.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/audit/rcm-audit.ts"
}
Gate "security.ts has rate limiting" {
  (Get-Content "apps/api/src/middleware/security.ts" -Raw) -match "rateLimitBucket|rate.limit"
}
Gate "session-store.ts has tenantId field" {
  (Get-Content "apps/api/src/auth/session-store.ts" -Raw) -match "tenantId.*string"
}

# ===================================================================
# Summary
# ===================================================================
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  Total: $total  |  Pass: $pass  |  Fail: $fail"
if ($fail -eq 0) {
  Write-Host "  ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "  $fail GATE(S) FAILED" -ForegroundColor Red
}
exit $fail
