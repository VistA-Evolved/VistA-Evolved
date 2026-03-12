# Phase 726 - Full Truth And UX Audit - IMPLEMENT 07

## User Request
Continue the Phase 726 audit correctly by moving past the closed P1 route set and proving the next real mixed surface with live VistA signal, starting with the admin integrations console instead of certifying it from route metadata alone.

## Implementation Steps
1. Reconfirm canonical Docker, API, and VistA health before the integrations audit pass.
2. Inventory the admin integrations page implementation, its supporting API routes, and any existing runbook or audit references.
3. Open the admin integrations console in an authenticated browser session on the canonical VEHU stack.
4. Compare the visible tabs, cards, tables, and controls against live API responses rather than trusting static labels.
5. Identify any truth defects where the browser implies live integration status, queue depth, message detail, or HLO/HL7 behavior that the underlying routes do not support.
6. Fix only the real defects found during the live pass, with preference for truthful labels and states over fabricated semantics.
7. Re-test the changed surface against live VEHU-backed routes after any fix.
8. Record only evidence-backed findings in the browser audit artifact, runtime overrides if applicable, and ops records.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-07-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-95-VERIFY.md
- apps/web/src/app/cprs/admin/integrations/page.tsx
- apps/api/src/routes/vista-interop.ts
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json