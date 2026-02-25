# Phase 131+132 VERIFY -- Summary

## What Changed

Fixed critical Phase 132 CSRF regression: 44 frontend files with ~138 mutation
fetch calls were not sending the `x-csrf-token` header, causing all POST/PUT/
PATCH/DELETE operations to receive 403 after the CSRF synchronizer token migration.

### Root Cause
Phase 132 migrated CSRF from double-submit cookie to session-bound synchronizer
token, but only 3 out of 47 frontend files with mutations were updated.

### Fix
1. Added `csrfHeaders()` utility to `apps/web/src/lib/csrf.ts`
2. Injected CSRF headers into all 44 affected files:
   - 7 dialog components
   - 7 panel components
   - 16 page files
   - 2 store files (session-context + cprs-ui-state)

## How to Test Manually

```bash
# Login and note csrfToken in response
curl -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Without CSRF -> 403; With x-csrf-token header -> passes to handler
```

## Verifier Output

Gauntlet RC: 4 PASS, 0 FAIL, 1 WARN (pre-existing secret scan).
TypeScript: API + Web both clean.

## Follow-ups

- Portal app has its own CSRF pattern via `validateCsrf()` -- audit separately.
- Consider shared `apiFetch` at `@/lib/api.ts` with auto-CSRF to prevent this class of bug.

1. **Broker connect/disconnect lifecycle** -- Service-layer routes (vista-mailman.ts, portal-mailman.ts, messaging/index.ts) never called connect()/disconnect(), causing Not connected errors for all VistA MailMan RPCs.

2. **RPC parameter type (LITERAL to LIST)** -- listMessages and getVistaMessage in secure-messaging.ts used safeCallRpc (LITERAL params), but ZVE MAIL RPCs expect LIST-type params. Switched to safeCallRpcWithList.

3. **RPC return type registration** -- All 5 ZVE MAIL RPCs had invalid return type B in VistA File 8994. Fixed to 2 (ARRAY) via ZVEFIX.m patch + updated ZVEMSIN.m installer.

4. **M routine indirection pattern** -- ZVEMSGR.m used @RES@ (name indirection) but XWB broker passes .XWBY by reference. Fixed: @RES@ to RES (13 occurrences).

5. **LIST param key double-quoting** -- sendViaMailMan/manageMessage pre-quoted keys, but buildRpcMessageEx adds another set. Removed pre-quotes from service layer.

6. **XWB LIST flat subscript mismatch** -- XWB LIST protocol delivers single-level subscripts (PARAM("TEXT,1")), but SEND expected two-level (PARAM("TEXT",1)). Rewrote SEND to use flat key prefix matching.

### Files Modified
- apps/api/src/routes/vista-mailman.ts -- connect/disconnect lifecycle + error field
- apps/api/src/routes/portal-mailman.ts -- connect/disconnect lifecycle
- apps/api/src/routes/messaging/index.ts -- connect/disconnect lifecycle
- apps/api/src/services/secure-messaging.ts -- LIST params + flat key format
- services/vista/ZVEMSGR.m -- @RES@ to RES + flat key parsing in SEND
- services/vista/ZVEMSIN.m -- return type .04=B to .04=2

## E2E Test Results (VistA UP)
- GET /vista/mailman/folders -- 4 baskets (ok, source:vista)
- GET /vista/mailman/inbox -- 7 messages (ok, source:vista)
- GET /vista/mailman/message/3270 -- full body + metadata (ok, source:vista)
- POST /vista/mailman/send -- vistaRef:3270 (ok, source:vista), 3 body lines preserved
- POST /vista/mailman/manage markread -- ok
- GET /messaging/folders -- Phase 70 routes also working

## E2E Test Results (VistA DOWN)
- GET /vista/mailman/inbox -- ok:false, source:local
- GET /vista/mailman/folders -- ok:false, source:local
- POST /vista/mailman/send -- ok:false, error

## Verification
- TypeScript: 0 errors
- Gauntlet RC: 12 PASS, 0 FAIL, 1 WARN (pre-existing secret scan)

## Follow-Ups
- Portal mailman routes need integration testing with portal session
- MANAGE delete/move operations need VistA E2E test (markread verified)
