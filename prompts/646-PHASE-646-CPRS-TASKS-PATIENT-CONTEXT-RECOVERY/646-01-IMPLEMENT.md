# Phase 646 - CPRS Tasks Patient Context Recovery

## User request

Continue the live CPRS chart audit until the clinician UI is working truthfully end to end. Recover any chart tab that shows data from the wrong patient context.

## Inventory first

- Inspect `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx` for how the chart-scoped Tasks tab fetches staff queues.
- Inspect `apps/api/src/routes/portal-core.ts` staff queue endpoints used by the CPRS Tasks chart tab.
- Inspect `apps/api/src/services/portal-messaging.ts`, `apps/api/src/services/portal-refills.ts`, and `apps/api/src/services/portal-tasks.ts` to confirm each queue item already carries patient identifiers.
- Inspect prior Tasks recovery prompts, especially Phase 623 and Phase 634, so the new fix composes with existing tenant-context and reply workflow recoveries.

## Implementation Steps

1. Reproduce the defect in the live browser by opening a patient chart Tasks tab and confirming it shows queue rows for a different patient.
2. Keep the staff workspace behavior intact, but add optional patient-context filtering for the chart-scoped queue reads.
3. Update the CPRS Tasks panel to request only the current chart DFN instead of loading cross-patient queues.
4. Preserve reply, refill review, and task rendering behavior for matching rows.
5. Update the relevant messaging/tasks runbook to record that the chart Tasks tab must stay patient-scoped even when it reuses staff queue endpoints.

## Files Touched

- `prompts/646-PHASE-646-CPRS-TASKS-PATIENT-CONTEXT-RECOVERY/646-01-IMPLEMENT.md`
- `prompts/646-PHASE-646-CPRS-TASKS-PATIENT-CONTEXT-RECOVERY/646-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx`
- `apps/api/src/routes/portal-core.ts`
- `docs/runbooks/phase32-messaging-refills.md`