# Phase 726 - Full Truth And UX Audit - IMPLEMENT 08

## User Request
Continue the Phase 726 audit correctly by moving to the next unresolved mixed-signal admin surface after integrations, using live browser and API proof for the payer DB console instead of certifying it from static structure.

## Implementation Steps
1. Reconfirm canonical Docker, API, and VistA health before starting the payer DB slice.
2. Inventory the payer DB page implementation, its supporting admin payer DB routes, and any persistence or runbook references.
3. Open `/cprs/admin/payer-db` in an authenticated browser session on the canonical VEHU stack.
4. Compare each visible tab, grid, filter, modal, and write control against live route responses and real DB-backed state.
5. Identify any truth defects where the page implies persisted payer, capability, evidence, or audit behavior that the underlying routes do not support.
6. Fix only the real defects found during the live pass, preferring truthful labels and states over fabricated semantics.
7. Re-test the changed surface against live backend routes after any fix.
8. Record only evidence-backed findings in the browser audit artifact, runtime overrides if applicable, and ops records.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-08-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-96-VERIFY.md
- apps/web/src/app/cprs/admin/payer-db/page.tsx
- apps/api/src/routes/admin-payer-db-routes.ts
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json