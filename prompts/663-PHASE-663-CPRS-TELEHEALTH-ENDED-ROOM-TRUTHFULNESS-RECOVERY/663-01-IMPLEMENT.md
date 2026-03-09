# Phase 663 - CPRS Telehealth Ended Room Truthfulness Recovery

## Goal
Ensure the CPRS Telehealth chart panel remains truthful after a room is ended.

## Problem Statement
Phase 662 fixed the create-room drift by binding the counter strip to `/telehealth/rooms` stats.
Live verification then exposed a second truthfulness defect.
After ending the only room, the Active Rooms list correctly became empty.
However, the status strip still showed `Total: 1` because backend stats count ended rooms in the total.
The UI did not surface `ended`, so the clinician had no explanation for the non-zero total.

## Implementation Steps
1. Keep using `/telehealth/rooms` as the authoritative stats source for the chart panel.
2. Update the Telehealth status strip to display `Ended` counts explicitly.
3. Preserve the existing created, waiting, active, and total counters.
4. Avoid changing backend room-store behavior in this phase; this is a frontend truthfulness recovery.
5. Re-verify the live flow by ending a room and confirming the strip explains the empty Active Rooms state.

## Files Touched
- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`
- `ops/summary.md`
- `ops/notion-update.json`
