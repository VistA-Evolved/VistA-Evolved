# Phase 726 - Full Truth And UX Audit - IMPLEMENT 02

## User Request
Continue the Phase 726 live truth-and-browser audit correctly, moving beyond the completed admin VistA sweep and fixing the next real user-facing defects instead of certifying broken flows.

## Implementation Steps
1. Inventory the next unresolved P1 surfaces after the completed admin VistA sweep.
2. Live-probe the candidate surfaces against the canonical VEHU stack before editing.
3. Confirm browser-visible impact so any fixes address real UX truth defects, not only route-level mismatches.
4. Fix the note-builder flow at the root cause if the page is unusable due to missing seeded templates, invalid default patient selection, or request/response contract drift.
5. Keep template behavior truthful by distinguishing tenant-published templates from built-in specialty-pack starter templates.
6. Preserve session auth and tenant scoping while allowing the note builder to function on a clean tenant without manual pre-seeding.
7. Re-test the changed route(s) against live VEHU with real login cookies and CSRF headers.
8. Browser-prove the repaired note-builder flow and the next workspace-level surface on the canonical frontend.
9. Record only evidence-backed findings in the audit artifact, ops summary, and notion status.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-02-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-90-VERIFY.md
- apps/api/src/templates/template-engine.ts
- apps/api/src/templates/template-routes.ts
- apps/web/src/app/encounter/note-builder/page.tsx
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json