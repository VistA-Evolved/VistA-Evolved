# Runbook: Phase 12 — CPRS Parity Wiring

## Overview

Phase 12 wires 5 remaining CPRS tab panels to real VistA RPCs, fixes 3 local-only
dialogs, and adds Graphing, Remote Data Viewer, and Legacy Console features.

## Prerequisites

- WorldVistA Docker running on port 9430
- `apps/api/.env.local` configured with PROV123 / PROV123!!
- API server running on port 3001

## New API Endpoints

### ICD Lexicon Search
```
GET /vista/icd-search?q=hypertension
→ ORQQPL4 LEX
→ Returns: { ok, results: [{ id, description, icd }] }
```

### Consults
```
GET /vista/consults?dfn=1
→ ORQQCN LIST [DFN, "", "", "", ""]
→ Returns: { ok, results: [{ id, date, status, service, type }] }

GET /vista/consults/detail?id=123
→ ORQQCN DETAIL [id]
→ Returns: { ok, text }
```

### Surgery
```
GET /vista/surgery?dfn=1
→ ORWSR LIST [DFN, "", "", "-1", "999"]
→ Returns: { ok, results: [{ id, caseNum, procedure, date, surgeon }] }
```

### Discharge Summaries
```
GET /vista/dc-summaries?dfn=1
→ TIU DOCUMENTS BY CONTEXT [CLASS=244, signed + unsigned]
→ Returns: { ok, results: [{ id, title, date, author, location, status }] }

GET /vista/tiu-text?id=123
→ TIU GET RECORD TEXT [id]
→ Returns: { ok, text }
```

### Labs
```
GET /vista/labs?dfn=1
→ ORWLRR INTERIM [DFN, "", ""]
→ Returns: { ok, results: [{ id, name, date, status, value }], rawText }
```

### Reports
```
GET /vista/reports
→ ORWRP REPORT LISTS []
→ Returns: { ok, reports: [{ id, name, hsType }] }

GET /vista/reports/text?dfn=1&id=1&hsType=
→ ORWRP REPORT TEXT [DFN, id, hsType, "", "0", "", ""]
→ Returns: { ok, text }
```

## Testing

### Quick Smoke Test
```powershell
# Start services
cd services/vista; docker compose --profile dev up -d
cd apps/api; npx tsx --env-file=.env.local src/index.ts

# Verify endpoints
Invoke-RestMethod http://127.0.0.1:3001/vista/icd-search?q=diabetes
Invoke-RestMethod http://127.0.0.1:3001/vista/consults?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/surgery?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/dc-summaries?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/labs?dfn=1
Invoke-RestMethod http://127.0.0.1:3001/vista/reports
```

### Note on Test Data

The WorldVistA Docker sandbox has limited clinical data for DFN 1/2/3:
- Consults: 0 records (RPC works, no data)
- Surgery: 0 records (RPC works, no data)
- D/C Summaries: 0 records (RPC works, no data)
- Labs: 0 records / "No Data Found" (RPC works, no data)
- Reports: 23 report types available (real catalog!)
- ICD Search: Returns real lexicon results for any query ≥ 2 chars

All endpoints return `ok: true` even with empty results. The RPCs are correctly
wired and will return real data when patients have clinical records.

## Troubleshooting

### "Not connected. Call connect() first."
Every endpoint must call `await connect()` before `callRpc()` and `disconnect()`
after. Check that the new endpoint follows the connect/disconnect pattern.

### "raw.split is not a function"
`callRpc()` returns a `string[]`, not a raw string. Don't call `.split()` on it.
Use `Array.isArray(lines) ? lines : [lines]` for safety.

### ICD search returns swapped fields
ORQQPL4 LEX returns `IEN^Description^ICD-code`, not `IEN^ICD^Description`.
The description comes before the ICD code in the response.

### Reports text returns empty
Some report types require specific hsType or date parameters. Pass the hsType
from the report catalog entry if available.
