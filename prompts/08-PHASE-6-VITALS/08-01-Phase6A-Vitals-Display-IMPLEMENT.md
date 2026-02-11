# Phase 6A — Vitals Display (IMPLEMENT)

Goal:
GET /vista/vitals?dfn=<dfn> returns vitals and UI displays them.

Known bug to avoid (BUG-021):
The VITALS^ORQQVI wire format is:
ien^type^value^datetime
NOT ien^type^datetime^rate.

Rules:
- Do not change broker protocol code.
- Handle FileMan dates if returned.
- Filter informational lines mixed with data.

Deliverables:
- API endpoint GET /vista/vitals?dfn=1 => { ok:true, count, results:[...] }
- UI shows vitals table under patient header
- Runbook: docs/runbooks/vista-rpc-vitals.md
- Update bug tracker with BUG-021 details (already done)
