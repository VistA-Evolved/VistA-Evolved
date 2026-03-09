# Phase 687 - CPRS Cover Sheet Appointments Truth Recovery - VERIFY

## Verification Steps

1. Confirm Docker, `/health`, and `/vista/ping` are healthy with the API running
   against VEHU.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/cprs/appointments?dfn=46` and confirm the response is
   grounded to `ORWPT APPTLST` instead of `SDOE LIST ENCOUNTERS FOR PAT`.
4. Confirm the response no longer contains `source:"request"` rows or request
   statuses such as `request:pending` and `request:approved`.
5. Open `/cprs/chart/46/cover` and confirm the Appointments card no longer
   renders request workflow rows as chart appointments.
6. Confirm the card target/empty-state copy now reflects CPRS appointment truth
   rather than `appointments or requests` wording.

## Acceptance Criteria

1. The cover-sheet appointments route uses the CPRS-specific read path.
2. The route returns truthful appointment-only rows for the cover sheet.
3. Request-store workflow entries are no longer shown as chart appointments.
4. The Cover Sheet appointments card renders a truthful appointment contract.
5. Live VEHU route and browser verification are both captured in ops artifacts.