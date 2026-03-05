# Phase 575 -- Verify: Tier-0 + Runtime-Lane Consistency

## Verification Gates

1. **TypeScript compiles**: `pnpm -C apps/api exec tsc --noEmit` passes
2. **swap-boundary exports**: vehuSandboxBoundary, worldvistaEhrBoundary,
   distroLaneBoundary, devSandboxBoundary, activeSwapBoundary all exported
3. **VISTA_INSTANCE_ID=vehu**: activeSwapBoundary returns instanceId 'vehu'
4. **Port heuristic 9431**: without VISTA_INSTANCE_ID, port 9431 -> vehu
5. **Port heuristic 9430**: port 9430 -> worldvista-ehr
6. **Port heuristic 9210**: port 9210 -> worldvista-ehr
7. **TIER0_PROOF.md**: contains link to runtime-lanes.md + both cred sets
8. **verify-tier0.ps1**: contains /vista/swap-boundary call + lane detection
9. **verify-tier0.sh**: contains /vista/swap-boundary call + lane detection
10. **runtime-lanes.md**: contains VISTA_INSTANCE_ID section
11. **Gauntlet FAST**: 0 FAIL
