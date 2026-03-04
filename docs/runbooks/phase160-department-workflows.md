# Phase 160 -- Department Workflow Packs

> Runbook for Phase 160: Department-specific clinical workflow definitions,
> step-based execution engine, and 8 specialty department packs.

---

## Overview

Phase 160 provides configurable, step-by-step clinical workflows for 8 hospital
departments. Each workflow definition breaks a department visit into discrete
steps (triage, assessment, orders, disposition, etc.) with VistA RPC references
where applicable.

## Architecture

```
apps/api/src/workflows/
  types.ts                 -- WorkflowDefinition, WorkflowInstance, DepartmentPack
  department-packs.ts      -- 8 built-in packs (ED, Lab, Rad, Surgery, OB/GYN, ICU, Rx, MH)
  workflow-engine.ts       -- In-memory CRUD + step advancement + seed
  workflow-routes.ts       -- 13 Fastify endpoints
  index.ts                 -- Barrel export

apps/web/src/app/cprs/admin/workflows/
  page.tsx                 -- Admin dashboard (definitions, instances, packs, stats)
```

## Department Packs

| Department    | Steps | VistA RPCs Referenced                                 |
| ------------- | ----- | ----------------------------------------------------- |
| ED            | 9     | ORWPT LIST ALL, ORQQAL LIST, ORWPS ACTIVE, ORWDX SAVE |
| Lab           | 6     | ORWPS ACTIVE, ORWDX SAVE                              |
| Radiology     | 6     | ORWPS ACTIVE, ORWDX SAVE, RAD/NUC MED                 |
| Surgery       | 7     | ORWDX SAVE, TIU CREATE RECORD                         |
| OB/GYN        | 7     | ORWPT LIST ALL, ORWPS ACTIVE                          |
| ICU           | 8     | ORWPS ACTIVE, ORWDX SAVE, ORQQAL LIST                 |
| Pharmacy      | 7     | ORWPS ACTIVE, PSB MED LOG                             |
| Mental Health | 7     | TIU CREATE RECORD, ORWPS ACTIVE                       |

All VistA references are marked `integration-pending` in the sandbox.

## API Endpoints

### Admin (requires admin role)

- `GET  /admin/workflows/definitions` -- List all definitions
- `POST /admin/workflows/definitions` -- Create definition
- `GET  /admin/workflows/definitions/:id` -- Get definition by ID
- `POST /admin/workflows/definitions/:id/activate` -- Activate a draft
- `POST /admin/workflows/definitions/:id/archive` -- Archive a definition
- `GET  /admin/workflows/packs` -- List available department packs
- `POST /admin/workflows/seed` -- Seed all department packs
- `GET  /admin/workflows/stats` -- Workflow statistics

### Operational (requires session)

- `POST /workflows/start` -- Start workflow for patient
- `POST /workflows/instances/:id/advance` -- Advance to next step
- `POST /workflows/instances/:id/cancel` -- Cancel a workflow
- `GET  /workflows/instances` -- List instances (filter by dept)
- `GET  /workflows/instances/:id` -- Get instance detail

## Database

### SQLite Tables

- `workflow_definition` -- Template definitions with steps JSON
- `workflow_instance` -- Running instances with step state JSON

### PostgreSQL (v25)

- Same tables with UUID PKs, JSONB for steps/tags, TIMESTAMPTZ
- RLS policies via `applyRlsPolicies()` -- both tables in tenantTables

### Store Policy

- `workflow-definition-store` -- classification: registry, durability: pg_backed
- `workflow-instance-store` -- classification: critical, durability: pg_backed

## Verification

```powershell
# 1. Check TypeScript compiles
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit

# 2. Verify schema tables exist
grep -n "workflow_definition\|workflow_instance" apps/api/src/platform/db/schema.ts

# 3. Verify PG migration v25
grep -n "phase160" apps/api/src/platform/pg/pg-migrate.ts

# 4. Verify RLS entries
grep -n "workflow_definition\|workflow_instance" apps/api/src/platform/pg/pg-migrate.ts

# 5. Verify store policy
grep -n "workflow-definition-store\|workflow-instance-store" apps/api/src/platform/store-policy.ts

# 6. Verify routes wired
grep -n "workflowRoutes" apps/api/src/index.ts

# 7. Count department packs (expect 8)
grep -c "department:" apps/api/src/workflows/department-packs.ts
```

## Manual Testing

```bash
# Seed department packs
curl -s -b cookies.txt http://localhost:3001/admin/workflows/seed -X POST | jq

# List definitions
curl -s -b cookies.txt http://localhost:3001/admin/workflows/definitions | jq

# Start a workflow
curl -s -b cookies.txt http://localhost:3001/workflows/start \
  -X POST -H "Content-Type: application/json" \
  -d '{"definitionId":"<id>","patientDfn":"3","department":"ED"}' | jq

# Advance step
curl -s -b cookies.txt http://localhost:3001/workflows/instances/<id>/advance \
  -X POST -H "Content-Type: application/json" \
  -d '{"completedBy":"87"}' | jq
```

## VistA Integration Status

All VistA RPC references in department packs are marked `integration-pending`.
Steps reference RPCs via the `vistaRpc` field but do not call them directly.
Future phases will wire step completion to actual VistA RPC calls (e.g.,
completing an "Orders" step triggers `ORWDX SAVE`).

## Follow-ups

- Wire step completion to actual VistA RPC calls
- Add WebSocket notifications for step advancement (real-time board updates)
- Department-specific sub-workflows (e.g., ED trauma protocol vs. minor injury)
- Link workflow instances to queue tickets from Phase 159
- Persist definitions/instances to SQLite/PG instead of in-memory
