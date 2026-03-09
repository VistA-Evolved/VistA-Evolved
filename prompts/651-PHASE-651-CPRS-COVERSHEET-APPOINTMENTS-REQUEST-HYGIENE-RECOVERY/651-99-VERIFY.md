# Phase 651 - CPRS Cover Sheet Appointments Request Hygiene Recovery (VERIFY)

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are healthy.
2. Confirm the API returns `ok:true` from `/health` and `/vista/ping`.
3. Validate the touched scheduling adapter and Cover Sheet files with workspace diagnostics.
4. Login and fetch `GET /vista/cprs/appointments?dfn=46`.
5. Confirm the payload no longer includes a request row with empty clinic/date values.
6. Confirm legitimate request rows still remain in the response.
7. Verify `/cprs/chart/46/cover` no longer renders the junk appointments row with `—` placeholders.
8. Verify the Cover Sheet appointments card now formats request dates into readable chart timestamps.

## Acceptance Criteria

- The appointments backing route excludes non-appointment cancellation placeholders that lack clinician-usable date/clinic data.
- Legitimate appointment request rows still appear in the merged appointment feed.
- The Cover Sheet appointments card shows readable dates instead of raw ISO strings.
- No frontend-only hiding is used to mask malformed backend rows.