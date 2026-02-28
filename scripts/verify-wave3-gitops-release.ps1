<#
.SYNOPSIS
  Verify all Wave 3 (Q197-Q210) deliverables.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path
$pass = 0
$fail = 0

function Gate($name, $cond, $detail) {
    $s = if ($cond) { "PASS" } else { "FAIL" }
    $c = if ($cond) { "Green" } else { "Red" }
    Write-Host "  [$s] $name -- $detail" -ForegroundColor $c
    if ($cond) { $script:pass++ } else { $script:fail++ }
}

Write-Host "=== Wave 3 Verification (Q197-Q210) ===" -ForegroundColor Cyan

# ---- Q197: GitOps ArgoCD ----
Write-Host "`n--- Q197: GitOps ArgoCD ---"
Gate "ArgoCD bootstrap values" (Test-Path "$repoRoot/infra/gitops/argocd/bootstrap/values.yaml") "bootstrap/values.yaml"
Gate "AppProject ve-system" (Test-Path "$repoRoot/infra/gitops/argocd/projects/ve-system.yaml") "projects/ve-system.yaml"
Gate "AppProject ve-tenants" (Test-Path "$repoRoot/infra/gitops/argocd/projects/ve-tenants.yaml") "projects/ve-tenants.yaml"
Gate "Application ve-shared" (Test-Path "$repoRoot/infra/gitops/argocd/apps/ve-shared.yaml") "apps/ve-shared.yaml"
Gate "ApplicationSet tenant" (Test-Path "$repoRoot/infra/gitops/argocd/apps/tenant-set.yaml") "apps/tenant-set.yaml"
Gate "ArgoCD install script" (Test-Path "$repoRoot/infra/scripts/argocd-install.ps1") "argocd-install.ps1"

# ---- Q198: Environment Model ----
Write-Host "`n--- Q198: Environment Model ---"
foreach ($e in @("dev","staging","prod")) {
    Gate "$e shared values" (Test-Path "$repoRoot/infra/environments/$e/shared.values.yaml") "$e/shared.values.yaml"
    Gate "$e tenant defaults" (Test-Path "$repoRoot/infra/environments/$e/tenant.defaults.values.yaml") "$e/tenant.defaults.values.yaml"
}
Gate "Dev demo tenant" (Test-Path "$repoRoot/infra/environments/dev/tenants/demo.values.yaml") "dev/tenants/demo.values.yaml"
Gate "Dev canary tenant" (Test-Path "$repoRoot/infra/environments/dev/tenants/demo-canary.values.yaml") "dev/tenants/demo-canary.values.yaml"
Gate "Validate-values script" (Test-Path "$repoRoot/infra/scripts/validate-values.ps1") "validate-values.ps1"

# ---- Q199: CI PR Gates ----
Write-Host "`n--- Q199: CI PR Gates ---"
Gate "ci-pr-gates.yml" (Test-Path "$repoRoot/.github/workflows/ci-pr-gates.yml") "ci-pr-gates.yml"
Gate "security-scan-local.ps1" (Test-Path "$repoRoot/infra/scripts/security-scan-local.ps1") "security-scan-local.ps1"
$ciPr = Get-Content "$repoRoot/.github/workflows/ci-pr-gates.yml" -Raw
Gate "CI has gitleaks job" ($ciPr -match "gitleaks") "secret-scan job"
Gate "CI has helm-lint job" ($ciPr -match "helm-lint|helm lint") "helm-lint job"
Gate "CI has sbom job" ($ciPr -match "sbom|syft") "sbom job"

# ---- Q200: CD Pipeline ----
Write-Host "`n--- Q200: CD Pipeline ---"
Gate "cd-deploy.yml" (Test-Path "$repoRoot/.github/workflows/cd-deploy.yml") "cd-deploy.yml"
Gate "bump-images.ps1" (Test-Path "$repoRoot/infra/scripts/bump-images.ps1") "bump-images.ps1"
$cd = Get-Content "$repoRoot/.github/workflows/cd-deploy.yml" -Raw
Gate "CD has Trivy scan" ($cd -match "trivy|aquasecurity") "trivy-scan job"
Gate "CD has GHCR push" ($cd -match "ghcr\.io") "GHCR registry"

# ---- Q201: Canary + Metric Gate ----
Write-Host "`n--- Q201: Canary + Metric Gate ---"
Gate "canary-check.ps1" (Test-Path "$repoRoot/infra/scripts/canary-check.ps1") "canary-check.ps1"
Gate "promote-release.ps1" (Test-Path "$repoRoot/infra/scripts/promote-release.ps1") "promote-release.ps1"

# ---- Q202: Rollback + Incidents ----
Write-Host "`n--- Q202: Rollback + Incidents ---"
Gate "rollback-release.ps1" (Test-Path "$repoRoot/infra/scripts/rollback-release.ps1") "rollback-release.ps1"
Gate "release-failure-pack.ps1" (Test-Path "$repoRoot/infra/scripts/release-failure-pack.ps1") "release-failure-pack.ps1"
foreach ($e in @("dev","staging","prod")) {
    Gate "$e last-known-good" (Test-Path "$repoRoot/infra/environments/$e/releases/last-known-good.json") "$e/releases/last-known-good.json"
}

# ---- Q203: Policy as Code ----
Write-Host "`n--- Q203: Policy as Code ---"
Gate "Kyverno policies" (Test-Path "$repoRoot/infra/policy/kyverno/cluster-policies.yaml") "cluster-policies.yaml"
Gate "Policy test bad-pod" (Test-Path "$repoRoot/infra/policy/tests/bad-pod.yaml") "bad-pod.yaml"
Gate "Helm policy template" (Test-Path "$repoRoot/infra/helm/ve-shared/templates/policy.yaml") "policy.yaml"
$sv = Get-Content "$repoRoot/infra/helm/ve-shared/values.yaml" -Raw
Gate "policy.enabled default" ($sv -match "policy:" -and $sv -match "enabled:\s*false") "values.yaml has policy.enabled: false"

# ---- Q204: SBOM Attest ----
Write-Host "`n--- Q204: SBOM Attest + Signing ---"
Gate "supply-chain-attest.yml" (Test-Path "$repoRoot/.github/workflows/supply-chain-attest.yml") "supply-chain-attest.yml"
$sca = Get-Content "$repoRoot/.github/workflows/supply-chain-attest.yml" -Raw
Gate "SBOM cosign support" ($sca -match "cosign") "cosign signing scaffolded"
Gate "SBOM syft generation" ($sca -match "syft") "syft SBOM generation"

# ---- Q205: SLOs + Alerts ----
Write-Host "`n--- Q205: SLOs + Alerts ---"
Gate "SLO spec" (Test-Path "$repoRoot/infra/observability/slo/slo-spec.yaml") "slo-spec.yaml"
Gate "Alert rules" (Test-Path "$repoRoot/infra/observability/slo/alerts.rules.yaml") "alerts.rules.yaml"
$slo = Get-Content "$repoRoot/infra/observability/slo/slo-spec.yaml" -Raw
Gate "SLO has availability" ($slo -match "api-availability") "99.5% availability SLO"
Gate "SLO has latency" ($slo -match "api-latency") "p95 latency SLO"
Gate "SLO has RPC broker" ($slo -match "rpc-broker") "RPC broker SLO"
Gate "SLO has backup" ($slo -match "backup-success") "backup SLO"

# ---- Q206: E2E Playwright ----
Write-Host "`n--- Q206: E2E Playwright + CI ---"
Gate "ci-e2e-smoke.yml" (Test-Path "$repoRoot/.github/workflows/ci-e2e-smoke.yml") "ci-e2e-smoke.yml"
$e2e = Get-Content "$repoRoot/.github/workflows/ci-e2e-smoke.yml" -Raw
Gate "E2E has web job" ($e2e -match "e2e-web|Playwright Web") "web smoke job"
Gate "E2E has portal job" ($e2e -match "e2e-portal|Portal Smoke") "portal smoke job"

# ---- Q207: Fleet Rollout ----
Write-Host "`n--- Q207: Fleet Rollout CLI ---"
Gate "rollout-fleet.ps1" (Test-Path "$repoRoot/infra/scripts/rollout-fleet.ps1") "rollout-fleet.ps1"
$fleet = Get-Content "$repoRoot/infra/scripts/rollout-fleet.ps1" -Raw
Gate "Fleet has canary phase" ($fleet -match "Canary deployment|canary") "canary phase"
Gate "Fleet has batch promote" ($fleet -match "BatchSize|batch") "batch promotion"
Gate "Fleet has rollback" ($fleet -match "rollback") "rollback integration"

# ---- Q208: Compliance Evidence ----
Write-Host "`n--- Q208: Compliance Evidence ---"
Gate "generate-evidence-pack.ps1" (Test-Path "$repoRoot/infra/scripts/generate-evidence-pack.ps1") "generate-evidence-pack.ps1"
$evid = Get-Content "$repoRoot/infra/scripts/generate-evidence-pack.ps1" -Raw
Gate "Evidence has SHA-256 manifest" ($evid -match "SHA256|manifest\.sha256") "tamper-evident manifest"
Gate "Evidence has Helm manifests" ($evid -match "helm template") "rendered manifests"
Gate "Evidence has security scans" ($evid -match "gitleaks|pnpm audit|trivy") "security scan artifacts"

# ---- Q209: Cross-Region DR ----
Write-Host "`n--- Q209: Cross-Region DR ---"
Gate "dr-posture-check.ps1" (Test-Path "$repoRoot/infra/scripts/dr-posture-check.ps1") "dr-posture-check.ps1"
$dr = Get-Content "$repoRoot/infra/scripts/dr-posture-check.ps1" -Raw
Gate "DR has endpoint checks" ($dr -match "PrimaryEndpoint|SecondaryEndpoint") "endpoint reachability"
Gate "DR has RPO/RTO targets" ($dr -match "MaxRpoHours|MaxRtoMinutes") "RPO/RTO validation"

# ---- Q210: Go-Live Runbooks ----
Write-Host "`n--- Q210: Go-Live Runbooks ---"
Gate "Release runbook" (Test-Path "$repoRoot/infra/runbooks/release.md") "release.md"
Gate "Tenant lifecycle runbook" (Test-Path "$repoRoot/infra/runbooks/tenant-lifecycle.md") "tenant-lifecycle.md"
Gate "Backup-restore runbook" (Test-Path "$repoRoot/infra/runbooks/backup-restore.md") "backup-restore.md"
Gate "Incident response runbook" (Test-Path "$repoRoot/infra/runbooks/incident-response.md") "incident-response.md"

# ---- Helm lint ----
Write-Host "`n--- Helm Lint ---"
$helmPath = "$env:LOCALAPPDATA\helm"
if (Test-Path $helmPath) { $env:PATH = "$helmPath;$env:PATH" }
try {
    $lintOut = helm lint "$repoRoot/infra/helm/ve-shared" 2>&1 | Out-String
    $lintOk = $lintOut -match "0 chart\(s\) failed"
    Gate "ve-shared lint clean" $lintOk "no failures"
} catch { Gate "ve-shared lint clean" $false "helm not found" }

try {
    $lintOut = helm lint "$repoRoot/infra/helm/ve-tenant" 2>&1 | Out-String
    $lintOk = $lintOut -match "0 chart\(s\) failed"
    Gate "ve-tenant lint clean" $lintOk "no failures"
} catch { Gate "ve-tenant lint clean" $false "helm not found" }

# ---- Summary ----
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  TOTAL: $($pass + $fail)"

if ($fail -eq 0) {
    Write-Host "`nWave 3 verification: ALL GATES PASSED" -ForegroundColor Green
} else {
    Write-Host "`nWave 3 verification: $fail GATE(S) FAILED" -ForegroundColor Red
    exit 1
}
