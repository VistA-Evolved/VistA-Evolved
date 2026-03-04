# Phase 146 -- Durability Wave 3: Critical Map Stores to Zero (IMPLEMENT)

## Scope

Eliminate all remaining high-risk in-memory Map stores in portal, telehealth,
imaging, RCM, and scheduling domains. PG is the canonical store.
Map instances remain as write-through TTL caches only.

## Inventory (pre-implementation)

- 129 critical Map stores across 5 target domains
- 6 stores already DB-backed but mis-classified in store-policy.ts
- 36 stores truly un-backed, needing full PG migration

## Implementation

1. Fix 6 mis-classified store-policy entries (already pg_backed)
2. PG migration v18: 30+ new tables for un-backed critical stores
3. Domain-grouped PG repo modules in platform/pg/repos/
4. Write-through wiring in each store file (Map = cache, PG = truth)
5. Update store-policy classifications to pg_backed
6. Update RLS policy table list
7. Restart durability tests

## Files Touched

- apps/api/src/platform/pg/pg-migrate.ts (v18)
- apps/api/src/platform/pg/repos/\*.ts (new repos)
- apps/api/src/platform/store-policy.ts (42 classification updates)
- 25+ store files (write-through wiring)
- qa/gauntlet/critical-map-baseline.json

## Acceptance

- critical+in_memory_only count = 0 in target domains
- TSC clean, build clean, gauntlet rc PASS
