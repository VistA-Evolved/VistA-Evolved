# Phase 73 -- Drift Lock + PendingTargets Index + Repo Hygiene

## User Request

NO new product features. Only governance, indexing, verification hardening, repo hygiene.

## Implementation Steps

1. **Repo hygiene gate** (`scripts/governance/verifyRepoHygiene.ts`)
   - Fail if sprawl dirs exist (reports/, docs/reports/, output/, tmp/)
   - Fail if artifacts tracked by git
   - Fail if prompts folder has duplicate/missing phase numbers

2. **Prompts ordering audit** (enhance existing `check-prompts-ordering.ts`)
   - Output to /artifacts/governance/prompts-audit.json
   - Add prompt header matcher gate (title must match filename)

3. **PendingTargets index** (`scripts/governance/buildPendingTargetsIndex.ts`)
   - Scan apps/web + apps/api for pendingTargets usage
   - Capture file, line, screenId/route, RPC names, UI text
   - Output to /artifacts/governance/pending-targets-index.json

4. **Traceability index** (`scripts/governance/buildTraceabilityIndex.ts`)
   - Enumerate all actionIds from actionRegistry.ts
   - Verify endpoint mapping + rpcRegistry cross-ref
   - Output to /artifacts/governance/traceability-index.json

5. **Eliminate reports sprawl** -- clean up docs/reports if tracked

6. **Upgrade verify-latest** to run hygiene + indexes first

## Verification Steps

- TSC clean (api + web)
- verify-latest passes
- Hygiene gate passes
- PendingTargets index generates valid JSON
- Traceability index generates valid JSON

## Files Touched

| File | Action |
|------|--------|
| scripts/governance/verifyRepoHygiene.ts | CREATE |
| scripts/governance/buildPendingTargetsIndex.ts | CREATE |
| scripts/governance/buildTraceabilityIndex.ts | CREATE |
| scripts/verify-latest.ps1 | MODIFY |
| scripts/verify-phase73-drift-lock.ps1 | CREATE |
| prompts/78-PHASE-73-DRIFT-LOCK/78-01-IMPLEMENT.md | CREATE |
| prompts/78-PHASE-73-DRIFT-LOCK/78-99-VERIFY.md | CREATE |
