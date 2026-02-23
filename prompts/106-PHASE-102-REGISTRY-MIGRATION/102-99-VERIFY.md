# Phase 102 v2 -- VERIFY: Migrate Prototype Stores to PlatformStore

## Verification Script

```powershell
.\scripts\verify-phase102-registry-migration.ps1 -Verbose
```

## Gates (67 total)

### Section 1: PG Repo Files (16 gates)
- repo directory exists
- All 7 repo files exist (payer, audit, capability, task, evidence, tenant-payer, capability-matrix, index)
- Barrel exports all 7 PG repo namespaces

### Section 2: PG Repo Content (19 gates)
- Every repo imports getPgDb
- Every repo has async functions
- Capability matrix repo has getFullMatrix, setCapability, addEvidence, getMatrixStats
- Capability matrix repo references capabilityMatrixCell schema

### Section 3: Store Resolver (7 gates)
- store-resolver.ts exists
- Exports resolveStore and store proxy
- Uses isPgConfigured, Promise.resolve wrappers, PG repos, backend property

### Section 4: Route Wiring (5 gates)
- Routes import resolveStore
- Async ensureDb with await
- Backend endpoint exists
- No direct SQLite repo imports remain

### Section 5: PG Seed Loader (5 gates)
- pg-seed.ts exists with JSON fixture reading, BOM stripping, async function, idempotent insert

### Section 6: pg-init.ts Integration (3 gates)
- Imports pgSeedFromJsonFixtures
- Result type includes seeded field
- Calls seed function

### Section 7: Migration v5 (3 gates)
- v5 migration exists
- capability_matrix_cell table
- capability_matrix_evidence table

### Section 8: PG Schema (3 gates)
- capabilityMatrixCell and capabilityMatrixEvidence tables
- Unique index on payer+capability

### Section 9: UI Persistence Badge (4 gates)
- Fetches backend endpoint
- backendInfo state
- PostgreSQL and SQLite labels

### Section 10: PG Module Barrel (1 gate)
- pg/index.ts exports repo barrel

### Section 11: TypeScript Compilation (1 gate)
- `npx tsc --noEmit` passes cleanly

## Result

67/67 PASS
