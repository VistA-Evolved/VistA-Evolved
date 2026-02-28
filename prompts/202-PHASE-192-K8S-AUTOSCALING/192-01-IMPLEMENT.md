# Phase 192 -- FHIR R4 Patient Resource

## Implementation Steps
1. Implement FHIR Patient read (/fhir/r4/Patient/:id)
2. Map VistA demographics to FHIR Patient resource
3. Handle identifier systems (DFN, SSN)
4. Return OperationOutcome for errors

## Files Touched
- apps/api/src/fhir/

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies
- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
