# Phase 5B — Patient Demographics (IMPLEMENT)

Goal:
After selecting a DFN, fetch and display basic demographics:
name, dfn, dob, sex.

Lessons learned to enforce:

- FileMan dates are YYYMMDD where YYY = year-1700 (BUG-012).
- Many RPCs return -1^error (BUG-013). Handle cleanly.
- .env.local must be loaded properly (BUG-010):
  Ensure apps/api start script loads env file OR document required env load method.

Preconditions:

- Phase 4B works
- Phase 5A UI selection works (selected DFN available)

Implementation:
A) API endpoint:
GET /vista/patient-demographics?dfn=<dfn>

- validate dfn numeric
- call the best available patient select/demographics RPC in this sandbox
- parse response into:
  { ok:true, patient:{ dfn, name, dob, sex } }
- if response is -1^... return:
  { ok:false, error:"Patient not found", hint:"Check DFN" }

B) FileMan date conversion:

- If DOB is FileMan numeric (e.g., 3260211):
  year = first 3 digits + 1700
  month/day follow
- Provide utility function and reuse it everywhere.

C) UI:

- When user selects a patient, call patient-demographics endpoint
- Display "Patient Header" panel at top:
  Name | DFN | DOB | Sex

D) Docs:

- docs/runbooks/vista-rpc-patient-demographics.md
- Update apps/web README with “Patient Header appears after selection”

Deliverables:

- file list
- curl test:
  curl http://127.0.0.1:3001/vista/patient-demographics?dfn=1
- expected JSON
