# Phase 232 -- SMART Scope Enforcement

## User Request
Enforce SMART-on-FHIR scopes on all FHIR resource routes. Bearer token users
must have the appropriate scope for each resource type. Session users get
implicit user/*.read.

## Implementation Steps
1. Create `fhir-scope-enforcement.ts` with parseScope(), checkScopeAccess(), enforceFhirScope()
2. Support SMART scope format: context/ResourceType.permission
3. Support wildcard (*) for resourceType and permission
4. Session auth -> implicit user/*.read (always allowed)
5. Patient-scope restricts to patientContext DFN only
6. Wire enforceFhirScope() into all 8 resource routes in fhir-routes.ts
7. Return 403 with OperationOutcome on scope violation
8. Write 22 unit tests

## Verification Steps
1. All 22 fhir-scope-enforcement tests pass
2. Session users can access all resources
3. Bearer users with matching scope can access
4. Bearer users without matching scope get 403
5. Patient-scope restricts to patient context

## Files Touched
- apps/api/src/fhir/fhir-scope-enforcement.ts (NEW)
- apps/api/src/fhir/fhir-routes.ts (MODIFIED)
- apps/api/src/fhir/index.ts (MODIFIED)
- apps/api/tests/fhir-scope-enforcement.test.ts (NEW)
