# Phase 264 -- Data Portability Exports v1 (VERIFY)

## Verification Script
scripts/verify-phase264-data-portability-exports.ps1

## Gates (20)
1. G01 -- data-portability.ts exists
2. G02 -- data-portability-routes.ts exists
3. G03 -- test file exists
4. G04 -- BulkExportJob type defined
5. G05 -- kickoffBulkExport function
6. G06 -- PatientChartBundle type defined
7. G07 -- generatePatientChart function
8. G08 -- TenantExportJob type defined
9. G09 -- kickoffTenantExport function
10. G10 -- verifyExportManifest function
11. G11 -- SHA-256 manifest hashing
12. G12 -- 7 FHIR resource types
13. G13 -- 7 tenant export scopes
14. G14 -- Bulk export kickoff route
15. G15 -- Patient chart export route
16. G16 -- Tenant export kickoff route
17. G17 -- Manifest verification route
18. G18 -- Async kickoffs return 202
19. G19 -- Existing export-engine.ts preserved
20. G20 -- Prompt files present

## Run
```powershell
.\scripts\verify-phase264-data-portability-exports.ps1
```
