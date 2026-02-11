# Phase 7B — Create Note (VERIFY — no changes)

Verify:
- POST /vista/notes returns ok:true OR ok:false with meaningful VistA error (no crash)
- GET /vista/notes shows new note OR count changes
- UI create form works and refreshes list
- no secrets committed

Commands:
curl http://127.0.0.1:3001/vista/notes?dfn=1
POST test with PowerShell Invoke-RestMethod or curl if supported.
