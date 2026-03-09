# Phase 669 - CPRS Login Lane Truthfulness Recovery

## User Request
- Continue autonomously until the clinician-facing UI is truthful and fully working.
- Use VistA first and verify live user behavior in the browser, not just backend routes.
- If a workflow presents stale or fake guidance, fix it from the end-user perspective.

## Implementation Steps
1. Reconfirm the active lane and live clinician credentials already verified in the current VEHU workflow.
2. Reproduce the CPRS login defect in the browser and capture whether the displayed credentials actually work.
3. Inventory the login page source and any existing lane-specific guidance already present in the repo.
4. Patch the CPRS login UI so placeholders and helper text match the verified live lane instead of legacy WorldVistA defaults.
5. Avoid inventing unverified credentials; only show the clinician account that has live proof in the current lane.
6. Re-run the browser login flow using the on-screen guidance and confirm the chart opens successfully.
7. Update operational notes if the user-facing guidance changes.

## Files Touched
- apps/web/src/app/cprs/login/page.tsx
- prompts/669-PHASE-669-CPRS-LOGIN-LANE-TRUTHFULNESS-RECOVERY/669-01-IMPLEMENT.md
- prompts/669-PHASE-669-CPRS-LOGIN-LANE-TRUTHFULNESS-RECOVERY/669-99-VERIFY.md
- ops/summary.md
