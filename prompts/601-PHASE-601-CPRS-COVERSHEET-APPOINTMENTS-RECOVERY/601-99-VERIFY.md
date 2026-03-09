# Phase 601 — CPRS Cover Sheet Appointments Recovery — VERIFY

## Verification Steps

1. Confirm Docker and the local API are running cleanly.
2. Call `GET /vista/cprs/appointments?dfn=46` with a live authenticated session
   and capture the returned appointment payload.
3. Run targeted web type checking to confirm the cover sheet changes compile.
4. Verify the cover sheet appointments card shows live data when the route is
   available and only shows a pending badge when the backend returns a pending
   posture.
5. Run the latest repository verifier and regenerate prompt metadata if the new
   Phase 601 prompt folder changes the phase index count.

## Acceptance Criteria

- The CPRS cover sheet no longer hardcodes appointments as integration-pending.
- The appointments card renders real data from `/vista/cprs/appointments`.
- The action registry marks the cover sheet appointments action as wired.
- The UI still surfaces truthful fallback messaging when the backend route is
  unavailable or explicitly pending.
- Verification passes without regressing unrelated workflows.
