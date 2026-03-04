# Phase 193 -- FHIR Encounter Resource

## Implementation Steps

1. Implement FHIR R4 Encounter read and search endpoints
2. Map VistA visit data (ORWCV VST) to Encounter resource
3. Support search by patient and date range parameters
4. Add period, class, and type mappings per R4 spec

## Files Touched

- apps/api/src/fhir/

## Source

- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Corrected by audit fix (title alignment with folder name)

## Dependencies

- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
