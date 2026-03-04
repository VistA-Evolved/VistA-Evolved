# Phase 142 — RCM Operational Excellence (IMPLEMENT)

## User Request

Move RCM from "structures exist" to "operational system" with durable jobs,
evidence-gated integrations, denial/appeal loop, and reconciliation maturity.

## Implementation Steps

### A) Durable Job Queue (PG-backed)

- Add `rcm_durable_job` table to SQLite migration (`migrate.ts`)
- Add Drizzle schema table to `schema.ts`
- Create `PgDurableJobQueue` implementing `RcmJobQueue` interface
- Swap `getJobQueue()` to use PG-backed queue when DB available
- New job types: `REMITTANCE_IMPORT`, `DENIAL_FOLLOWUP_TICK`
- Idempotency key enforcement + retry policy stored in DB

### B) Evidence-Gated Adapter Enforcement

- Create `evidence-gate.ts` in `rcm/evidence/`
- Before any payer call, check `integration_evidence` table
- If no verified evidence → route to manual workflow + audit "evidence_missing"
- Add staleness check (>90 days since `last_verified_at` → stale warning)
- Strict mode: `RCM_EVIDENCE_STRICT=true` blocks stale evidence

### C) Denial/Appeal Workflow Enhancements

- Add `denial_followup_tick` job that scans open denials near SLA deadline
- Generate work queue items for overdue/approaching denials
- Appeal packet HTML generation improvements
- Standard states: open → gather_docs → submit → pending → resolved

### D) Reconciliation Automation

- Add `remittance_import_process` job for background ERA import
- Enhance matching engine with multi-strategy scoring
- Auto-detect underpayments (paid < expected threshold)
- Create tasks for unmatched payments and underpayment review

### E) Routes + UI

- Add `/rcm/ops/jobs/durable` for durable job management
- Add `/rcm/ops/evidence-gate/check` for evidence validation
- Add `/rcm/ops/denial-followup/run` for manual trigger
- Update RCM admin page with Jobs + Evidence Gate tabs

## Files Touched

- `apps/api/src/platform/db/migrate.ts` — durable job table
- `apps/api/src/platform/db/schema.ts` — durable job schema
- `apps/api/src/rcm/jobs/durable-queue.ts` — NEW: PG-backed queue
- `apps/api/src/rcm/jobs/queue.ts` — updated singleton to use durable
- `apps/api/src/rcm/evidence/evidence-gate.ts` — NEW: evidence enforcement
- `apps/api/src/rcm/jobs/denial-followup-tick.ts` — NEW: SLA ticker
- `apps/api/src/rcm/jobs/remittance-import-job.ts` — NEW: ERA import job
- `apps/api/src/rcm/reconciliation/matching-engine.ts` — enhanced matching
- `apps/api/src/rcm/rcm-ops-routes.ts` — new endpoints
- `apps/api/src/index.ts` — wiring
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — UI tabs

## Verification

- See 142-99-VERIFY.md
