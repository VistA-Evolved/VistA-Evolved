# Phase 614 - IMPLEMENT: CPRS Labs Panel Recovery

## User Request

- Continue autonomously and recover unfinished CPRS chart behavior until the Labs tab is usable end to end.
- Stay VistA-first, inspect the original phase lineage, and do not leave placeholder UX where the repo already has real backend depth.
- Make the frontend match the real backend lab workflow surface and communicate sandbox limits honestly.

## Prompt Lineage

- Phase 393 W22-P5 Lab Deep Workflows
- Phase 580 W42-P9 Wire Stubs - Labs and Reports
- Phase 610 CPRS Phase 12 Parity Panel Truthfulness Recovery

## Implementation Steps

1. Restore the missing `apps/web/src/components/cprs/panels/LabsPanel.tsx` component referenced by the CPRS chart route and panel barrel export.
2. Keep the existing cached `/vista/labs?dfn=` read path for live VistA interim results and display fetch posture honestly.
3. Reuse the existing lab acknowledgement path so clinicians can acknowledge selected results from the Labs tab.
4. Add world-class workflow subtabs for deep lab operations over the existing `/lab/*` backend: orders, specimens, results, critical alerts, and writeback posture.
5. Make every write action reflect the true backend state transition result and never imply sandbox capabilities that are not actually available.
6. Preserve CPRS usability: list/detail layout, clear selection state, actionable empty states, and visible writeback posture.
7. Update runbook and ops artifacts after live verification.

## Files Touched

- apps/web/src/components/cprs/panels/LabsPanel.tsx
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes

- Verify Docker, API health, and VistA connectivity first.
- Confirm the CPRS Labs tab renders for a chart without missing-component failures.
- Confirm `/vista/labs?dfn=46` still returns live VistA data.
- Confirm `/lab/dashboard`, `/lab/orders`, `/lab/specimens`, `/lab/results`, `/lab/critical-alerts`, and `/lab/writeback-posture` load from the UI session.
- Run TypeScript diagnostics for the new panel and rerun the latest verifier after docs updates.