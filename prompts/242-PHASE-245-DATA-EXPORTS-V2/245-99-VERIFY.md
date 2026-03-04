# Phase 245 — Data Exports v2 — VERIFY

## Gates

1. export-engine.ts exists with `createExportJob`, `getExportJob`, `listExportJobs`
2. export-formats.ts exists with `formatCsv`, `formatJson`, `formatJsonl`
3. export-sources.ts exists with `registerSource`, `getSources`
4. export-routes.ts exists with GET/POST endpoints
5. Routes registered in register-routes.ts (`exportV2Routes`)
6. Admin exports page exists
7. Admin layout has "Exports" nav item
8. TypeScript compiles
9. No console.log in new files
10. Store registered in store-policy (if applicable)

## Run

```powershell
.\scripts\verify-phase245-data-exports-v2.ps1
```
