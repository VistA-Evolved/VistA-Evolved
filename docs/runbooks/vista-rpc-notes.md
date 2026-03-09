# Runbook — Notes List via `TIU DOCUMENTS BY CONTEXT` RPC (Phase 7A)

## Objective

Display clinical notes (TIU documents) for a selected patient using the
**TIU DOCUMENTS BY CONTEXT** RPC (entry point `CONTEXT^TIUSRVLO`).

---

## Prerequisites

| Item         | Detail                                           |
| ------------ | ------------------------------------------------ |
| VistA Docker | `docker compose --profile dev up -d` (port 9430) |
| API server   | `pnpm -C apps/api dev` (port 3001)               |
| Credentials  | `apps/api/.env.local` with `PROV123 / PROV123!!` |

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

## Notes Panel Truthfulness Contract

- The standalone CPRS Notes panel uses the shared `useDataCache()` notes-domain metadata, not just array length.
- A successful live empty response renders `No notes on record`.
- A failed or integration-pending notes read renders a grounded pending banner with status, attempted RPCs, and target RPCs instead of a false empty state.
- Request-failure posture still identifies `TIU DOCUMENTS BY CONTEXT` as the target dependency so clinicians are not shown an ungrounded blank list.
- TIU note status chips in the CPRS Notes panel must classify `unsigned` and `uncosigned` before any generic `signed` substring check; otherwise live unsigned notes are falsely labeled as signed in the chart.
- CPRS note creation is only truthful when the returned TIU IEN can be read back with persisted body lines, not just the standard TIU header block.
- `TIU SET DOCUMENT TEXT` acknowledgements alone are insufficient in VEHU for clinician-facing success. The route must verify persisted body lines through TIU readback before returning `ok:true`.
- The XWB LIST serializer must preserve valid MUMPS compound keys such as `"TEXT",1,0` and leave numeric field keys such as `1202` and `1301` unquoted. Quoting the entire key string causes TIU body writes to land in the wrong node and TIU create field arrays to be ignored.
- The authoritative `TIU CREATE RECORD` contract for CPRS create uses the 9-parameter Phase 7B sequence: `DFN`, `TITLE`, `VDT`, `VLOC`, `VSIT`, `TIUX{1202,1301}`, `VSTR`, `SUPPRESS`, `NOASF`.
- In VEHU, `TIU DETAILED DISPLAY` may still report `Line Count: None` for a newly created unsigned note even when the body is present. Success must therefore be based on actual TIU readback content, not on line count alone.
- Live verification on 2026-03-08 confirmed real note creation for DFN 46 with title IEN `10`: `POST /vista/cprs/notes/create` returned document IEN `14359`, and `TIU GET RECORD TEXT` returned the entered body lines.
- During a notes refresh triggered by create, sign, addendum, or manual refresh, the CPRS Notes panel must keep already-known note rows visible and downgrade loading to a non-blocking refresh indicator. A blank loading-only pane is only acceptable before any trustworthy notes have been loaded.
- Live verification on 2026-03-08 also confirmed real addendum creation for signed parent note `727`: `POST /vista/cprs/notes/addendum` returned addendum IEN `14361`.
- Addenda against an unsigned parent note still degrade truthfully to server-side draft because `TIU CREATE ADDENDUM RECORD` does not produce a valid addendum IEN in that scenario.
- Live verification on 2026-03-08 confirmed the nursing TIU fallback writer now persists frontend-entered reason text. `POST /vista/nursing/mar/administer` for DFN `46` and medication `8207` returned note IEN `14366`, and `GET /vista/cprs/notes/text?ien=14366` read back `Med admin: 8207 - given - PHASE668 nursing reason UI contract ...`.
- Live verification on 2026-03-08 confirmed the eMAR TIU fallback writer now persists frontend-entered reason text. `POST /emar/administer` for DFN `46` and order `8207` returned note IEN `14367`, and `GET /vista/cprs/notes/text?ien=14367` read back `eMAR: given order 8207 - PHASE668 emar reason UI contract ...`.
- The nursing fallback route must accept both `note` and `reason` inputs because the CPRS web UI posts `reason`; dropping that field silently loses clinician-entered administration context even when TIU text persistence is otherwise working.

---

## Under the Hood

### RPC: `TIU DOCUMENTS BY CONTEXT`

Entry point: `CONTEXT^TIUSRVLO` in routine `TIUSRVLO.m`.

**Parameters** (positional LITERAL strings):

| #   | Name     | Value       | Description                                   |
| --- | -------- | ----------- | --------------------------------------------- |
| 1   | CLASS    | `3`         | Document class — progress notes (file 8925.1) |
| 2   | CONTEXT  | `1`         | All signed notes for this patient             |
| 3   | DFN      | patient DFN | Pointer to Patient file (#2)                  |
| 4   | EARLY    | `""`        | Start date filter (empty = no filter)         |
| 5   | LATE     | `""`        | End date filter (empty = no filter)           |
| 6   | PERSON   | `0`         | Author filter (0 = all authors)               |
| 7   | OCCLIM   | `0`         | Occurrence limit (0 = no limit)               |
| 8   | SEQUENCE | `D`         | Sort order: D=descending (newest first)       |

### CONTEXT values

| Value | Meaning                                     |
| ----- | ------------------------------------------- |
| 1     | All signed (by patient)                     |
| 2     | Unsigned (by patient & author/transcriber)  |
| 3     | Uncosigned (by patient & expected cosigner) |
| 4     | Signed notes (by patient & selected author) |
| 5     | Signed notes (by patient & date range)      |

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

| Symptom                                        | Cause                       | Fix                                             |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------- |
| `ok:false, error:"Missing or non-numeric dfn"` | No dfn param                | Add `?dfn=1`                                    |
| `ok:true, count:0`                             | Patient has no signed notes | Try DFN=1, 2, or 3                              |
| 608 Job ended                                  | Protocol framing            | Check rpcBrokerClient.ts                        |
| ECONNREFUSED                                   | Docker not running          | Start with `docker compose --profile dev up -d` |

---

## Files Modified (Phase 7A)

| File                                              | Change                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/api/src/index.ts`                           | Added `GET /vista/notes` route with `TIU DOCUMENTS BY CONTEXT` RPC |
| `apps/web/src/app/patient-search/page.tsx`        | Added notes section with table (title, date, author, status)       |
| `apps/web/src/app/patient-search/page.module.css` | Styles for notes table                                             |
| `docs/runbooks/vista-rpc-notes.md`                | This runbook                                                       |
