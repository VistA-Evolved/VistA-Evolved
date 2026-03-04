# Runbook — Phase 6A: Vitals Display

> Display patient vitals from VistA via the `ORQQVI VITALS` RPC.

---

## RPC Used

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| **RPC Name**   | `ORQQVI VITALS`                                               |
| **Routine**    | `VITALS^ORQQVI`                                               |
| **Context**    | `OR CPRS GUI CHART`                                           |
| **Parameters** | DFN (patient IEN), ORSDT (start date FM), OREDT (end date FM) |
| **Returns**    | Array: `ien^type^value^datetime` per line                     |

### Alternative RPC

`ORQQVI XFASTVIT` returns only the **most recent** measurement for each
vital type (T, P, R, BP, HT, WT, PN). Format: `ien^type^rate^datetime`.

We use `ORQQVI VITALS` for full history within a date range.

---

## API Endpoint

```
GET /vista/vitals?dfn=<dfn>
```

### Response (success)

```json
{
  "ok": true,
  "count": 3,
  "results": [
    { "type": "T", "value": "98.6", "takenAt": "2026-02-10 14:30" },
    { "type": "BP", "value": "120/80", "takenAt": "2026-02-10 14:30" },
    { "type": "P", "value": "72", "takenAt": "2026-02-10 14:30" }
  ],
  "rpcUsed": "ORQQVI VITALS"
}
```

### Response (no vitals)

```json
{
  "ok": true,
  "count": 0,
  "results": [],
  "rpcUsed": "ORQQVI VITALS"
}
```

### Response (error)

```json
{
  "ok": false,
  "error": "Missing or non-numeric dfn",
  "hint": "Use ?dfn=1"
}
```

---

## Vital Type Abbreviations

| Abbreviation | Vital Sign     |
| ------------ | -------------- |
| T            | Temperature    |
| P            | Pulse          |
| R            | Respiration    |
| BP           | Blood Pressure |
| HT           | Height         |
| WT           | Weight         |
| PN           | Pain           |

---

## FileMan Date Handling

Dates come back in FileMan format `YYYMMDD.HHMMSS` where `YYY = year - 1700`.

Conversion: `parseInt(dateStr.substring(0, 3), 10) + 1700` → calendar year.

The API converts these to `YYYY-MM-DD HH:MM` format automatically.

---

## Informational Line Filtering

When no vitals exist, VistA returns: `^No vitals found.`

The first field (IEN) is empty — we skip any line where `id` is falsy,
same pattern as allergy "No Allergy Assessment" filtering.

---

## Curl Test Commands

```powershell
# Vitals for DFN 1
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/vitals?dfn=1" -TimeoutSec 15 | ConvertTo-Json -Depth 5

# Vitals for DFN 2
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/vitals?dfn=2" -TimeoutSec 15 | ConvertTo-Json -Depth 5

# Missing dfn (should return error)
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/vitals" -TimeoutSec 5 | ConvertTo-Json

# Invalid dfn format
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/vitals?dfn=abc" -TimeoutSec 5 | ConvertTo-Json
```

---

## UI

The **Vitals** section appears below the patient header (after allergies)
when a patient is selected. It renders a table with columns:
Type | Value | Taken At.

---

## Key Gotchas

1. **Wire format differs from MUMPS comment**: The `VITALS^ORQQVI` comment says
   `ien^type^datetime^rate` but the actual wire is `ien^type^value^datetime`.
   Verified by direct MUMPS call. Always test, never trust comments.
2. **Date range must be FileMan format**: `3000101` = Jan 1 2000,
   `3991231` = Dec 31 2099. We use a wide range to get all history.
3. **Informational lines**: `^No vitals found.` has empty IEN — filter it.
4. **Type abbreviations**: VistA returns short codes (T, P, R, BP, HT, WT, PN),
   not full names.
5. **FileMan datetime**: The `.HHMMSS` portion may be absent for date-only entries.
6. **No broker changes**: Uses existing `callRpc` with literal params — no LIST needed.
