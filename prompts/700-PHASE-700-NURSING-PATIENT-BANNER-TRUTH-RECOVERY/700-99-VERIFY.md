# Phase 700 - Nursing Patient Banner Truth Recovery Verification

## Verification Steps

1. Confirm Docker and the API are running cleanly on the VEHU lane.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Probe `ORWPT16 ID INFO` for DFN 46 and capture the raw positional response.
4. Call `GET /vista/nursing/patient-context?dfn=46` and confirm `patient.name` contains the live patient name rather than the SSN.
5. Open `/cprs/nursing?dfn=46` in an authenticated browser session.
6. Confirm the standalone Nursing patient banner shows the live patient name and DFN 46.
7. Run editor diagnostics on `apps/api/src/routes/nursing/index.ts`.

## Acceptance Criteria

- `/vista/nursing/patient-context` no longer maps the SSN into `patient.name`.
- The standalone Nursing banner shows the live patient name.
- The VEHU field-order caveat is documented in the nursing runbooks.
- Diagnostics are clean on the touched API route.
