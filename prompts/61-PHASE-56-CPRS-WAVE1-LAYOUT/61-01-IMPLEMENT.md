# Phase 56 -- CPRS Functional Parity Wave 1 v2 (READ) + Cover Sheet Layout Manager

## Mission
Make the web UI behave like CPRS for core READ workflows and Cover Sheet layout behavior.

## Definition of Done
1. Wave56 plan artifact generated and used as the only wiring source.
2. No mock data in Wave 1 panels (except explicit integration-pending).
3. Cover Sheet cards are resizable, persisted per user, resettable.
4. No dead clicks on Wave 1 screens.
5. Every Wave 1 action maps to endpoint + RPC list or pending list.

## Implementation

### A) Wave Plan Builder
- `scripts/cprs/buildWave56Plan.ts` -- reads parity-matrix + delphi + vivian + rpc-catalog
- outputs `artifacts/cprs/wave56-plan.json`

### B) Wave 1 Targets
Cover Sheet: Allergies, Active Problems, Vitals, Recent Labs, Outpatient Meds,
Orders Summary, Appointments, Clinical Reminders.
Tabs: Problems, Meds, Orders, Notes, Labs/Results (list + detail).

### C) API Endpoints
- Implement under `apps/api/src/routes/cprs/` -- each declares rpcUsed[], vivianPresence.
- Uses rpcRegistry, safeCallRpc, circuit breaker.

### D) UI Binding
- Remove mock imports, wire real endpoints.
- Pending items get standardized pending modal with RPC targets.

### E) Cover Sheet Layout Manager
- Resizable cards via drag handles.
- Persist layout per user (localStorage).
- Reset-to-default button.
- Classic + Modern mode support.

### F) Traceability
- Add `endpoint` field to actionRegistry CprsAction interface.
- Developer inspector overlay showing mappings.

### G) Verifiers
- `scripts/verify-phase56-wave1.ps1`
- `scripts/verify-latest.ps1` updated.

## Files Touched
- `scripts/cprs/buildWave56Plan.ts` (new)
- `apps/api/src/routes/cprs/wave1-routes.ts` (new)
- `apps/api/src/routes/index.ts` (modified)
- `apps/api/src/index.ts` (modified)
- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` (modified)
- `apps/web/src/components/cprs/CoverSheetLayoutManager.tsx` (new)
- `apps/web/src/components/cprs/IntegrationPendingModal.tsx` (new)
- `apps/web/src/components/cprs/ActionInspector.tsx` (new)
- `apps/web/src/stores/cprs-ui-state.tsx` (modified)
- `apps/web/src/actions/actionRegistry.ts` (modified)
- `apps/web/src/components/cprs/cprs.module.css` (modified)
- `scripts/verify-phase56-wave1.ps1` (new)
- `scripts/verify-latest.ps1` (modified)
- `ops/phase56-summary.md` (new)
- `ops/phase56-notion-update.json` (new)

## Commit
"Phase56: CPRS parity wave1 v2 (read) + cover sheet layout manager"
