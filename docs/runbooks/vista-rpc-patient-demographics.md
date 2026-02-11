# Runbook: Patient Demographics via ORWPT SELECT

## Phase
5B — Patient Demographics

## Endpoint
```
GET /vista/patient-demographics?dfn=<dfn>
```

## RPC Used
`ORWPT SELECT` — the standard CPRS patient-select RPC.

## Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `dfn` | string (numeric) | Yes | Patient DFN (internal file number) |

## Request Example
```bash
curl http://127.0.0.1:3001/vista/patient-demographics?dfn=1
```

## Response (success)
```json
{
  "ok": true,
  "patient": {
    "dfn": "1",
    "name": "ZZ PATIENT,TEST ONE",
    "dob": "1945-01-24",
    "sex": "F"
  },
  "rpcUsed": "ORWPT SELECT"
}
```

## Response (error — bad DFN)
```json
{
  "ok": false,
  "error": "Patient is unknown to CPRS.",
  "hint": "DFN 99999 not found in VistA"
}
```

## Response (error — missing/invalid param)
```json
{
  "ok": false,
  "error": "Missing or non-numeric dfn",
  "hint": "Use ?dfn=1"
}
```

## RPC Response Format
`ORWPT SELECT` returns a single `^`-delimited line:
```
NAME^SEX^DOB_FM^SSN^...^'DFN'^
```

| Field | Index | Example |
|-------|-------|---------|
| Name | 0 | `ZZ PATIENT,TEST ONE` |
| Sex | 1 | `F` |
| DOB (FileMan) | 2 | `2450124` |
| SSN (masked) | 3 | `000003322` |

### FileMan Date Conversion
FileMan dates use format `YYYMMDD` where `YYY = year - 1700`.
- `2450124` → 245 + 1700 = 1945, month 01, day 24 → `1945-01-24`
- `2571225` → 257 + 1700 = 1957, month 12, day 25 → `1957-12-25`

### Invalid DFN
Returns `-1^^^^^Patient is unknown to CPRS.`

## Prerequisites
- WorldVistA Docker container running on port 9430
- API server running on port 3001
- Valid credentials in `apps/api/.env.local`

## UI Integration
The Patient Search page (`/patient-search`) calls this endpoint when a patient
result is clicked. The response populates a **Patient Header** panel showing:
Name | DFN | DOB | Sex.

## Test Patients (WorldVistA Docker)
| DFN | Name | DOB | Sex |
|-----|------|-----|-----|
| 1 | ZZ PATIENT,TEST ONE | 1945-01-24 | F |
| 2 | ZZ PATIENT,TEST TWO | 1957-12-25 | M |
| 3 | ZZ PATIENT,TEST THREE | 1968-01-15 | M |
