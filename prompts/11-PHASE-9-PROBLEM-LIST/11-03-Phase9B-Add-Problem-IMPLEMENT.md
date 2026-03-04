# Phase 9B — Add Problem (Write/CRUD) (IMPLEMENT)

Goal:
POST /vista/problems adds a problem entry.

Rules:

- If full problem entry requires complex code sets, document the minimal safe path.
- Return honest errors if blocked.
- Use FileMan date conversion if needed.
- Handle -1^ errors.

API:
POST /vista/problems
Body:
{ "dfn":"1", "text":"HYPERTENSION" }

Return:
{ ok:true, message:"Created" } OR ok:false with error and hint.

Docs:

- docs/runbooks/vista-rpc-add-problem.md
