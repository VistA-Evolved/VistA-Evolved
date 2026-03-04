# Phase 263 — Wave 8 Integrity Audit

## User Request

Comprehensive 3-part progressive audit of all Wave 8 changes:

1. SANITY CHECK — wiring, reachability, hardcoded values, contracts, builds
2. FEATURE INTEGRITY CHECK — E2E flow, edge cases, dead code, gap analysis
3. SYSTEM REGRESSION CHECK — existing functionality, data contracts, alignment

## Summary of Findings and Fixes

### CRITICAL (3 found, 3 fixed)

1. **adapter-sdk-routes.ts: Property access on flat objects** — `a.config.id` etc.
   on already-flat `listPayerAdapters()` return. Fixed: `a.id`, `a.name`, etc.
2. **adapter-sdk-routes.ts: `Map.length` typo** — `getAllConnectors()` returns Map;
   `.length` is undefined. Fixed: `.size`.
3. **support-toolkit-v2-routes.ts: Parametric name collision** — Used `:ticketId`
   at same path segment as `:id` from support-routes.ts. Fastify `find-my-way`
   rejects different param names at the same segment. Fixed: `:ticketId` -> `:id`.

### WIRING (8 missing, 8 fixed)

4. **register-routes.ts: 8 Wave 8 route files never registered** — Imports added
   and `server.register()` calls wired for all P2-P9 route plugins.

### TYPE ERRORS (14 found, 14 fixed)

5. **store-policy.ts: Invalid StoreClassification values** — `"operational"` and
   `"reference"` not in the type union. Fixed to valid values (`"registry"`,
   `"cache"`, `"audit"`, `"critical"`).
6. **store-policy.ts: Invalid DurabilityStatus values** — `"in_memory"` not in
   the type union. Fixed to `"in_memory_only"`.
7. **hl7-pipeline.ts: `ok` specified twice** — `{ ok: result.ok, ...result }`
   spread already contains `ok`. Fixed to `{ ...result }`.

### STORE POLICY (12 new entries)

8. **12 in-memory stores from P5-P9 not cataloged** — Added all entries with
   correct classification, durability, domain, TTL/maxSize, migration targets.

### ERROR HANDLING (15 POST handlers)

9. **try/catch added to all POST handlers** in: hl7-use-cases.ts (1),
   onboarding-integration-routes.ts (4), data-portability-routes.ts (4),
   sat-routes.ts (5) — now return structured `{ok:false, error, detail}` on 500.

### COSMETIC (4 fixes)

10. **import type for FastifyInstance** — 4 files used value import instead of
    type-only import. Fixed.
11. **Sync fs calls replaced** — `hl7-use-cases.ts` used `fs.existsSync` and
    `fs.readdirSync`. Changed to async `fs/promises`.
12. **sat-suite.ts TypeScript narrowing** — `overallLevel !== "offline"`
    unreachable after break. Fixed to `!== "critical"`.
13. **Hardcoded requestedBy** — `data-portability-routes.ts` used `"admin"`.
    Fixed to use `session.duz || "admin"`.
14. **Input validation** — `sat-routes.ts` POST handlers now validate enum
    values for `status`, `source`, `level`.

### TEST FIX (1)

15. **support-toolkit-v2.test.ts** — Updated assertion from `:ticketId` to `:id`
    to match the param name collision fix.

## Files Touched (11)

- apps/api/src/pilot/sat-suite.ts
- apps/api/src/platform/store-policy.ts
- apps/api/src/routes/adapter-sdk-routes.ts
- apps/api/src/routes/data-portability-routes.ts
- apps/api/src/routes/hl7-pipeline.ts
- apps/api/src/routes/hl7-use-cases.ts
- apps/api/src/routes/onboarding-integration-routes.ts
- apps/api/src/routes/sat-routes.ts
- apps/api/src/routes/support-toolkit-v2-routes.ts
- apps/api/src/server/register-routes.ts
- apps/api/tests/support-toolkit-v2.test.ts

## Verification

- TypeScript: 0 compile errors (clean `tsc --noEmit`)
- Tests: 85/85 Wave 8 tests pass (4 files)
- Full test suite: 968 pass / 65 skip (72 fail = ECONNREFUSED integration tests)
