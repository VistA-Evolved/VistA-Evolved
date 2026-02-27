# Phase 160-01: IMPLEMENT — Department Workflow Packs

## Objective
Create configurable department workflow packs (ED, Lab, Radiology, Surgery, OB, ICU,
Pharmacy, Mental Health) that define the step-by-step clinical workflows for each
department. Integrates with Phase 158 templates and Phase 159 queues.

## Files to Create/Modify
| Action | File |
|--------|------|
| CREATE | apps/api/src/workflows/types.ts |
| CREATE | apps/api/src/workflows/workflow-engine.ts |
| CREATE | apps/api/src/workflows/department-packs.ts |
| CREATE | apps/api/src/workflows/workflow-routes.ts |
| CREATE | apps/api/src/workflows/index.ts |
| MODIFY | apps/api/src/index.ts (register routes) |
| MODIFY | apps/api/src/platform/db/schema.ts (+2 tables) |
| MODIFY | apps/api/src/platform/db/migrate.ts (+DDL) |
| MODIFY | apps/api/src/platform/pg/pg-migrate.ts (+v25) |
| MODIFY | apps/api/src/platform/store-policy.ts (+entries) |
| CREATE | apps/web/src/app/cprs/admin/workflows/page.tsx |
| CREATE | docs/runbooks/phase160-department-workflows.md |
