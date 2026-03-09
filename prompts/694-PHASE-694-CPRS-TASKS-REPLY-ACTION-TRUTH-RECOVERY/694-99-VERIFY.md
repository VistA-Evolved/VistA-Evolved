# Phase 694 - CPRS Tasks Reply Action Truth Recovery Verify

## Verification Steps
1. Open /cprs/chart/46/tasks as an authenticated clinician.
2. Open Reply for an existing patient message.
3. Confirm Send Reply is disabled while the reply textarea is blank.
4. Enter only whitespace and confirm Send Reply remains disabled.
5. Enter non-whitespace reply text and confirm Send Reply becomes enabled.
6. Confirm the existing client-side fallback still rejects empty reply text if invoked indirectly.
7. Run pnpm -C apps/web exec tsc --noEmit.
8. Check editor diagnostics for MessagingTasksPanel.tsx.

## Acceptance Criteria
- The Tasks panel does not advertise a clickable Send Reply action while required reply text is missing.
- Existing reply behavior remains intact once non-whitespace text is present.
- The handler guard remains in place as a fallback.
- Documentation and ops artifacts reflect the new Tasks reply truth contract.
- Frontend compile passes with no introduced errors.

## Evidence
- Live page: /cprs/chart/46/tasks
- Message used: Rate limit proof 7
- Patient used for audit: DFN 46