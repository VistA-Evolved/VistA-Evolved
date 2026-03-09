# Phase 661 - CPRS Labs Transition Selector Truthfulness Recovery

## User Request

Continue closing real clinician workflow gaps so the CPRS Labs panel behaves truthfully and does not present misleading workflow state to the user.

## Implementation Steps

1. Inventory the Labs workflow transition controls in the CPRS UI and compare them to the existing workflow lifecycle behavior from Phase 652.
2. Reproduce an invalid transition in the Labs Orders view and confirm whether the UI leaves the selector in a misleading state after the backend rejects the transition.
3. Fix the Labs transition controls so failed transitions reset to a truthful neutral state instead of visually implying success.
4. Preserve the existing backend lifecycle validation; only correct the clinician-facing control behavior.
5. Re-verify the invalid transition path in the browser.

## Files Touched

- prompts/661-PHASE-661-CPRS-LABS-TRANSITION-SELECTOR-TRUTHFULNESS-RECOVERY/661-01-IMPLEMENT.md
- prompts/661-PHASE-661-CPRS-LABS-TRANSITION-SELECTOR-TRUTHFULNESS-RECOVERY/661-99-VERIFY.md
- apps/web/src/components/cprs/panels/LabsPanel.tsx
- ops/summary.md
- ops/notion-update.json
