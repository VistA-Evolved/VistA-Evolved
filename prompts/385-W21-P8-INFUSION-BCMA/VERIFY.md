# Phase 385 — W21-P8 Infusion/BCMA Safety Bridge — VERIFY

## Verification Gates

### Gate 1: Source files exist

- [ ] `apps/api/src/devices/infusion-bcma-types.ts` exists
- [ ] `apps/api/src/devices/infusion-bcma-store.ts` exists
- [ ] `apps/api/src/devices/infusion-bcma-routes.ts` exists

### Gate 2: Barrel export

- [ ] `infusionBcmaRoutes` exported from `devices/index.ts`

### Gate 3: Route registration

- [ ] `infusionBcmaRoutes` imported in `register-routes.ts`
- [ ] `server.register(infusionBcmaRoutes)` called

### Gate 4: AUTH_RULE

- [ ] `/devices/infusion/pump-events` → service auth

### Gate 5: Store policy

- [ ] `infusion-pump-events` entry in STORE_INVENTORY
- [ ] `bcma-sessions` entry in STORE_INVENTORY
- [ ] `infusion-bcma-audit-log` entry in STORE_INVENTORY

### Gate 6: Type coverage

- [ ] InfusionPumpEvent type with 18+ fields
- [ ] BcmaSession type with 12+ fields
- [ ] BcmaRight6Result with all 6 checks + overallStatus
- [ ] MedicationScan / PatientScan types
- [ ] PumpEventType union (10 event types)

### Gate 7: Right-6 verification

- [ ] rightPatient: barcode DFN match
- [ ] rightDrug: NDC match
- [ ] rightDose: scaffold pass
- [ ] rightRoute: scaffold pass
- [ ] rightTime: 1hr/2hr window
- [ ] rightDocumentation: order IEN present
- [ ] failures array populated on check failure

### Gate 8: Endpoint count

- [ ] 13 REST endpoints (4 pump + 7 BCMA + 2 stats/audit)

### Gate 9: Evidence

- [ ] `evidence/wave-21/385-infusion-bcma/evidence.md` exists
