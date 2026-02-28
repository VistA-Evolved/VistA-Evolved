# Release Orchestration Runbook

> Covers the full release lifecycle from code merge to production deployment.

## Prerequisites

- [ ] Kind cluster running (`infra/scripts/kind-up.ps1`)
- [ ] ArgoCD installed (`infra/scripts/argocd-install.ps1`)
- [ ] Helm v3 available
- [ ] `kubectl` configured for target cluster
- [ ] Git on `main` branch, clean working tree

## Release Flow

```
main merge -> CI PR gates -> CD build -> GHCR push -> canary deploy
  -> 15m metric gate -> stable promote (batched) -> LKG update
```

## Step 1: Verify CI Gates Pass

```powershell
# Locally:
pnpm build
pnpm test
.\infra\scripts\security-scan-local.ps1
```

CI workflow `ci-pr-gates.yml` runs automatically on PR:
- TypeScript build + Vitest
- QA gauntlet (FAST suite)
- Secret scan (gitleaks)
- SBOM (syft)
- Helm lint (both charts)

## Step 2: Merge to Main

CI on main triggers `cd-deploy.yml`:
1. Builds 3 Docker images (api, web, portal)
2. Pushes to GHCR with `sha-<short>` + `latest` tags
3. Trivy vulnerability scan (CRITICAL/HIGH threshold)
4. SBOM per image
5. Auto-promotes staging (commits updated image tags)

## Step 3: Staging Validation

```powershell
# Check staging canary metrics (after ~15m)
.\infra\scripts\canary-check.ps1 -Environment staging -Simulate
```

ArgoCD auto-syncs staging. Verify via:
```powershell
.\infra\scripts\argocd-portforward.ps1
# Open http://localhost:8080 -> check staging Application health
```

## Step 4: Tag for Production

```powershell
git tag v1.2.3
git push origin v1.2.3
```

CD workflow creates a promotion PR for production.

## Step 5: Production Rollout

After PR approval and merge:

```powershell
# Option A: Fleet orchestrator (recommended)
.\infra\scripts\rollout-fleet.ps1 -Tag v1.2.3 -Environment prod -BatchSize 1

# Option B: Manual step-by-step
.\infra\scripts\bump-images.ps1 -Tag v1.2.3 -Environment prod -Commit
# Wait for ArgoCD sync, then check canary
.\infra\scripts\canary-check.ps1 -Environment prod -PrometheusUrl http://prometheus:9090
# Promote stable tenants
.\infra\scripts\promote-release.ps1 -Tag v1.2.3 -Environment prod
```

## Step 6: Post-Deploy Verification

```powershell
# Verify pods healthy
kubectl get pods -n ve-tenant-demo --watch

# Check ArgoCD sync status
kubectl get applications -n argocd

# Generate compliance evidence
.\infra\scripts\generate-evidence-pack.ps1 -Tag v1.2.3
```

## Rollback Procedure

```powershell
# Automatic (uses last-known-good.json)
.\infra\scripts\rollback-release.ps1 -Environment prod

# Manual (specific tag)
.\infra\scripts\rollback-release.ps1 -Environment prod -ToTag v1.2.2

# Incident artifacts
.\infra\scripts\release-failure-pack.ps1 -Environment prod
```

## Emergency: Skip Canary

Only in emergencies (hotfix with management approval):

```powershell
.\infra\scripts\rollout-fleet.ps1 -Tag v1.2.3-hotfix -Environment prod -SkipCanary
```

Document the skip in the incident report.
