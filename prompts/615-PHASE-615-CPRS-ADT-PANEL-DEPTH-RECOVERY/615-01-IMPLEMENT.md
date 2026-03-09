# Phase 615 — IMPLEMENT: CPRS ADT Panel Depth Recovery

## User Request

Continue CPRS parity recovery so the user-facing chart tab is fully working, VistA-first, and truthful. If an existing phase already defined intended functionality, recover that behavior instead of inventing a new shallow UI.

## Implementation Steps

1. Inventory the current ADT panel against the original Phase 137 ADT + Bedboard + Census prompt.
2. Confirm which ADT routes already exist and are live in the API, especially `/vista/adt/census` and `/vista/adt/movements`.
3. Upgrade `apps/web/src/components/cprs/panels/ADTPanel.tsx` so the chart tab surfaces the richer ADT depth already present in the backend instead of only the older Phase 67 list views.
4. Keep the panel VistA-first and truthful:
- use live `/vista/adt/*` reads for census and movement history
- preserve explicit integration-pending posture for DG write actions that the sandbox cannot execute
- do not fake bedboard or movement detail that the route does not actually return
5. Reuse existing CPRS visual patterns where practical so the panel feels like the rest of the chart, not a one-off admin page.
6. Validate the upgraded panel in the browser on the real `/cprs/chart/[dfn]/adt` route.
7. Update runbook and ops artifacts after live verification.

## Files Touched

- prompts/615-PHASE-615-CPRS-ADT-PANEL-DEPTH-RECOVERY/615-01-IMPLEMENT.md
- prompts/615-PHASE-615-CPRS-ADT-PANEL-DEPTH-RECOVERY/615-99-VERIFY.md
- apps/web/src/components/cprs/panels/ADTPanel.tsx
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json
