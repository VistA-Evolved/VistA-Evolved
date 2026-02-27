# Phase 152 — SCHEDULING REALISM V3 (PG-ONLY, NO MAP FALLBACK, OPTIONAL SEED)

## Request
Eliminate the remaining "PG fallback to Map" behaviour in scheduling routes and make scheduling realism deterministic.

## Non-negotiables
1. In rc/prod, scheduling requests must never use in-memory store fallback.
2. In dev, fallback may exist only if explicitly flagged DEV_ONLY and never used in rc/prod.
3. Optional seeding routine remains optional but supported.

## Implementation Steps

### A) Remove Map fallback from /scheduling/requests
- In routes/scheduling/index.ts:
  - GET /scheduling/requests: if PG import fails and runtime_mode is rc/prod => 503
  - POST approve/reject: if PG import fails and runtime_mode is rc/prod => 503
  - In dev mode, fallback allowed but logged as DEV_ONLY_FALLBACK

### B) Enforce PG-only request store in rc/prod
- In vista-adapter.ts:
  - `getRequestStore()` returns 503-friendly signal in rc/prod when PG unavailable
  - `requestStore` Map is guarded by runtime mode
  - `persistEntry()` in rc/prod must throw (not silently skip) if dbRepo is null
  - Update store-policy.ts classification to document new behaviour

### C) Seed routine (optional)
- services/vista/ZVESDSEED.m already exists (179 lines)
- Create docs/runbooks/scheduling-seed.md with explicit install steps

### D) Truth gate enforcement + audit
- GET /scheduling/verify/:ref: if appointment claimed booked but not verifiable, mark pending
- Audit detail uses [REDACTED] for patient identifiers (Phase 151 compliance)

## Files Changed
- apps/api/src/routes/scheduling/index.ts
- apps/api/src/adapters/scheduling/vista-adapter.ts
- apps/api/src/platform/store-policy.ts
- docs/runbooks/scheduling-seed.md
- prompts/157-PHASE-152-SCHEDULING-PG-ONLY/152-01-IMPLEMENT.md
- prompts/157-PHASE-152-SCHEDULING-PG-ONLY/152-99-VERIFY.md

## Verification
- `pnpm exec tsc --noEmit` -- 0 errors
- `node qa/gauntlet/cli.mjs --suite rc` -- 18P/0F
