# Phase 445 — VERIFY: Compliance Dashboard UI (W28 P7)

## Gates

1. `page.tsx` exists at `apps/web/src/app/cprs/admin/compliance/`
2. 4 tabs: Posture, Frameworks, Attestations, Validators
3. All fetches use `credentials: 'include'`
4. Posture tab shows chain integrity badges
5. Attestations tab shows coverage percentage
6. QA lint: 0 FAIL
