# Phase 86 — VERIFY (Shift Handoff + Signout)

## User Request

Run the standard 3-layer verification rubric:
1. **Sanity** — verify-latest + secret scan + wiring + contracts + build
2. **Feature Integrity** — handoff creation/edit, export/print, edge cases, dead UI
3. **Regression** — prior flows unbroken, data contracts consistent

## Verification Steps

### Layer 1: Sanity
- [ ] `scripts/verify-latest.ps1` passes (65/65)
- [ ] Secret scan: no credentials outside login page
- [ ] API `tsc --noEmit` clean
- [ ] Web `next build` clean (25+ pages)
- [ ] All new routes reachable (AUTH_RULES, index.ts import/register)
- [ ] Audit actions typed correctly in audit.ts
- [ ] No console.log added
- [ ] No hardcoded/placeholder data

### Layer 2: Feature Integrity
- [ ] Handoff store CRUD: create, get, list, update, submit, accept, archive
- [ ] State machine: draft → submitted → accepted → archived (no skip)
- [ ] Ward patient assembly: ORQPT WARD PATIENTS → per-patient enrichment
- [ ] SBAR form validation (all 4 sections)
- [ ] Risk flags and todos persistence
- [ ] pendingTargets + vistaGrounding in every response
- [ ] UI tabs: Active, Create, Accept, Archive all functional
- [ ] Error states handled (404, 400, etc.)
- [ ] Edge cases: empty ward, no patients, duplicate submit

### Layer 3: Regression
- [ ] eMAR routes still work (Phase 85)
- [ ] CPRSMenuBar: all existing menu items preserved
- [ ] AUTH_RULES: no disruption to other route patterns
- [ ] Audit type union: no syntax errors, existing actions preserved
- [ ] index.ts: all prior route registrations intact

## Files Touched
- `apps/api/src/routes/handoff/handoff-store.ts` (new)
- `apps/api/src/routes/handoff/index.ts` (new)
- `apps/web/src/app/cprs/handoff/page.tsx` (new)
- `apps/api/src/index.ts` (modified)
- `apps/api/src/middleware/security.ts` (modified)
- `apps/api/src/lib/audit.ts` (modified)
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` (modified)

## Output
- `docs/reports/phase-86-verify.md`
