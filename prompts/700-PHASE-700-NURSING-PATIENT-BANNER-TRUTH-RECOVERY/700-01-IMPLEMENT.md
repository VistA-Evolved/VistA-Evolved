# Phase 700 - Nursing Patient Banner Truth Recovery

## Goal

Recover truthful standalone nursing patient-banner behavior so `/cprs/nursing` shows the live patient name from VistA instead of mislabeling the SSN as the patient name.

## Implementation Steps

1. Reproduce the standalone nursing banner defect for DFN 46 and confirm the banner shows an SSN where the patient name should appear.
2. Inspect the `/vista/nursing/patient-context` route and verify how `ORWPT16 ID INFO` is being parsed.
3. Probe the raw `ORWPT16 ID INFO` output on the VEHU lane and confirm the actual positional field ordering.
4. Correct the patient-context parser so `patient.name` maps to the real patient-name field.
5. Update the nursing runbooks to document the VEHU field ordering and the corrected banner contract.
6. Restart the API and verify both the route payload and the standalone Nursing banner live.

## Files Touched

- `apps/api/src/routes/nursing/index.ts`
- `docs/runbooks/nursing-flowsheets.md`
- `docs/runbooks/nursing-grounding.md`
- `ops/summary.md`
- `ops/notion-update.json`
