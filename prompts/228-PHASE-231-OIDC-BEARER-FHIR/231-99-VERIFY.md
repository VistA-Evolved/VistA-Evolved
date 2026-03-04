# Phase 231 -- VERIFY -- OIDC Bearer Token Support for FHIR

## Verification Steps

1. Run: `pnpm -C apps/api test -- --run tests/fhir-bearer-auth.test.ts`
2. Confirm 14/14 tests pass
3. Verify extractBearerToken handles: valid, missing header, empty bearer, Basic scheme
4. Verify validateFhirBearerToken rejects when OIDC disabled
5. Verify principalFromSession maps session fields to FhirPrincipal
6. Verify security.ts AuthLevel includes "fhir"
7. Verify AUTH_RULES entry for /fhir/ uses "fhir" auth level

## Acceptance Criteria

- Bearer JWT accepted on all /fhir/\* routes
- Session cookie fallback preserved
- No regressions on non-FHIR routes
- 14 tests green
