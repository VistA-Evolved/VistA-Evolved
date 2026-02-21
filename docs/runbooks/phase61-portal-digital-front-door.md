# Phase 61 Runbook -- Patient Portal Digital Front Door v1

## Overview

Phase 61 wires 5 previously-pending portal health endpoints to real VistA RPCs,
upgrades the Health Records UI from placeholder text to data tables, adds AI
governance labels, and documents the reuse analysis.

## What Changed

### API (portal-auth.ts)

5 portal endpoints upgraded from stubs to live VistA RPC calls:

| Endpoint | RPC | Params | Phase |
|---|---|---|---|
| `GET /portal/health/labs` | ORWLRR INTERIM | DFN, startDate, endDate | 61 |
| `GET /portal/health/consults` | ORQQCN LIST | DFN, start, stop, service, status | 61 |
| `GET /portal/health/surgery` | ORWSR LIST | DFN, start, end, context, max | 61 |
| `GET /portal/health/dc-summaries` | TIU DOCUMENTS BY CONTEXT | class=244, signed+unsigned | 61 |
| `GET /portal/health/reports` | ORWRP REPORT TEXT / LISTS | DFN, reportId, hsType | 61 |

All endpoints gracefully fall back to `_integration: "pending"` if VistA is unavailable.

### Portal Web (Health Records page)

- Labs: Data table with Test, Result, Units, Ref Range, Flag columns
- Consults: Data table with Service, Status, Date, Type columns
- Surgery: Data table with Procedure, Date, Surgeon, Status columns
- DC Summaries: Data table with Title, Date, Author, Status columns
- Dynamic source badges (ehr when data present, pending on fallback)

### AI Help (Governance)

- Enhanced governance banner with explicit disclaimers
- No clinical advice, no VistA terminology, no PHI sent to AI

## How to Test

### Prerequisites
- VistA Docker running on port 9430
- API running: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
- Portal running: `cd apps/portal && pnpm dev`

### Manual Test Steps

1. **Login to portal:**
   Navigate to portal login, use `patient1` / `patient1`

2. **Health Records page:**
   Navigate to Dashboard > Health Records
   - Verify allergies, problems, vitals, medications show real data
   - Verify labs section shows data table (or "No lab results" if empty)
   - Verify consults section shows data table (or "No consults")
   - Verify surgery section shows data table (or "No surgical history")
   - Verify DC summaries section shows data table (or "No discharge summaries")
   - Verify all sections have EHR source badge (or pending if VistA down)

3. **AI Help page:**
   Navigate to Dashboard > AI Help
   - Verify governance banner is visible at top
   - Verify "AI Governance Notice" text includes no-diagnosis disclaimer

4. **Dashboard home:**
   Verify Lab Results card shows EHR badge (not pending)

### Automated Verification

```powershell
.\scripts\verify-phase61-portal.ps1
```

## Architecture Notes

- Portal endpoints use `portalRpc()` helper for consistent error handling
- All health data access is audited via `portalAudit()`
- Parsing logic mirrors clinician-side routes in `index.ts` (Phase 12)
- Reports endpoint supports two modes: list (no reportId) and text (with reportId)

## Remaining Gaps

See `artifacts/phase61/portal-plan.json` for full feature map including:
- Immunizations (no RPCs registered)
- VistA-backed messaging (target: XMXAPI MailMan)
- Real scheduling (target: SD* RPCs)
- Production auth (OIDC/SAML)
