# Phase 8B — Add Medication (Write/CRUD) (IMPLEMENT)

Goal:
POST /vista/medications adds a medication/order (MVP-safe).

Rules:
- Do NOT attempt full CPOE ordering complexity.
- If true medication ordering requires multiple dependent RPCs, document it and stop.
- Prefer the safest minimal "add med record" if sandbox supports it.
- Return honest errors (no fake success).

API:
POST /vista/medications
Body:
{ "dfn":"1", "drug":"AMOXICILLIN", "sig":"1 tab daily", "days":7 }

Return:
{ ok:true, message:"Created" } OR ok:false with explanation.

UI:
- Simple add form
- refresh list

Docs:
- docs/runbooks/vista-rpc-add-medication.md
