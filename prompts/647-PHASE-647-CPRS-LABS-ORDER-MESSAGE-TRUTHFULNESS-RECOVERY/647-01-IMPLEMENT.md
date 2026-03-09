# Phase 647 - CPRS Labs Order Message Truthfulness Recovery

## User Request

Continue the clinician-tab audit and fix any user-visible lab ordering behavior that hides the real VistA posture.

## Implementation Steps

1. Inventory the live Labs quick-order path before editing:
- confirm `apps/web/src/components/cprs/panels/LabsPanel.tsx` is the chart entry point
- confirm `createLabOrder(...)` in `apps/web/src/stores/data-cache.tsx` calls `POST /vista/cprs/orders/lab`
- confirm the backend returns a truthful draft response for unsupported VEHU quick-order cases

2. Patch the Labs panel so unsupported or draft responses do not collapse into a generic failure string.
- preserve `message` and `pendingNote` from the backend when `ok:false`
- distinguish real failures from truthful draft or sync-pending posture in the clinician message tone

3. Update the lab-order runbook so the UI expectation matches the real VEHU contract.
- document that free-text requests like `CBC` usually surface a draft/unsupported-in-sandbox response in default VEHU
- document that the chart must show that backend message directly

4. Record the recovery in ops artifacts and verify the live UI.

## Files Touched

- apps/web/src/components/cprs/panels/LabsPanel.tsx
- docs/runbooks/vista-rpc-add-lab-order.md
- prompts/647-PHASE-647-CPRS-LABS-ORDER-MESSAGE-TRUTHFULNESS-RECOVERY/647-99-VERIFY.md
- ops/summary.md
- ops/notion-update.json