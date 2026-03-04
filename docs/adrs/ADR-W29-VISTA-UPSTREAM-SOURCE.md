# ADR-W29-VISTA-UPSTREAM-SOURCE

## Status

Accepted

## Context

VistA-Evolved needs a repeatable, auditable way to ingest upstream VistA sources.
Multiple upstream variants exist:

- **WorldVistA** — community-maintained, Docker images on Docker Hub
- **OSEHRA / FOIA VistA** — government release, periodic FOIA drops
- **VA Enterprise VistA** — not publicly accessible; only FOIA extracts
- **Internal mirror** — our own pinned fork for reproducible builds

Currently we use `worldvista/worldvista-ehr` Docker image as-is, with custom
MUMPS routines (`ZVE*`) layered on top. This is expedient for development but
has no formal version pinning, no patch tracking, and no rollback mechanism.

## Decision

### Primary Source: WorldVistA Docker + OSEHRA FOIA cross-reference

1. **WorldVistA Docker image** remains the primary development base.
2. We mirror selected WorldVistA GitHub repos into `/vendor/worldvista/`
   with commit SHA pinning via `LOCK.json`.
3. OSEHRA FOIA releases are tracked as a cross-reference for routine
   version comparison but are not the build source.

### Patch Application Model

- Custom routines (`ZVE*`) are maintained in `services/vista/` and
  `services/vista-distro/routines/`.
- Patches are applied via `docker cp` + `mumps -run` (idempotent installers).
- Each patch set produces a **VistA Release Manifest** (Phase 449) that
  records exact routine hashes, RPC registry state, and upstream SHAs.

### Version Pinning

- `vendor/worldvista/LOCK.json` pins every mirrored repo to a commit SHA.
- Docker image digests are recorded in release manifests.
- No floating tags (`latest`) in CI/CD — always pinned digests.

### Rollback Plan

- Previous Docker image digest is retained in the release manifest history.
- Rollback = redeploy previous pinned image + re-run previous patch set.
- Rollback runbook: `docs/runbooks/vista-rollback.md` (Phase 455).

## Consequences

- Upstream updates require explicit pull + lock + build + test cycle.
- No surprise breakage from upstream changes.
- Slight lag behind upstream (acceptable for stability).
- WorldVistA community contributions remain attributable via LOCK.json.
