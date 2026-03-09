# Phase 592-01: IMPLEMENT — Queue / Workflow Durability and Truthfulness

## Objective

Finish the Phase 159 and 160 operational workflow stack so the existing queue and
workflow admin UIs are actually usable in production. The current gap is not new
UI scaffolding; it is durable state, tenant scoping, and broken API/UI contracts.

## Implementation Steps

1. Reproduce the live workflow admin failure and queue empty-state behavior against
   the running API.
2. Add Postgres-backed repositories for `queue_ticket`, `queue_event`,
   `workflow_definition`, and `workflow_instance` using the existing Phase 159/160
   tables from PG migration history.
3. Update queue routes to be tenant-scoped, PG-first, and truthful:
   auto-seed default department configs, persist ticket lifecycle transitions,
   and keep the public display board working.
4. Update workflow routes to be tenant-scoped, PG-first, and compatible with the
   existing UI contract, including `/admin/workflows/definitions`, workflow pack
   summaries, and stats shaped the way the page expects.
5. Add a front-desk ticket creation path to the queue admin UI so the workflow can
   be exercised without hidden out-of-band setup.
6. Verify live with clinician login, real HTTP calls, and the existing admin pages.

## Files Touched

- `apps/api/src/platform/pg/pg-schema.ts`
- `apps/api/src/platform/pg/repo/index.ts`
- `apps/api/src/platform/pg/repo/pg-queue-repo.ts`
- `apps/api/src/platform/pg/repo/pg-workflow-repo.ts`
- `apps/api/src/queue/queue-routes.ts`
- `apps/api/src/workflows/workflow-routes.ts`
- `apps/web/src/app/cprs/admin/queue/page.tsx`
- `docs/runbooks/phase159-patient-queue.md`
- `docs/runbooks/phase160-department-workflows.md`
- `ops/summary.md`
- `ops/notion-update.json`