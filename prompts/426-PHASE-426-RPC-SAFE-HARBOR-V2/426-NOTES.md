# Phase 426 -- NOTES

- **Wave**: 26, Position 4 (W26 P4)
- **Type**: Documentation / Safety classification
- **Risk**: None -- data file only, no code changes
- **Dependencies**: Phase 424 (runtime matrix for domain context)

## Key Decisions

1. Five-tier system: safe-harbor > supervised > experimental > blocked > infrastructure.
   This matches the common clinical systems pattern of graduated trust levels.
2. ORQQPL EDIT SAVE classified as "blocked" because it genuinely doesn't exist
   in the WorldVistA Docker sandbox (confirmed during Phase 14A capability discovery).
3. Order-related RPCs classified as "supervised" due to mandatory LOCK/UNLOCK
   bracketing and clinical significance. Even though they work in sandbox, they
   require clinician oversight in production.
4. Custom ZVE\* RPCs classified as "safe-harbor" because we control their MUMPS
   implementations and have full test coverage.
