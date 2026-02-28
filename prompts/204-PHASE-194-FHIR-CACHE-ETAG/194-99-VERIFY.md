# Phase 194 -- Verify: FHIR Cache ETag

## Verification Steps
1. ETag present on FHIR responses
2. Conditional GET returns 304 when unchanged
3. Cache headers correct
4. Stale cache detected and refreshed

## Acceptance Criteria
- [ ] ETag present on FHIR responses
- [ ] Conditional GET returns 304 when unchanged
- [ ] Cache headers correct
- [ ] Stale cache detected and refreshed

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Corrected by audit fix (title alignment with folder name)

## Notes
- All verification steps require the relevant infrastructure to be running
- Run the corresponding phase verifier script if available
