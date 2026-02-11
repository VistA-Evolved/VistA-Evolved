# Phase 5C — Allergies Display (IMPLEMENT)

Goal:
Display allergies for selected patient DFN.

Lessons learned to enforce:
- VistA can return informational lines mixed with data (BUG-014):
  example "^No Allergy Assessment" where ID field is blank.
  Must filter out lines with missing key fields.
- Keep broker protocol unchanged (already proven).

Preconditions:
- Patient selected (DFN known)
- Phase 4A/4B broker client works

Implementation:
A) API endpoint:
GET /vista/allergies?dfn=<dfn>
- validate dfn numeric
- call suitable allergies list RPC
- parse into:
  { ok:true, count:N, results:[{ id, text }, ...] }
- filter out lines where id is empty/missing
- return ok:false with error if RPC returns -1^...

B) UI:
- Show Allergies section under patient header
- fetch and display list when patient selected

C) Docs:
- docs/runbooks/vista-rpc-allergies.md
- include:
  curl http://127.0.0.1:3001/vista/allergies?dfn=1

Deliverables:
- file list
- curl output example
