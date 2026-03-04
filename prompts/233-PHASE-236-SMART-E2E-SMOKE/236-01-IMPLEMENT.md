# Phase 236 -- SMART App Launch E2E Smoke

## User Request

Create a comprehensive end-to-end smoke test that validates the entire
SMART-on-FHIR pipeline: discovery -> metadata -> auth -> scopes -> search -> paging.

## Implementation Steps

1. Create fhir-smart-e2e-smoke.test.ts with 6 test sections
2. Step 1: SMART Discovery -- buildSmartConfiguration validates structure
3. Step 2: CapabilityStatement -- buildCapabilityStatement validates metadata
4. Step 3: Bearer token flow -- extractBearerToken + validateFhirBearerToken
5. Step 4: Scope enforcement -- parseScope + checkScopeAccess
6. Step 5: Search parameter filtering -- parseDateParam + filter functions
7. Step 6: Paging -- toPagedSearchBundle with self/next/previous links
8. Full pipeline integration test -- all modules functional together
9. Write 26 tests

## Verification Steps

1. All 26 fhir-smart-e2e-smoke tests pass
2. Full pipeline test exercises all Wave 5 modules end-to-end
3. All module imports succeed (no circular deps)

## Files Touched

- apps/api/tests/fhir-smart-e2e-smoke.test.ts (NEW)
