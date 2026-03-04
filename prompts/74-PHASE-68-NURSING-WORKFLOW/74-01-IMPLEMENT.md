# Phase 68 (Prompt 74) -- IMPLEMENT: Nursing Workflow v1

## User Request

Add nursing-facing workflows without inventing parallel clinical logic:

- Nursing task list (shift-based)
- Nursing documentation entry points (vitals exist; expand nursing notes posture)
- MAR posture (read-only if BCMA not present)

## Implementation Steps

1. Create `artifacts/phase68/nursing-plan.json` -- identifies RPCs, BCMA absence, pending posture
2. Create API routes `apps/api/src/routes/nursing/index.ts` -- 7 endpoints (4 read, 3 pending)
3. Create UI panel `apps/web/src/components/cprs/panels/NursingPanel.tsx` -- 4 sub-tabs
4. Wire tab in chart page, panel barrel, tabs.json, modules.json
5. Register RPCs in rpcRegistry.ts (1 new: ORQQVI VITALS FOR DATE RANGE)
6. Register actions in actionRegistry.ts (7 nursing actions)
7. Register capabilities in capabilities.json (7 nursing capabilities)
8. Create verification script `scripts/verify-phase68-nursing.ps1`

## Verification Steps

- API TSC: 0 errors
- Web TSC: 0 errors
- Phase 68 verify script: all gates PASS
- No fake data anywhere
- BCMA/MAR explicitly integration-pending

## Files Touched

- `artifacts/phase68/nursing-plan.json`
- `apps/api/src/routes/nursing/index.ts`
- `apps/api/src/index.ts`
- `apps/api/src/vista/rpcRegistry.ts`
- `apps/web/src/components/cprs/panels/NursingPanel.tsx`
- `apps/web/src/components/cprs/panels/index.ts`
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
- `apps/web/src/actions/actionRegistry.ts`
- `apps/web/src/lib/contracts/data/tabs.json`
- `config/capabilities.json`
- `config/modules.json`
- `scripts/verify-phase68-nursing.ps1`
- `prompts/74-PHASE-68-NURSING-WORKFLOW/74-01-IMPLEMENT.md`
- `prompts/74-PHASE-68-NURSING-WORKFLOW/74-99-VERIFY.md`
