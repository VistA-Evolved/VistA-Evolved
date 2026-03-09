# Phase 666 - CPRS Cover Sheet Sequential Prefetch Truthfulness Recovery

## User Request
- Continue the live clinician audit until the CPRS UI is truthful and production-grade end to end.
- Use VistA first, validate against live Docker, and fix real workflow defects instead of cosmetic placeholders.
- Check prompt lineage before editing anything that appears incomplete or pending.

## Implementation Steps
1. Inventory the live defect from the clinician chart for DFN 46.
2. Confirm whether the backend or frontend is responsible by testing the live VistA-backed endpoints used by the Cover Sheet and Notes workflows.
3. Repair the Cover Sheet preload path so slow or empty domains do not cause later domains to render false empty states.
4. Ensure Notes navigation is not blocked behind Cover Sheet sequential domain fetches.
5. Keep the change minimal and aligned with existing CPRS data-cache patterns.

## Verification Steps
1. Verify Docker services are running and the API starts cleanly with no migration failures.
2. Log into the API with PRO1234 / PRO1234!! and call the live endpoints used by the Cover Sheet:
   - GET /vista/medications?dfn=46
   - GET /vista/vitals?dfn=46
   - GET /vista/notes?dfn=46
3. Open the live chart at /cprs/chart/46/cover and confirm Cover Sheet sections no longer show false empty states before their requests start.
4. Navigate from Cover Sheet to Notes and confirm the Notes list loads without a persistent Loading notes... hang.
5. Run scripts/verify-latest.ps1 and record whether any failures are pre-existing repository debt versus regressions from this fix.

## Files Touched
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- prompts/666-PHASE-666-CPRS-COVERSHEET-SEQUENTIAL-PREFETCH-TRUTHFULNESS-RECOVERY/666-01-IMPLEMENT.md
- prompts/666-PHASE-666-CPRS-COVERSHEET-SEQUENTIAL-PREFETCH-TRUTHFULNESS-RECOVERY/666-99-VERIFY.md
- ops/summary.md
- ops/notion-update.json