# Phase 445 — IMPLEMENT: Compliance Dashboard UI (W28 P7)

## Goal
Web UI for compliance/regulatory visualization with 4 tabs:
Posture, Frameworks, Attestations, Validators.

## Files Created
- `apps/web/src/app/cprs/admin/compliance/page.tsx` — Compliance dashboard

## Key Features
- Posture tab: tenant regulatory config, chain integrity badges, info cards
- Frameworks tab: table of all registered frameworks with PHI element counts
- Attestations tab: per-framework coverage cards with status breakdown
- Validators tab: table of country validators with domain lists
- All fetches use credentials: 'include' for httpOnly cookie auth
