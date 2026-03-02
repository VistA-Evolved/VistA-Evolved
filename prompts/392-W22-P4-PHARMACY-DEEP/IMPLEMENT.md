# Phase 392 -- W22-P4 Pharmacy Deep Workflows: IMPLEMENT

## User Request
Implement Phase 392 (W22-P4): Pharmacy Deep Workflows -- order->verify->dispense->administer->discontinue lifecycle with clinical checks, BCMA linking, and VistA writeback posture.

## Implementation Steps

1. **Types** (`apps/api/src/pharmacy/types.ts`):
   - PharmOrder with 11-state FSM (pending->pharmacist_review->verified->dispensing->dispensed->ready_for_admin->administered->discontinued->cancelled->on_hold->expired)
   - ClinicalCheckResult (DDI, allergy, duplicate, dose_range, renal_dose, high_alert)
   - DispenseEvent with 6-state lifecycle (pending->picking->checked->ready->delivered->returned)
   - AdminRecord with BCMA session linking (bcmaSessionId, barcodeVerified, right6Passed)
   - PharmWritebackPosture for ORWDX SAVE/DC, PSB MED LOG, PSO FILL, PSJBCMA

2. **Store** (`apps/api/src/pharmacy/pharmacy-store.ts`):
   - 3 in-memory stores: orders, dispense events, admin records
   - FSM transition validation with allowed-transitions map
   - Clinical checks: high-alert flagging (ISMP list), dose-range heuristic
   - Clinical check override with reason + auditor tracking
   - Dashboard stats aggregation (24h window)
   - Writeback posture: ORWDX SAVE (available), PSB MED LOG (pending)

3. **Routes** (`apps/api/src/pharmacy/pharmacy-routes.ts`):
   - 12 endpoints under `/pharmacy/*`
   - Orders CRUD + transition + clinical override
   - Dispensing events with status progression
   - Administration records with BCMA linking
   - Dashboard stats + writeback posture

4. **Wiring**:
   - `register-routes.ts`: import + register `pharmacyDeepRoutes`
   - `security.ts`: override endpoint admin-only, rest session
   - `store-policy.ts`: 3 pharmacy store entries

## Files Touched
- `apps/api/src/pharmacy/types.ts` (new)
- `apps/api/src/pharmacy/pharmacy-store.ts` (new)
- `apps/api/src/pharmacy/pharmacy-routes.ts` (new)
- `apps/api/src/pharmacy/index.ts` (new)
- `apps/api/src/server/register-routes.ts` (modified)
- `apps/api/src/middleware/security.ts` (modified)
- `apps/api/src/platform/store-policy.ts` (modified)
