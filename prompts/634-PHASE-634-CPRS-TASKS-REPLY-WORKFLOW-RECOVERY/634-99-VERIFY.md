# Phase 634 -- VERIFY: CPRS Tasks Reply Workflow Recovery

## Verification Steps

1. Confirm Docker shows `vehu` and `ve-platform-db` healthy.
2. Confirm `GET /ready` returns `ok:true` with VistA reachable.
3. Open the clinician chart Tasks tab for DFN 46.
4. Click `Reply` on a staff message and confirm no page error is thrown.
5. Confirm an inline composer appears with textarea and send/cancel controls.
6. Attempt send with empty reply text and confirm client-side validation blocks submission.
7. Submit a real reply and confirm the request succeeds through the existing staff reply API.
8. Refresh/reload the Tasks tab and confirm the panel remains usable.

## Acceptance Criteria

- No `prompt() is not supported` runtime error after clicking `Reply`.
- The reply interaction is visible, cancellable, and submit-safe.
- Failed sends surface an error message to the clinician.
- Successful sends collapse the composer and reload queue data.
- No regression to Refills or Tasks sub-tabs.

## Files Touched

- `prompts/634-PHASE-634-CPRS-TASKS-REPLY-WORKFLOW-RECOVERY/634-01-IMPLEMENT.md`
- `prompts/634-PHASE-634-CPRS-TASKS-REPLY-WORKFLOW-RECOVERY/634-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx`