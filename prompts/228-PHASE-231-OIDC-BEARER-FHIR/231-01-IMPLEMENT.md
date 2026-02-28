# Phase 231 -- OIDC Bearer Token Support for FHIR

## User Request
Add SMART-on-FHIR Bearer JWT token authentication to all /fhir/* routes,
alongside existing session cookie auth. New "fhir" auth level in security.ts.

## Implementation Steps
1. Create `fhir-bearer-auth.ts` with FhirPrincipal type, extractBearerToken(), validateFhirBearerToken(), principalFromSession()
2. Add "fhir" auth level to security.ts AuthLevel union
3. Change /fhir/ AUTH_RULES entry from "session" to "fhir"
4. Wire bearer JWT validation into auth gateway hook (try bearer first, fallback to session)
5. Set request.fhirPrincipal on successful auth
6. Update fhir/index.ts barrel exports
7. Write 14 unit tests

## Verification Steps
1. All 14 fhir-bearer-auth tests pass
2. Session cookie auth still works for /fhir/ routes
3. Bearer token extraction handles edge cases (missing, empty, malformed)
4. FhirPrincipal correctly populated from JWT claims
5. No breaking changes to non-FHIR routes

## Files Touched
- apps/api/src/fhir/fhir-bearer-auth.ts (NEW)
- apps/api/src/middleware/security.ts (MODIFIED)
- apps/api/src/fhir/index.ts (MODIFIED)
- apps/api/tests/fhir-bearer-auth.test.ts (NEW)
