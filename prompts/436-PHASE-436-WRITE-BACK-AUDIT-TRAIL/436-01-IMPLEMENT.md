# Phase 436 — Write-Back Audit Trail (W27 P6)

## Goal
Activate orphaned `write.*` immutableAudit actions for all clinical adapter write methods.

## What Changed
1. Created `adapters/adapter-audit.ts` — centralized audit emitter for adapter writes
2. Wired `auditAdapterWrite()` into all 4 live adapter write methods in `vista-adapter.ts`:
   - `addAllergy()` → emits `write.allergy`
   - `addVital()` → emits `write.vitals`
   - `createNote()` → emits `write.note`
   - `addProblem()` → emits `write.problem`
3. Added `adapter-write-audit` entry to `store-policy.ts`

## Design Decisions
- Centralized audit helper avoids inline duplication across methods
- Uses `immutableAudit()` (hash-chained) not `audit()` (lightweight), matching the write severity
- PHI auto-redacted by `sanitizeAuditDetail()` in immutable-audit.ts
- Both success and failure paths emit audit events
- Error catch blocks emit audit BEFORE returning error result
- `duz` passed as actor sub for provider attribution

## Files Changed
- `apps/api/src/adapters/adapter-audit.ts` (NEW)
- `apps/api/src/adapters/clinical-engine/vista-adapter.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED)
