# Phase 604 — CPRS Cover Sheet Reminders Recovery — VERIFY

## Verification Steps

1. Confirm Docker prerequisites:
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. Start the API with `.env.local` loaded and confirm clean startup logs.
3. Log in with `PRO1234 / PRO1234!!` and call:
   - `GET /vista/cprs/reminders?dfn=46`
4. Verify the reminders route returns either live results or `ok:true` with
   `status:"ok-empty"` and `rpcUsed:["ORQQPX REMINDERS LIST"]`.
5. Open the CPRS chart cover sheet for patient DFN 46 and verify the reminders
   card shows `No clinical reminders due` only for live empty results and shows
   a pending badge/message when the route is unavailable.
6. Run TypeScript validation for touched frontend code.
7. Run `scripts/verify-latest.ps1`.

## Acceptance Criteria

- Cover sheet reminders no longer silently collapse route failure into an empty state.
- Live empty reminder responses render the correct empty-state copy.
- Pending badge/modal wiring is used for actual unavailable states.
- TypeScript passes and repo verification remains green.
