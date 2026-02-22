# Phase 92 — PAYMENT TRACKING + RECONCILIATION + AGING + PAYER INTELLIGENCE v1

## User Request

Implement end-to-end payment tracking, remittance reconciliation, AR aging, and
payer intelligence analytics for the RCM module. Evidence-first accounting: never
mark a claim as paid without matching remittance evidence.

## Deliverables

1. **Payment Data Model** — RemittanceBatch, RemittanceLine, PaymentPostingEvent,
   UnderpaymentCase, AgingBucket, PayerKPI types
2. **Payment Store** — In-memory tenant-scoped stores with 6 indexes
3. **Matching Engine** — 3-tier deterministic matching (exact_id → external_ref → fuzzy),
   CSV parser, manual claim linking
4. **Aging + Payer Intelligence** — 5-bucket AR aging, payer KPI computation
   (avg days to pay, denial rate, underpayment rate)
5. **Export Bridge** — Pluggable CSV/JSON export with ERPNext/Odoo compatibility
6. **13 API Endpoints** under `/payerops/` prefix
7. **2 UI Pages** — Payments dashboard + Payer intelligence
8. **Nav entries** — 'Payments' and 'Payer Intel' in admin sidebar

## Implementation Steps

1. Create `apps/api/src/rcm/payments/payment-types.ts` — full type system
2. Create `apps/api/src/rcm/payments/payment-store.ts` — in-memory stores + indexes
3. Create `apps/api/src/rcm/payments/matching-engine.ts` — 3-tier matching + CSV + manual
4. Create `apps/api/src/rcm/payments/aging-intelligence.ts` — aging buckets + payer KPIs
5. Create `apps/api/src/rcm/payments/export-bridge.ts` — pluggable CSV/JSON bridge
6. Create `apps/api/src/rcm/payments/payment-routes.ts` — 13 Fastify endpoints
7. Register routes in `apps/api/src/index.ts`
8. Add nav entries in `apps/web/src/app/cprs/admin/layout.tsx`
9. Create `apps/web/src/app/cprs/admin/payments/page.tsx` — payments dashboard
10. Create `apps/web/src/app/cprs/admin/payer-intelligence/page.tsx` — KPI dashboard
11. Create runbook `docs/runbooks/ph-payments-reconciliation-v1.md`

## Non-Negotiables

- Evidence-first: no claim transitions to paid without matched remittance
- Tenant-scoped: facilityId on all stores
- Pluggable ERP: export bridge interface for CSV/JSON, extensible
- PHI privacy: no patient names in logs, sanitized audit entries
- Performance: O(n) matching, indexed lookups

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /payerops/payments/batches | Create remittance batch |
| POST | /payerops/payments/batches/:id/upload | Upload CSV content |
| POST | /payerops/payments/batches/:id/import | Parse CSV into lines |
| POST | /payerops/payments/batches/:id/match | Run matching engine |
| GET | /payerops/payments/batches | List batches |
| GET | /payerops/payments/batches/:id | Batch detail + lines |
| GET | /payerops/payments/reconciliation | Needs-review worklist |
| POST | /payerops/payments/reconciliation/:lineId/link-claim | Manual link |
| GET | /payerops/analytics/payer-intelligence | Payer KPIs |
| GET | /payerops/analytics/aging | AR aging buckets |
| GET | /payerops/exports/payments/:batchId | Export batch (CSV/JSON) |
| GET | /payerops/payments/underpayments | Underpayment cases |
| GET | /payerops/payments/store-info | Store stats |

## Verification Steps

- `pnpm -C apps/api exec tsc --noEmit` — API compiles clean
- `pnpm -C apps/web exec tsc --noEmit` — Web compiles clean
- Verify 13 endpoints return proper JSON
- Verify matching engine processes CSV input
- Verify aging buckets compute from claim data
- Verify payer KPIs aggregate correctly

## Files Touched

- `apps/api/src/rcm/payments/payment-types.ts` (NEW)
- `apps/api/src/rcm/payments/payment-store.ts` (NEW)
- `apps/api/src/rcm/payments/matching-engine.ts` (NEW)
- `apps/api/src/rcm/payments/aging-intelligence.ts` (NEW)
- `apps/api/src/rcm/payments/export-bridge.ts` (NEW)
- `apps/api/src/rcm/payments/payment-routes.ts` (NEW)
- `apps/api/src/index.ts` (MODIFIED — import + register)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED — nav entries)
- `apps/web/src/app/cprs/admin/payments/page.tsx` (NEW)
- `apps/web/src/app/cprs/admin/payer-intelligence/page.tsx` (NEW)
- `docs/runbooks/ph-payments-reconciliation-v1.md` (NEW)
