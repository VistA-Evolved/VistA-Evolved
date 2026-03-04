# Phase 235 -- CapabilityStatement Conformance

## User Request

Update the FHIR CapabilityStatement to accurately reflect all implemented
search parameters, SMART security posture, and paging parameters.

## Implementation Steps

1. Add SMART security section to rest[0] with CORS + service code
2. When OIDC enabled: add oauth-uris extension (authorize, token, revoke)
3. Expand Patient searchParam: add identifier, \_offset
4. Expand AllergyIntolerance: add clinical-status, \_count, \_offset
5. Expand Condition: add clinical-status, \_count, \_offset
6. Expand Observation: add code, date, \_count, \_offset
7. Expand MedicationRequest: add status, \_count, \_offset
8. Expand DocumentReference: add date, \_count, \_offset
9. Expand Encounter: add date, status, \_count, \_offset
10. Add documentation strings to all search params
11. Upgrade FhirCapabilityStatement type: add security, documentation
12. Change status from "draft" to "active", version 0.2.0
13. Update existing conformance test (status check)
14. Write 50 unit tests

## Verification Steps

1. All 50 fhir-capability-conformance tests pass
2. All 44 existing fhir-conformance tests pass
3. Every implemented search param declared in CapabilityStatement
4. Security section present with SMART-on-FHIR code

## Files Touched

- apps/api/src/fhir/capability-statement.ts (MODIFIED)
- apps/api/src/fhir/types.ts (MODIFIED)
- apps/api/tests/fhir-conformance.test.ts (MODIFIED)
- apps/api/tests/fhir-capability-conformance.test.ts (NEW)
