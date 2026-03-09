# Phase 666 - CPRS Cover Sheet Sequential Prefetch Truthfulness Recovery Verify

## Verification Steps
1. Confirm VEHU and platform-db containers are running before backend verification.
2. Start the API with `npx tsx --env-file=.env.local src/index.ts` from apps/api and confirm:
   - Server listening on port 3001
   - Platform PG init ok:true
   - No migration_failed output
3. Authenticate with PRO1234 / PRO1234!! and verify live VistA route output:
   - /vista/medications?dfn=46 returns ok:true and legitimate empty or live medication data
   - /vista/vitals?dfn=46 returns ok:true with the known vital rows for DFN 46
   - /vista/notes?dfn=46 returns ok:true with live TIU notes
4. In the browser, log into CPRS and open /cprs/chart/46/cover.
5. Confirm the Cover Sheet no longer shows false empty `No vitals recorded` or `No notes on record` while those requests have not yet started or are still loading.
6. Navigate from Cover Sheet to Notes and confirm the Notes list renders live rows instead of hanging on `Loading notes...`.
7. Run scripts/verify-latest.ps1 and record whether failures are unrelated pre-existing repository debt.

## Acceptance Criteria
- Cover Sheet starts all core clinical domain loads independently instead of serially blocking later domains behind earlier ones.
- Slow medication or lab requests do not cause false empty Notes or Vitals states on the Cover Sheet.
- Cover Sheet to Notes navigation no longer inherits a stuck notes load from sequential prefetch ordering.
- Live VistA data remains the source of truth for notes and vitals.
- No new verifier failures are introduced by this change.

## Files Touched
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- prompts/666-PHASE-666-CPRS-COVERSHEET-SEQUENTIAL-PREFETCH-TRUTHFULNESS-RECOVERY/666-01-IMPLEMENT.md
- prompts/666-PHASE-666-CPRS-COVERSHEET-SEQUENTIAL-PREFETCH-TRUTHFULNESS-RECOVERY/666-99-VERIFY.md
- ops/summary.md
- ops/notion-update.json