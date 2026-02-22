# Phase 86 -- Shift Handoff + Signout Runbook

## Overview

Shift Handoff provides SBAR-structured (Situation, Background, Assessment,
Recommendation) handoff reports for inpatient nursing staff. Reports flow
through a 4-state lifecycle: draft -> submitted -> accepted -> archived.

## Architecture

```
Web UI (4-tab page)          API (8 endpoints)           VistA RPCs
  Active / Create / Accept / Archive
        |                        |
        +-- fetch ---------> /handoff/ward-patients --> ORQPT WARD PATIENTS
        |                                               ORWPS ACTIVE (meds)
        |                                               ORQQAL LIST (allergies)
        |
        +-- POST ----------> /handoff/reports ---------> In-memory store
        +-- PUT -----------> /handoff/reports/:id        (CRHD migration target)
        +-- POST submit ---> /handoff/reports/:id/submit
        +-- POST accept ---> /handoff/reports/:id/accept
        +-- POST archive --> /handoff/reports/:id/archive
```

### Storage

In-memory `Map<string, HandoffReport>` in `handoff-store.ts`. Resets on API
restart. This matches the established pattern from imaging-worklist (Phase 23).

### CRHD Migration Path

The WorldVistA Docker sandbox has 0/58 CRHD RPCs installed. When CRHD is
available:

1. Replace in-memory store with CRHD RPC calls (CRHD HANDOFF SAVE, etc.)
2. Ward patient list already uses VistA RPCs (ORQPT WARD PATIENTS)
3. Map SBAR fields to TIU DOCUMENT CLASS for persistence
4. Use CRHD HANDOFF SUBMIT / ACCEPT for lifecycle transitions

See `docs/runbooks/handoff-grounding.md` for full capability map.

## Endpoints

| Method | Path                          | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | /handoff/ward-patients        | Live VistA patient list with meds/allergies |
| GET    | /handoff/reports              | List reports (filter: ward, status) |
| GET    | /handoff/reports/:id          | Get single report                  |
| POST   | /handoff/reports              | Create draft report                |
| PUT    | /handoff/reports/:id          | Update draft report                |
| POST   | /handoff/reports/:id/submit   | Submit draft for acceptance        |
| POST   | /handoff/reports/:id/accept   | Accept submitted handoff           |
| POST   | /handoff/reports/:id/archive  | Archive accepted handoff           |

## Audit Actions

- `clinical.handoff-create` -- Report created
- `clinical.handoff-accept` -- Report accepted by incoming nurse
- `clinical.handoff-view` -- Report viewed (archive/detail access)

## UI

URL: `/cprs/handoff`
Access: CPRSMenuBar -> Inpatient menu -> "Shift Handoff"

### Tabs

1. **Active** -- Non-archived handoffs for selected ward
2. **Create** -- SBAR form with ward patient loader, risk flags, todos
3. **Accept** -- Review and accept submitted handoffs
4. **Archive** -- Historical handoffs

## Manual Testing

```bash
# 1. Start VistA Docker + API
cd services/vista && docker compose --profile dev up -d
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Login and get session cookie
curl -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# 3. Check ward patients
curl -b cookies.txt http://127.0.0.1:3001/handoff/ward-patients

# 4. Create a handoff report
curl -b cookies.txt -X POST http://127.0.0.1:3001/handoff/reports \
  -H "Content-Type: application/json" \
  -d '{"ward":"ICU","patients":[{"dfn":"3","name":"TEST PATIENT","sbar":{"situation":"Stable","background":"Admitted 2d ago","assessment":"Improving","recommendation":"Continue current plan"},"riskFlags":[],"todos":[]}]}'

# 5. Submit it
curl -b cookies.txt -X POST http://127.0.0.1:3001/handoff/reports/<ID>/submit

# 6. Accept it
curl -b cookies.txt -X POST http://127.0.0.1:3001/handoff/reports/<ID>/accept
```

## Configuration

No additional env vars required. Uses existing session auth.

## Known Limitations

- In-memory store resets on API restart
- CRHD RPCs not available in WorldVistA Docker (0/58 installed)
- Ward patient assembly does N+1 RPC calls per patient (acceptable for ward-size lists)
