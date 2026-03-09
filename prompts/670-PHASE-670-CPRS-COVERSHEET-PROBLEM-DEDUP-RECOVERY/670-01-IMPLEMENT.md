# Phase 670 - CPRS Cover Sheet Problem Dedup Recovery

## User Request
- Continue autonomously until the clinician-facing UI is truthful and fully working.
- Verify live browser behavior instead of stopping at route success.
- Fix the next real post-login chart defect once the login flow is truthful.

## Implementation Steps
1. Reproduce the post-login Cover Sheet duplicate-key warning in the browser.
2. Prove whether the duplicate problem IDs come from the backend route or the web data path.
3. Inspect the shared CPRS data cache and problem fetch normalization used by the Cover Sheet.
4. Fix the root of the duplicate problem-record path with minimal edits so React receives stable unique problem rows.
5. Preserve truthful live VistA data instead of masking the issue with fake placeholders.
6. Re-open the chart and confirm the duplicate key warning and repeated problem rows are gone.
7. Update the ops summary with the verified cause and remediation.

## Files Touched
- apps/web/src/stores/data-cache.tsx
- prompts/670-PHASE-670-CPRS-COVERSHEET-PROBLEM-DEDUP-RECOVERY/670-01-IMPLEMENT.md
- prompts/670-PHASE-670-CPRS-COVERSHEET-PROBLEM-DEDUP-RECOVERY/670-99-VERIFY.md
- ops/summary.md
