# Phase 686 - IMPLEMENT: eMAR Allergy PSB Grounding

## Goal

Recover the standalone eMAR allergy workflow so it reflects the real VEHU
BCMA-allergy posture instead of continuing to tell the clinician that
`PSB ALLERGY` is integration-pending when that RPC is already callable.

## Problem Statement

During the live clinician audit, `GET /emar/allergies?dfn=46` still returned a
`pendingTargets` entry for `PSB ALLERGY`, and the standalone eMAR Allergy
Warnings tab still displayed footer text claiming scan-time BCMA allergy
checking was integration-pending. The chart nursing MAR route already proves
`PSB ALLERGY` is callable in VEHU and returns live warning rows.

## Implementation Steps

1. Update `apps/api/src/routes/emar/index.ts` so `/emar/allergies` calls
   `PSB ALLERGY` when available and returns those warning rows as live data
   instead of a stale pending target.
2. Keep `ORQQAL LIST` as the source of the documented allergy table and use
   `PSB ALLERGY` as the BCMA scan-time warning supplement.
3. Update `apps/web/src/app/cprs/emar/page.tsx` so the Allergy Warnings tab
   presents the live PSB-backed posture truthfully and no longer hardcodes
   `integration-pending` language for `PSB ALLERGY`.
4. Preserve truthful messaging that BCMA medication-log writes still depend on
   `PSB MED LOG` and full bedside BCMA remains broader than the allergy check.

## Files Touched

- `apps/api/src/routes/emar/index.ts`
- `apps/web/src/app/cprs/emar/page.tsx`
- `docs/runbooks/emar-bcma.md`
- `ops/summary.md`
- `ops/notion-update.json`
