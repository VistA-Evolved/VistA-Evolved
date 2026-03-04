# 401-99-VERIFY — MPI / Client Registry

## Verification Gates

1. `types.ts` exports MpiPatientIdentity, MatchResult, MergeEvent, MpiDashboardStats
2. `mpi-store.ts` implements deterministic matching with score-based confidence
3. Merge operations absorb identifiers from retired into survivor
4. FIFO eviction with `>=` on both stores
5. Route registered in `register-routes.ts`
6. AUTH_RULES entry for `/mpi/` in `security.ts`
7. 2 STORE_INVENTORY entries (identities=phi, merges=operational)
8. `tsc --noEmit` passes cleanly
