# Phase 121 — DURABILITY WAVE 1 (ENTERPRISE RESTART SAFETY) — IMPLEMENT

> **Goal:** Migrate the 4 highest-risk pure in-memory stores to DB-backed
> persistence so the system survives API restarts without data loss.

## User Request

Phase 120 system audit identified 49 high-risk in-memory Map stores.
This phase targets the 4 store groups that are STILL pure in-memory
(telehealth rooms, imaging worklist, and portal messaging were already
made durable in Phase 115):

1. **RCM domain claim store** (`rcm/domain/claim-store.ts`) -- claims + remittances
2. **RCM claims lifecycle store** (`rcm/claims/claim-store.ts`) -- ClaimCase FSM
3. **Portal access log store** (`portal-iam/access-log-store.ts`) -- patient-visible activity log
4. **Scheduling request store** (`adapters/scheduling/vista-adapter.ts`) -- wait list requests + booking locks

## Implementation Steps

### Step 1 -- Baseline audit snapshot
Run `pnpm audit:system`, record:
- Total in-memory stores, high-risk count
- Existing SQLite table count

### Step 2 -- Schema design (Drizzle + migrate.ts)
Add 5 new tables to `apps/api/src/platform/db/schema.ts`:
- AP) `rcm_claim` -- durable claims (Claim type from claim.ts)
- AQ) `rcm_remittance` -- durable remittances (Remittance type)
- AR) `rcm_claim_case` -- durable claim cases (ClaimCase from claim-types.ts)
- AS) `portal_access_log` -- durable access logs
- AT) `scheduling_request` -- durable wait list / appointment requests

Add matching `CREATE TABLE IF NOT EXISTS` to `migrate.ts`.

### Step 3A -- RCM domain claim store durability
- Create `platform/db/repo/rcm-claim-repo.ts` (CRUD for claims + remittances)
- Refactor `rcm/domain/claim-store.ts` to hybrid pattern:
  - In-memory Map as cache
  - `initClaimStoreRepo(repo)` lazy-wires DB repo
  - Write-through: every mutating op writes to both cache and DB
  - Read: cache-first, DB fallback on cache miss

### Step 3B -- RCM claims lifecycle store durability
- Create `platform/db/repo/rcm-claim-case-repo.ts` (CRUD for claim cases)
- Refactor `rcm/claims/claim-store.ts` to hybrid pattern
- Complex fields (diagnoses, procedures, events, denials, attachments) stored as JSON columns

### Step 3C -- Portal access log durability
- Create `platform/db/repo/access-log-repo.ts`
- Refactor `portal-iam/access-log-store.ts` to hybrid pattern
- Preserve FIFO eviction in cache, DB stores all entries

### Step 3D -- Scheduling request store durability
- Create `platform/db/repo/scheduling-request-repo.ts`
- Refactor `adapters/scheduling/vista-adapter.ts` to hybrid pattern
- Booking locks remain in-memory (TTL-based, intentionally ephemeral)

### Step 4 -- Wire repos in index.ts
Add init blocks following the Phase 115 pattern in index.ts.

### Step 5 -- Update repo barrel export
Add new repos to `platform/db/repo/index.ts`.

### Step 6 -- Re-run audit
Confirm high-risk store count drops.

### Step 7 -- Runbook
Create `docs/runbooks/durability-wave-1.md`.

## Files Touched
- `apps/api/src/platform/db/schema.ts` -- 5 new table definitions
- `apps/api/src/platform/db/migrate.ts` -- 5 new CREATE TABLE statements
- `apps/api/src/platform/db/repo/rcm-claim-repo.ts` -- NEW
- `apps/api/src/platform/db/repo/rcm-claim-case-repo.ts` -- NEW
- `apps/api/src/platform/db/repo/access-log-repo.ts` -- NEW
- `apps/api/src/platform/db/repo/scheduling-request-repo.ts` -- NEW
- `apps/api/src/platform/db/repo/index.ts` -- 4 new exports
- `apps/api/src/rcm/domain/claim-store.ts` -- hybrid pattern
- `apps/api/src/rcm/claims/claim-store.ts` -- hybrid pattern
- `apps/api/src/portal-iam/access-log-store.ts` -- hybrid pattern
- `apps/api/src/adapters/scheduling/vista-adapter.ts` -- hybrid pattern
- `apps/api/src/index.ts` -- 4 new init blocks
- `docs/runbooks/durability-wave-1.md` -- NEW

## Acceptance Criteria
- All 4 store groups survive API restart (data in SQLite)
- TypeScript compiles (`npx tsc --noEmit`)
- Build passes (`pnpm -r build`)
- High-risk store count drops by at least 10 in audit
