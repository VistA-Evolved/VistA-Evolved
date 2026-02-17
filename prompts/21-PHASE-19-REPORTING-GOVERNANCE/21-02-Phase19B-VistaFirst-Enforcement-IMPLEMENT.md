# Phase 19B — VistA-First Enforcement for Reporting & Governance (IMPLEMENT)

> **Created by Phase 20 — VistA-First Grounding**
> This sub-phase retrofits Phase 19 with explicit separation between
> clinical reporting (VistA GMTS) and platform operational reporting.

---

## Context

Phase 19 built `/reports/*` endpoints for operational metrics. The
`/reports/clinical` endpoint is misnamed — it counts audit events about
clinical actions, not actual VistA clinical reports. This must be clarified.

---

## Requirements

### R1: Rename `/reports/clinical` → `/reports/clinical-activity`

- [ ] Rename route in `apps/api/src/routes/reporting.ts`
- [ ] Update any web UI references in `apps/web/src/app/admin/reports/page.tsx`
- [ ] Update report-config.ts if the route name is referenced

### R2: Add VistA Reporting Grounding Header

- [ ] `apps/api/src/routes/reporting.ts` header comment must explicitly state:
  - These endpoints are **platform operational reports**, not VistA clinical reports
  - VistA clinical reports are served via `ORWRP REPORT TEXT` in `index.ts`
  - See `docs/reporting-grounding.md` for the full separation

### R3: Reference Grounding Doc

- [ ] Top of `reporting.ts`: `See: docs/reporting-grounding.md`
- [ ] `docs/reporting-grounding.md` must be committed before this sub-phase

---

## Verification

- Run `scripts/verify-latest.ps1`
- Confirm `/reports/clinical` is renamed to `/reports/clinical-activity`
- Confirm header comments reference grounding doc

---

## Files to Touch

- `apps/api/src/routes/reporting.ts` (rename route + header comment)
- `apps/web/src/app/admin/reports/page.tsx` (update route reference if needed)
- `apps/api/src/config/report-config.ts` (update if route name referenced)
