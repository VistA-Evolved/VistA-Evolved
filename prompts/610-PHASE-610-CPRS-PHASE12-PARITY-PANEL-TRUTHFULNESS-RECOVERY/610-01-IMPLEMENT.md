# Phase 610 - IMPLEMENT: CPRS Phase 12 Parity Panel Truthfulness Recovery

## User Request

- Continue autonomously and recover unfinished CPRS chart behavior until the UI reflects truthful live VistA posture.
- Stay VistA-first and inspect original prompt lineage before changing stale areas.
- Treat existing parity panels as production-facing user workflows, not placeholders.

## Scope

- Recover the remaining standalone Phase 12 parity panels that are cache-backed but still collapse failed or integration-pending reads into empty-chart copy.
- Cover the Consults, Surgery, D/C Summaries, Labs, and Reports tabs.
- Preserve the existing list/detail/report-text behavior; only fix the stale read-posture contract.

## Prompt Lineage

- Phase 12 CPRS Parity Wiring
- Phase 606 CPRS Cover Sheet Cache Truthfulness Recovery
- Phase 608 CPRS Notes Panel Truthfulness Recovery
- Phase 609 CPRS Problems and Medications Panel Truthfulness Recovery

## Implementation Steps

1. Add a shared pending-banner helper for cache-backed CPRS panels so the remaining parity tabs do not each invent different pending wording.
2. Wire the Consults, Surgery, D/C Summaries, Labs, and Reports tabs to `getDomainMeta(dfn, domain)`.
3. Render grounded pending banners with status, attempted RPCs, and target RPCs when the latest fetch is failed or integration-pending and there are no trustworthy rows.
4. Keep true live-empty responses rendering normal empty-state copy.
5. Improve filter-empty copy where relevant so a local filter mismatch is not described as a chart-empty condition.
6. Normalize the `/vista/reports` backend response to the documented report-catalog contract so the Reports panel receives `{ id, name, hsType }` instead of raw report-list rows.
7. Update the Phase 12 parity runbook so the documented panel contract matches the recovered truthfulness behavior.

## Files Touched

- apps/web/src/components/cprs/panels/CachePendingBanner.tsx
- apps/web/src/components/cprs/panels/ConsultsPanel.tsx
- apps/web/src/components/cprs/panels/SurgeryPanel.tsx
- apps/web/src/components/cprs/panels/DCSummPanel.tsx
- apps/web/src/components/cprs/panels/LabsPanel.tsx
- apps/web/src/components/cprs/panels/ReportsPanel.tsx
- apps/api/src/server/inline-routes.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes

- Verify Docker, API health, and VistA connectivity first.
- Confirm the live list routes for consults, surgery, D/C summaries, labs, and reports still return truthful VEHU posture for DFN 46.
- Confirm the report text endpoint still returns live text for a real report definition when available.
- Run TypeScript diagnostics for the changed web files.
- Regenerate phase metadata after adding the Phase 610 prompt folder and rerun the repo verifier.