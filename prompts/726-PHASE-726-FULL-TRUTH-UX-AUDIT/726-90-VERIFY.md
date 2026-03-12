# Phase 726 - Full Truth And UX Audit - VERIFY 90

## Verification Steps
1. Confirm VEHU and platform database containers are healthy before testing.
2. Authenticate to the canonical API and capture a valid CSRF token.
3. Verify the note-builder template catalog returns usable options on a clean tenant without requiring prior manual seeding.
4. Verify the note-builder generate endpoint accepts the page’s patient payload shape and returns a truthful draft-note payload.
5. Verify the default sandbox patient in the page is a valid VEHU DFN.
6. Browser-prove the note-builder page end to end on the canonical frontend.
7. Browser-check the workspace surface so Phase 726 advances beyond route-only proof.
8. Update the audit artifact and ops files with only the findings actually proven during this slice.

## Acceptance Criteria
1. The note-builder page no longer opens with an empty unusable template picker on a clean tenant.
2. The note-builder flow works with a valid VEHU patient and returns a truthful generated draft.
3. The backend and page agree on request and response shapes.
4. Evidence of the repaired browser flow is recorded in the Phase 726 artifact bundle.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-02-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-90-VERIFY.md
- apps/api/src/templates/template-engine.ts
- apps/api/src/templates/template-routes.ts
- apps/web/src/app/encounter/note-builder/page.tsx
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json