# Phase 154 — CPOE Order Signing + Idempotency (Postgres-Backed)

## Goal

Close the audit gap "Order signing workflow incomplete".
Eliminate remaining Map-based idempotency for orders. Multi-instance correctness required.

## Non-Negotiables

- VistA-first: use VistA RPCs if available; otherwise honest integration_pending with named RPC targets
- Postgres-only: idempotency keys persisted in the existing PG idempotency_key table
- No fake success: signing returns real signed state OR structured blocker

## Implementation Steps

### Step 1 — Migrate CPOE Map-based idempotency to DB-backed middleware

- Remove `idempotencyStore` Map from `orders-cpoe.ts`
- Remove `idempotencyStore` Map from `wave2-routes.ts`
- Wire the global `idempotencyGuard()` + `idempotencyOnSend` from `middleware/idempotency.ts`
- Switch header from `X-Idempotency-Key` to standard `Idempotency-Key` (middleware convention)
- Add PG migration v21: `cpoe_order_sign_event` table for signing audit trail
- Update `store-policy.ts` to reflect durability change from `in_memory_only` to `pg_backed`

### Step 2 — Add PG migration for signing audit table

- `cpoe_order_sign_event`: id, tenant_id, order_ien, dfn, duz, action (sign/reject/defer), status, es_hash, rpc_used, created_at
- Add to RLS tables array

### Step 3 — Enhance signing endpoint

- `POST /vista/cprs/orders/sign` already exists
- Add e-signature prompt UX (esCode field)
- Probe `ORWOR1 SIG` at runtime via `optionalRpc()`
- Log signing event to `cpoe_order_sign_event` (PG migration)
- Return signed/unsigned/pending with explicit RPC targets
- Fix `capabilities.json` discrepancy: `clinical.orders.sign` should target `ORWOR1 SIG`

### Step 4 — Update OrdersPanel UI

- Show signed/unsigned states with distinct visual treatment
- Sign button shows e-signature input modal when clicked
- "Integration pending" banner when signing not available
- Disabled/pending buttons have tooltip explaining why

### Step 5 — Tests

- Repeat submit/sign calls → idempotency guard returns cached result
- Signing: real if ORWOR1 SIG available, explicit blocker otherwise

## Files Touched

- `apps/api/src/routes/cprs/orders-cpoe.ts` — Remove Map idempotency, enhance sign endpoint
- `apps/api/src/routes/cprs/wave2-routes.ts` — Remove Map idempotency
- `apps/api/src/platform/pg/pg-migrate.ts` — v21 cpoe_order_sign_event
- `apps/api/src/platform/store-policy.ts` — Update durability classification
- `apps/web/src/components/cprs/panels/OrdersPanel.tsx` — UI signing UX
- `config/capabilities.json` — Fix sign capability target RPC
- `prompts/159-PHASE-154-CPOE-SIGNING/154-01-IMPLEMENT.md`
- `prompts/159-PHASE-154-CPOE-SIGNING/154-99-VERIFY.md`
