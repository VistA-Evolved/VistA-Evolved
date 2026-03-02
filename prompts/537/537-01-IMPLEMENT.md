# Phase 537 — Clinical Procedures v1 (CP/MD)

## Wave 39, P7

### Goal
Build read-only Clinical Procedures (CP) and Medicine (MD) panels with VistA
RPC stubs, integration-pending responses, and tabbed UI for CP results,
Medicine data, and consult-procedure linking.

### Implementation

1. **RPC Registry** -- Add 15+ MD/CP RPCs to `rpcRegistry.ts` under domain
   `"clinical-procedures"` (MD CLIO, MD TMD* family, ORQQCN medicine RPCs,
   TIU CLINPROC RPCs).

2. **Route Module** -- `apps/api/src/routes/clinical-procedures/index.ts`
   - GET /vista/clinical-procedures?dfn=N -- List CP results for patient
   - GET /vista/clinical-procedures/:id -- Detail of a CP result
   - GET /vista/clinical-procedures/medicine?dfn=N -- Medicine (MD) data
   - GET /vista/clinical-procedures/consult-link?consultId=N -- Consult-procedure linkage
   - All use integration-pending pattern (MD RPCs not wired in sandbox)
   - In-memory store for future writeback prep

3. **Capabilities** -- Add to `config/capabilities.json`:
   - clinical.procedures.list (pending, MD CLIO)
   - clinical.procedures.detail (pending, MD TMDPROCEDURE)
   - clinical.procedures.medicine (pending, MD TMDPATIENT)
   - clinical.procedures.consult_link (pending, ORQQCN ATTACH MED RESULTS)

4. **Module Config** -- Add `^/vista/clinical-procedures` to clinical module
   routePatterns in `config/modules.json`.

5. **Panel** -- `ClinicalProceduresPanel.tsx`
   - Tabs: Results | Medicine | Consult Link
   - Results tab: list + detail split pane (like ConsultsPanel)
   - Medicine tab: placeholder with vistaGrounding display
   - Consult Link tab: placeholder with vistaGrounding display
   - "Integration Pending" badges on all data areas

6. **Panel Barrel** -- Export from `panels/index.ts`

7. **Store Policy** -- Add cp-results-store entry

8. **Register Routes** -- Wire in `register-routes.ts`

### Files Touched
- apps/api/src/vista/rpcRegistry.ts
- apps/api/src/routes/clinical-procedures/index.ts (NEW)
- apps/api/src/server/register-routes.ts
- apps/api/src/platform/store-policy.ts
- apps/web/src/components/cprs/panels/ClinicalProceduresPanel.tsx (NEW)
- apps/web/src/components/cprs/panels/index.ts
- config/capabilities.json
- config/modules.json
