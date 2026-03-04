# Phase 236 -- VERIFY -- SMART App Launch E2E Smoke

## Verification Steps

1. Run: `pnpm -C apps/api test -- --run tests/fhir-smart-e2e-smoke.test.ts`
2. Confirm 26/26 tests pass
3. Verify full pipeline test covers: discovery -> metadata -> auth -> scope -> search -> page
4. Verify no circular import issues

## Acceptance Criteria

- Complete Wave 5 pipeline validated in one test file
- All 26 tests green
- All SMART-on-FHIR modules importable and functional
