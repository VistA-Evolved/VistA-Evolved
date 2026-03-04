# Phase 23 — Imaging Workflow V2 — VERIFY Summary

## What Changed (VERIFY session)

### Bug Fix: Ingest Idempotency

- **File:** `apps/api/src/services/imaging-ingest.ts`
- **Issue:** Re-ingesting the same `studyInstanceUid` created duplicate linkage records
- **Fix:** Added idempotency guards in `reconcileStudy()` and `quarantineStudy()`
  - `reconcileStudy()`: checks `getLinkageByStudyUid()` before processing; returns `already-linked` if found
  - `quarantineStudy()`: checks `unmatchedStore` for existing unresolved entry with same UID
- **Verified:** First ingest → `accession-exact`, second ingest → `already-linked` (same linkage ID)

### Verification Script

- **Created:** `scripts/verify-phase23-imaging-workflow.ps1` — 80 automated gates
- **Updated:** `scripts/verify-latest.ps1` → now delegates to Phase 23 script

## Gates Tested (Manual + Automated)

| Gate | Description                     | Result |
| ---- | ------------------------------- | ------ |
| 1    | Phase 22 regression (59 gates)  | PASS   |
| 2a-f | Worklist CRUD (6 endpoints)     | PASS   |
| 2g-h | Worklist auth enforcement (401) | PASS   |
| 3a   | Ingest callback accession-exact | PASS   |
| 3b-c | Bad/missing service key → 403   | PASS   |
| 3d   | Unmatched study → quarantine    | PASS   |
| 3e   | Linkages by patient query       | PASS   |
| 3f   | Unmatched admin queue           | PASS   |
| 4    | Chart orderSummary enrichment   | PASS   |
| 5    | UI structure (8 checks)         | PASS   |
| 6    | Orthanc Lua script mounted      | PASS   |
| 7    | Security + PHI scan (0 leaks)   | PASS   |
| 8    | Idempotency (bug fixed)         | PASS   |
| 9    | Documentation (7 docs)          | PASS   |
| K    | API + Web TSC compilation       | PASS   |

**Automated script result: 80 PASS, 0 FAIL, 1 WARN** (warn = skipped regression flag)

## How to Test Manually

```powershell
# 1. Start services
cd services\vista; docker compose --profile dev --profile imaging up -d
cd apps/api; npx tsx --env-file=.env.local src/index.ts

# 2. Run automated verification
.\scripts\verify-phase23-imaging-workflow.ps1

# 3. Or skip Phase 22 regression (faster)
.\scripts\verify-phase23-imaging-workflow.ps1 -SkipRegression
```

## Verifier Output

```
Phase 23 - Imaging Workflow V2 Verification
  PASS: 80  |  FAIL: 0  |  WARN: 1
  Phase 23 - Imaging Workflow V2: ALL GATES PASSED
```

## Follow-ups

- Phase 24 planning (if applicable)
- Production deployment: change `IMAGING_INGEST_WEBHOOK_SECRET` from default
- Production: increase `StableAge` in orthanc.json to 120-300s
- Migrate worklist/ingest stores from in-memory to VistA-native when Rad/Nuc Med files available
