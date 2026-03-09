# Phase 614 — CPRS Labs Deep Workflow Recovery

## User Request

- Continue autonomously and recover incomplete CPRS chart workflows until the UI behaves like a production clinical system.
- Keep the implementation VistA-first, inspect original prompt lineage before editing, and avoid fake completion states.
- Ensure the user-facing Labs tab reflects the real backend and sandbox posture instead of stopping at a read-only result list.

## Scope

- Upgrade the CPRS Labs tab from a result viewer into a multi-workflow surface for results, lab orders, specimen tracking, critical alerts, and lab operations posture.
- Reuse the existing Phase 304 lab writeback executor and Phase 393 lab deep workflow routes instead of inventing parallel web-only state.
- Preserve truthful behavior when VEHU lacks live writeback coverage by surfacing grounded draft, pending, or sandbox-limited states.

## Prompt Lineage

- Phase 12D — Labs read parity
- Phase 304 — Lab deep writeback
- Phase 393 — Lab deep workflows
- Phase 595 — Lab acknowledgement truthfulness
- Phase 610 — CPRS Phase 12 parity panel truthfulness recovery

## Implementation Steps

1. Inventory the current Labs panel, data-cache lab helpers, Phase 393 lab routes, and Phase 304 writeback contract.
2. Expand the Labs tab into multiple views: results, orders, specimens, critical alerts, and operations posture.
3. Add frontend fetch helpers for `/lab/orders`, `/lab/specimens`, `/lab/critical-alerts`, `/lab/dashboard`, and `/lab/writeback-posture`.
4. Wire order creation to the existing `/vista/cprs/orders/lab` route while also showing tracked order lifecycle data from `/lab/orders`.
5. Surface specimen chain-of-custody transitions using the existing Phase 393 specimen FSM endpoints.
6. Surface critical result alert acknowledgement and resolution using the existing Phase 393 alert endpoints.
7. Make all empty, pending, and unsupported states explicit and grounded in actual backend posture.
8. Update runbooks and ops artifacts with live verification commands and current VEHU limitations.

## Files Touched

- apps/web/src/components/cprs/panels/LabsPanel.tsx
- apps/web/src/stores/data-cache.tsx
- docs/runbooks/vista-rpc-phase12-parity.md
- docs/parity-coverage-report.md
- ops/summary.md
- ops/notion-update.json
- prompts/614-PHASE-614-CPRS-LABS-DEEP-WORKFLOW-RECOVERY/614-01-IMPLEMENT.md
- prompts/614-PHASE-614-CPRS-LABS-DEEP-WORKFLOW-RECOVERY/614-99-VERIFY.md

## Verification Notes

- Verify Docker, API health, and `/vista/ping` before code changes are treated as done.
- Confirm the current Labs read route still returns truthful VEHU posture for DFN 46.
- Exercise the Phase 393 lab workflow endpoints with an authenticated clinician session.
- Confirm the upgraded Labs tab compiles cleanly and reflects real order/specimen/alert state.
- Re-run the repo verifier after prompt/index regeneration.