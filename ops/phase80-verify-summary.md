# Phase 80 VERIFY -- Patient Record Portability v1

## What Changed (VERIFY audit fixes)

6 bugs discovered during 3-tier audit (sanity, feature integrity, system regression):

| Bug   | Issue                                                                                                     | Fix                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| BUG-1 | `getSharePreview()` missing `label` field -- E2E test would fail on `previewBody.label`                   | Added `label: share.label` to preview return type and object                                        |
| BUG-2 | Stats returns `activeExports`/`activeShares` but E2E expects `totalExports`/`totalShares`                 | Added `totalExports`/`totalShares` (count of all) alongside active counts -- stats now has 5 fields |
| BUG-3 | `revokeExport` imported but no route handler wired -- DoD says "revocation works (both export and share)" | Added `POST /portal/record/export/:token/revoke` route + UI Revoke button + E2E test                |
| BUG-4 | 7x unnecessary `as any` casts on `portalAudit()` calls                                                    | Removed all -- `PortalAuditAction` union already includes Phase 80 actions                          |
| BUG-5 | Graceful shutdown doesn't stop portability cleanup timer                                                  | Added `stopPortabilityCleanup()` import + call in `security.ts` shutdown handler                    |
| BUG-6 | `stopCleanupJob` not imported in security.ts                                                              | Part of BUG-5 fix -- import added                                                                   |

## Files Modified

- `apps/api/src/services/record-portability-store.ts` -- preview label, stats fields, removed as-any casts
- `apps/api/src/routes/record-portability.ts` -- added export revoke route, updated JSDoc
- `apps/portal/src/app/dashboard/records/page.tsx` -- added handleRevokeExport + Revoke button
- `apps/api/src/middleware/security.ts` -- graceful shutdown cleanup hook
- `apps/portal/e2e/record-portability.spec.ts` -- enriched assertions, added export revoke test
- `scripts/verify-phase80-record-portability.ps1` -- 8 new gates (P80-067 through P80-074)

## How to Test Manually

```bash
# 1. Start API + VistA Docker
cd services/vista && docker compose --profile dev up -d
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Create export, then revoke it
curl -X POST http://127.0.0.1:3001/portal/record/export \
  -H "Content-Type: application/json" \
  -d '{"format":"json","sections":["allergies"]}'
# Note the token from response
curl -X POST http://127.0.0.1:3001/portal/record/export/{TOKEN}/revoke

# 3. Verify download denied after revoke
curl http://127.0.0.1:3001/portal/record/export/{TOKEN}
# Should return 410 Gone

# 4. Run verifier
powershell -ExecutionPolicy Bypass -File scripts/verify-phase80-record-portability.ps1
```

## Verifier Output

```
Phase 80 Results: 74 PASS / 0 FAIL / 74 total
```

## Follow-ups

- None. Phase 80 is complete.
