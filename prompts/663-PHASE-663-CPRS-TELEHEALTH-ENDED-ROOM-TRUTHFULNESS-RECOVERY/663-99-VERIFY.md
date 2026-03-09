# Phase 663 - CPRS Telehealth Ended Room Truthfulness Recovery

## Verification Scope
Verify the Telehealth chart panel stays truthful after a room is ended.

## Verification Steps
1. Open `/cprs/chart/46/telehealth` in a live authenticated clinician session.
2. Confirm the status strip matches the visible Active Rooms list before mutation.
3. End an existing created or active room.
4. Confirm the Active Rooms list becomes empty when no non-ended rooms remain.
5. Confirm the status strip explicitly shows `Ended: 1` when `/telehealth/rooms` reports an ended room.
6. Confirm the UI no longer leaves `Total` unexplained when the visible list is empty.
7. Run editor diagnostics on `TelehealthPanel.tsx` and confirm no new errors.

## Acceptance Criteria
1. After ending the only room, the Active Rooms list shows no active telehealth rooms.
2. The provider status strip explicitly renders `Ended` counts from `/telehealth/rooms` stats.
3. The strip and list remain mutually consistent across create and end transitions.
4. No backend contract changes are required for this truthfulness recovery.
5. `TelehealthPanel.tsx` remains free of new diagnostics.
