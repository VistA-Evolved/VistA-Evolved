# Phase 424 -- VistA Runtime Strategy + Baseline Matrix (W26 P2)

## Objective

Document VistA runtime options, create a machine-readable runtime matrix,
and add tooling for container inspection, runtime selection, and drift detection.

## Changes

### New Files

| File                                  | Purpose                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `data/vista/runtime-matrix.json`      | Machine-readable matrix: environments, runtime modes, domain requirements, adapter mapping |
| `scripts/vista/inspect-container.ps1` | Probes a running VistA Docker container (status, routines, globals, broker)                |
| `scripts/vista/select-runtime.ps1`    | Validates and optionally switches VistA runtime target (sandbox vs distro)                 |

### Modified Files

| File                                    | Change                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/api/src/vista/rpcCapabilities.ts` | Added drift detection (`compareToBaseline`), `buildRuntimeMatrix()`, `getAllDomains()` |

## Runtime Matrix Structure

The `runtime-matrix.json` defines:

1. **Environments**: worldvista-docker (dev), vista-distro (staging), production
2. **Runtime Modes**: dev/test/rc/prod with requirements (VistA, PG, OIDC, stubs)
3. **Domain Requirements**: 18 domains with required/optional RPCs per mode
4. **Adapter Matrix**: 5 adapter types with vista/stub paths and domain mapping

## Drift Detection

`compareToBaseline(baseline)` compares live capability discovery against a saved
baseline, producing a `DriftReport` with:

- `regressions` -- RPCs that were available but are now missing
- `newlyAvailable` -- RPCs that are new since baseline
- `hasDrift` -- boolean flag for regression detection
- `summary` -- human-readable one-liner

## Files Touched

- `data/vista/runtime-matrix.json` (new)
- `scripts/vista/inspect-container.ps1` (new)
- `scripts/vista/select-runtime.ps1` (new)
- `apps/api/src/vista/rpcCapabilities.ts` (modified)
