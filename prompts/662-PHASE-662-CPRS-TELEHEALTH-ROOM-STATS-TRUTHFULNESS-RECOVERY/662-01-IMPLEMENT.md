# Phase 662 - CPRS Telehealth Room Stats Truthfulness Recovery

## User request

Continue the live CPRS chart audit until the clinician UI works truthfully end to end, uses VistA-first behavior where available, and fix remaining misleading UI states instead of leaving subtle drift in place.

## Problem observed live

During live browser verification of `/cprs/chart/46/telehealth`, creating a new room succeeded and the Active Rooms list correctly showed one visible room, but the status strip above it still rendered stale contradictory counters.

Observed live:

- `POST /telehealth/rooms` succeeded and created a room for the selected appointment.
- The Active Rooms section showed one visible room in `created` status.
- The provider status strip still showed `Active: 0 | Waiting: 0 | Total: 2` even though the current room list and fresh backend fetches only showed one open room.
- Remounting the tab corrected the counters, proving the chart panel had a truthfulness drift problem after the create flow.

## Inventory first

Files inspected:

- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`
- `apps/api/src/routes/telehealth.ts`
- `apps/api/src/telehealth/room-store.ts`
- `prompts/653-PHASE-653-CPRS-TELEHEALTH-CHART-LAUNCH-RECOVERY/653-01-IMPLEMENT.md`

Existing routes/endpoints involved:

- `POST /telehealth/rooms`
- `GET /telehealth/rooms`
- `GET /telehealth/health`
- `GET /vista/cprs/appointments?dfn=46`

Existing UI involved:

- `TelehealthPanel`
- Chart tab route `/cprs/chart/:dfn/telehealth`

Exact files to change:

- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`

## Implementation Steps

1. Capture room lifecycle counters from the same `/telehealth/rooms` payload that drives the rendered room list.
2. Stop treating the provider health payload as the authoritative room counter source in the chart panel.
3. Render `created` room counts explicitly so the status strip matches the visible room lifecycle state.
4. Keep the existing telehealth launch, join, and end routes unchanged.
5. Re-verify live in the browser by creating a room and confirming the counters stay aligned with the visible room list.

## Files Touched

- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`
- `prompts/662-PHASE-662-CPRS-TELEHEALTH-ROOM-STATS-TRUTHFULNESS-RECOVERY/662-01-IMPLEMENT.md`
- `prompts/662-PHASE-662-CPRS-TELEHEALTH-ROOM-STATS-TRUTHFULNESS-RECOVERY/662-99-VERIFY.md`