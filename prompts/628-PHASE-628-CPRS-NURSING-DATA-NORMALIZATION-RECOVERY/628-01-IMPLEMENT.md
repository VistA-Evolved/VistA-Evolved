# Phase 628 - CPRS Nursing Data Normalization Recovery

## User request

Continue the live CPRS chart audit until the full clinician UI works truthfully end to end, using VistA-first behavior and checking prompt lineage when behavior looks missing, pending, or wrong.

## Problem observed live

During the live browser audit of Nursing for DFN=46, the backend was healthy and VistA-backed, but the rendered data was materially wrong:

- Vitals showed raw internal values like `3155` and `3030407.1113` in the Date and Units columns.
- Flowsheet reused the same malformed vitals shape, so timestamps were rendered as raw numeric fragments and appended into the Value column.
- Nursing Notes showed raw FileMan dates and internal TIU author/status fields instead of human-readable note metadata.

This was not a VistA outage. `/vista/nursing/vitals`, `/vista/nursing/flowsheet`, and `/vista/nursing/notes` all returned live data, but `apps/api/src/routes/nursing/index.ts` was parsing the RPC wire format incorrectly.

## Inventory first

Files inspected:

- `apps/api/src/routes/nursing/index.ts`
- `apps/web/src/components/cprs/panels/NursingPanel.tsx`
- `apps/api/src/server/inline-routes.ts`
- `apps/api/src/routes/cprs/tiu-notes.ts`
- `prompts/143-PHASE-138-NURSING-DOC-MAR-HANDOFF/138-01-IMPLEMENT.md`
- `prompts/143-PHASE-138-NURSING-DOC-MAR-HANDOFF/138-99-VERIFY.md`

Existing routes/endpoints involved:

- `GET /vista/nursing/vitals?dfn=46`
- `GET /vista/nursing/flowsheet?dfn=46`
- `GET /vista/nursing/notes?dfn=46`
- Reference parser: `GET /vista/vitals?dfn=46`

Existing UI involved:

- `NursingPanel` Vitals tab
- `NursingPanel` Flowsheet tab
- `NursingPanel` Notes tab

Exact files to change:

- `apps/api/src/routes/nursing/index.ts`

## Implementation steps

1. Add a shared FileMan date formatter in the nursing route file.
2. Fix the `ORQQVI VITALS` parser so the 4th caret piece is treated as the FileMan timestamp, not units.
3. Derive display units by vital type instead of leaking the raw timestamp into the units/value fields.
4. Fix the TIU nursing notes parser to use the same field positions as the working CPRS note route:
   - `parts[2]` as FileMan date
   - `parts[4]` as author field
   - `parts[6]` as status
5. Re-verify in the live browser and via live HTTP endpoints against the running VEHU Docker/API.

## Verification steps

1. Confirm Docker/API readiness remains healthy:
   - `curl.exe -s http://127.0.0.1:3001/ready`
2. Authenticate and call the live nursing routes:
   - `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/nursing/vitals?dfn=46"`
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/nursing/flowsheet?dfn=46"`
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/nursing/notes?dfn=46"`
3. Reload the live Nursing tab in the browser and verify:
   - Vitals dates are human-readable timestamps
   - Vitals units are blank or clinically meaningful, never raw FileMan timestamps
   - Flowsheet no longer concatenates timestamps into the value column
   - Notes show human-readable dates, author names, and note status
4. Run file diagnostics on the edited route file.

## Files touched

- `apps/api/src/routes/nursing/index.ts`
- `prompts/628-PHASE-628-CPRS-NURSING-DATA-NORMALIZATION-RECOVERY/628-01-IMPLEMENT.md`
- `prompts/628-PHASE-628-CPRS-NURSING-DATA-NORMALIZATION-RECOVERY/628-99-VERIFY.md`