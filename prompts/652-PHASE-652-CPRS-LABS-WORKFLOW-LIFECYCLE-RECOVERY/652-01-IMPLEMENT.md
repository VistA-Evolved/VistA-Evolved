# Phase 652 - CPRS Labs Workflow Lifecycle Recovery

## User Request

- Continue the clinician-chart audit and fix any lab workflow behavior that claims progress while leaving the underlying lifecycle inconsistent.
- Keep the implementation VistA-first and preserve truthful sandbox posture instead of inventing fake completion.

## Implementation Steps

1. Inventory the live Labs workflow behavior after Phase 614/647.
2. Reproduce the deep workflow path in the browser by creating a lab order, then recording a result against that order.
3. Confirm whether `/lab/orders`, `/lab/results`, and `/lab/dashboard` stay internally consistent after result capture.
4. Patch the backend lab store so recording a result validates the source order and advances the order lifecycle to a truthful post-result state.
5. Preserve higher-order states like `reviewed`, `verified`, and `final` instead of regressing them when a new result is recorded.
6. Reject invalid result capture attempts such as missing or cancelled source orders.
7. Update the phase-12 parity runbook so the Labs workflow contract documents lifecycle advancement after result capture.
8. Record the recovery in ops artifacts and verify it live against the running API.

## Files Touched

- apps/api/src/lab/lab-store.ts
- apps/api/src/lab/lab-routes.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json
- prompts/652-PHASE-652-CPRS-LABS-WORKFLOW-LIFECYCLE-RECOVERY/652-01-IMPLEMENT.md
- prompts/652-PHASE-652-CPRS-LABS-WORKFLOW-LIFECYCLE-RECOVERY/652-99-VERIFY.md