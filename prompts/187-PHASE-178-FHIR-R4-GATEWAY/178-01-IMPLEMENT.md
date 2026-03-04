# Phase 178 -- FHIR R4 Gateway

## Implementation Steps

1. Design FHIR R4 resource mappings for Patient, Encounter, AllergyIntolerance, MedicationStatement
2. Map VistA RPC responses to FHIR Bundle format
3. Create /fhir/r4/ route prefix for FHIR endpoints
4. Implement content negotiation (application/fhir+json)

## Files Touched

- apps/api/src/routes/fhir/
- apps/api/src/fhir/

## Source

- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies

- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
