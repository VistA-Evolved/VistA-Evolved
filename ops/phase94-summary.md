# Phase 94 — PH HMO Workflow Automation

## What Changed

Phase 94 implements end-to-end PH HMO workflow automation with three
workbenches (LOA, Claims, Remittance), payer-specific rulepacks, and
VistA-first source mapping visible in the UI.

### Deliverables

| ID  | Deliverable                                    | Status |
| --- | ---------------------------------------------- | ------ |
| A   | Unified LOA Workflow + Workbench               | Done   |
| B   | Unified Claims Submission Workflow + Workbench | Done   |
| C   | Remittance / EOB Intake + Workbench            | Done   |
| D   | Payer-Specific Rulepacks                       | Done   |
| E   | VistA-First Source Mapping                     | Done   |
| F   | Prompt Discipline                              | Done   |

### Files Created

**Backend (apps/api/src/rcm/)**

| File                                | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| loa/loa-types.ts                    | LOA domain types (7-state lifecycle)                     |
| loa/loa-store.ts                    | In-memory LOA store with CRUD                            |
| loa/loa-workflow.ts                 | LOA orchestration (payer-aware modes)                    |
| loa/loa-routes.ts                   | 10 REST endpoints for LOA                                |
| workflows/claims-workflow.ts        | Claims submission with HMO awareness                     |
| workflows/claims-workflow-routes.ts | 10 REST endpoints for claims + rulepacks + VistA sources |
| workflows/remittance-intake.ts      | Remittance document intake + underpayment flagging       |
| workflows/remittance-routes.ts      | 7 REST endpoints for remittance                          |
| workflows/vista-source-map.ts       | 24-entry VistA field source map                          |
| payers/payer-rulepacks.ts           | Rulepack loader from JSON                                |

**Data**

| File                              | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| data/payers/ph-hmo-rulepacks.json | 5 HMO rulepacks (evidence-only, unknowns marked) |

**Frontend (apps/web/src/app/cprs/admin/)**

| File                       | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| loa-workbench/page.tsx     | LOA management: list, create, submit, approve/deny    |
| claims-workbench/page.tsx  | Claims status board, create, VistA sources, rulepacks |
| remittance-intake/page.tsx | Remittance upload, review, post, underpayment alerts  |

**Wiring**

| File                                   | Change                           |
| -------------------------------------- | -------------------------------- |
| apps/api/src/index.ts                  | +3 route imports + registrations |
| apps/web/src/app/cprs/admin/layout.tsx | +3 nav entries                   |

### Files Inspected (Not Modified)

- apps/api/src/rcm/payers/ph-hmo-registry.ts (Phase 93)
- apps/api/src/rcm/payers/ph-hmo-adapter.ts (Phase 93)
- apps/api/src/rcm/payers/ph-hmo-routes.ts (Phase 93)
- apps/api/src/rcm/domain/claim.ts (Phase 38)
- apps/api/src/rcm/domain/claim-store.ts (Phase 38)
- apps/api/src/rcm/audit/rcm-audit.ts (existing)

## How to Test Manually

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Test LOA endpoints
curl -X POST http://localhost:3001/rcm/loa \
  -H 'Content-Type: application/json' \
  -d '{"patientDfn":"3","payerId":"PH-MAXICARE","actor":"test"}'

curl http://localhost:3001/rcm/loa
curl http://localhost:3001/rcm/loa/stats

# 3. Test Claims endpoints
curl -X POST http://localhost:3001/rcm/claims/hmo \
  -H 'Content-Type: application/json' \
  -d '{"patientDfn":"3","payerId":"PH-MAXICARE","dateOfService":"2025-01-15","actor":"test"}'

curl http://localhost:3001/rcm/claims/hmo/board
curl http://localhost:3001/rcm/claims/source-map
curl http://localhost:3001/rcm/payers/rulepacks

# 4. Test Remittance endpoints
curl -X POST http://localhost:3001/rcm/remittance \
  -H 'Content-Type: application/json' \
  -d '{"payerId":"PH-MAXICARE","filename":"test-eob.pdf","storageRef":"local://test"}'

curl http://localhost:3001/rcm/remittance
curl http://localhost:3001/rcm/remittance/stats

# 5. Start Web
cd apps/web
pnpm dev
# Navigate to /cprs/admin/loa-workbench, claims-workbench, remittance-intake
```

## Verification

- TypeScript typecheck: PASS (exit code 0)
- No new console.log calls
- No hardcoded credentials
- All stores are in-memory (consistent with Phase 23/38 pattern)
- VistA source map explicitly marks integration-pending fields with target RPCs
- Rulepacks mark unknown SLAs/deadlines as "unknown" (evidence-only)
- No fabricated payer APIs

## Follow-Ups

1. Add Phase 94 verifier script (scripts/verify-phase94-hmo-workflow.ps1)
2. Connect LOA workflow to Phase 93 adapter for live packet generation
3. Implement payer rulepack validation rules in claim scrubber (Phase 91)
4. Add underpayment trend analytics to Phase 25 BI pipeline
5. Production: replace in-memory stores with VistA Pre-Auth files
