# Phase 268 — Data Integrity & Clinical Invariants (W8-P3)

## User Request
Detect subtle clinical bugs (wrong patient, swapped identifiers, partial chart).

## Implementation Steps
1. Create `apps/api/tests/invariants/patient-identity.test.ts`
2. Create `apps/api/tests/invariants/encounter-linkage.test.ts`
3. Create `apps/api/tests/invariants/medication-transitions.test.ts`
4. Create `apps/api/tests/invariants/text-truncation.test.ts`
5. Create `scripts/clinical-invariants-ci.mjs` — drift detector + report generator
6. Populate evidence

## Files Touched
- apps/api/tests/invariants/ (new directory, 4 test files)
- scripts/clinical-invariants-ci.mjs (new)
- evidence/wave-8/P3-data-integrity/ (new)
