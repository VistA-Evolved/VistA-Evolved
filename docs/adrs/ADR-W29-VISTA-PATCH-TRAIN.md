# ADR-W29-VISTA-PATCH-TRAIN

## Status
Accepted

## Context
When upgrading the VistA base (new upstream image, new routines, new RPCs),
we need a reliable promotion pipeline that prevents regressions.

Currently, VistA routine installs are ad-hoc (`install-vista-routines.ps1`)
with no formal gating between "candidate" and "production-ready."

## Decision

### Release Cadence
- **Monthly** routine patch train for non-urgent changes.
- **On-demand** for security patches or critical bug fixes.
- Each train produces a candidate image that must pass all gates before promotion.

### Promotion Stages
```
candidate --> staging --> production
```

1. **Candidate**: Built from pinned sources + patch set. Must pass:
   - Docker build succeeds
   - Container starts and passes health check
   - All ZVE* routine installs complete (idempotent)
   - RPC smoke suite passes (137+ registered RPCs callable)
   - Tier-0 "day-in-life" journey suite passes (login, patient list, read RPCs)

2. **Staging**: Candidate that passed all automated gates. Must pass:
   - Compatibility matrix (at least 2 lanes: VEHU + ProdBase)
   - No new critical/high vulnerabilities in SBOM scan
   - License policy gate passes

3. **Production**: Staging that received sign-off artifact.
   - Sign-off file: `/artifacts/vista-release-signoff-<version>.json`
   - Contains: approver, timestamp, gate results hash, release manifest hash

### Evidence Requirements
Each promotion stage produces evidence under:
```
/evidence/wave-29/<phase>/patch-train/<timestamp>/
```
Including: build logs, test results, manifest, SBOM report, sign-off.

### Failure Policy
- Any gate failure blocks promotion.
- Fix-forward: patch the routine set, rebuild candidate, re-run pipeline.
- No manual overrides without documented exception in sign-off file.

## Consequences
- Slower promotion but much safer upgrades.
- Every production VistA image is fully traceable to sources + test evidence.
- Pipeline can be extended with additional lanes (PlanVI, country-specific).
