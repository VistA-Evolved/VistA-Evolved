# Phase 723 - RC Gate Realignment (VERIFY)

## Verification Steps
1. Run: `node scripts/qa-gates/phase-index-gate.mjs`.
2. Confirm duplicate-phase check reports no new duplicates after allowlisting `614`.
3. Run: `node scripts/qa-gates/rpc-trace-compare.mjs`.
4. Confirm existence + parse + count checks pass and drift is informational only.
5. Run: `powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`.
6. Confirm required gate set no longer blocked by G02/G06.

## Acceptance Criteria
- `phase-index-gate.mjs` exits `0`.
- `rpc-trace-compare.mjs` exits `0`.
- `verify-latest.ps1` no longer reports required failures for `G02` or `G06`.
- No new TypeScript compile regressions introduced in API/web projects.

## Evidence
- Capture command outputs in terminal history.
- If verifier still reports blockers, include exact failing gate IDs and messages.
- If optional gates fail, distinguish them from required gates.

## Files Touched
- `scripts/qa-gates/phase-index-gate.mjs`
- `scripts/qa-gates/rpc-trace-compare.mjs`
