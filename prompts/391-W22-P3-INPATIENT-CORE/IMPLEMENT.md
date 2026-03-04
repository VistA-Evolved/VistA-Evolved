# Phase 391 — W22-P3 Inpatient Core: IMPLEMENT

## User Request

Implement Phase 391 (W22-P3): Inpatient Core — ADT bedboard, nursing flowsheet
data capture, vitals recording, and writeback posture for GMV ADD VM / TIU
CREATE RECORD / DGPM ADT MOVEMENTS.

## Implementation Steps

1. **Types** (`apps/api/src/inpatient/types.ts`):
   - BedAssignment, BedStatus, AdtEvent, AdtEventType
   - FlowsheetRow (raw nursing data points)
   - VitalsEntry with writeback status tracking
   - WritebackPosture contract for GMV/TIU/DGPM

2. **Store** (`apps/api/src/inpatient/inpatient-store.ts`):
   - In-memory Maps for beds, ADT events, flowsheet rows, vitals
   - CRUD + bed assignment/discharge lifecycle
   - Bedboard summary stats (occupancy rate)
   - MAX_ITEMS=10000 with FIFO eviction

3. **Routes** (`apps/api/src/inpatient/inpatient-routes.ts`):
   - 13 endpoints under `/inpatient/*`
   - Bedboard, bed CRUD, ADT events, flowsheet rows, vitals, writeback posture
   - Auth: session for reads, admin for bed create/update

4. **Wiring**:
   - `register-routes.ts`: import + register `inpatientCoreRoutes`
   - `security.ts`: AUTH_RULES for `/inpatient/beds` (admin) + `/inpatient/` (session)
   - `store-policy.ts`: 4 store entries (beds, adt-events, flowsheet-rows, vitals)

## Verification

- `pnpm exec tsc --noEmit` from `apps/api/` — clean build
- All 13 endpoints follow existing patterns (await requireSession, field allowlists)

## Files Touched

- `apps/api/src/inpatient/types.ts` (new)
- `apps/api/src/inpatient/inpatient-store.ts` (new)
- `apps/api/src/inpatient/inpatient-routes.ts` (new)
- `apps/api/src/inpatient/index.ts` (new)
- `apps/api/src/server/register-routes.ts` (modified)
- `apps/api/src/middleware/security.ts` (modified)
- `apps/api/src/platform/store-policy.ts` (modified)
