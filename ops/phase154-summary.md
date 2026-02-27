# Phase 154 — CPOE Order Signing + Postgres-Backed Idempotency

## What Changed

### Core Changes
1. **Eliminated in-memory Map-based idempotency** from all 3 CPRS write route files:
   - `orders-cpoe.ts` — removed `idempotencyStore`, `checkIdempotency()`, `storeIdempotency()`
   - `wave2-routes.ts` — same removal (11 POST endpoints)
   - `tiu-notes.ts` — same removal (2 POST endpoints)

2. **Wired DB-backed idempotency middleware** (`idempotencyGuard()` from `middleware/idempotency.ts`) into all 3 route plugins via Fastify hooks. Uses the existing `idempotency_key` PG table with 24h TTL. Multi-instance safe.

3. **Enhanced `POST /vista/cprs/orders/sign`**:
   - esCode is now **required** — missing esCode returns a structured blocker (`status: "sign-blocked", blocker: "esCode_required"`)
   - If RPC unavailable, returns `ok: false, status: "integration-pending"` (no fake success)
   - All sign attempts logged to new `cpoe_order_sign_event` PG table
   - esCode hashed via SHA-256 (truncated to 16 chars) before storage

4. **New PG migration v21**: `cpoe_order_sign_event` table with tenant_id, order_ien, dfn, duz, action, status, es_hash, rpc_used, detail (JSONB), created_at. Three indexes. Included in RLS.

5. **Backward-compatible header support**: Middleware now accepts both `Idempotency-Key` and `X-Idempotency-Key` headers.

6. **Fixed capabilities.json**: `clinical.orders.sign.targetRpc` corrected from `ORWDX SEND` to `ORWOR1 SIG`.

7. **UI enhancement**: OrdersPanel now shows e-signature code input (password field) next to the Sign button. Sign button disabled until esCode is entered.

### Files Changed
- `apps/api/src/routes/cprs/orders-cpoe.ts` — Map removed, DB middleware, sign audit
- `apps/api/src/routes/cprs/wave2-routes.ts` — Map removed, DB middleware
- `apps/api/src/routes/cprs/tiu-notes.ts` — Map removed, DB middleware
- `apps/api/src/middleware/idempotency.ts` — X-Idempotency-Key fallback
- `apps/api/src/platform/pg/pg-migrate.ts` — v21 migration + RLS
- `apps/api/src/platform/store-policy.ts` — durability -> pg_backed
- `apps/web/src/components/cprs/panels/OrdersPanel.tsx` — esCode UX
- `config/capabilities.json` — targetRpc fix
- `AGENTS.md` — Phase 154 notes

## How to Test

```bash
# 1. Sign without esCode (should get blocker)
curl -s -X POST http://localhost:3001/vista/cprs/orders/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: ehr_session=<session>" \
  -d '{"dfn":"3","orderIds":["12345"]}' | jq .
# Expected: { ok: false, status: "sign-blocked", blocker: "esCode_required" }

# 2. Sign with esCode
curl -s -X POST http://localhost:3001/vista/cprs/orders/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: ehr_session=<session>" \
  -d '{"dfn":"3","orderIds":["12345"],"esCode":"PROV123!!"}' | jq .
# Expected: { ok: true/false, status: "signed"/"integration-pending" }

# 3. Idempotency test (same key = same response)
curl -s -X POST http://localhost:3001/vista/cprs/orders/sign \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-sign-1" \
  -H "Cookie: ehr_session=<session>" \
  -d '{"dfn":"3","orderIds":["12345"],"esCode":"PROV123!!"}' | jq .
```

## Verifier Output
```
Phase 154 verification: ALL GATES PASSED (17/17)
```

## Follow-ups
- [ ] Verify sign endpoint with real VistA Docker (ORWOR1 SIG RPC)
- [ ] Monitor cpoe_order_sign_event table growth in production
- [ ] Consider adding sign event query endpoint for audit UI
