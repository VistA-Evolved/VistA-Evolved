# Phase 617 - VERIFY - CPRS Orders Active Order Recovery

## Verification Steps
1. Docker-first check:
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. API health check:
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
   - `curl.exe -s http://127.0.0.1:3001/health`
3. Login and orders read check:
   - create `login-body.json` with `PRO1234 / PRO1234!!`
   - `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders?dfn=46"`
4. Order enrichment proof:
   - call live helper RPC routes for at least one returned order IEN
   - confirm display text is grounded in live `ORWORR GETBYIFN` and/or `ORWORR GETTXT`
5. Orders chart UI check:
   - open CPRS chart Orders tab for DFN 46
   - confirm live VistA orders render meaningful names/statuses
   - confirm selecting an active VistA order populates the detail pane
6. Action truthfulness check:
   - exercise at least one active-order action path from the panel or API
   - verify the response is one of: real success, sign-blocked, integration-pending, unsupported-in-sandbox, or sync-pending
7. Run the relevant repo verifier and capture the output in ops artifacts.

## Acceptance Criteria
- `GET /vista/cprs/orders?dfn=46` returns `ok:true` with live VistA order rows that are clinically readable, not raw caret-fragments.
- The orders response preserves `rpcUsed` traceability for every enrichment path used.
- The CPRS Orders panel no longer treats live VistA orders as a disconnected read-only table.
- Real VistA orders can be selected in-chart and inspected without inventing data.
- At least one order follow-up action is exposed truthfully against the existing backend route surface.
- Unsupported or partial workflows remain explicit and clinically honest.
- Docs and ops artifacts explain how to reproduce the live verification.
