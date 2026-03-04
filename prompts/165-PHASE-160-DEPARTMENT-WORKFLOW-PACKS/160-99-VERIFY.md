# Phase 160-99: VERIFY — Department Workflow Packs

## Verification Gates (10 gates)

### Gate 1: TypeScript Compiles

### Gate 2: Workflow Engine Exists (types, engine, packs, routes, index)

### Gate 3: DB Schema (workflow_definition, workflow_instance + PG v25 + RLS)

### Gate 4: Store Policy Entries

### Gate 5: Routes Wired in index.ts

### Gate 6: 8+ Department Packs (ED, Lab, Radiology, Surgery, OB, ICU, Pharmacy, MH)

### Gate 7: Step Lifecycle (pending -> active -> completed -> skipped)

### Gate 8: Template Integration (workflow steps reference Phase 158 specialty tags)

### Gate 9: UI Page Exists (apps/web/src/app/cprs/admin/workflows/page.tsx)

### Gate 10: Runbook (docs/runbooks/phase160-department-workflows.md)
