# Phase 61 -- VERIFY -- Patient Portal Digital Front Door v1

## Verification Gates

### G1: ADR exists
- `docs/decisions/ADR-portal-reuse-v1.md` exists and references HealtheMe, Ottehr, AIOTP

### G2: Portal-plan.json artifact
- `artifacts/phase61/portal-plan.json` maps features to endpoints + RPCs

### G3: Pending endpoints wired (5 of 5)
- `/portal/health/labs` calls ORWLRR INTERIM (not stub)
- `/portal/health/consults` calls ORQQCN LIST (not stub)
- `/portal/health/surgery` calls ORWSR LIST (not stub)
- `/portal/health/dc-summaries` calls TIU DOCUMENTS BY CONTEXT (not stub)
- `/portal/health/reports` calls ORWRP REPORT TEXT (not stub)

### G4: Health Records UI updated
- Labs, consults, surgery, DC summaries sections render data tables (not placeholder text)
- Source badge is dynamic (ehr when data present, pending on fallback)

### G5: AI governance
- AI help page has disclaimer banner
- No clinical advice generated

### G6: No dead clicks
- All portal nav links resolve to real pages
- All pending integrations return honest-pending with _rpc target

### G7: Portal auth posture
- Portal sessions are isolated from clinician sessions
- DFN never exposed to client

### G8: Privacy controls
- Settings page supports 7 languages
- Notification preferences exist
- Proxy access has invitation flow

### G9: Prompt files
- `prompts/66-PHASE-61-PORTAL-DIGITAL-FRONT-DOOR/61-01-IMPLEMENT.md` exists
- `prompts/66-PHASE-61-PORTAL-DIGITAL-FRONT-DOOR/61-99-VERIFY.md` exists

### G10: Export governance
- PDF/JSON/SHC exports audited via portal-audit

## Script

```powershell
.\scripts\verify-phase61-portal.ps1
```
