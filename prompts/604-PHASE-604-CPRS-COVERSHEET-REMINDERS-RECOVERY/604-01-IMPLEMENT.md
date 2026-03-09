# Phase 604 — CPRS Cover Sheet Reminders Recovery

## Mission

Recover truthful live state handling for the CPRS cover sheet clinical reminders
card. The card must distinguish live empty reminder results from route failure or
unavailable VistA posture and must not silently present an empty-state message
when the reminders RPC call actually failed.

## Implementation Steps

1. Inventory the current cover sheet reminders fetch path and compare it to the
   Phase 78 reminders contract.
2. Verify the live backend posture for `GET /vista/cprs/reminders?dfn=46`.
3. Add explicit reminders pending state to the cover sheet so the UI tracks the
   latest fetch result instead of collapsing all failures into an empty list.
4. Keep user-visible behavior truthful:
   - live empty -> `No clinical reminders due`
   - route failure / unavailable -> pending badge + pending copy
5. Reuse the existing cover sheet pending modal/action wiring instead of adding
   a parallel UI path.
6. Re-run TypeScript and live HTTP verification after the change.

## Files Touched

- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- `docs/runbooks/phase56-wave1-layout.md`
- `ops/summary.md`
- `ops/notion-update.json`
