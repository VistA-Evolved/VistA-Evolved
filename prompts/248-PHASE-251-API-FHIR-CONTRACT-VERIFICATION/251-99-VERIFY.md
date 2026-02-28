# Phase 251 -- VERIFY -- API + FHIR Contract Verification

## Verification Script
```powershell
.\scripts\verify-phase251-api-fhir-contracts.ps1
```

## Gates (18)

| Gate | Check | Criteria |
|------|-------|----------|
| G01 | api-contracts/ dir | Directory exists |
| G02 | route-contracts.ts | Core registry file |
| G03 | barrel index | index.ts exports |
| G04 | >= 25 route contracts | Count path declarations |
| G05 | 5 domain coverage | infra, auth, clinical, fhir, admin |
| G06 | FHIR metadata | /fhir/metadata in contracts |
| G07 | 7 FHIR resource types | All resource types covered |
| G08 | SMART discovery | smart-configuration contract |
| G09 | API contract test | Test file exists |
| G10 | FHIR contract test | Test file exists |
| G11 | API test imports | Imports from api-contracts |
| G12 | FHIR test imports | Imports capability-statement |
| G13 | prompt folder | Exists |
| G14 | IMPLEMENT prompt | 251-01-IMPLEMENT.md |
| G15 | VERIFY prompt | 251-99-VERIFY.md |
| G16 | evidence dir | evidence/wave-7/P4 |
| G17 | TypeScript compiles | tsc --noEmit passes |
| G18 | AuthLevel exported | Type exported from barrel |

## Expected Output
```
PASS: 18  FAIL: 0  WARN: 0
VERDICT: PASS
```
