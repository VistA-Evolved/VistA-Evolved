# Phase 662 - CPRS Telehealth Room Stats Truthfulness Recovery

## Verification Steps

1. Verify the API is running and clinician authentication still works.
2. Open `/cprs/chart/46/telehealth` in the browser and confirm telehealth appointments load.
3. Create a new room from a selected telehealth appointment.
4. Confirm the Active Rooms section shows the created room.
5. Confirm the provider status strip uses the same current room counts as the visible room list.
6. Confirm `created` rooms are surfaced explicitly in the counter strip.
7. Confirm no new workspace diagnostics were introduced in `TelehealthPanel.tsx`.

## Acceptance Criteria

- The clinician can still create a room from the CPRS Telehealth chart tab.
- The Active Rooms section still shows the created room after launch.
- The status strip no longer reports contradictory totals after room creation.
- The counter strip explicitly accounts for `created` rooms instead of implying there are zero current rooms when one is visible.
- The fix is frontend-only and does not change the live telehealth backend route contract.
- `TelehealthPanel.tsx` remains free of new diagnostics.

## Manual Browser Proof Target

- Before fix: a visible created room could coexist with `Active: 0 | Waiting: 0 | Total: 2`.
- After fix: the same panel should show aligned counters such as `Created: 1 | Waiting: 0 | Active: 0 | Total: 1` when exactly one created room is visible.