# Phase 429 -- Runtime-Mode Integration Tests -- VERIFY

## Gates

1. **Test file exists**: `apps/api/tests/runtime-mode.test.ts`
2. **Mode resolution tests**: dev default, PLATFORM_RUNTIME_MODE direct, NODE_ENV fallback, precedence
3. **Guard function tests**: requiresPg, requiresRls, blocksJsonStores, requiresOidc for each mode
4. **Validation tests**: throws for rc/prod without PG/OIDC, passes with all required vars
5. **Property matrix**: 4 modes x 4 guards = 16 assertions in parameterized test
6. **Cache reset**: _resetCachedMode() allows re-read after env change
7. **Prompt folder**: `429-PHASE-429-RUNTIME-MODE-TESTS/` has IMPLEMENT + VERIFY + NOTES
8. **Linter**: `prompts-tree-health.mjs` -- 0 FAIL
