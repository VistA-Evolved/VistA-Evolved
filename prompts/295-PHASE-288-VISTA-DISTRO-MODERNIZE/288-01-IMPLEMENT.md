# Phase 288 -- VistA Distro Modernization (IMPLEMENT)

## Goal
Modernize the VistA distro lane (Phase 148) with pinned commit references,
Synthea patient seeding support, a CI build-validation job, and a Dockerfile
lint pass.

## Implementation Steps

1. Pin VistA-M to a specific commit hash in `build.env` for reproducible builds
2. Create `services/vista-distro/synthea-seed/` with:
   - Synthea download + run wrapper script
   - M routine to ingest Synthea FHIR bundles (stub/scaffold)
3. Create `.github/workflows/ci-distro-build.yml` -- CI job validating Dockerfile builds
4. Add hadolint config `.hadolint.yaml` for Dockerfile linting
5. Update Dockerfile with best-practice labels (OCI annotations) and layer optimization
6. Create verifier + evidence

## Files Touched
- `services/vista-distro/build.env` (MODIFIED - pin commit)
- `services/vista-distro/Dockerfile` (MODIFIED - layer optimization + build metadata)
- `services/vista-distro/synthea-seed/seed-synthea.ps1` (NEW)
- `services/vista-distro/synthea-seed/README.md` (NEW)
- `.github/workflows/ci-distro-build.yml` (NEW)
- `.hadolint.yaml` (NEW)
- `docs/runbooks/vista-distro-modernization.md` (NEW)
- `scripts/verify-phase288-distro-modernize.ps1` (NEW)
