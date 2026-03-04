# Phase 234 -- VERIFY -- FHIR Paging + Bundle Links

## Verification Steps

1. Run: `pnpm -C apps/api test -- --run tests/fhir-paging.test.ts`
2. Confirm 8/8 tests pass
3. Verify Bundle.link contains self, next, previous as appropriate
4. Verify offset + count in link URLs
5. Verify total is always set to full result count

## Acceptance Criteria

- Offset-based paging on all 6 search routes
- Bundle.link entries per FHIR spec
- 8 tests green
