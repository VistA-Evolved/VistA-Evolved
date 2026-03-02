# Phase 419 -- W25-P2: Flatten W12 + Remove Collisions (VERIFY)

## Verification Gates

### Gate 1: Collisions eliminated
- `prompts-audit.mjs` reports `Collisions: 0`

### Gate 2: 302-306 have content at top-level
- Each of `302-PHASE-302-*`, `303-PHASE-303-*`, `304-PHASE-304-*`,
  `305-PHASE-305-*`, `306-PHASE-306-*` contains `*-01-IMPLEMENT.md`,
  `*-99-VERIFY.md`, and `*-NOTES.md`

### Gate 3: Nested 299-WAVE-12 removed
- `Test-Path prompts/299-WAVE-12` returns False

### Gate 4: Empty collision duplicates removed
- `308-PHASE-308-DEPT-CERTIFICATION-RUNNER` gone
- `412-W24-P4-CERT-RUNS` gone
- `415-W24-P7-CUTOVER-ROLLBACK-DR` gone

### Gate 5: Script references updated
- `verify-phase302-orders-writeback.ps1` references
  `prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE/` (not old nested path)

### Gate 6: no-duplicate-prefixes PASS
- `check-prompts-ordering.ts` no-duplicate-prefixes gate is PASS

## Evidence
- `evidence/wave-25/419-flatten-w12/prompts-audit.after.txt`
- `evidence/wave-25/419-flatten-w12/prompts-tree-health.after.txt`
- `evidence/wave-25/419-flatten-w12/check-ordering.after.txt`
