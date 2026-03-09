# Phase 603 — CPRS Cover Sheet Immunizations Recovery

## Mission

Recover truthful live immunization state on the CPRS cover sheet so users do not
see a stale integration-pending badge after the VistA immunizations route is
working again. The cover sheet must distinguish live-empty data from real
integration-pending states and must reset transient pending posture on refresh
and patient changes.

## Implementation Steps

1. Inventory the current cover sheet immunization fetch path and compare it to
   the Phase 65 immunizations contract.
2. Verify the live backend posture for `GET /vista/immunizations?dfn=46` against
   running VEHU and the API.
3. Fix the cover sheet immunizations state handling so pending state is cleared
   before each fetch and recomputed from the latest response only.
4. Keep the user-visible behavior truthful:
   - live empty -> `No immunizations on record`
   - real pending/unavailable -> pending badge + pending copy
5. Update any directly related stale panel wiring or comments only where needed
   to keep the frontend contract aligned.
6. Re-run TypeScript and live HTTP verification after the change.

## Files Touched

- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- `docs/runbooks/phase79-coversheet-layout.md` (if needed for behavior notes)
- `ops/summary.md`
- `ops/notion-update.json`
