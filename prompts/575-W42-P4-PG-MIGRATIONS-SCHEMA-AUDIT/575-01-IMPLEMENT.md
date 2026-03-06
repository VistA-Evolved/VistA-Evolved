# Phase 575 — W42-P4: PG Migrations + Schema Audit

> Wave 42: Production Remediation | Position 4 of 15
> Depends on: None (parallel with Phases 573, 574)

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

Create migration v60 with 17 new PG tables for in-memory store migration.
Add all new tables to CANONICAL_RLS_TABLES for tenant isolation.

## Tables Added (v60)

1. `intake_brain_state` — Brain plugin session state
2. `intake_brain_audit` — Brain decision audit log
3. `mha_administration` — Mental health assessment records
4. `cp_result` — Clinical procedure results
5. `imaging_capture` — Point-of-care imaging captures
6. `scheduling_recall` — Patient recall reminders
7. `portal_audit_event` — Patient portal audit events
8. `hl7_route` — HL7 message routing rules
9. `hl7_tenant_endpoint` — Per-tenant HL7 endpoints
10. `hl7_message_event` — HL7 message tracking
11. `med_rec_session` — Medication reconciliation sessions
12. `discharge_plan` — Discharge planning records
13. `mar_safety_event` — Medication administration safety events
14. `device_alarm` — Medical device alarm records

## Files Modified

- `apps/api/src/platform/pg/pg-migrate.ts` — Added migration v60 + 14 new
  entries in CANONICAL_RLS_TABLES

## Acceptance Criteria

- [ ] Migration v60 creates all 14 tables with IF NOT EXISTS
- [ ] All tables have `tenant_id TEXT NOT NULL DEFAULT 'default'`
- [ ] All tables have index on `(tenant_id)` at minimum
- [ ] All 14 tables added to CANONICAL_RLS_TABLES
