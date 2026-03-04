# Phase 57 Summary — CPRS Parity Wave 2 (WRITE) Safety + Capability Detection

## What Changed

### New Files

- `artifacts/cprs/wave57-plan.json` — Authoritative plan: 11 write actions + safetyRules
- `apps/api/src/routes/cprs/wave2-routes.ts` — 11 POST endpoints with full safety model
- `apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx` — TIU note creation
- `apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx` — Vital signs entry (8 types)
- `apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx` — Allergy documentation
- `apps/web/src/components/cprs/dialogs/AcknowledgeLabDialog.tsx` — Lab result acknowledgment
- `scripts/verify-phase57-wave2-write.ps1` — 12-gate verifier
- `prompts/62-PHASE-57-CPRS-WAVE2-WRITE/57-01-IMPLEMENT.md` — Prompt capture

### Modified Files

- `apps/web/src/actions/actionRegistry.ts` — Added `rpcKind: "read" | "write"` to all 52 actions (12 write, 40 read), added endpoint fields to write actions, added `getWriteActions()`/`getReadActions()` helpers
- `apps/api/src/lib/audit.ts` — 5 new audit action types for Phase 57 write events
- `apps/api/src/routes/write-backs.ts` — Exported `createDraft` for reuse
- `apps/api/src/index.ts` — Registered wave2 routes
- `apps/web/src/components/cprs/dialogs/index.ts` — Barrel exports for 4 new dialogs
- `apps/web/src/components/cprs/CPRSModals.tsx` — Wired all 7 write dialogs
- `scripts/verify-latest.ps1` — Points to Phase 57 verifier

## Safety Model (5 layers)

1. **No auto-retry on writes** — `safeCallRpc` called with `idempotent: false`
2. **Idempotency keys** — `X-Idempotency-Key` header with 10-min TTL dedup store
3. **LOCK/UNLOCK** — `ORWDX LOCK` before order writes, `ORWDX UNLOCK` in finally block
4. **Draft fallback** — When RPC unavailable, `createDraft()` stores `ServerDraft`
5. **Metadata-only audit** — Only action type + DFN recorded, never input args/PHI

## 11 Write Endpoints

| Endpoint                           | RPC(s)                            | Lock? | Draft? |
| ---------------------------------- | --------------------------------- | ----- | ------ |
| POST /vista/cprs/problems/add      | ORQQPL ADD SAVE                   | No    | Yes    |
| POST /vista/cprs/problems/edit     | ORQQPL EDIT SAVE                  | No    | Yes    |
| POST /vista/cprs/notes/create      | TIU CREATE RECORD + SET TEXT      | No    | Yes    |
| POST /vista/cprs/orders/draft      | ORWDX SAVE                        | Yes   | Yes    |
| POST /vista/cprs/orders/verify     | ORWDXR01 VERIFY                   | No    | No     |
| POST /vista/cprs/orders/dc         | ORWDXA DC (integration-pending)   | No    | No     |
| POST /vista/cprs/orders/flag       | ORWDXA FLAG (integration-pending) | No    | No     |
| POST /vista/cprs/meds/quick-order  | ORWDXM1 BLDQRSP                   | Yes   | Yes    |
| POST /vista/cprs/labs/ack          | ORWOR UNSIGN                      | No    | No     |
| POST /vista/cprs/vitals/add        | GMV ADD VM                        | No    | Yes    |
| POST /vista/cprs/allergies/add     | ORWDAL32 SAVE ALLERGY             | No    | Yes    |
| POST /vista/cprs/consults/complete | ORQQCN SET ACT MENUS              | No    | No     |

## How to Test Manually

```bash
# Problems - add
curl -X POST http://127.0.0.1:3001/vista/cprs/problems/add \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-1" \
  -b "session=<cookie>" \
  -d '{"dfn":"3","icdCode":"R51","narrative":"Headache","status":"A","immediacy":"A"}'

# Vitals - add
curl -X POST http://127.0.0.1:3001/vista/cprs/vitals/add \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-2" \
  -b "session=<cookie>" \
  -d '{"dfn":"3","vitalType":"T","value":"98.6","units":"F"}'
```

## Verifier Output

```
PASS: 12 / 12
All gates passed.
```

## Follow-ups

- Wire `orders.dc` and `orders.flag` to live RPCs when sandbox supports them
- Add E2E Playwright tests for write dialogs
- Implement Phase 57 VERIFY prompt (57-99-VERIFY.md)
