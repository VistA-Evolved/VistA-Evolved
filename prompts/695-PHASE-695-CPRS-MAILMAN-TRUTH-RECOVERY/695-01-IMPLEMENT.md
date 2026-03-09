# Phase 695 - CPRS MailMan Truth Recovery

## User Request
- Continue making the clinician UI production-grade and VistA-first.
- Remove silent fallback behavior where clinician messaging presents local cache behavior as if it were MailMan.
- If a workflow is not true VistA MailMan, surface that truth explicitly.

## Implementation Steps
1. Inspect the active clinician messaging page and remove local inbox and sent-cache fallback behavior from the visible CPRS Messages screen.
2. Switch clinician compose/send to the direct VistA MailMan route so the UI reports success only when VistA accepts the message.
3. Add a direct File-menu entry for the real clinician MailMan page instead of forcing discovery through unrelated surfaces.
4. Update the chart Tasks panel so the Messages subtab is explicitly labeled as the patient portal staff queue, not MailMan.
5. Keep the existing staff-queue reply workflow intact, but clarify that it is a portal workflow rather than the clinician MailMan inbox.
6. Preserve minimal edits and existing styling patterns.

## Files Touched
- apps/web/src/app/cprs/messages/page.tsx
- apps/web/src/components/cprs/CPRSMenuBar.tsx
- apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx
- docs/runbooks/cprs-parity-closure-phase14.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes
- Verify the clinician Messages page loads real VistA MailMan data and no longer advertises local fallback mode.
- Verify compose/send success depends on real VistA MailMan acceptance.
- Verify the File menu exposes the real MailMan route directly.
- Verify the Tasks panel labels the patient-message queue truthfully as a staff queue rather than MailMan.
