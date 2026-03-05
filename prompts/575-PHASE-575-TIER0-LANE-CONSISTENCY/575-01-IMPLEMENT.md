# Phase 575 -- Tier-0 + Runtime-Lane Consistency

## Objective

Unify the VistA swap boundary, Tier-0 proof, and verify-tier0 scripts
so they consistently model all 4 runtime lanes. Remove contradictions
between docs, defaults, and heuristics.

## Changes

### A) swap-boundary.ts -- Explicit lane boundaries
- Add `vehuSandboxBoundary()` (instanceId: 'vehu', port default 9431)
- Add `worldvistaEhrBoundary()` (instanceId: 'worldvista-ehr', port default 9430)
- Rename `devSandboxBoundary()` -> kept as alias for backward compat
- Rename `distroLaneBoundary()` -> kept, instanceId stays 'vista-distro-lane'
- Update `activeSwapBoundary()`:
  - VISTA_INSTANCE_ID explicit mapping: vehu, worldvista-ehr, vista-distro-lane
  - Port heuristic fallback: 9431->vehu, 9430->worldvista-ehr, 9210->worldvista-ehr

### B) TIER0_PROOF.md -- Multi-lane prerequisites
- Replace single-lane "port 9430" guidance
- Link to runtime-lanes.md
- Show creds for both VEHU and Legacy

### C) verify-tier0.ps1 + verify-tier0.sh -- Lane detection
- Add lane detection via GET /vista/swap-boundary
- Choose default creds from boundary.instanceId
- Docker check looks for both "wv" and "vehu" containers

### D) runtime-lanes.md -- VISTA_INSTANCE_ID section
- Add short reference section for VISTA_INSTANCE_ID values

## Files Touched

- apps/api/src/vista/swap-boundary.ts (edit)
- docs/TIER0_PROOF.md (edit)
- scripts/verify-tier0.ps1 (edit)
- scripts/verify-tier0.sh (edit)
- docs/runbooks/runtime-lanes.md (edit)
