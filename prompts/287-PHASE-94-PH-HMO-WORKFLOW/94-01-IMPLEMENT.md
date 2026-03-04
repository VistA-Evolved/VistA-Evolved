# Phase 94 IMPLEMENT -- PH HMO Workflow Automation

## Request

Build unified LOA, Claims, and Remittance workflows for PH HMO payers
on top of Phase 93 registry + adapters. Evidence-bound, VistA-first,
human-in-loop for portal/manual payers. No fabricated APIs.

## Implementation Steps

1. LOA domain types + in-memory store (loa-types.ts, loa-store.ts)
2. Claims workflow domain (claims-workflow.ts) wrapping existing claim-store
3. Remittance intake domain (remittance-intake.ts) with secure blob abstraction
4. Payer rulepacks data (data/payers/ph-hmo-rulepacks.json) -- evidence-only
5. VistA source mapping (vista-source-map.ts) for field provenance
6. API routes: loa-workflow-routes.ts, claims-workflow-routes.ts, remittance-routes.ts
7. UI: LOA Workbench, Claims Workbench, Remittance Intake pages
8. Wire routes in index.ts, nav entries in admin layout

## Files Touched

- CREATED: apps/api/src/rcm/loa/loa-types.ts
- CREATED: apps/api/src/rcm/loa/loa-store.ts
- CREATED: apps/api/src/rcm/loa/loa-workflow.ts
- CREATED: apps/api/src/rcm/loa/loa-routes.ts
- CREATED: apps/api/src/rcm/workflows/claims-workflow.ts
- CREATED: apps/api/src/rcm/workflows/claims-workflow-routes.ts
- CREATED: apps/api/src/rcm/workflows/remittance-intake.ts
- CREATED: apps/api/src/rcm/workflows/remittance-routes.ts
- CREATED: apps/api/src/rcm/workflows/vista-source-map.ts
- CREATED: apps/api/src/rcm/payers/payer-rulepacks.ts
- CREATED: data/payers/ph-hmo-rulepacks.json
- CREATED: apps/web/src/app/cprs/admin/loa-workbench/page.tsx
- CREATED: apps/web/src/app/cprs/admin/claims-workbench/page.tsx
- CREATED: apps/web/src/app/cprs/admin/remittance-intake/page.tsx
- MODIFIED: apps/api/src/index.ts (register 4 new route plugins)
- MODIFIED: apps/web/src/app/cprs/admin/layout.tsx (3 nav entries)
- CREATED: prompts/99-PHASE-94-PH-HMO-WORKFLOW/94-01-IMPLEMENT.md
- CREATED: prompts/99-PHASE-94-PH-HMO-WORKFLOW/94-99-VERIFY.md

## Verification

- npx tsc --noEmit (zero errors)
- scripts/vista-first-audit.ps1 (15+ gates PASS)
- No fabricated payer APIs
- No credentials in code
- All fetches use credentials:'include'
