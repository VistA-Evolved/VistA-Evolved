# Phase 276 — Durability: Read-Through Cache for PG-Backed Stores

## User Request
Replace write-through-only patterns with read-through: on cache miss, check PG
before returning null. Also hydrate critical Map stores from PG on startup.

## Inventory
- 65 `pg_backed` stores in store-policy.ts
- ~57 are write-through only (read from Map, never fall back to PG)
- Only 5 have read-through: session-cache, payer-cache, module-overrides,
  idempotency middleware (3)
- Generic PG repo in `durability-repos.ts` already provides findById/findByTenant

## Implementation Steps

1. Create `apps/api/src/platform/pg/read-through.ts`:
   - Generic `readThroughGet<T>()` — Map-first, PG-fallback, cache-fill
   - Generic `readThroughList<T>()` — Map-first (if populated), PG-fallback
   - `hydrateMapsFromPg()` — startup bulk-load for critical stores

2. Create `scripts/qa-gates/durability-readthrough-gate.mjs`:
   - Parse store-policy.ts to find all pg_backed stores
   - Check which ones import from read-through or have explicit DB reads
   - Report coverage percentage

3. Wire read-through into 3 critical stores as exemplars:
   - `telehealth/room-store.ts` — getRoomById falls through to PG
   - `services/imaging-worklist.ts` — getWorkItem falls through to PG
   - `intake/intake-store.ts` — getSession falls through to PG

## Verification Steps
- `readThroughGet` returns data from PG when Map is empty
- QA gate script runs and reports coverage
- Critical stores use read-through pattern
