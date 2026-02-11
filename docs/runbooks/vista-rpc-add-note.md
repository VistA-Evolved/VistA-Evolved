# Phase 7B — Create Note via TIU CREATE RECORD + TIU SET DOCUMENT TEXT

## Objective

Add `POST /vista/notes` to create a new progress note for a patient.

## RPCs Used

### TIU CREATE RECORD

- **Entry point**: `MAKE^TIUSRVP`
- **Registered**: IEN 97 in `^XWB(8994)`
- **Return**: Single value — TIU Document IEN on success, `0^error` on failure

**Parameters (positional via `callRpcWithList`):**

| # | Name     | Type    | Value                       | Notes                                    |
|---|----------|---------|-----------------------------|------------------------------------------|
| 1 | DFN      | literal | Patient IEN                 | From `POST body.dfn`                     |
| 2 | TITLE    | literal | `10`                        | GENERAL NOTE (IEN 10, type DOC, 8925.1)  |
| 3 | VDT      | literal | FileMan date `YYYMMDD.HHMM` | YYY = year − 1700                        |
| 4 | VLOC     | literal | `2`                         | DR OFFICE (Hospital Location)            |
| 5 | VSIT     | literal | `""`                        | Let VistA create visit                   |
| 6 | TIUX     | list    | `{1202: DUZ, 1301: fmDate}` | Author + reference date                 |
| 7 | VSTR     | literal | `""`                        | Auto-derived from VDT+VLOC              |
| 8 | SUPPRESS | literal | `1`                         | Suppress alerts during batch create      |
| 9 | NOASF    | literal | `0`                         |                                          |

**TIUX Fields:**

| Key    | Description        | Value          |
|--------|--------------------|----------------|
| `1202` | Author/Dictator    | DUZ of signer  |
| `1301` | Reference Date     | FileMan date   |

### TIU SET DOCUMENT TEXT

- **Entry point**: `SETTEXT^TIUSRVPT`
- **Registered**: IEN 1109 in `^XWB(8994)`
- **Return**: `noteIEN^page^pages` on success, `0^0^0^error` on failure

**Parameters:**

| # | Name     | Type    | Value                          |
|---|----------|---------|--------------------------------|
| 1 | TIUDA    | literal | Note IEN (from CREATE step)    |
| 2 | TIUX     | list    | `{HDR: "1^1", TEXT,N,0: line}` |
| 3 | SUPPRESS | literal | `0`                            |

**TIUX Keys for TEXT:**

| Key          | Value                            |
|--------------|----------------------------------|
| `HDR`        | `page^totalPages` (e.g., `1^1`)  |
| `TEXT,1,0`   | First line of note body          |
| `TEXT,2,0`   | Second line                      |
| `TEXT,N,0`   | Nth line                         |

## Two-Step Create Flow

1. **TIU CREATE RECORD** — creates the document record (no text yet).
   Returns the new IEN.
2. **TIU SET DOCUMENT TEXT** — sets the body text on the created record.
   Returns `IEN^page^pages` on success.

The XWB LIST parameter format only supports single-level subscripts.
Multi-subscript keys like `TEXT,1,0` work as flat string keys in the
`^TMP("XWBPRS")` global, which is how SETTEXT receives them.

## Key Discovery: Why Two Steps?

The `MAKE^TIUSRVP` function can accept text via `TIUX("TEXT",1,0)` etc.,
but the XWB broker's LIST parameter parser (LINST^XWBPRS) treats commas
in keys differently than multi-dimensional MUMPS subscripts. Passing the
text as part of TIU CREATE RECORD's TIUX caused:

```
M ERROR=LINST+3^XWBPRS, Right parenthesis expected
```

Splitting into CREATE + SET TEXT avoids this entirely and matches the
approach CPRS uses (create record → set text → optionally sign).

## Title IEN Reference

| IEN  | Name              | Type |
|------|-------------------|------|
| 3    | PROGRESS NOTES    | CL   |
| 10   | GENERAL NOTE      | DOC  |
| 15   | CLINICAL WARNING  | DOC  |
| 81   | ADDENDUM          | DOC  |

We use IEN **10 (GENERAL NOTE)** as the default for all created notes.

## Hospital Location Reference

| IEN | Name            |
|-----|-----------------|
| 1   | LAB DIV 050...  |
| 2   | DR OFFICE       |
| 3   | SECURE MESSAGING|

We use IEN **2 (DR OFFICE)** as the default location.

## FileMan Date Format

```
YYYMMDD.HHMM
YYY = year - 1700
```

Example: February 11, 2026 at 3:15 PM → `3260211.1515`

## TIU DOCUMENTS BY CONTEXT — Updated for Phase 7B

The GET /vista/notes endpoint now fetches both:
- **CONTEXT=1** (all signed notes)
- **CONTEXT=2** (unsigned notes)

Results are merged and deduplicated by IEN, with unsigned notes listed
first (newest at top). This ensures newly created notes appear immediately.

## API

### POST /vista/notes

**Request:**
```json
{
  "dfn": "1",
  "title": "TEST NOTE",
  "text": "Hello from VistA-Evolved"
}
```

**Response (success):**
```json
{
  "ok": true,
  "id": "48",
  "message": "Note created",
  "rpcUsed": "TIU CREATE RECORD + TIU SET DOCUMENT TEXT"
}
```

**Response (failure):**
```json
{
  "ok": false,
  "error": "Missing title",
  "hint": "Body: { \"dfn\": \"1\", \"title\": \"TEST NOTE\", \"text\": \"hello world\" }"
}
```

## Verification

```powershell
# Create a note
curl -X POST http://127.0.0.1:3001/vista/notes `
  -H "Content-Type: application/json" `
  -d '{"dfn":"1","title":"TEST NOTE","text":"Hello from VistA-Evolved"}'

# Verify it appears in the list (including unsigned)
curl http://127.0.0.1:3001/vista/notes?dfn=1
```

## Bug Reference

- **BUG-022**: LINST+3^XWBPRS `Right parenthesis expected` when passing
  multi-subscript TEXT keys through TIU CREATE RECORD's TIUX LIST param.
  Fix: split into TIU CREATE RECORD + TIU SET DOCUMENT TEXT (two-step).
