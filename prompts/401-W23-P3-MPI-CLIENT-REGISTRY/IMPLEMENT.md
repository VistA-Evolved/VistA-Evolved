# 401-01-IMPLEMENT — MPI / Client Registry

## Phase 401 (W23-P3)

### Goal
Implement the Master Patient Index (MPI) / Client Registry with patient identity
management, deterministic matching, merge/link operations, and OpenCR-ready adapter hooks.

### Source Files
- `apps/api/src/mpi/types.ts` — PatientIdentifier, MpiPatientIdentity, MatchResult, MergeEvent
- `apps/api/src/mpi/mpi-store.ts` — Identity CRUD, matching, merge, dashboard
- `apps/api/src/mpi/mpi-routes.ts` — REST endpoints
- `apps/api/src/mpi/index.ts` — Barrel export

### Integration
- Registered in `register-routes.ts`
- AUTH_RULES: `/mpi/` → session
- STORE_INVENTORY: 2 stores (identities, merge events)

### Endpoints
- GET/POST/PUT /mpi/identities
- POST /mpi/match (deterministic + probabilistic matching)
- POST /mpi/merge (merge/link/unlink operations)
- GET /mpi/merge-events
- GET /mpi/dashboard
