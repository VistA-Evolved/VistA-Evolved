# Phase 671 - CPRS Reports Health Summary Disambiguation

## User Request
- Continue the live clinician UI audit until workflows are truthful and complete.
- Use VistA-first behavior and fix user-facing ambiguity instead of tolerating AI-left partial parity.
- If the intended behavior is unclear, inspect the original report prompt and current live payload.

## Implementation Steps
1. Reproduce the ambiguous Reports tree state in the live browser.
2. Confirm whether duplicate report labels are raw duplicates or distinct VistA report/qualifier tokens.
3. Inspect the Reports prompt history and current panel normalization logic.
4. Update the Reports UI to disambiguate duplicate Health Summary labels without inventing new report semantics.
5. Preserve live VistA identifiers so clinicians can distinguish otherwise identical choices.
6. Re-test the Reports tree in the browser and confirm the duplicate labels are no longer visually ambiguous.
7. Update ops notes with the verified live cause and remediation.

## Files Touched
- apps/web/src/components/cprs/panels/ReportsPanel.tsx
- prompts/671-PHASE-671-CPRS-REPORTS-HEALTH-SUMMARY-DISAMBIGUATION/671-01-IMPLEMENT.md
- prompts/671-PHASE-671-CPRS-REPORTS-HEALTH-SUMMARY-DISAMBIGUATION/671-99-VERIFY.md
- ops/summary.md
