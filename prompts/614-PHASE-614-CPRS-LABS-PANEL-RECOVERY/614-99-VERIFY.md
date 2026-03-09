# Phase 614 - VERIFY: CPRS Labs Panel Recovery

## Verification Steps

1. Verify Docker containers and API startup health before testing the panel.
2. Open the CPRS chart Labs tab and confirm the missing `LabsPanel` import failure is gone.
3. Confirm the results view loads live VistA lab data from `GET /vista/labs?dfn=46`.
4. Confirm result acknowledgement from the Labs tab returns a truthful mode response.
5. Confirm the deep lab workflow views load from the existing backend endpoints:
   - `GET /lab/dashboard`
   - `GET /lab/orders?dfn=46`
   - `GET /lab/specimens?dfn=46`
   - `GET /lab/results?dfn=46`
   - `GET /lab/critical-alerts?dfn=46`
   - `GET /lab/writeback-posture`
6. Confirm no deep workflow action claims a VistA write succeeded unless the backend returned success.
7. Run TypeScript checks for the changed web file.
8. Update runbook and ops artifacts with real manual test steps and observed posture.

## Acceptance Criteria

- The CPRS Labs tab renders and is navigable from the chart route.
- Live VistA lab results remain available and truthful.
- Deep lab lifecycle views are exposed in one coherent panel instead of being stranded behind backend-only routes.
- Sandbox write limitations remain explicit in the UI.
- Documentation and ops artifacts reflect the recovered Labs panel behavior.