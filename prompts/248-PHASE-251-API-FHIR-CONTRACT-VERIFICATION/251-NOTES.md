# Phase 251 -- NOTES -- API + FHIR Contract Verification

## Design Decisions

### Why a Route Contract Registry?
- Existing contract.test.ts (Phase 37) validates against a live server
- The registry provides offline validation -- CI gates without Docker
- Machine-readable format enables future code generation (OpenAPI export)
- Contracts document expected auth levels, response shapes, and domain groupings

### Relationship to Existing FHIR Tests
The 8 existing FHIR test files (Phase 178-236) test mapper logic, scope enforcement,
search params, paging, etc. This phase adds:
- CapabilityStatement structural completeness (all 7 types + interactions + search params)
- US Core profile reference verification
- SMART configuration validation
- Cross-resource consistency checks

### What This Does NOT Do
- Does not generate OpenAPI specs (future enhancement)
- Does not test against a live server (that remains in contract.test.ts)
- Does not modify any production routes
- Does not add middleware or interceptors

### Future: OpenAPI Generation
The RouteContract type is designed to be machine-extractable for future OpenAPI 3.1
generation. The successKeys field maps to response schema properties. The auth field
maps to security schemes. This is Phase 251 scaffolding for a future OpenAPI phase.
