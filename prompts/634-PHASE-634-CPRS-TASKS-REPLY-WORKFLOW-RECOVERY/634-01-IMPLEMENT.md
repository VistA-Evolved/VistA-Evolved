# Phase 634 -- IMPLEMENT: CPRS Tasks Reply Workflow Recovery

## Goal

Replace the CPRS Tasks message reply dead-end with a real in-app reply composer.

## Implementation Steps

1. Inventory the current Tasks panel reply flow and confirm the live browser failure.
2. Verify runtime health first: Docker containers healthy, API ready, VistA reachable.
3. Inspect the clinician staff messaging API contract and keep the existing POST reply route unchanged unless required.
4. Remove direct `prompt()` usage from the Tasks panel.
5. Add an in-panel reply composer with textarea, cancel, submit, validation, and visible error state.
6. Preserve existing session + CSRF behavior for the reply POST.
7. Refresh the queue after a successful reply and collapse the composer.

## Files Touched

- `prompts/634-PHASE-634-CPRS-TASKS-REPLY-WORKFLOW-RECOVERY/634-01-IMPLEMENT.md`
- `prompts/634-PHASE-634-CPRS-TASKS-REPLY-WORKFLOW-RECOVERY/634-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx`
- `apps/api/src/routes/portal-core.ts` (inspected for existing reply contract)

## Notes

- Root cause is a frontend interaction bug, not a missing backend endpoint.
- The clinician reply route already exists at `/portal/staff/messages/:id/reply`.
- The recovery should follow existing CPRS styling and avoid introducing a new UI system.