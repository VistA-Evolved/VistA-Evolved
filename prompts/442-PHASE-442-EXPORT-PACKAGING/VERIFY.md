# Phase 442 — VERIFY: Export Packaging Pipeline (W28 P4)

## Gates
1. `export-pipeline.ts` exists in `apps/api/src/regulatory/`
2. Exports: createExportPackage, getExportPackage, listExportPackages, getExportAudit, verifyExportAuditChain
3. Cross-border constraint blocks HIPAA exports to foreign destinations
4. Manifests include SHA-256 contentHash and constraint check results
5. Store-policy entries registered (export-packages, export-audit)
6. Barrel re-export from regulatory/index.ts
7. QA lint: 0 FAIL
