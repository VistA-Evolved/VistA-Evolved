# Phase 429 -- Runtime-Mode Integration Tests (W26 P7)

## IMPLEMENT

### Goal

Create a Vitest test suite validating the runtime mode system: mode resolution,
guard functions, validation enforcement, adapter env var selection, and SKU defaults.

### Steps

1. Create `apps/api/tests/runtime-mode.test.ts`
2. Test `getRuntimeMode()` with all env var combinations
3. Test `requiresPg()`, `requiresRls()`, `blocksJsonStores()`, `requiresOidc()` per mode
4. Test `validateRuntimeMode()` throws correctly for rc/prod without PG/OIDC
5. Test `_resetCachedMode()` allows re-read
6. Verify adapter env var defaults and SKU selection

### Files Touched

- `apps/api/tests/runtime-mode.test.ts` (NEW)
- `prompts/429-PHASE-429-RUNTIME-MODE-TESTS/` (NEW)

### Key Design Decisions

- Uses `vi.resetModules()` + dynamic import to test each mode in isolation
- Env vars snapshotted in beforeEach, restored in afterEach
- Mode property matrix covers all 4 modes x 4 guard functions
