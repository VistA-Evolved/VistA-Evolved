# Phase 599 — Patient Search Problem Write Recovery (IMPLEMENT)

## User Request

Continue autonomously on the next real user-facing gap, keep the system truthful,
VistA-first, and fully working from the end-user perspective.

## Implementation Steps

1. Inventory the patient-search problem workflow and its prompt lineage.
2. Confirm which add-problem route is live today and which UI path is stale.
3. Update the patient-search problem form to call the truthful live write path.
4. Preserve honest status messaging: real VistA save vs draft/pending fallback.
5. Refresh the problem list after successful save and remove stale “Not Yet Implemented” wording.
6. Keep the scope minimal to the broken workflow path; do not broaden to unrelated problem dialogs.

## Verification Steps

1. Ensure Docker prerequisites remain healthy.
2. Start or confirm the API is running cleanly.
3. Log in with VEHU credentials and call the live add-problem route against DFN 46.
4. Verify the response is truthful: either real VistA save or explicit draft fallback with rpcUsed.
5. Confirm the patient-search UI wiring matches the verified live route contract.
6. Run targeted diagnostics on the edited frontend file.

## Files Touched

- apps/web/src/app/patient-search/page.tsx
- prompts/599-PHASE-599-PATIENT-SEARCH-PROBLEM-WRITE-RECOVERY/599-01-IMPLEMENT.md
- prompts/599-PHASE-599-PATIENT-SEARCH-PROBLEM-WRITE-RECOVERY/599-99-VERIFY.md
- docs/runbooks/vista-rpc-add-problem.md
- ops/summary.md
- ops/notion-update.json