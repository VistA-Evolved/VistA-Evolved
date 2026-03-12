# Phase 726 - Full Truth And UX Audit - VERIFY 95

## Verification Steps
1. Confirm `vehu` and `ve-platform-db` are healthy and the canonical API responds on `/health` and `/vista/ping`.
2. Open `/cprs/admin/integrations` in an authenticated browser session on the canonical frontend.
3. Exercise the main integrations console tabs and corroborate each visible data region against its backing API response.
4. Verify that any queue counts, system status, message lists, and detail panels are either live-backed, truthfully empty, or explicitly integration-pending.
5. If a browser-visible truth defect is found, fix it and repeat the browser plus API proof.
6. Validate any touched files for diagnostics errors.
7. Update the audit artifact and ops files only after live proof is complete.

## Acceptance Criteria
1. The admin integrations console is either browser-proven as truthful on the canonical VEHU stack or fixed at the root cause of any misleading UI state.
2. No visible integration panel implies live behavior that its route contract cannot support.
3. Phase 726 records are updated only with evidence-backed findings from this integrations slice.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-07-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-95-VERIFY.md
- apps/web/src/app/cprs/admin/integrations/page.tsx
- apps/api/src/routes/vista-interop.ts
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json