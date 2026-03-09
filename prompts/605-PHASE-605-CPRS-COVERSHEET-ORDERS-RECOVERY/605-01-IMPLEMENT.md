# Phase 605 — CPRS Cover Sheet Orders Recovery

## Mission

Recover truthful live state handling for the CPRS cover sheet orders summary
card. The card must distinguish live empty unsigned-order results from route
failure or unavailable backend posture and must not silently show `No unsigned
orders` when the live route actually failed.

## Implementation Steps

1. Inventory the current cover sheet orders summary fetch path and compare it to
   the CPRS wave 1 orders summary contract.
2. Verify the live backend posture for `GET /vista/cprs/orders-summary?dfn=46`.
3. Add explicit orders pending state to the cover sheet so the card reflects the
   latest fetch result instead of collapsing failures into an empty state.
4. Keep user-visible behavior truthful:
   - live empty -> `No unsigned orders`
   - route failure / unavailable -> pending badge + pending copy
5. Reuse the existing cover sheet pending badge/modal wiring instead of adding
   a separate UI path.
6. Re-run TypeScript and live HTTP verification after the change.

## Files Touched

- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- `docs/runbooks/phase56-wave1-layout.md`
- `ops/summary.md`
- `ops/notion-update.json`
