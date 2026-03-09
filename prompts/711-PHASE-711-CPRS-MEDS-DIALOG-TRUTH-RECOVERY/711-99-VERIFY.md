# Phase 711 - Verify CPRS Meds Dialog Truth Recovery

## Goal

Verify that the standalone CPRS Add Medication dialog accurately describes the current medication quick-order and manual-entry contracts.

## Verification Checklist

1. Inspect `apps/api/src/routes/cprs/wave2-routes.ts` and confirm `POST /vista/cprs/meds/quick-order` uses `ORWDXM AUTOACK`.
2. Confirm the quick-order dialog no longer claims the action runs through `ORWDX SEND`.
3. Confirm the quick-order draft wording now refers to a server-side draft.
4. Confirm the manual-entry path clearly remains a local-only draft and not a VistA-backed active medication.
5. Run diagnostics on all touched files.

## Acceptance Criteria

- Quick-order text matches the Phase 659 AUTOACK contract.
- Quick-order and manual-entry draft semantics are clearly distinguished.
- The dialog no longer mixes server-side draft and local-only draft language.