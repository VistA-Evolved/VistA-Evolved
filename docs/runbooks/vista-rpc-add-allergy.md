# Runbook — Phase 5D: Add Allergy (First Write / CRUD)

> **Goal**: `POST /vista/allergies` — Add an allergy for a selected patient
> via `ORWDAL32 ALLERGY MATCH` + `ORWDAL32 SAVE ALLERGY` RPCs.

---

## 1. RPC Discovery

### ORWDAL32 ALLERGY MATCH (IEN 615)

| Property    | Value                   |
| ----------- | ----------------------- |
| Tag         | `ALLSRCH^ORWDAL32`      |
| Return type | 2 (array)               |
| Params      | 1 LITERAL (search text) |

**Response format** (one line per match):

```
IEN^name^source_global^allergyType^sourceNum
```

- Header lines have empty `source_global` — skip them.
- Prefer matches from `GMRD(120.82,"B")` (VA Allergies File).

Example:

```
1^VA Allergies File^^^TOP^+
49^PENICILLIN^GMRD(120.82,"B")^D^1
49^PENICILLIN <PENICILLINS>^GMRD(120.82,"D")^D^1
```

### ORWDAL32 SAVE ALLERGY (IEN 1968)

| Property    | Value                                                           |
| ----------- | --------------------------------------------------------------- |
| Tag         | `EDITSAVE^ORWDAL32`                                             |
| Return type | 1 (single value)                                                |
| Params      | LITERAL (allergyIEN, `0` = new), LITERAL (DFN), LIST (OREDITED) |

**Returns**: `"0"` on success, `"-1^error message"` on failure.

---

## 2. OREDITED List Fields

All six fields are mandatory — `UPDATE^GMRAGUI1` iterates over them in a
`FOR` loop without `$G()` protection, so a missing field causes a
`GVUNDEF` error.

| Key        | Description                | Example                      |
| ---------- | -------------------------- | ---------------------------- |
| `GMRAGNT`  | `NAME^IEN;file_root`       | `PENICILLIN^49;GMRD(120.82,` |
| `GMRATYPE` | Allergy type from MATCH    | `D` (Drug), `F` (Food), `DF` |
| `GMRANATR` | Nature of reaction         | `U^Unknown`                  |
| `GMRAORIG` | DUZ of authenticated user  | `87`                         |
| `GMRAORDT` | FileMan date/time          | `3260211.152300`             |
| `GMRAOBHX` | Observed / historical flag | `h^HISTORICAL`               |

### GMRAGNT format

```
ALLERGEN_NAME ^ IEN ; file_root
```

- **piece 1** (before `^`) = allergen display name (stored as `.02` field)
- **piece 2** (after `^`) = `IEN;global_root` (cross-reference source)
- The `file_root` keeps its trailing comma (e.g., `GMRD(120.82,`)

### FileMan Date Format

`YYYMMDD.HHMMSS` where `YYY = year − 1700`.

| Calendar Date       | FileMan Date     |
| ------------------- | ---------------- |
| 2026-02-11 15:23:00 | `3260211.152300` |
| 2025-07-04 09:00:00 | `3250704.090000` |

---

## 3. XWB LIST Parameter Wire Format

The `ORWDAL32 SAVE ALLERGY` RPC requires a LIST-type parameter (type `2`).
Wire format discovered by reading `PRS5`/`LINST`/`OARY` in `XWBPRS.m`:

```
"2" + [LPack('"key"') + LPack(value) + continuation]...
```

- `continuation` = `"t"` (more entries) or `"f"` (last entry / end-of-param)
- **Keys must include MUMPS double-quotes** so `LINST^XWBPRS` correctly
  sets string subscripts via indirection (`@ref@(key)=value`)
- Last entry uses `"f"` directly — do NOT append an extra `"f"` after `"t"`

---

## 4. API Endpoint

### `POST /vista/allergies`

**Request body** (JSON):

```json
{
  "dfn": "1",
  "allergyText": "PENICILLIN"
}
```

**Validations**:

- `dfn` — required, must be numeric
- `allergyText` — required, minimum 2 characters

**Success response**:

```json
{
  "ok": true,
  "message": "Allergy created",
  "allergen": "PENICILLIN",
  "result": "0",
  "rpcUsed": "ORWDAL32 SAVE ALLERGY"
}
```

**Error responses**:

```json
{ "ok": false, "error": "Patient already has a ASPIRIN reaction entered.  No duplicates allowed." }
{ "ok": false, "error": "No matching allergen found for \"XYZZY\"" }
{ "ok": false, "error": "Missing or non-numeric dfn" }
{ "ok": false, "error": "allergyText must be at least 2 characters" }
```

---

## 5. Verification

```powershell
# Start API (must have .env.local with credentials)
cd apps/api
node --env-file=.env.local --import tsx src/index.ts

# Test: Add PENICILLIN allergy for patient DFN=3
$body = '{"dfn":"3","allergyText":"PENICILLIN"}'
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/allergies" `
  -Method POST -ContentType "application/json" -Body $body

# Verify it shows up in GET
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/allergies?dfn=3"

# Test duplicate detection
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/allergies" `
  -Method POST -ContentType "application/json" -Body $body
# Should return: "Patient already has a PENICILLIN reaction entered."

# Test input validation
$bad = '{"allergyText":"ASPIRIN"}'
Invoke-RestMethod -Uri "http://127.0.0.1:3001/vista/allergies" `
  -Method POST -ContentType "application/json" -Body $bad
# Should return: "Missing or non-numeric dfn"
```

---

## 6. Two-Step Flow

```
Client                        API                        VistA
  │ POST {dfn, allergyText}    │                           │
  │──────────────────────────▶│                           │
  │                            │ ORWDAL32 ALLERGY MATCH   │
  │                            │──────────────────────────▶│
  │                            │  IEN^name^source^type     │
  │                            │◀──────────────────────────│
  │                            │                           │
  │                            │ ORWDAL32 SAVE ALLERGY    │
  │                            │  (0, dfn, OREDITED list)  │
  │                            │──────────────────────────▶│
  │                            │  "0" (success)            │
  │                            │◀──────────────────────────│
  │ {ok:true, allergen, ...}   │                           │
  │◀──────────────────────────│                           │
```

---

## 7. Files Changed (Phase 5D)

| File                                              | Change                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/api/src/vista/rpcBrokerClient.ts`           | Added `getDuz()`, `RpcParam` type, `buildRpcMessageEx()`, `callRpcWithList()` |
| `apps/api/src/index.ts`                           | Added `POST /vista/allergies` endpoint                                        |
| `apps/web/src/app/patient-search/page.tsx`        | Added "Add Allergy" form with loading/error/success states                    |
| `apps/web/src/app/patient-search/page.module.css` | Added `.addAllergyForm`, `.allergyInput`, `.addAllergyBtn`, etc.              |
| `docs/runbooks/vista-rpc-add-allergy.md`          | This file                                                                     |

---

## 8. Key Gotchas

1. **All 6 OREDITED fields are mandatory.** Missing any one causes `GVUNDEF`
   in `UPDATE^GMRAGUI1` (it uses a `FOR` loop without `$G()` protection).
2. **GMRAGNT format is `NAME^IEN;file_root`** — not `IEN^file_root`. The
   name goes in piece 1 (stored as the .02 "REACTANT" field), and the
   `IEN;root` pointer goes in piece 2 (cross-reference source).
3. **LIST param keys need MUMPS double-quotes** (`'"GMRAGNT"'`), not bare
   identifiers.
4. **LIST param continuation bytes**: `"t"` = more, `"f"` = last entry.
   No extra `"f"` after the last `"t"`.
5. **FileMan dates use YYY = year − 1700**, not standard YYYY.
6. **Trailing comma in file root is required**: `GMRD(120.82,` not
   `GMRD(120.82)`.
