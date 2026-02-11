# Phase 4B — Patient Search (IMPLEMENT)

Goal:
GET /vista/patient-search?q=SMI returns real matches.

Rules:
- Protocol is proven (Phase 4A passed). Do NOT change framing/cipher unless necessary.
- Minimal change: add endpoint + mapping only.
- If search RPC mapping uncertain, try 2 candidates and report which works.

Implementation:
- Validate q present and length >= 2
- Try ORQPT FIND PATIENT
- If fails, try ORQPT PATIENT SELECTION
- Parse lines into { dfn, name }
- Return { ok:true, count, results, rpcUsed }

Docs:
- docs/runbooks/vista-rpc-patient-search.md
- prompts/ record the final chosen RPC and args
