# Runbook — Notes List via `TIU DOCUMENTS BY CONTEXT` RPC (Phase 7A)

## Objective

Display clinical notes (TIU documents) for a selected patient using the
**TIU DOCUMENTS BY CONTEXT** RPC (entry point `CONTEXT^TIUSRVLO`).

---

## Prerequisites

| Item | Detail |
|------|--------|
| VistA Docker | `docker compose --profile dev up -d` (port 9430) |
| API server | `pnpm -C apps/api dev` (port 3001) |
| Credentials | `apps/api/.env.local` with `PROV123 / PROV123!!` |

---

## API Endpoint

```
GET /vista/notes?dfn=<dfn>
```

### Response

```json
{
  "ok": true,
  "count": 15,
  "results": [
    {
      "id": "46",
      "title": "CLINICAL WARNING",
      "date": "2018-09-10 20:13",
      "author": "DEWAYNE,ROBERT",
      "location": "DR OFFICE",
      "status": "completed"
    }
  ],
  "rpcUsed": "TIU DOCUMENTS BY CONTEXT"
}
```

---

## Under the Hood

### RPC: `TIU DOCUMENTS BY CONTEXT`

Entry point: `CONTEXT^TIUSRVLO` in routine `TIUSRVLO.m`.

**Parameters** (positional LITERAL strings):

| # | Name | Value | Description |
|---|------|-------|-------------|
| 1 | CLASS | `3` | Document class — progress notes (file 8925.1) |
| 2 | CONTEXT | `1` | All signed notes for this patient |
| 3 | DFN | patient DFN | Pointer to Patient file (#2) |
| 4 | EARLY | `""` | Start date filter (empty = no filter) |
| 5 | LATE | `""` | End date filter (empty = no filter) |
| 6 | PERSON | `0` | Author filter (0 = all authors) |
| 7 | OCCLIM | `0` | Occurrence limit (0 = no limit) |
| 8 | SEQUENCE | `D` | Sort order: D=descending (newest first) |

### CONTEXT values

| Value | Meaning |
|-------|---------|
| 1 | All signed (by patient) |
| 2 | Unsigned (by patient & author/transcriber) |
| 3 | Uncosigned (by patient & expected cosigner) |
| 4 | Signed notes (by patient & selected author) |
| 5 | Signed notes (by patient & date range) |

### Wire Format

Each result line (caret-delimited):

```
IEN^title^editDate(FM)^patientName^authorDUZ;sigName;authorName^location^status^visitDate^dischargeDate^imgCount^subject^prefix^parent^idSort
```

Field positions (0-indexed):
- **0**: Document IEN (id)
- **1**: Title (may have `+ ` prefix for addenda indicator)
- **2**: Edit date in FileMan format (YYYMMDD.HHMM)
- **3**: Patient name with last-4-SSN
- **4**: Author — `DUZ;signatureName;displayName`
- **5**: Location name
- **6**: Status (e.g., "completed")
- **7**: Visit date (formatted as `Visit: MM/DD/YY`)
- **8**: Discharge date (if applicable)

### FileMan Date Conversion

`YYYMMDD.HHMM` → `YYYY-MM-DD HH:MM`

- YYY + 1700 = Gregorian year
- Example: `3180910.2013` → `2018-09-10 20:13`

---

## Verification

### 1. curl GET — list notes for DFN=1

```bash
curl -s "http://127.0.0.1:3001/vista/notes?dfn=1" | jq .
```

Expected: `ok:true`, `count:15`, results array with title/date/author/status fields.

### 2. curl GET — patient with no notes

```bash
curl -s "http://127.0.0.1:3001/vista/notes?dfn=4" | jq .
```

Expected: `ok:true`, `count:0`, `results:[]`.

### 3. Validation error

```bash
curl -s "http://127.0.0.1:3001/vista/notes" | jq .
```

Expected: `ok:false`, `error:"Missing or non-numeric dfn query parameter"`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ok:false, error:"Missing or non-numeric dfn"` | No dfn param | Add `?dfn=1` |
| `ok:true, count:0` | Patient has no signed notes | Try DFN=1, 2, or 3 |
| 608 Job ended | Protocol framing | Check rpcBrokerClient.ts |
| ECONNREFUSED | Docker not running | Start with `docker compose --profile dev up -d` |

---

## Files Modified (Phase 7A)

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Added `GET /vista/notes` route with `TIU DOCUMENTS BY CONTEXT` RPC |
| `apps/web/src/app/patient-search/page.tsx` | Added notes section with table (title, date, author, status) |
| `apps/web/src/app/patient-search/page.module.css` | Styles for notes table |
| `docs/runbooks/vista-rpc-notes.md` | This runbook |
