# Phase 682 - IMPLEMENT: CPRS Notes Refresh Continuity Recovery

## User Request

- Continue autonomous, VistA-first recovery work until clinician-facing CPRS workflows feel complete and production-grade.
- Repair real browser workflow defects instead of stopping at route-level success.
- Check prompt lineage before changing an existing panel workflow.

## Problem Statement

Live verification of the CPRS Notes panel showed that creating a TIU note succeeds and returns a real document IEN, but the panel then hides the existing notes table and collapses into a blank `Loading notes...` state until the follow-up refresh finishes. The data is truthful, but the interaction is not clinician-grade because the panel discards already-known note rows during a refresh cycle even though it can keep showing trustworthy cached data.

## Implementation Steps

1. Preserve the Phase 608 notes truthfulness contract: no fake empty state and no invented local notes.
2. Keep the existing live TIU-backed refresh path after create/sign/addendum actions.
3. Update `apps/web/src/components/cprs/panels/NotesPanel.tsx` so a refresh loader is only blocking when there are no trustworthy note rows yet.
4. When cached note rows already exist, keep the table visible during refresh and surface loading as a secondary non-destructive indicator.
5. Preserve pending-banner behavior for failed or integration-pending note reads.
6. Re-verify by creating a note from the live Notes panel against VEHU and confirming the list remains visible while the refresh completes.

## Verification Steps

1. Run targeted diagnostics on the touched web file.
2. Confirm Docker and API health remain good.
3. Open the live Notes tab for DFN 46, create a note, and verify the TIU-backed create route returns a real document IEN.
4. Confirm the Notes panel keeps the prior note list visible during the post-save refresh instead of collapsing to a blank loading pane.
5. Confirm the refreshed list still converges to the live note set after the request settles.

## Files Touched

- prompts/682-PHASE-682-CPRS-NOTES-REFRESH-CONTINUITY-RECOVERY/682-01-IMPLEMENT.md
- prompts/682-PHASE-682-CPRS-NOTES-REFRESH-CONTINUITY-RECOVERY/682-99-VERIFY.md
- apps/web/src/components/cprs/panels/NotesPanel.tsx
- docs/runbooks/vista-rpc-notes.md
- ops/summary.md
- ops/notion-update.json