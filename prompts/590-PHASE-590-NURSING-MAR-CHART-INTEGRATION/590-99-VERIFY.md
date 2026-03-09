# Phase 590 - Nursing MAR Chart Integration Verify

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Start the API with `npx tsx --env-file=.env.local src/index.ts` and confirm `/health` returns `ok:true`.
3. Authenticate with the live API using the VEHU programmer account.
4. Call `/emar/schedule?dfn=46` and confirm real VistA medication rows are returned.
5. Call `/emar/history?dfn=46` and confirm the fallback history path returns truthful data and notes the PSB gap explicitly.
6. Call `POST /emar/administer` with a real order IEN from the schedule and confirm the response records a TIU fallback note instead of fake BCMA success.
7. Call `POST /emar/barcode-scan` and confirm it performs VistA-backed medication matching without claiming unsupported PSJBCMA behavior.
8. Re-run the latest repo verification script to ensure the chart-integration change does not regress readiness.

## Acceptance Criteria

1. The Nursing chart MAR tab is no longer a dead placeholder.
2. The chart surfaces the same truthful eMAR fallback behavior that already exists in the standalone eMAR page.
3. Action metadata no longer marks working nursing MAR reads and fallback administration as fully unsupported.
4. BCMA package limits remain explicit and visible to the user.
5. The live verification steps are reproducible against VEHU with DFN 46.

## Files Touched

- prompts/590-PHASE-590-NURSING-MAR-CHART-INTEGRATION/590-01-IMPLEMENT.md
- prompts/590-PHASE-590-NURSING-MAR-CHART-INTEGRATION/590-99-VERIFY.md
- apps/web/src/components/cprs/panels/NursingPanel.tsx
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/emar-bcma.md
- ops/summary.md
- ops/notion-update.json