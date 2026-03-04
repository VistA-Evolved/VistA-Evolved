# Phase 385 — W21-P8 Infusion/BCMA Safety Bridge — IMPLEMENT

## User Request

Build the Infusion Pump Integration and Barcode Medication Administration
(BCMA) safety bridge per Wave 21 manifest W21-P8. Implements pump event
staging, BCMA session workflow, and right-6 medication safety checks.

## Implementation Steps

1. Create `infusion-bcma-types.ts` — types for pump events, BCMA sessions,
   right-6 checks, medication/patient scans, statistics
2. Create `infusion-bcma-store.ts` — in-memory stores for pump events (20K),
   BCMA sessions (10K), audit log (20K), right-6 verification engine
3. Create `infusion-bcma-routes.ts` — 13 REST endpoints:
   - 4 pump event endpoints (create, list, get, verify)
   - 7 BCMA session endpoints (create, list, get, patient-scan,
     medication-scan, right6-check, complete)
   - 2 stats/audit endpoints
4. Wire barrel export in `devices/index.ts`
5. Wire import + register in `register-routes.ts`
6. Add AUTH_RULE for pump-events ingest (service auth)
7. Add 3 store entries to `store-policy.ts`

## Verification Steps

- All 13 endpoints registered and accessible
- Right-6 check returns structured pass/fail/warning per check
- Pump event ingest with service auth
- BCMA session lifecycle: scanning -> verified -> administered
- Store-policy entries present
- Barrel exports resolve

## Files Touched

- `apps/api/src/devices/infusion-bcma-types.ts` (NEW)
- `apps/api/src/devices/infusion-bcma-store.ts` (NEW)
- `apps/api/src/devices/infusion-bcma-routes.ts` (NEW)
- `apps/api/src/devices/index.ts` (MODIFIED — barrel export)
- `apps/api/src/server/register-routes.ts` (MODIFIED — import + register)
- `apps/api/src/middleware/security.ts` (MODIFIED — AUTH_RULE)
- `apps/api/src/platform/store-policy.ts` (MODIFIED — 3 store entries)
