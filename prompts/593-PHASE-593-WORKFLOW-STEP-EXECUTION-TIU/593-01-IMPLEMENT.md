# Phase 593 — Workflow Step Execution + TIU Integration

## Objective

Turn the department workflow feature from a read-only admin catalog into an operational workflow console. Add a real frontend path to start and advance workflow instances, and wire supported note/report steps to proven TIU draft creation so workflow execution can perform live VistA-backed work when the step contract allows it.

## Implementation Steps

1. Inventory the workflow admin UI and identify missing operational actions for starting and advancing instances.
2. Reuse existing TIU writeback or CPRS notes logic instead of inventing new RPC calls.
3. Add a supported workflow step integration contract for TIU-backed note/report steps.
4. Return truthful integration results and grounding metadata for unsupported step RPCs rather than fake success.
5. Live-test the UI-dependent routes with clinician login, CSRF, and real VEHU TIU create/set-text behavior.
6. Update the workflow runbook and ops summary with the new operational contract.

## Files Touched

- apps/api/src/workflows/workflow-routes.ts
- apps/web/src/app/cprs/admin/workflows/page.tsx
- docs/runbooks/phase160-department-workflows.md
- ops/summary.md
- ops/notion-update.json
