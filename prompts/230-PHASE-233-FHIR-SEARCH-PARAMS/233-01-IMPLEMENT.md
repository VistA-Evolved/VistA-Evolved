# Phase 233 -- FHIR Search Parameters Expansion

## User Request
Add post-filter search parameter support for all FHIR resource types beyond
the basic patient reference. Parameters: date, clinical-status, status, code,
_count per resource type.

## Implementation Steps
1. Create `fhir-search-params.ts` with date prefix parsing (eq/lt/gt/le/ge)
2. Implement filterEncounters(records, query) -- date + status filters
3. Implement filterObservations(records, query) -- code + date filters
4. Implement filterMedicationRequests(records, query) -- status filter
5. Implement filterConditions(records, query) -- clinical-status filter
6. Implement filterAllergyIntolerances(records, query) -- clinical-status filter
7. Implement filterDocumentReferences(records, query) -- date filter
8. Wire all filters into fhir-routes.ts search routes
9. Fix applyCount edge case: _count=0 treated as 20
10. Write 30 unit tests

## Verification Steps
1. All 30 fhir-search-params tests pass
2. Date prefix operators work correctly
3. Status/clinical-status filtering works
4. Code filtering works for Observation
5. _count=0 handled correctly

## Files Touched
- apps/api/src/fhir/fhir-search-params.ts (NEW)
- apps/api/src/fhir/fhir-routes.ts (MODIFIED)
- apps/api/tests/fhir-search-params.test.ts (NEW)
