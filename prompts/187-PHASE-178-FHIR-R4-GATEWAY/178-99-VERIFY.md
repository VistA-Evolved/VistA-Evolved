# Phase 178 -- Verify: FHIR R4 Gateway

## Verification Steps

1. FHIR Patient resource maps from ORWPT SELECT
2. Bundle responses conform to R4 spec
3. Content-Type headers correct
4. Invalid resource types return OperationOutcome

## Acceptance Criteria

- [ ] FHIR Patient resource maps from ORWPT SELECT
- [ ] Bundle responses conform to R4 spec
- [ ] Content-Type headers correct
- [ ] Invalid resource types return OperationOutcome

## Source

- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Notes

- All verification steps require the relevant infrastructure to be running
- Run the corresponding phase verifier script if available
