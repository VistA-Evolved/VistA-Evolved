# Phase 67 — VERIFY: ADT + Inpatient Lists v1

## Verification Gates (scripts/verify-phase67-adt.ps1)

### Gate 1: File structure
- apps/api/src/routes/adt/index.ts exists
- apps/web/src/components/cprs/panels/ADTPanel.tsx exists

### Gate 2: RPC Registry
- rpcRegistry.ts contains ORQPT WARDS (domain: adt)
- rpcRegistry.ts contains ORQPT WARD PATIENTS
- rpcRegistry.ts contains ORQPT PROVIDER PATIENTS
- rpcRegistry.ts contains ORQPT TEAMS
- rpcRegistry.ts contains ORQPT TEAM PATIENTS
- rpcRegistry.ts contains ORQPT SPECIALTIES
- rpcRegistry.ts contains ORQPT SPECIALTY PATIENTS
- rpcRegistry.ts contains ORWU1 NEWLOC
- rpcRegistry.ts contains ORWPT16 ADMITLST

### Gate 3: Capabilities
- capabilities.json has clinical.adt.wards
- capabilities.json has clinical.adt.wardPatients
- capabilities.json has clinical.adt.providerPatients
- capabilities.json has clinical.adt.teams
- capabilities.json has clinical.adt.teamPatients
- capabilities.json has clinical.adt.specialties
- capabilities.json has clinical.adt.specialtyPatients
- capabilities.json has clinical.adt.locations

### Gate 4: Action Registry
- actionRegistry.ts contains adt.wards
- actionRegistry.ts contains adt.ward-patients
- actionRegistry.ts contains adt.provider-patients

### Gate 5: Tab Wiring
- tabs.json contains CT_ADT
- page.tsx VALID_TABS contains 'adt'
- page.tsx has ADTPanel import
- panels/index.ts exports ADTPanel

### Gate 6: Modules
- modules.json clinical routePatterns includes /vista/adt

### Gate 7: TSC
- `npx tsc --noEmit` clean in apps/api and apps/web

### Gate 8: No fake data
- ADTPanel.tsx does NOT contain hardcoded patient names
- adt/index.ts does NOT contain hardcoded ward names
- All data comes from VistA RPCs or shows integration-pending
