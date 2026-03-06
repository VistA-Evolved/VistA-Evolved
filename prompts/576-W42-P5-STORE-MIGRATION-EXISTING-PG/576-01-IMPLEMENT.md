# Phase 576 — W42-P5: Store Migration — Wire Existing PG Tables (Phase 3A)

> Wave 42: Production Remediation | Position 5 of 15
> Depends on: Phase 573 (RPC pool), Phase 574 (Redis), Phase 575 (PG migrations v60)

---

## Context

Wave 42 production-remediation prompt. Use this section to capture execution context, dependencies, and prerequisites before changing code.

## Implementation Steps

1. Execute the objective and task sections below in order.
2. Keep changes deterministic and minimal.
3. Record any deviations from the stated approach in Decisions.

## Files Changed

List the source files, configs, scripts, docs, and tests changed while executing this prompt.

## Decisions

Record design choices, trade-offs, or scope trims made during execution.

## Evidence Captured

List the commands, runtime checks, artifacts, and logs that prove the work is complete.

---

## Objective

Wire 10 existing PG tables to their in-memory store counterparts. These tables already exist in `pg-migrate.ts`; the routes still use in-memory Maps. Replace Map-backed logic with PG repo calls.

---

## Stores to Wire

| Store                    | File                                  | Existing PG Table             | Action                    |
| ------------------------ | ------------------------------------- | ----------------------------- | ------------------------- |
| portal-access-logs       | portal-iam/access-log-store.ts        | portal_access_log             | Wire PG repo              |
| imaging-break-glass      | services/imaging-authz.ts             | iam_break_glass_session       | Wire PG repo              |
| telehealth-rooms         | telehealth/room-store.ts              | telehealth_room               | Wire PG repo              |
| scheduling-booking-locks | adapters/scheduling/vista-adapter.ts  | scheduling_booking_lock       | Wire PG repo              |
| scheduling-waitlist      | adapters/scheduling/vista-adapter.ts  | scheduling_waitlist_request   | Wire PG repo              |
| intake-sessions          | intake/intake-store.ts                | intake_session                | Wire PG repo              |
| clinical-drafts          | routes/write-backs.ts                 | clinical_draft                | Wire PG repo              |
| templates                | templates/template-engine.ts          | clinical_template, quick_text | Already PG-backed, verify |
| webhook-subscriptions    | services/webhook-service.ts           | (v45 planned)                 | Create table + repo       |
| fhir-subscriptions       | services/fhir-subscription-service.ts | (v46 planned)                 | Create table + repo       |

---

## Files to Create/Modify

- `apps/api/src/portal-iam/access-log-store.ts` — Replace Map with PG repo
- `apps/api/src/services/imaging-authz.ts` — Replace break-glass Map with PG repo
- `apps/api/src/telehealth/room-store.ts` — Replace room Map with PG repo
- `apps/api/src/adapters/scheduling/vista-adapter.ts` — Wire booking locks + waitlist to PG
- `apps/api/src/intake/intake-store.ts` — Replace intake session Map with PG repo
- `apps/api/src/routes/write-backs.ts` — Wire clinical drafts to PG repo
- `apps/api/src/templates/template-engine.ts` — Verify PG-backed; remove any Map fallback
- `apps/api/src/services/webhook-service.ts` — Create v45 table if missing; wire PG repo
- `apps/api/src/services/fhir-subscription-service.ts` — Create v46 table if missing; wire PG repo
- `apps/api/src/platform/pg/` — Add PG repos for any store lacking one
- `apps/api/src/platform/store-policy.ts` — Update durability to `pg_backed` for all 10 stores

---

## Key Patterns to Follow

1. **Store resolver**: Use `resolveBackend()` from `store-resolver.ts` — in rc/prod, PG is required.
2. **Tenant context**: All PG writes must set `app.current_tenant_id` via `SET LOCAL` before queries.
3. **Fallback**: In dev mode, allow in-memory fallback if PG unavailable; log warning.
4. **Idempotent writes**: Use `ON CONFLICT DO UPDATE` or `INSERT ... ON CONFLICT DO NOTHING` where appropriate.
5. **Connection release**: Ensure `releaseClient()` is called after each query in pooled connections.

---

## Acceptance Criteria

- [ ] All 10 stores read/write from PG when `PLATFORM_PG_URL` is set
- [ ] No in-memory Map used for durable data in rc/prod mode
- [ ] `store-policy.ts` updated: all 10 stores marked `pg_backed`
- [ ] API restart does not lose data for any of the 10 stores
- [ ] RLS policies apply to all tables (tenant isolation)
