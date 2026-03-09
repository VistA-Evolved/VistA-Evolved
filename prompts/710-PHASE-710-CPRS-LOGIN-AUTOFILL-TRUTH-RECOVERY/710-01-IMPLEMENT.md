# Phase 710 - CPRS Login Autofill Truth Recovery

## User Request

Continue the clinician-facing audit and fix real end-user defects so the UI behavior matches the live VEHU-backed runtime.

## Problem Statement

The CPRS login form shows the verified VEHU credentials in the field placeholders during development mode, but the underlying controlled inputs still start empty. From a clinician perspective the form looks prefilled, yet clicking `Sign On` fails with `Both access code and verify code are required.` until the user manually retypes the displayed values.

## Inventory

### Files inspected

- `apps/web/src/app/cprs/login/page.tsx`
- `prompts/669-PHASE-669-CPRS-LOGIN-LANE-TRUTHFULNESS-RECOVERY/669-01-IMPLEMENT.md`
- `prompts/669-PHASE-669-CPRS-LOGIN-LANE-TRUTHFULNESS-RECOVERY/669-99-VERIFY.md`
- `docs/runbooks/runtime-lanes.md`

### Existing UI involved

- `GET /cprs/login`
- Redirected CPRS chart login flow, including `redirect=/cprs/chart/:dfn/:tab`

### Exact files to change

- `apps/web/src/app/cprs/login/page.tsx`
- `docs/runbooks/runtime-lanes.md`
- `ops/summary.md`
- `ops/notion-update.json`

## Implementation Steps

1. Reproduce the dev-mode login defect in the browser and confirm the visible VEHU credentials are placeholders rather than real field values.
2. Update the CPRS login page so the actual controlled input state is prefilled with the verified VEHU lane credentials in development mode only.
3. Keep production behavior unchanged.
4. Update the relevant runtime runbook and ops artifacts.

## Verification Steps

1. Open `/cprs/login` or a redirected chart login page in a clean browser session.
2. Confirm the login form no longer errors for missing credentials when the visible dev-mode VEHU values are used without manual retyping.
3. Confirm sign-on reaches the requested chart route.
4. Run editor diagnostics on all touched files.