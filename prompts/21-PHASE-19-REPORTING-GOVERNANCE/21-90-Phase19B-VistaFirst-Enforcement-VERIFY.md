# Phase 19B — VistA-First Enforcement for Reporting & Governance (VERIFY)

> **Created by Phase 20 — VistA-First Grounding**

---

## Checks

### Route Rename

- [ ] `/reports/clinical` no longer exists in `reporting.ts`
- [ ] `/reports/clinical-activity` exists and returns same data structure
- [ ] Web UI references updated (if any)

### VistA Reporting Separation

- [ ] `reporting.ts` header comment states "platform operational reports"
- [ ] `reporting.ts` header references `docs/reporting-grounding.md`
- [ ] `docs/reporting-grounding.md` exists and is non-empty

### Clinical Reports (unchanged)

- [ ] `ORWRP REPORT TEXT` endpoint still works in `index.ts`
- [ ] Reports tab in CPRS replica still renders VistA reports

### Regression

- [ ] `scripts/verify-latest.ps1` passes (no regressions)
