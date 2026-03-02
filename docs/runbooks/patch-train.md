# Patch Train Runbook

> Phase 450 (W29-P4) — VistA patch train operations guide.

## Overview

The VistA patch train promotes builds through three stages:

```
candidate  ──(gates)──>  staging  ──(gates)──>  production
```

Each promotion requires passing automated gates. Emergency hot-patches
can bypass gates with `--SkipGates` (requires documented justification).

## Monthly Cadence

| Week | Activity |
|------|----------|
| Week 1 | Upstream sync (`worldvista-sync.ps1`), create candidate |
| Week 2 | Run candidate gates, promote to staging |
| Week 3 | Staging soak (compat matrix, SBOM, license review) |
| Week 4 | Run staging gates, promote to production, sign-off |

## Commands

### Create a candidate

```powershell
# 1. Sync upstream
pwsh scripts/upstream/worldvista-sync.ps1

# 2. Snapshot licenses
node scripts/upstream/snapshot-licenses.mjs

# 3. Emit release manifest
node scripts/upstream/emit-release-manifest.mjs
```

### Promote candidate to staging

```powershell
pwsh scripts/patch-train/promote.ps1 -From candidate -To staging
```

### Promote staging to production

```powershell
pwsh scripts/patch-train/promote.ps1 -From staging -To production
```

### Dry-run (preview without promoting)

```powershell
pwsh scripts/patch-train/promote.ps1 -From candidate -To staging -DryRun
```

## Candidate Gates

| # | Gate | What it checks |
|---|------|---------------|
| 1 | docker-build | Dockerfile exists (CI does actual build) |
| 2 | vista-health | TCP probe to VistA (soft gate) |
| 3 | custom-routines | .m files exist in services/vista/ |
| 4 | rpc-registry | >100 RPCs in rpcRegistry.ts |
| 5 | release-manifest | artifacts/vista-release-manifest.json exists |

## Staging Gates

| # | Gate | What it checks |
|---|------|---------------|
| 1 | candidate-promoted | Candidate->staging promotion record exists |
| 2 | lock-pinned | All LOCK.json SHAs are real commits |
| 3 | license-snapshot | License inventory exists |
| 4 | compat-matrix | Phase 451 evidence (soft until implemented) |
| 5 | sbom | Phase 454 evidence (soft until implemented) |

## Artifacts

All promotion artifacts are written to `artifacts/patch-train/<train-id>/`.
This directory is gitignored (under `/artifacts/`).

## Rollback

If a production promotion fails:

1. Redeploy previous Docker image tag
2. Re-run `install-vista-routines.ps1` from the previous commit
3. Verify with `verify-latest.ps1`
4. Document the rollback in the train artifacts directory

## Emergency Hot-Patch

```powershell
pwsh scripts/patch-train/promote.ps1 -From candidate -To production -SkipGates
```

**DANGER**: Creates a promotion record with `gatesSkipped: true`. Requires
post-facto documentation of why gates were bypassed.
