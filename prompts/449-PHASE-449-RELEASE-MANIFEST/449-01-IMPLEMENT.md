# Phase 449 — W29-P3: VistA Release Manifest Schema

## Objective

Define a machine-readable release manifest schema so every VistA-related build
artifact is tagged with: upstream SHA, routine inventory, RPC count, Docker digest,
and build provenance. Extend `infra/scripts/build-images.ps1` to emit this manifest.

## Deliverables

| #   | File                                            | Purpose                                                   |
| --- | ----------------------------------------------- | --------------------------------------------------------- |
| 1   | `docs/vista/VISTA_RELEASE_MANIFEST.schema.json` | JSON Schema for VistA release manifests                   |
| 2   | `infra/scripts/build-images.ps1` (edit)         | Emit `artifacts/vista-release-manifest.json` after build  |
| 3   | `scripts/upstream/emit-release-manifest.mjs`    | Standalone script to generate manifest from current state |

## Acceptance Criteria

1. JSON Schema validates with `ajv` or any JSON Schema Draft-07 validator
2. `build-images.ps1` writes `artifacts/vista-release-manifest.json` after build completes
3. Standalone emitter works without Docker (reads LOCK.json + rpcRegistry)
4. Manifest includes: schemaVersion, buildSha, buildTime, upstreamShas, rpcCount, routineCount, images
