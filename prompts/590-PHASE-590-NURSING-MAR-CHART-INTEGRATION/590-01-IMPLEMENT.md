# Phase 590 - Nursing MAR Chart Integration

## User Request

Continue closing real end-user workflow gaps so the chart experience is truthful, production-grade, and VistA-first.

## Implementation Steps

1. Verify VEHU, platform-db, and the API are reachable before changing chart-facing nursing MAR behavior.
2. Inventory the current Nursing chart panel, standalone eMAR page, eMAR API routes, and runbook intent before editing code.
3. Reuse the existing `/emar/*` routes instead of creating parallel nursing-only MAR logic.
4. Replace the Nursing panel MAR placeholder with a working chart-embedded experience backed by live eMAR schedule, history, administration, and barcode-scan endpoints.
5. Preserve truthful posture: keep BCMA package limits explicit while exposing the VistA-backed fallback flows that already work today.
6. Update action metadata so the chart action registry reflects what is actually wired versus what still depends on PSB MED LOG.
7. Update the eMAR runbook and ops artifacts so another engineer can see the Nursing panel now surfaces the same fallback capability as the standalone page.
8. Re-run live authenticated eMAR route checks after the UI and metadata change.

## Files Touched

- prompts/590-PHASE-590-NURSING-MAR-CHART-INTEGRATION/590-01-IMPLEMENT.md
- prompts/590-PHASE-590-NURSING-MAR-CHART-INTEGRATION/590-99-VERIFY.md
- apps/web/src/components/cprs/panels/NursingPanel.tsx
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/emar-bcma.md
- ops/summary.md
- ops/notion-update.json