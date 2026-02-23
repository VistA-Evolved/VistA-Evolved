# Phase 93 VERIFY — PH HMO Deepening Pack

## Verification Steps

### Automated
```powershell
.\scripts\vista-first-audit.ps1
```

### Manual Verification

1. **Registry JSON** -- `data/payers/ph-hmo-registry.json`
   - [ ] Exactly 27 HMO entries
   - [ ] All payerIds unique, start with PH-
   - [ ] All entries have canonicalSource.url pointing to IC
   - [ ] 5 HMOs have portal integration mode
   - [ ] No fabricated URLs or API endpoints

2. **TypeScript** -- `apps/api/src/rcm/payers/ph-hmo-registry.ts`
   - [ ] Types match JSON schema exactly
   - [ ] Validation catches missing/duplicate payerIds
   - [ ] BOM handling (BUG-064)

3. **API Routes** -- `apps/api/src/rcm/payers/ph-hmo-routes.ts`
   - [ ] GET /rcm/payers/ph/hmos returns list
   - [ ] GET /rcm/payers/ph/hmos/stats returns coverage stats
   - [ ] GET /rcm/payers/ph/hmos/validate returns validation
   - [ ] GET /rcm/payers/ph/hmos/:payerId returns single HMO
   - [ ] GET /rcm/payers/ph/hmos/:payerId/loa-packet generates packet
   - [ ] GET /rcm/payers/ph/hmos/:payerId/claim-packet generates packet
   - [ ] GET /rcm/payers/ph/hmos/:payerId/capabilities returns report
   - [ ] 404 for unknown payerId

4. **Adapter** -- `apps/api/src/rcm/payers/ph-hmo-adapter.ts`
   - [ ] No hardcoded credentials
   - [ ] LOA packet includes portal URL when available
   - [ ] Claim packet includes contracting warning when needed
   - [ ] Capability report accurately reflects evidence

5. **UI** -- `apps/web/src/app/cprs/admin/ph-hmo-console/page.tsx`
   - [ ] Registry tab: list + filter + detail panel
   - [ ] Capabilities tab: matrix with color legend
   - [ ] Packets tab: LOA/claim generation per HMO
   - [ ] Validation tab: data quality report
   - [ ] Nav entry in admin layout

6. **VistA-First Compliance**
   - [ ] No RCM store claims to be authoritative ledger
   - [ ] Registry is "orchestration metadata" only
   - [ ] VistA IB/AR/PCE referenced as source of truth

7. **Build**
   - [ ] `npx tsc --noEmit` passes (no type errors in new files)

## Expected Audit Output
```
PASS: 15+ gates
FAIL: 0
WARN: 0-2 (acceptable for store tagging)
```
