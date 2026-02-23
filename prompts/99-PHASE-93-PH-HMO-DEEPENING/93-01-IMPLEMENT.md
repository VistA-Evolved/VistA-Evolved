# Phase 93 — PH HMO Deepening Pack (ALL Licensed HMOs) — IMPLEMENT

## User Request

Ship a Philippines HMO payer deepening pack covering all 28 Insurance Commission-licensed
HMOs. Evidence-backed, VistA-first, no fabricated APIs. Includes canonical registry,
payer adapter interface, billing staff UI console, and VistA-first audit script.

## Deliverables

1. Prompts ordering audit — verify contiguity, fix gaps
2. Canonical PH HMO registry JSON (`data/payers/ph-hmo-registry.json`) — 28 entries
3. PH HMO types + validation + API routes (`apps/api/src/rcm/payers/ph-hmo-registry.ts`)
4. PH HMO payer adapter interface + base impls (`apps/api/src/rcm/payers/ph-hmo-adapter.ts`)
5. UI console page (`apps/web/src/app/cprs/admin/ph-hmo-console/page.tsx`)
6. VistA-first audit script (`scripts/vista-first-audit.ps1`)
7. Documentation (`docs/payers/ph/README.md`, `docs/payers/ph/canonical-sources.md`,
   `docs/payers/ph/payer-capabilities-schema.md`)
8. Phase summary (`docs/reports/phase-93.md`)

## Canonical Source

Insurance Commission of the Philippines:
https://www.insurance.gov.ph/list-of-hmos-with-certificate-of-authority-as-of-31-december-2025/

## Files Touched

- `data/payers/ph-hmo-registry.json` (NEW)
- `apps/api/src/rcm/payers/ph-hmo-registry.ts` (NEW)
- `apps/api/src/rcm/payers/ph-hmo-adapter.ts` (NEW)
- `apps/api/src/rcm/payers/ph-hmo-routes.ts` (NEW)
- `apps/api/src/index.ts` (MODIFIED — register routes)
- `apps/api/src/middleware/security.ts` (MODIFIED — AUTH_RULES)
- `apps/web/src/app/cprs/admin/ph-hmo-console/page.tsx` (NEW)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED — nav entry)
- `scripts/vista-first-audit.ps1` (NEW)
- `docs/payers/ph/README.md` (NEW)
- `docs/payers/ph/canonical-sources.md` (NEW)
- `docs/payers/ph/payer-capabilities-schema.md` (NEW)
- `docs/reports/phase-93.md` (NEW)
- `prompts/99-PHASE-93-PH-HMO-DEEPENING/93-01-IMPLEMENT.md` (NEW)

## Verification

- Registry loads 28 entries at startup, validated unique payerId + non-empty legalName
- API: `GET /rcm/payers/ph/hmos` returns 28 items
- UI: PH HMO Console shows 28 rows
- VistA-first audit script runs clean
- `pnpm -C apps/api exec tsc --noEmit` passes
- `pnpm -C apps/web exec tsc --noEmit` passes
