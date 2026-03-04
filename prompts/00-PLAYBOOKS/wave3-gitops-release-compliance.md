# Phase 197-210 — Wave 3: GitOps, Release, Compliance

## User Request

Build the Wave 3 "production operating system" covering 14 queue items:

- Q197: GitOps ArgoCD foundation (app-of-apps + ApplicationSet)
- Q198: Environment model (dev/staging/prod values contract)
- Q199: CI baseline PR gates (tests, secret scan, SBOM, helm lint)
- Q200: CD pipeline (build images, Trivy, GHCR, GitOps promotion)
- Q201: Canary tenant + 15-min metric gate + promote
- Q202: Auto rollback + incident artifact collection
- Q203: Policy as code (Kyverno ClusterPolicies)
- Q204: SBOM attestation + optional cosign signing
- Q205: SLOs + burn-rate alerts as code
- Q206: E2E Playwright smoke + CI integration
- Q207: Fleet rollout orchestrator CLI
- Q208: Compliance evidence automation (SHA-256 manifest)
- Q209: Cross-region DR posture check
- Q210: Go-live runbooks (release, tenant, backup, incident)

## Implementation Steps

### Q197 — GitOps ArgoCD

- Created `infra/gitops/argocd/bootstrap/values.yaml` (kind-friendly ArgoCD config)
- Created `infra/gitops/argocd/projects/ve-system.yaml` (shared layer AppProject)
- Created `infra/gitops/argocd/projects/ve-tenants.yaml` (tenant AppProject, no ClusterRoles)
- Created `infra/gitops/argocd/apps/ve-shared.yaml` (shared Application, auto-sync)
- Created `infra/gitops/argocd/apps/ve-tenant-template.yaml` (per-tenant template)
- Created `infra/gitops/argocd/apps/tenant-set.yaml` (ApplicationSet, git file generator)
- Created `infra/scripts/argocd-install.ps1` (Helm install + project setup)
- Created `infra/scripts/argocd-portforward.ps1`

### Q198 — Environment Model

- Created `infra/environments/{dev,staging,prod}/shared.values.yaml`
- Created `infra/environments/{dev,staging,prod}/tenant.defaults.values.yaml`
- Created `infra/environments/dev/tenants/demo.values.yaml` + `demo-canary.values.yaml`
- Created `infra/environments/staging/tenants/demo.values.yaml`
- Created `infra/scripts/validate-values.ps1` (77 checks: required keys, secrets, prod guards)

### Q199 — CI PR Gates

- Created `.github/workflows/ci-pr-gates.yml` (5 parallel jobs)
- Created `infra/scripts/security-scan-local.ps1`

### Q200 — CD Pipeline

- Created `.github/workflows/cd-deploy.yml` (build + Trivy + SBOM + promote)
- Created `infra/scripts/bump-images.ps1`

### Q201 — Canary + Metric Gate

- Created `infra/scripts/canary-check.ps1` (4 metric gates, Prometheus/simulation)
- Created `infra/scripts/promote-release.ps1`

### Q202 — Rollback + Incidents

- Created `infra/scripts/rollback-release.ps1`
- Created `infra/scripts/release-failure-pack.ps1`
- Created `infra/environments/{dev,staging,prod}/releases/last-known-good.json`

### Q203 — Policy as Code

- Created `infra/policy/kyverno/cluster-policies.yaml` (6 policies)
- Created `infra/policy/tests/bad-pod.yaml`
- Created `infra/helm/ve-shared/templates/policy.yaml`
- Added `policy.enabled: false` default to `infra/helm/ve-shared/values.yaml`

### Q204 — SBOM Attest + Signing

- Created `.github/workflows/supply-chain-attest.yml` (syft + cosign keyless)

### Q205 — SLOs + Alerts

- Created `infra/observability/slo/slo-spec.yaml` (4 SLOs: availability, latency, RPC, backup)
- Created `infra/observability/slo/alerts.rules.yaml` (multi-window burn-rate + infra alerts)

### Q206 — E2E Playwright + CI

- Created `.github/workflows/ci-e2e-smoke.yml` (web + portal smoke jobs)

### Q207 — Fleet Rollout CLI

- Created `infra/scripts/rollout-fleet.ps1` (canary-first, batch, rollback, evidence)

### Q208 — Compliance Evidence

- Created `infra/scripts/generate-evidence-pack.ps1` (9-section evidence pack + SHA-256 manifest)

### Q209 — Cross-Region DR

- Created `infra/scripts/dr-posture-check.ps1` (10 gates, RPO/RTO validation)

### Q210 — Go-Live Runbooks

- Created `infra/runbooks/release.md`
- Created `infra/runbooks/tenant-lifecycle.md`
- Created `infra/runbooks/backup-restore.md`
- Created `infra/runbooks/incident-response.md`

## Verification

- `scripts/verify-wave3-gitops-release.ps1`: 64/64 gates PASS
- `infra/scripts/validate-values.ps1`: 77/77 checks PASS
- Helm lint: both charts pass (0 failures)
- Helm template: both charts render with dev overlay values

## Files Touched

See implementation steps above for complete file list (~50 files created/modified).
