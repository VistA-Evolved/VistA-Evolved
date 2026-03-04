# Phase 308 -- W12-P10 IMPLEMENT

## Departmental Certification Runner

### Goal

Create a comprehensive certification runner that validates the entire clinical
writeback system end-to-end: command bus, all 6 domain executors, telehealth
hardening modules, feature gates, and safety guards.

### Steps

1. Create `writeback/certification-runner.ts` with 17 certification checks:
   - 4 infrastructure: command bus, gates, audit actions, store policy
   - 6 domain: TIU, ORDERS, PHARM, LAB, ADT, IMG executor validation + dry-run
   - 3 telehealth: encounter linkage, consent posture, session hardening
   - 4 safety: dry-run default, kill-switch, intent mapping, PHI guard
2. Update writeback-routes.ts with `/writeback/certification` and `/writeback/certification/summary` endpoints
3. Update barrel export (index.ts) with certification exports
4. Create contract tests for certification runner (14 tests)
5. Create evidence + verifier

### Files Touched

- apps/api/src/writeback/certification-runner.ts (NEW)
- apps/api/src/writeback/**tests**/certification-contract.test.ts (NEW)
- apps/api/src/writeback/writeback-routes.ts (MODIFIED — +2 endpoints)
- apps/api/src/writeback/index.ts (MODIFIED — +certification exports)
- prompts/308-PHASE-308-CERTIFICATION-RUNNER/308-01-IMPLEMENT.md
- prompts/308-PHASE-308-CERTIFICATION-RUNNER/308-99-VERIFY.md
- prompts/308-PHASE-308-CERTIFICATION-RUNNER/308-NOTES.md
- evidence/wave-12/308-certification-runner/evidence.md
- scripts/verify-phase308-certification-runner.ps1
