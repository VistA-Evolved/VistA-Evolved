# Phase 577 — W42-P6: Store Migration — New PG Repos (Phase 3B)

> Wave 42: Production Remediation | Position 6 of 15
> Depends on: Phase 575 (PG migrations v60), Phase 576 (wire existing PG)

---

## Objective

Create PG repos for 17 new tables from migration v60 and wire them to their in-memory store counterparts. Each store currently uses a Map; replace with PG-backed repo.

---

## Tables and Store Mappings

| Store                | File                                  | New PG Table         |
| -------------------- | ------------------------------------- | -------------------- |
| intake-brain-states  | intake/brain-routes.ts                 | intake_brain_state   |
| intake-brain-audit   | intake/brain/registry.ts               | intake_brain_audit   |
| mha-administration   | routes/mha/index.ts                   | mha_administration   |
| cp-result            | routes/clinical-procedures/index.ts   | cp_result            |
| imaging-capture      | routes/imaging-capture/index.ts       | imaging_capture      |
| scheduling-recall    | routes/scheduling/index.ts            | scheduling_recall    |
| portal-audit         | services/portal-audit.ts               | portal_audit_event   |
| hl7-routes           | hl7/routing/registry.ts               | hl7_route            |
| hl7-tenant-endpoints | hl7/tenant-endpoints.ts               | hl7_tenant_endpoint  |
| hl7-message-events   | hl7/message-event-store.ts            | hl7_message_event    |
| webhook-delivery-log | services/webhook-service.ts           | webhook_delivery_log |
| fhir-notification    | services/fhir-subscription-service.ts | fhir_notification    |
| med-rec-sessions     | routes/med-reconciliation.ts          | med_rec_session      |
| discharge-plans      | routes/discharge-workflow.ts          | discharge_plan       |
| mar-safety-events    | routes/emar/index.ts                  | mar_safety_event     |
| device-alarm         | devices/alarm-store.ts                | device_alarm         |
| plugin-registry       | services/plugin-sdk.ts                | plugin_registry      |

---

## Files to Create/Modify

- `apps/api/src/platform/pg/repo/` — Create one repo file per table (or grouped by domain)
- `apps/api/src/intake/brain-routes.ts` — Wire brain state to PG
- `apps/api/src/intake/brain/registry.ts` — Wire brain audit to PG
- `apps/api/src/routes/mha/index.ts` — Wire MHA to PG
- `apps/api/src/routes/clinical-procedures/index.ts` — Wire cp_result to PG
- `apps/api/src/routes/imaging-capture/index.ts` — Wire imaging_capture to PG
- `apps/api/src/routes/scheduling/index.ts` — Wire scheduling_recall to PG
- `apps/api/src/services/portal-audit.ts` — Wire portal_audit_event to PG
- `apps/api/src/hl7/` — Wire hl7_route, hl7_tenant_endpoint, hl7_message_event to PG
- `apps/api/src/services/webhook-service.ts` — Wire webhook_delivery_log to PG
- `apps/api/src/services/fhir-subscription-service.ts` — Wire fhir_notification to PG
- `apps/api/src/routes/med-reconciliation.ts` — Wire med_rec_session to PG
- `apps/api/src/routes/discharge-workflow.ts` — Wire discharge_plan to PG
- `apps/api/src/routes/emar/index.ts` — Wire mar_safety_event to PG
- `apps/api/src/devices/alarm-store.ts` — Wire device_alarm to PG
- `apps/api/src/services/plugin-sdk.ts` — Wire plugin_registry to PG
- `apps/api/src/platform/store-policy.ts` — Add all 17 stores as `pg_backed`

---

## Key Patterns to Follow

1. **Repo interface**: Each repo exposes `insert`, `findById`, `findByTenant`, `update`, `delete` as appropriate.
2. **Tenant isolation**: All queries filter by `tenant_id`; use `SET LOCAL app.current_tenant_id` before writes.
3. **JSON columns**: Store complex objects in `*_json` or `detail_json` columns; parse on read.
4. **Indexes**: Ensure indexes on `(tenant_id, created_at)` for time-range queries.
5. **RLS**: All tables in `CANONICAL_RLS_TABLES`; `applyRlsPolicies()` must include them.

---

## Acceptance Criteria

- [ ] All 17 tables have PG repos implemented
- [ ] All 17 stores use PG in rc/prod mode (no Map fallback)
- [ ] Migration v60 creates all tables (verify in Phase 575)
- [ ] `store-policy.ts` lists all 17 as `pg_backed`
- [ ] RLS policies apply; tenant isolation verified
