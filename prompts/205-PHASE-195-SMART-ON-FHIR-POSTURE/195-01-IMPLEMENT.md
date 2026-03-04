# Phase 195 -- SMART on FHIR Posture

## Implementation Steps

1. Implement SMART launch context for EHR launch flow
2. Add CapabilityStatement endpoint (/fhir/r4/metadata)
3. Declare supported authorization scopes per SMART spec
4. Configure SMART well-known endpoint for discovery

## Files Touched

- apps/api/src/fhir/

## Source

- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Corrected by audit fix (title alignment with folder name)

## Dependencies

- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
