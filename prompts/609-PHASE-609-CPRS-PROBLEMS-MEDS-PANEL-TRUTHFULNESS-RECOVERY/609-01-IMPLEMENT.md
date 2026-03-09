# Phase 609 - IMPLEMENT: CPRS Problems and Medications Panel Truthfulness Recovery

## User Request

- Continue autonomously and recover real end-user workflow gaps until the CPRS web surface behaves truthfully.
- Stay VistA-first and use prompt lineage before changing stale UI behavior.
- Treat existing chart tabs as production-facing features, not placeholders.

## Scope

- Recover the standalone CPRS Problems and Medications tabs so failed or integration-pending reads do not render as fake empty charts.
- Keep true live-empty responses rendering normal empty-state copy.
- Preserve existing list/detail behavior and the current add/edit modal entry points.

## Prompt Lineage

- Phase 8A Medications List
- Phase 9A Problem List
- Phase 606 CPRS Cover Sheet Cache Truthfulness Recovery
- Phase 608 CPRS Notes Panel Truthfulness Recovery

## Implementation Steps

1. Reuse `useDataCache().getDomainMeta(...)` in the standalone Problems and Medications panels.
2. Add grounded pending banners that explain failed or pending reads with status, attempted RPCs, and target RPCs.
3. Only show `No problems on record` and `No medications` when the latest fetch is trustworthy and live-empty.
4. Improve filtered empty-state copy so a filter mismatch is not described as a chart-empty condition.
5. Update the problems and medications runbooks so the standalone panel contract matches the recovered truthfulness behavior.

## Files Touched

- apps/web/src/components/cprs/panels/ProblemsPanel.tsx
- apps/web/src/components/cprs/panels/MedsPanel.tsx
- docs/runbooks/vista-rpc-problems.md
- docs/runbooks/vista-rpc-medications.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes

- Verify Docker, API health, and VistA connectivity first.
- Confirm live problem and medication list routes still work for DFN 46.
- Run TypeScript diagnostics for the changed web files.
- Regenerate phase metadata after adding the Phase 609 prompt folder and rerun the repo verifier.