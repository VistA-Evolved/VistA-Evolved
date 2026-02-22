# Phase 86 — Shift Handoff + Signout (IMPLEMENT)

## User Request

Implement shift handoff/signout workflow for inpatient operations:
- SBAR-style handoff form with situation/background/assessment/recommendation
- To-do checklist, risk flags (falls, isolation, critical labs)
- Shift-to-shift "handoff packet" printable/exportable
- Patient list for ward/service
- VistA-first: inventory CRHD RPCs; if unavailable in sandbox, use local in-memory store with explicit migration targets
- Audit/RBAC: nursing/inpatient staff only
- No dead clicks; handoff notes saved deterministically

## VistA Grounding Research

VistA has a **Shift Handoff Tool** package (CRHD) with 58 RPCs including:
- `CRHD GET PAT LIST` / `CRHD INPT LIST` — ward patient lists
- `CRHD PAT DEMO` / `CRHD PAT ALLERGIES` / `CRHD PAT ACTMEDS` — patient data assembly
- `CRHD HOT TEAM LIST` / `CRHD HOT TEAM SAVE` — team management
- `CRHD GET PREFERENCES` / `CRHD SAVE PARAMETERS` — user config

**Finding:** CRHD RPCs are NOT installed in WorldVistA Docker sandbox (0 RPCs available per parity matrix). The Delphi client `ShiftHandoffTool.exe` is a standalone Windows app.

**Decision:** Use in-memory store for handoff reports (matching Phase 23 imaging-worklist pattern) with CRHD RPCs as named migration targets. Patient data assembly uses existing working RPCs (ORWPS ACTIVE for meds, ORQQAL LIST for allergies, ORQPT WARD PATIENTS for ward lists).

## Implementation Steps

1. Create `apps/api/src/routes/handoff/handoff-store.ts` — in-memory SBAR handoff store
2. Create `apps/api/src/routes/handoff/index.ts` — 8 handoff endpoints
3. Create `apps/web/src/app/cprs/handoff/page.tsx` — shift handoff UI
4. Wire into `apps/api/src/index.ts` (import + register)
5. Add AUTH_RULE in `apps/api/src/middleware/security.ts`
6. Add audit actions in `apps/api/src/lib/audit.ts`
7. Add menu item in `apps/web/src/components/cprs/CPRSMenuBar.tsx`
8. Create docs + verifier

## Verification Steps

- API `tsc --noEmit` clean
- Web `next build` clean (25/25 pages)
- Phase 86 verifier script passes all gates
- Secret scan clean
- No dead clicks in handoff UI
- Handoff CRUD operations work deterministically

## Files Touched

### Created
- `apps/api/src/routes/handoff/handoff-store.ts`
- `apps/api/src/routes/handoff/index.ts`
- `apps/web/src/app/cprs/handoff/page.tsx`
- `prompts/91-PHASE-86-SHIFT-HANDOFF/91-01-IMPLEMENT.md`
- `scripts/verify-phase86-shift-handoff.ps1`
- `docs/runbooks/phase86-shift-handoff.md`
- `docs/runbooks/handoff-grounding.md`

### Modified
- `apps/api/src/index.ts`
- `apps/api/src/middleware/security.ts`
- `apps/api/src/lib/audit.ts`
- `apps/web/src/components/cprs/CPRSMenuBar.tsx`
