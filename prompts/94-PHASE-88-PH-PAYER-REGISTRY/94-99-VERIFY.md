# Phase 88 -- PH Payer Registry Ingestion + Capability Matrix -- VERIFY

## Verification Gates

### Gate 1: API compilation
```powershell
cd apps/api; npx tsc --noEmit
# Expected: clean, zero errors
```

### Gate 2: Web compilation
```powershell
cd apps/web; npx tsc --noEmit
# Expected: clean, zero errors
```

### Gate 3: Registry routes respond
```powershell
# Start API first: cd apps/api; npx tsx --env-file=.env.local src/index.ts
curl.exe http://localhost:3001/rcm/payerops/registry/health
# Expected: {"ok":true, "registry":{"sources":...}, "matrix":{"totalCells":...}}
```

### Gate 4: Ingestion pipeline
```powershell
curl.exe -X POST http://localhost:3001/rcm/payerops/registry/ingest -H "Content-Type: application/json" -d '{"target":"all"}'
# Expected: {"ok":true, "results":[...], "stats":{"sources":2, "payers":>30}}
```

### Gate 5: Regulator snapshot data files exist
```powershell
Test-Path data/regulator-snapshots/ph-ic-hmo-list.json       # True
Test-Path data/regulator-snapshots/ph-ic-hmo-broker-list.json # True
```

### Gate 6: Payer list populated after ingest
```powershell
curl.exe http://localhost:3001/rcm/payerops/payers
# Expected: array of 40+ payers (27 HMOs + PhilHealth + 13 brokers)
```

### Gate 7: Capability matrix populated
```powershell
curl.exe http://localhost:3001/rcm/payerops/capability-matrix
# Expected: {"ok":true, "matrix":[...], "stats":{"totalCells":>0}}
```

### Gate 8: Evidence enforcement -- no active without evidence
```powershell
# Attempt to set maturity=active on payer without evidence
curl.exe -X PATCH http://localhost:3001/rcm/payerops/capability-matrix/<payerId> -H "Content-Type: application/json" -d '{"capability":"eligibility","maturity":"active","mode":"api"}'
# Expected: {"ok":false, "error":"Cannot set maturity to active without evidence..."}
```

### Gate 9: Evidence add/remove auto-demote
```powershell
# Add evidence, set to active, remove evidence -> should auto-demote to in_progress
```

### Gate 10: Payer merge
```powershell
curl.exe -X POST http://localhost:3001/rcm/payerops/payers/merge -H "Content-Type: application/json" -d '{"targetId":"...","sourceId":"..."}'
# Expected: {"ok":true, "merged":{...}}
```

### Gate 11: Admin layout includes new nav items
```
Verify /cprs/admin/payer-directory and /cprs/admin/capability-matrix appear in admin sidebar
```

### Gate 12: Artifacts gitignored
```powershell
git check-ignore artifacts/regulator/test.json
# Expected: artifacts/regulator/test.json (matched by artifacts/ rule)
```

### Gate 13: No hardcoded credentials
```powershell
Select-String -Path apps/api/src/rcm/payerOps/*.ts -Pattern "PROV123|password|secret" -CaseSensitive
# Expected: no matches
```

### Gate 14: Runbook exists
```powershell
Test-Path docs/runbooks/ph-payer-registry-ingestion.md  # True
```

## Pass Criteria
All 14 gates must pass. API + Web must compile clean. No TypeScript errors.
