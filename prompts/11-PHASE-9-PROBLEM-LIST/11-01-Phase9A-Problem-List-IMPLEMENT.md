# Phase 9A — Problem List (IMPLEMENT)

Goal:
GET /vista/problems?dfn=<dfn> returns patient problem list and UI displays it.

Rules:

- Do not change broker protocol.
- Handle -1^ errors.
- Problem list often uses ICD/SNOMED mapping; keep MVP minimal: text + status.

API:
GET /vista/problems?dfn=1
Return:
{ ok:true, count:N, results:[{ id, text, status, onset }, ...] }

UI:

- Problem List section/tab

Docs:

- docs/runbooks/vista-rpc-problems.md
