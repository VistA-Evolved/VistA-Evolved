# Phase 160 -- Department Workflow Packs

> Runbook for Phase 160: Department-specific clinical workflow definitions,
> step-based execution engine, and 8 specialty department packs.

---

## Overview

Phase 160 provides configurable, step-by-step clinical workflows for 8 hospital
departments. Each workflow definition breaks a department visit into discrete
steps (triage, assessment, orders, disposition, etc.) with VistA RPC references
where applicable.

Phase 592 completed the missing durability/truthfulness work: workflow definitions
and workflow instances are now served PG-first in `workflow-routes.ts`, the
definitions/packs/stats contracts match the admin UI, and definitions are seeded
on first read when the tenant has none.

Phase 593 completed the first real step-execution path: the workflow admin UI can
start workflows and advance active steps, and TIU-backed documentation steps now
create live VistA draft notes through `TIU CREATE RECORD` + `TIU SET DOCUMENT TEXT`.

## Architecture

```
apps/api/src/workflows/
  types.ts                 -- WorkflowDefinition, WorkflowInstance, DepartmentPack
  department-packs.ts      -- 8 built-in packs (ED, Lab, Rad, Surgery, OB/GYN, ICU, Rx, MH)
  workflow-engine.ts       -- In-memory CRUD + step advancement + seed
  workflow-routes.ts       -- Definitions, instances, step execution, TIU integration
  index.ts                 -- Barrel export

apps/api/src/writeback/executors/
  tiu-executor.ts          -- Real TIU CREATE NOTE DRAFT execution path reused by workflows

apps/api/src/routes/cprs/
  tiu-notes.ts             -- TIU titles/list/text routes; personal-title fallback hardening

apps/web/src/app/cprs/admin/workflows/
  page.tsx                 -- Admin dashboard (definitions, instances, packs, stats, step controls)
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

Most VistA references remain `integration-pending` in the sandbox.
Supported today:

- Radiology `rad-report` and ED `ed-note` can create live TIU draft notes.

Still pending:

- order, lab, and imaging verification steps that reference RPCs such as `ORWDX SAVE`, `ORWLR REPORT`, and `ORWDXR NEW ORDER`.

## API Endpoints

### Admin (requires admin role)

- `GET  /admin/workflows/definitions` -- List all definitions
- `POST /admin/workflows` -- Create definition
- `GET  /admin/workflows/:id` -- Get definition by ID
- `POST /admin/workflows/:id/activate` -- Activate a draft
- `POST /admin/workflows/:id/archive` -- Archive a definition
- `GET  /admin/workflows/packs` -- List available department packs
- `POST /admin/workflows/seed` -- Seed all department packs
- `GET  /admin/workflows/stats` -- Workflow statistics

### Operational (requires session)

- `POST /workflows/start` -- Start workflow for patient
- `POST /workflows/instances/:id/step/:stepId` -- Complete or skip a step
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

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ accessCode = 'PRO1234'; verifyCode = 'PRO1234!!' } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -WebSession $session
$csrf = $login.csrfToken
$headers = @{ 'X-CSRF-Token' = $csrf }

# Seed definitions and inspect the UI contracts
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/workflows/seed' -Method Post -Headers $headers -WebSession $session
$defs = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/workflows/definitions' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/workflows/packs' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/workflows/stats' -Method Get -WebSession $session

# Start a workflow and complete the first step
$labDef = $defs.definitions | Where-Object { $_.department -eq 'laboratory' } | Select-Object -First 1
$startBody = @{ definitionId = $labDef.id; patientDfn = '46' } | ConvertTo-Json -Compress
$start = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/workflows/start' -Method Post -Body $startBody -ContentType 'application/json' -Headers $headers -WebSession $session
$firstStepId = $start.instance.steps[0].stepId
$advanceBody = @{ action = 'complete'; notes = 'Phase 592 live verification' } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/workflows/instances/{0}/step/{1}" -f $start.instance.id, $firstStepId) -Method Post -Body $advanceBody -ContentType 'application/json' -Headers $headers -WebSession $session

# Start a radiology workflow and drive it through the TIU-backed report step
$radDef = $defs.definitions | Where-Object { $_.department -eq 'radiology' -and $_.name -eq 'Radiology Standard Exam' } | Select-Object -First 1
$radStart = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/workflows/start' -Method Post -Body (@{ definitionId = $radDef.id; patientDfn = '46' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
foreach ($step in @('rad-checkin','rad-verify','rad-prep','rad-exam','rad-read')) {
  Invoke-RestMethod -Uri ("http://127.0.0.1:3001/workflows/instances/{0}/step/{1}" -f $radStart.instance.id, $step) -Method Post -Body (@{ action = 'complete'; notes = "Phase 593 verification $step" } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
}
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/workflows/instances/{0}/step/rad-report" -f $radStart.instance.id) -Method Post -Body (@{ action = 'complete'; notes = 'Phase 593 radiology report draft'; integration = @{ tiu = @{ titleIen = '10'; text = 'Workflow-generated radiology draft note for DFN 46 on live verification.' } } } | ConvertTo-Json -Depth 6 -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/cprs/notes/titles' -Method Get -WebSession $session
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/vista/cprs/notes/text?ien=14345' -Method Get -WebSession $session
```

## VistA Integration Status

Workflow execution is now mixed-mode and truthful:

- TIU-backed documentation steps execute real VistA draft-note creation and return `integration.mode = tiu_draft`, `status = completed`, `rpcUsed`, and the created `docIen`.
- Unsupported step integrations still return `integration-pending` with the referenced target RPC instead of fake success.
- `/vista/cprs/notes/titles` now filters unusable M error rows and falls back to `GENERAL NOTE` when VEHU returns no usable personal title list.

Future phases can wire additional step families to actual VistA RPC calls once their parameter contracts are proven live.

## Follow-ups

- Wire additional non-TIU step families to proven VistA RPC execution paths
- Add WebSocket notifications for step advancement (real-time board updates)
- Department-specific sub-workflows (e.g., ED trauma protocol vs. minor injury)
- Link workflow instances to queue tickets from Phase 159
- Expand the current PG-first route layer into dedicated PG-backed workflow services if richer analytics or audit history is needed
