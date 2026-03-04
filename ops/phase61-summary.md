# Phase 61 Summary -- Patient Portal Digital Front Door v1

## What Changed

### Core: Wire 5 pending portal health endpoints

- `GET /portal/health/labs` -- ORWLRR INTERIM (structured + raw text)
- `GET /portal/health/consults` -- ORQQCN LIST (date, status, service)
- `GET /portal/health/surgery` -- ORWSR LIST (procedure, date, surgeon)
- `GET /portal/health/dc-summaries` -- TIU DOCUMENTS BY CONTEXT (class=244, signed+unsigned merge)
- `GET /portal/health/reports` -- ORWRP REPORT LISTS (list mode) + ORWRP REPORT TEXT (text mode)

All 5 endpoints now call real VistA RPCs using the existing `portalRpc()` helper.
Graceful fallback to `_integration: "pending"` if VistA is unavailable.

### UI: Health Records page upgraded

- Labs, consults, surgery, DC summaries display real data tables
- Dynamic source badges (ehr when data present, pending on fallback)
- Dashboard home shows Lab Results with "ehr" source

### Governance

- ADR: `docs/decisions/ADR-portal-reuse-v1.md` (HealtheMe, Ottehr, AIOTP analysis)
- AI help: Enhanced governance banner with explicit no-diagnosis disclaimer
- Portal plan: `artifacts/phase61/portal-plan.json` (20 features mapped)

## How to Test

```powershell
.\scripts\verify-phase61-portal.ps1
```

## Follow-ups

- Immunizations (no RPCs registered yet)
- VistA-backed messaging (XMXAPI MailMan)
- Real scheduling (SD\* RPCs)
- Production auth (OIDC/SAML)
