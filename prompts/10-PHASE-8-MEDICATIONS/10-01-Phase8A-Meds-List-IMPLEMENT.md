# Phase 8A — Medications List (IMPLEMENT)

Goal:
GET /vista/medications?dfn=<dfn> returns active meds list and UI displays it.

Rules:
- Do not change broker protocol.
- Handle -1^ errors.
- Filter header/info lines if present.
- Parse fields carefully; VistA wire formats often differ from docs.

API:
GET /vista/medications?dfn=1
Return:
{ ok:true, count:N, results:[{ id, name, sig, status }, ...] }

UI:
- Medications section/tab
- Show list rows

Docs:
- docs/runbooks/vista-rpc-medications.md
