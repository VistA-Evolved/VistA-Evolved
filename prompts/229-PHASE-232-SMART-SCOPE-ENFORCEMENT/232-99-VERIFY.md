# Phase 232 -- VERIFY -- SMART Scope Enforcement

## Verification Steps

1. Run: `pnpm -C apps/api test -- --run tests/fhir-scope-enforcement.test.ts`
2. Confirm 22/22 tests pass
3. Verify parseScope handles all SMART scope formats
4. Verify checkScopeAccess grants/denies correctly
5. Verify wildcard scopes work (user/_.read, patient/_.\*)
6. Verify patient-scope restricts to DFN
7. Verify session users get implicit access

## Acceptance Criteria

- Scope enforcement on all 8 FHIR resource routes
- Session auth unaffected (implicit user/\*.read)
- 403 with OperationOutcome for scope violations
- 22 tests green
