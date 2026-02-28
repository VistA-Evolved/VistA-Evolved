# Phase 234 -- FHIR Paging + Bundle Links

## User Request
Replace simple _count truncation with proper offset-based FHIR paging.
Add self/next/previous Bundle.link entries.

## Implementation Steps
1. Add FhirPagingOptions interface to mappers.ts
2. Implement toPagedSearchBundle() with offset-based pagination
3. Generate self link with current _offset + _count
4. Generate next link when more pages available
5. Generate previous link when offset > 0
6. Add extractPaging() helper in fhir-routes.ts
7. Add buildSearchQueryString() to preserve query params in links
8. Replace all toSearchBundle calls with toPagedSearchBundle in 6 search routes
9. Write 8 unit tests

## Verification Steps
1. All 8 fhir-paging tests pass
2. Self link always present
3. Next link present when more pages
4. Previous link present after first page
5. No next link on last page
6. Count clamped to 1-100

## Files Touched
- apps/api/src/fhir/mappers.ts (MODIFIED)
- apps/api/src/fhir/fhir-routes.ts (MODIFIED)
- apps/api/tests/fhir-paging.test.ts (NEW)
