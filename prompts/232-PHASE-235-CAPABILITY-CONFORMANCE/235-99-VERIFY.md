# Phase 235 -- VERIFY -- CapabilityStatement Conformance

## Verification Steps

1. Run: `pnpm -C apps/api test -- --run tests/fhir-capability-conformance.test.ts`
2. Confirm 50/50 tests pass
3. Run: `pnpm -C apps/api test -- --run tests/fhir-conformance.test.ts`
4. Confirm 44/44 existing tests pass
5. Verify cross-check: every Q233 param is declared in CapabilityStatement
6. Verify security section present with SMART-on-FHIR service code

## Acceptance Criteria

- CapabilityStatement accurately reflects all implemented features
- SMART security posture advertised
- Status upgraded to "active"
- 50 + 44 tests green
