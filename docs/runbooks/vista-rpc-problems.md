# VistA Problem List (ORWCH PROBLEM LIST) — Phase 9A Runbook

## Overview

The **Problem List** in VistA stores patient chronic conditions, diagnoses, and active medical problems. The RPC `ORWCH PROBLEM LIST` retrieves these records for display and management.

---

## RPC: ORWCH PROBLEM LIST

### Categories

- **Namespace**: ORWCH (CPRS Chart)
- **Purpose**: Retrieve patient problem list (diagnoses, chronic conditions)
- **File**: 9000011 (Problem List in VistA fileman hierarchy)

### Parameters

| Param    | Type    | Description                                      |
| -------- | ------- | ------------------------------------------------ |
| **DFN**  | LITERAL | Patient IEN (e.g., "1")                          |
| **FLAG** | LITERAL | "1" = active only, "0" = all (active + resolved) |

### Response Format

Each line contains tab/caret-delimited fields:

```
IEN^PROBLEM_TEXT^STATUS^ONSET_DATE^...
```

**Field Breakdown**:

1. **IEN** – Problem record ID in file 9000011
2. **PROBLEM_TEXT** – Diagnosis/problem description (e.g., "Type 2 Diabetes")
3. **STATUS** – Status code:
   - `A` (Active) → displays as "active"
   - `I` (Inactive) or `0` → displays as "inactive"
   - `R` or `2` (Resolved) → displays as "resolved"
4. **ONSET_DATE** – Problem onset date (FileMan format or blank)
5. **...** – Additional fields (date modified, user, etc.) — typically ignored for MVP

### Error Response

```
-1^ERROR MESSAGE
```

---

## API Endpoint: GET /vista/problems?dfn=<dfn>

### Request

```bash
curl -s http://127.0.0.1:3001/vista/problems?dfn=1
```

### Success Response (200)

```json
{
  "ok": true,
  "count": 3,
  "results": [
    {
      "id": "1",
      "text": "Type 2 Diabetes",
      "status": "active",
      "onset": "3200101"
    },
    {
      "id": "2",
      "text": "Hypertension",
      "status": "active",
      "onset": "3191215"
    },
    {
      "id": "3",
      "text": "Hyperlipidemia",
      "status": "inactive"
    }
  ],
  "rpcUsed": "ORWCH PROBLEM LIST"
}
```

### Error Response (400/500)

```json
{
  "ok": false,
  "error": "Patient not found or RPC failed",
  "rpcUsed": "ORWCH PROBLEM LIST"
}
```

---

## API Endpoint: POST /vista/cprs/problems/edit

### Purpose

Edits an existing problem using `ORQQPL EDIT SAVE` through the CPRS writeback surface.

### Request Body

```json
{
  "dfn": "46",
  "problemIen": "1787",
  "problemText": "Sleep apnea (SCT 73430006)",
  "icdCode": "327.23",
  "status": "active"
}
```

### Status Normalization

- UI values `active` and `inactive` are normalized to VistA-safe status codes `A` and `I` before the RPC call.
- Any VistA runtime-error payload is treated as a failed live write and falls back truthfully to draft mode instead of returning fake live success.

### Success Responses

Real VistA write:

```json
{
  "ok": true,
  "mode": "real",
  "status": "saved",
  "rpcUsed": ["ORQQPL EDIT SAVE"]
}
```

Draft fallback:

```json
{
  "ok": true,
  "mode": "draft",
  "status": "sync-pending",
  "syncPending": true,
  "rpcUsed": ["ORQQPL EDIT SAVE"]
}
```

---

## Implementation Notes

### MVP Scope

- **Read only**: Returns problem list, no add/edit/delete in Phase 9A
- **Status display**: Simplified to "active" / "inactive" / "resolved"
- **Minimal fields**: Stores id, text, status, onset only (ICD/SNOMED mapping out of scope)
- **No date formatting**: Onset dates returned raw (FileMan format), displayed as-is

### Current Writeback Posture

- Problem list reads remain available via `GET /vista/problems`.
- Active CPRS writeback uses `POST /vista/cprs/problems/edit` and `POST /vista/cprs/problems/add`.
- Legacy `POST /vista/problems` remains blocker-era and should not be used for active write paths.

### Standalone Problems Panel Truthfulness Contract

- The standalone CPRS Problems tab uses shared `useDataCache()` metadata, not just row count.
- A successful live empty response renders `No problems on record`.
- A failed or integration-pending problem-list read renders a grounded pending banner with status, attempted RPCs, and target RPCs instead of a false empty-chart state.
- If problems exist but the local status filter removes all rows, the panel shows a filter-specific empty message rather than claiming the chart has no problems.

### Known Limitations

1. **Problem text may be truncated** in WorldVistA if stored descriptions are long
2. **Onset date** is in FileMan format (YYYMMDD) — frontend could format to human-readable if needed
3. **No ICD/SNOMED codes** — only problem description text is retrieved
4. **No add/edit/delete** — only read-access in current MVP
5. **Status mapping** – Some VistA sites may use different status codes; adjust in `index.ts` if needed

### Testing with WorldVistA Docker

1. **Verify patient has problems**:

   ```bash
   docker exec wv su - wv -c "mumps -r %XCMD 'F I=1:1:5 W I_\": \"_\$O(^PXRMINDX(9000011,\"PSPI\",1,I)),! ' Q"
   ```

2. **Test RPC call**:

   ```bash
   curl -s http://127.0.0.1:3001/vista/problems?dfn=1 | jq .
   ```

3. **Expected result**: List of 1–5 problems per default patient in the Docker sandbox

---

## File Structure: Problem List (9000011)

VistA stores problems in file **9000011** with index **PSPI** (Problem List by Status, Priority, Item/ICD9, and Date):

```
^PXRMINDX(9000011,"PSPI",DFN,STATUS,PRIORITY,ICD9,DATE,NODE)
```

- **STATUS**: "A" (active), "I" (inactive), "R" (resolved), etc.
- **PRIORITY**: Problem priority ranking (1–5)
- **ICD9**: ICD-9 or ICD-10 code (or diagnosis text if not coded)
- **DATE**: Date problem was entered/modified

The MVP endpoint does not navigate this complex index directly; instead, it calls the RPC which handles the lookup internally.

---

## Wire Protocol Details

### Example: ORWCH PROBLEM LIST[DFN=1, FLAG=0]

```
Request:
  RPC Name: ORWCH PROBLEM LIST
  Params (literal): ["1", "0"]

Response (multiple lines):
  1^Type 2 Diabetes^A^3200101^...
  2^Hypertension^A^3191215^...
  3^Hyperlipidemia^I^^...
```

### Caret-Delimited Parsing

Each line is split by `^`:

- `parts[0]` = IEN
- `parts[1]` = Problem text
- `parts[2]` = Status
- `parts[3]` = Onset date (may be empty)

---

## UI Integration

### Web Component: Problem List Tab

- **Section Title**: "Problem List"
- **Display**: Table with columns:
  - Problem (text)
  - Status (active/inactive/resolved)
  - Onset (date or "—")
- **Styling**: Matches medications/allergies sections with consistent hover/border styling
- **Loading state**: Shows "Loading problems…" spinner
- **Error state**: Displays error message in red box
- **Empty state**: "No problems found."

---

## Troubleshooting

### RPC returns empty list

- Check that patient (DFN) has active/resolved problems recorded in VistA
- Try `FLAG=0` (all problems) instead of `FLAG=1` (active only)

### RPC returns -1^ERROR

- Patient DFN may not exist in VistA
- User may not have RPC permissions (check VISTA_ACCESS_CODE and VISTA_VERIFY_CODE)

### UI section does not appear

- Ensure API is running: `curl http://127.0.0.1:3001/health`
- Check browser console for network errors
- Verify patient was selected before opening Problems tab

---

## Future Enhancements (Out of MVP Scope)

1. **ICD/SNOMED mapping**: Add code lookup alongside problem text
2. **Add/Edit/Resolve**: POST/PUT endpoints to modify problem list
3. **Date formatting**: Convert FileMan dates to user-friendly format (e.g., "Jan 1, 2020")
4. **Priority display**: Show problem priority ranking in UI
5. **History/audit**: Track when problems were added, modified, resolved

---

## References

- **File**: 9000011 (Problem List) in VA FileMan dictionary
- **RPC**: ORWCH PROBLEM LIST (defined in ORWCH.m)
- **Index**: PSPI in ^PXRMINDX(9000011)
- **Status codes**: Standard VistA problem statuses (A=active, I=inactive, R=resolved)
