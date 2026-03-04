# Phase 154 — VERIFY — CPOE Order Signing + Idempotency

## Tier 1: Sanity (5 gates)

1. TypeCheck: `pnpm -C apps/api exec tsc --noEmit` — 0 errors
2. Build: all 3 apps build clean
3. PG migration v21 exists with `cpoe_order_sign_event` table
4. Store policy: `orders-idempotency` + `wave2-idempotency` classified as `pg_backed` (not `in_memory_only`)
5. No `new Map` idempotency stores in `orders-cpoe.ts` or `wave2-routes.ts`

## Tier 2: Feature Integrity (5 gates)

1. `POST /vista/cprs/orders/sign` returns `status: "signed"` or `status: "integration-pending"` with `pendingTargets`
2. `Idempotency-Key` header on sign/order POST returns cached result on retry (no duplication)
3. Sign endpoint validates esCode, dfn, orderIds; returns 400 on missing fields
4. UI: Sign button renders with e-signature input; shows signed/unsigned/pending states
5. `capabilities.json` clinical.orders.sign.targetRpc === "ORWOR1 SIG"

## Tier 3: Regression (5 gates)

1. Existing medication order flow (ORWDXM AUTOACK) still works
2. Order list (ORWORR AGET) still returns data
3. Order checks (ORWDXC ACCEPT) still callable
4. Discontinue flow (ORWDXA DC) still works
5. Gauntlet fast + rc pass with 0 FAIL
